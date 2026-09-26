import "server-only";
import { db } from "@/server/veritabani";
import { alanAramasi } from "@/ui/panel-arama-bicim";
import type { Prisma } from "@/db/uretilen/client";
import { cekeIadeEt } from "@/server/hediye-ceki";
import { iadeBolustur } from "@/server/hediye-ceki-bicim";

/**
 * Para iadesi.
 *
 * İki ayrı iş var ve karıştırılmamalı:
 *
 * - **Kayıt:** mağazanın müşteriye ne kadar borcu var, ödendi mi. Bu her
 *   zaman çalışıyor; havalede tek yol da bu.
 * - **Gönderim:** paranın gerçekten geri gitmesi. Kartta iyzico'ya
 *   gönderiliyor (`server/odeme-iade.ts`), havalede mağaza sahibi bankadan
 *   gönderip panelde işaretliyor.
 *
 * Kayıt önce açılıyor, gönderim sonra deneniyor. Tersi olsaydı gönderim
 * başarılı olup kayıt düşerse borç iki kez ödenirdi (K-58).
 *
 * **Tutar hesabı.** Kısmi iade bebek kıyafetinde kural: üç üründen biri
 * tutmuyor. O yüzden iade tutarı satır satır hesaplanıyor:
 *
 * 1. Satır tutarı = birim fiyat × iade edilen adet
 * 2. Kampanya indiriminin o satıra düşen payı çıkarılıyor. Pay sipariş anında
 *    satıra yazılıyor ve yalnızca kampanyanın kapsadığı satırlarda var
 *    (K-109). Eskiden indirim bütün satırlara oranla yayılıyordu: yalnızca
 *    bir ürüne uygulanan kampanyada indirimsiz ürünü iade eden eksik,
 *    indirimliyi iade eden fazla para alıyordu. Payı yazılmamış eski
 *    siparişlerde oransal hesap kalıyor; doğrusu artık bilinmiyor.
 * 3. **Kargo yalnızca siparişin tamamı iade ediliyorsa** ekleniyor. Mesafeli
 *    Sözleşmeler Yönetmeliği'nde cayma hâlinde teslim masrafı da iade
 *    ediliyor; ama üründen birini iade edende gönderi yine yapılmış oluyor.
 *
 *    "Tamamı" **birikimli** sayılıyor: müşteri iki üründen birini bugün,
 *    ötekini haftaya iade ederse sonunda her şeyi iade etmiş oluyor ve kargo
 *    ikinci iadede ekleniyor. Yalnızca o anki talebe bakmak, parça parça
 *    iade edenin kargo bedelini hiç alamaması demekti — denemede çıktı
 *    (K-58). Eşitlik bir kez yakalandığı için kargo da bir kez ekleniyor.
 */

export type IadeSatiri = { orderItemId: string; adet: number };

export type IadeHesabi = {
  urunKurus: number;
  indirimPayiKurus: number;
  kargoKurus: number;
  toplamKurus: number;
  /** Siparişin tamamı mı iade ediliyor? Kargo buna bağlı. */
  tamami: boolean;
};

/**
 * İade tutarı.
 *
 * Satırlar boş verilirse siparişin tamamı kastediliyor demektir — iptalde
 * böyle oluyor.
 */
