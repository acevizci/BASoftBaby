import "server-only";
import { db } from "@/server/veritabani";
import type { Prisma } from "@/db/uretilen/client";

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
 * 2. Kampanya indiriminin o satıra düşen payı çıkarılıyor — indirim bütün
 *    sepete uygulanmıştı, iade edilen kısmı da payını taşımalı. Yoksa
 *    indirimli alınan ürün tam fiyatından iade edilirdi.
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
): Promise<IadeHesabi | undefined> {
  const siparis = await db.order.findUnique({
    where: { id: orderId },
    select: {
      araToplamKurus: true,
      indirimKurus: true,
      kargoKurus: true,
      toplamKurus: true,
      satirlar: { select: { id: true, adet: true, fiyatKurus: true } },
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
    : await db.orderRequestItem.findMany({
        where: { request: { orderId, tur: "iade", durum: "tamamlandi" } },
        select: { adet: true },
      });
  const birikenAdet = oncekiler.reduce((t, o) => t + o.adet, 0);

  let urunKurus = 0;
  let iadeEdilenAdet = 0;
  let toplamAdet = 0;

  for (const s of siparis.satirlar) {
    toplamAdet += s.adet;
    const adet = Math.min(Math.max(istenen.get(s.id) ?? 0, 0), s.adet);
    urunKurus += s.fiyatKurus * adet;
    iadeEdilenAdet += adet;
  }

  // Kargo kararı birikimli: bu talep tek başına siparişin tamamını
  // kapsamasa da, önceki iadelerle birlikte kapsıyorsa kargo ekleniyor.
  const tamami = hepsi
    ? iadeEdilenAdet > 0
    : iadeEdilenAdet > 0 && birikenAdet >= toplamAdet;

  // İndirim payı: satır tutarının ara toplama oranı kadar. Ara toplam sıfırsa
  // (hepsi bedava) pay da sıfır — bölme yapılmıyor.
  const indirimPayiKurus =
    siparis.indirimKurus > 0 && siparis.araToplamKurus > 0
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
    select: { odemeDurumu: true, odemeYontemi: true },
  });
  if (!siparis) return undefined;
  // Parası alınmamışsa iade edilecek bir şey de yok.
  if (siparis.odemeDurumu !== "odendi" && siparis.odemeDurumu !== "iade-bekliyor") {
    return undefined;
  }

  const kayit = await islem.refund.create({
    data: {
      orderId,
      requestId: ek.requestId,
      tutarKurus,
      yontem: siparis.odemeYontemi,
      aciklama: (ek.aciklama ?? "").slice(0, 500),
    },
    select: { id: true },
  });

  await islem.order.update({
    where: { id: orderId },
    data: { odemeDurumu: "iade-bekliyor" },
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

    await islem.refund.update({
      where: { id },
      data: {
        durum: "tamamlandi",
        tamamlandi: new Date(),
        saglayiciRef: ek.saglayiciRef ?? null,
        yapanId: ek.yapanId ?? null,
        hata: null,
      },
    });

    const kalan = await islem.refund.count({
      where: { orderId: kayit.orderId, durum: "bekliyor" },
    });
    if (kalan === 0) {
      await islem.order.update({
        where: { id: kayit.orderId },
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
export async function bekleyenIadeler(): Promise<BekleyenIade[]> {
  const kayitlar = await db.refund.findMany({
    where: { durum: { in: ["bekliyor", "basarisiz"] } },
    orderBy: { olusturuldu: "asc" },
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