export async function iadeTutari(
  orderId: string,
  satirlar?: IadeSatiri[],
  /**
   * Açık bir işlemin içinden çağrılıyorsa o işlemin istemcisi.
   *
   * Verilmezse sorgular havuzdan ayrı bir bağlantı alıyor. İşlem içinden
   * ayrı bağlantıyla okumak bu hesapta yanlış sonuç vermiyor — okunan
   * alanların hiçbirini işlem değiştirmiyor — ama yük altında havuzu
   * tüketebiliyor: işlem bir bağlantıyı tutarken ikincisini istiyor (K-62).
   */
  islem: Prisma.TransactionClient | typeof db = db,
): Promise<IadeHesabi | undefined> {
  const siparis = await islem.order.findUnique({
    where: { id: orderId },
    select: {
      araToplamKurus: true,
      indirimKurus: true,
      kargoKurus: true,
      toplamKurus: true,
      satirlar: { select: { id: true, adet: true, fiyatKurus: true, indirimKurus: true } },
    },
  });
  if (!siparis) return undefined;

  // Satır verilmediyse siparişin tamamı kastediliyor (iptal böyle çağırıyor).
  const hepsi = satirlar === undefined;
  const istenen = new Map(
    (satirlar ?? siparis.satirlar.map((s) => ({ orderItemId: s.id, adet: s.adet }))).map((s) => [
      s.orderItemId,
      s.adet,
    ]),
  );

  // Bu siparişte bugüne kadar tamamlanmış iadelerin adetleri. Çağıran talep
  // bu noktada zaten "tamamlandı" işaretli olduğu için kendisi de sayıya
  // dahil.
  const oncekiler = hepsi
    ? []
    : await islem.orderRequestItem.findMany({
        where: { request: { orderId, tur: "iade", durum: "tamamlandi" } },
        select: { adet: true },
      });
  const birikenAdet = oncekiler.reduce((t, o) => t + o.adet, 0);

  let urunKurus = 0;
  let iadeEdilenAdet = 0;
  let toplamAdet = 0;
  let satirPaylari = 0;
  const payYazili = siparis.satirlar.every((s) => s.indirimKurus !== null);

  for (const s of siparis.satirlar) {
    toplamAdet += s.adet;
    const adet = Math.min(Math.max(istenen.get(s.id) ?? 0, 0), s.adet);
    urunKurus += s.fiyatKurus * adet;
    iadeEdilenAdet += adet;
    // Satırın payı adede bölünüyor: üç adetten biri iade edilirse payın üçte biri.
    if (payYazili && adet > 0) satirPaylari += Math.round(((s.indirimKurus ?? 0) * adet) / s.adet);
  }

  // Kargo kararı birikimli: bu talep tek başına siparişin tamamını
  // kapsamasa da, önceki iadelerle birlikte kapsıyorsa kargo ekleniyor.
  const tamami = hepsi
    ? iadeEdilenAdet > 0
    : iadeEdilenAdet > 0 && birikenAdet >= toplamAdet;

  // İndirim payı: satır tutarının ara toplama oranı kadar. Ara toplam sıfırsa
  // (hepsi bedava) pay da sıfır — bölme yapılmıyor.
  const indirimPayiKurus = payYazili
    ? satirPaylari
    : siparis.indirimKurus > 0 && siparis.araToplamKurus > 0
      ? Math.round(siparis.indirimKurus * (urunKurus / siparis.araToplamKurus))
      : 0;

  const kargoKurus = tamami ? siparis.kargoKurus : 0;

  // Yuvarlama yüzünden tahsil edilenden fazlasını iade etmemek için üst sınır
  // siparişin kendi toplamı.
  const toplamKurus = Math.min(
    Math.max(urunKurus - indirimPayiKurus + kargoKurus, 0),
    siparis.toplamKurus,
  );

  return { urunKurus, indirimPayiKurus, kargoKurus, toplamKurus, tamami };
}

/**
 * İade kaydı açar ve siparişin ödeme durumunu `iade-bekliyor` yapar.
 *
 * Parası alınmamış siparişte iade diye bir şey yok: kayıt açılmıyor,
 * `undefined` dönüyor. Çağıran bunu hata saymıyor — iptal edilen ödenmemiş
 * sipariş olağan durum.
 *
 * **Hediye çekiyle ödenmiş sipariş (K-137).** Tutar, siparişin ödendiği
 * oranda para ve çek bakiyesi olarak bölünüyor. Çek kısmı aynı işlemde
 * bakiyeye dönüyor (gönderilecek bir şey yok); kayıttaki `tutarKurus`
 * yalnızca para olarak ödenecek kısım. Para kısmı sıfırsa kayıt
 * tamamlanmış açılıyor.
 */
export async function iadeKaydiAc(
  orderId: string,
  tutarKurus: number,
  ek: { requestId?: string; aciklama?: string } = {},
  islem: Prisma.TransactionClient | typeof db = db,
): Promise<string | undefined> {
  if (tutarKurus <= 0) return undefined;

  const siparis = await islem.order.findUnique({
    where: { id: orderId },
    select: {
      odemeDurumu: true,
      odemeYontemi: true,
      toplamKurus: true,
      hediyeCekiKurus: true,
      iadeler: { select: { tutarKurus: true, hediyeCekiKurus: true } },
    },
  });
  if (!siparis) return undefined;
  // Parası alınmamışsa iade edilecek bir şey de yok. "iade" de kabul: çekle
  // ödenmiş kısmın önceki iadesi hemen tamamlanıyor, sonraki kısmi iade
  // yine açılabilmeli.
  if (!["odendi", "iade-bekliyor", "iade"].includes(siparis.odemeDurumu)) {
    return undefined;
  }

  const { paraKurus, cekKurus } = iadeBolustur({
    tutarKurus,
    toplamKurus: siparis.toplamKurus,
    hediyeCekiKurus: siparis.hediyeCekiKurus,
    oncekiParaKurus: siparis.iadeler.reduce((t, i) => t + i.tutarKurus, 0),
    oncekiCekKurus: siparis.iadeler.reduce((t, i) => t + i.hediyeCekiKurus, 0),
  });
  if (paraKurus <= 0 && cekKurus <= 0) return undefined;
  if (cekKurus > 0) await cekeIadeEt(islem, orderId, cekKurus, "iade");

  const yalnizCek = paraKurus <= 0;
  const kayit = await islem.refund.create({
    data: {
      orderId,
      requestId: ek.requestId,
      tutarKurus: paraKurus,
      hediyeCekiKurus: cekKurus,
      yontem: siparis.odemeYontemi,
      aciklama: (ek.aciklama ?? "").slice(0, 500),
      ...(yalnizCek ? { durum: "tamamlandi", tamamlandi: new Date() } : {}),
    },
    select: { id: true },
  });

  const bekleyen = yalnizCek
    ? await islem.refund.count({ where: { orderId, durum: { not: "tamamlandi" } } })
    : 1;
  await islem.order.update({
    where: { id: orderId },
    data: { odemeDurumu: bekleyen > 0 ? "iade-bekliyor" : "iade" },
  });

  return kayit.id;
}

/**
 * İadeyi tamamlanmış işaretler.
 *
 * Siparişin ödeme durumu ancak **bekleyen başka iade kalmadıysa** `iade`
 * oluyor: iki parçalı bir iadenin ilki ödendiğinde borç bitmiş görünmemeli.
 */
export async function iadeyiTamamla(
  id: string,
  ek: { saglayiciRef?: string; yapanId?: string } = {},
): Promise<{ orderId: string } | undefined> {
  return db.$transaction(async (islem) => {
    const kayit = await islem.refund.findUnique({
      where: { id },
      select: { id: true, orderId: true, durum: true },
    });
    if (!kayit || kayit.durum === "tamamlandi") return undefined;

    // Koşullu (K-166): "işaretle"ye iki kez basılınca iki istek de
    // tamamlanmamış görüyor, müşteriye iki iade e-postası gidiyordu.
    const { count } = await islem.refund.updateMany({
      where: { id, durum: { not: "tamamlandi" } },
      data: {
        durum: "tamamlandi",
        tamamlandi: new Date(),
        saglayiciRef: ek.saglayiciRef ?? null,
        yapanId: ek.yapanId ?? null,
        hata: null,
      },
    });
    if (count === 0) return undefined;

    // Reddedilmiş ya da gönderimi yarıda kalmış iade de borç (K-166): eskiden
    // yalnızca "bekliyor" sayılıyordu, sipariş "iade edildi" görünüyordu.
    const kalan = await islem.refund.count({
      where: { orderId: kayit.orderId, durum: { not: "tamamlandi" } },
    });
    // Yalnızca iade bekleyen sipariş "iade edildi" oluyor (K-167): çift
    // ödemenin iadesi geçerli, ödenmiş bir siparişi iade edilmiş göstermesin.
    if (kalan === 0) {
      await islem.order.updateMany({
        where: { id: kayit.orderId, odemeDurumu: "iade-bekliyor" },
        data: { odemeDurumu: "iade" },
      });
    }

    return { orderId: kayit.orderId };
  });
}

/** Sağlayıcı reddetti: kayıt duruyor, sebebi yazılıyor, elle tamamlanabiliyor. */
export async function iadeyiBasarisizIsaretle(id: string, hata: string): Promise<void> {
  await db.refund.update({
    where: { id },
    data: { durum: "basarisiz", hata: hata.slice(0, 500) },
  });
}

export type BekleyenIade = {
  id: string;
  numara: string;
  adSoyad: string;
  tutarKurus: number;
  yontem: string;
  durum: string;
  hata: string | null;
  aciklama: string;
  olusturuldu: Date;
};

/** Ödenmeyi bekleyen ve reddedilmiş iadeler; panelin iş listesi. */
// "gonderiliyor": iyzico'ya gönderimi yarıda kalmış iade (K-166); listede
// kalıyor, borç görünmeye devam ediyor.
const BEKLEYEN_KOSULU = { durum: { in: ["bekliyor", "basarisiz", "gonderiliyor"] } };

/** Bekleyen iade koşulu, arama metniyle birlikte (K-69). */
function bekleyenKosulu(ara = ""): Record<string, unknown> {
  return {
    ...BEKLEYEN_KOSULU,
    ...alanAramasi(ara, ["aciklama", "hata", "order.numara", "order.adSoyad"]),
  };
}

/**
 * Bekleyen iadelerin adedi ve toplam tutarı.
 *
 * Liste sayfalandığı için (K-67) toplam artık ekrandaki satırlardan
 * toplanamıyor: "mağazanın müşteriye borcu" ilk sayfanın borcu değil, hepsi.
 */
export async function bekleyenIadeOzeti(
  ara = "",
): Promise<{ adet: number; toplamKurus: number }> {
  const ozet = await db.refund.aggregate({
    where: bekleyenKosulu(ara),
    _count: { _all: true },
    _sum: { tutarKurus: true },
  });
  return { adet: ozet._count._all, toplamKurus: ozet._sum.tutarKurus ?? 0 };
}

export async function bekleyenIadeler(
  atla = 0,
  adet?: number,
  ara = "",
): Promise<BekleyenIade[]> {
  const kayitlar = await db.refund.findMany({
    where: bekleyenKosulu(ara),
    orderBy: { olusturuldu: "asc" },
    skip: atla,
    ...(adet === undefined ? {} : { take: adet }),
    select: {
      id: true,
      tutarKurus: true,
      yontem: true,
      durum: true,
      hata: true,
      aciklama: true,
      olusturuldu: true,
      order: { select: { numara: true, adSoyad: true } },
    },
  });

  return kayitlar.map((k) => ({
    id: k.id,
    numara: k.order.numara,
    adSoyad: k.order.adSoyad,
    tutarKurus: k.tutarKurus,
    yontem: k.yontem,
    durum: k.durum,
    hata: k.hata,
    aciklama: k.aciklama,
    olusturuldu: k.olusturuldu,
  }));
}

/** Panelde bekleyen iade sayısı; menü rozeti. */
export async function bekleyenIadeSayisi(): Promise<number> {
  return db.refund.count({ where: { durum: { in: ["bekliyor", "basarisiz"] } } });
}

/**
 * Bir siparişin iade kayıtları; sipariş ekranında gösteriliyor.
 *
 * Sipariş numarasıyla çalışıyor, kimlikle değil: panelin elindeki `Siparis`
 * tipi müşteri tarafıyla ortak ve veritabanı kimliğini taşımıyor.
 */
export async function siparisinIadeleri(numara: string) {
  return db.refund.findMany({
    where: { order: { numara: numara.trim().toUpperCase() } },
    orderBy: { olusturuldu: "asc" },
    select: {
      id: true,
      tutarKurus: true,
      hediyeCekiKurus: true,
      yontem: true,
      durum: true,
      hata: true,
      saglayiciRef: true,
      aciklama: true,
      olusturuldu: true,
      tamamlandi: true,
    },
  });
}
