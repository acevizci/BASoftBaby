import "server-only";

/**
 * İptal, iade ve değişim talepleri.
 *
 * Mesafeli satışta cayma hakkı yasal ve koşulsuz: tüketici, teslim tarihinden
 * itibaren **14 gün** içinde gerekçe göstermeden ve ceza ödemeden cayabiliyor
 * (6502 sayılı kanun ve Mesafeli Sözleşmeler Yönetmeliği). Site bunu zaten
 * yasal metinlerinde söz veriyordu ama tek yolu telefon ya da e-postaydı.
 * Burası o sözü işleyen akış: talep kayıt altına alınıyor, panelden
 * cevaplanıyor, müşteri durumunu kendi sayfasından görüyor.
 *
 * **Kurallar koda gömülü, mağaza sahibinin insafına bırakılmamış:**
 *
 * - 14 gün **teslim tarihinden** sayılıyor, sipariş tarihinden değil.
 * - Kargoya verilmemiş sipariş iptal edilebiliyor; verilmişse iade yolu
 *   açılıyor — yasal olarak cayma hakkı sözleşme kurulduğu anda başlıyor,
 *   kargodaki ürün için de geçerli.
 * - Gerekçe zorunlu değil; "belirtmek istemiyorum" seçilebiliyor ve bu
 *   hiçbir şeyi değiştirmiyor.
 *
 * Süre dolduysa talep açılmıyor, ama bu tüketicinin ayıplı mal haklarını
 * ortadan kaldırmıyor: ekranda iletişim kanalları gösteriliyor.
 */

import { db } from "@/server/veritabani";
import { siparisiIptalEtVeStoguIadeEt } from "@/server/odeme-akis";
import { iadeKaydiAc, iadeTutari } from "@/server/iade";
import { stokBildirimleriniGonder } from "@/server/stok-bildirimi";
import { CAYMA_GUN, TALEP_TURLERI, type TalepTuru } from "@/ui/talep-bicim";

/**
 * Cayma hakkı süresi — yasal alt sınır. Uzatmak serbest, kısaltmak değil.
 *
 * Değer `ui/talep-bicim.ts` içinde: hem bu `server-only` modül hem de
 * müşteriye söz veren bilgi sayfaları aynı sayıyı kullanmalı. Sayı iki yerde
 * ayrı yazılsaydı süre uzatıldığında sayfalar yanlış söz vermeye devam
 * ederdi (K-62).
 */
export { CAYMA_GUN } from "@/ui/talep-bicim";

export type TalepSatiri = {
  orderItemId: string;
  urunAd: string;
  beden: string;
  renk: string;
  adet: number;
  /** Bu satırdan en çok kaç adet talep edilebilir. */
  kalanAdet: number;
};

export type Talep = {
  id: string;
  tur: string;
  sebep: string;
  aciklama: string;
  durum: string;
  cevap: string;
  olusturuldu: Date;
  satirlar: { urunAd: string; beden: string; renk: string; adet: number }[];
};

export type TalepDurumBilgisi = {
  /** Şu an açılabilecek talep türleri. Boşsa sebebi `engel` yazıyor. */
  turler: TalepTuru[];
  engel?: string;
  /** Cayma hakkının bitiş günü; teslim edilmiş siparişlerde dolu. */
  sonGun?: Date;
  /** Açık ya da sonuçlanmış talepler. */
  talepler: Talep[];
  /** Talep edilebilecek satırlar ve kalan adetleri. */
  satirlar: TalepSatiri[];
};

/** Açık sayılan talep: müşteri ikinci bir tane açmasın. */
const ACIK_DURUMLAR = ["yeni", "onaylandi"];

function gunEkle(t: Date, gun: number): Date {
  const y = new Date(t);
  y.setDate(y.getDate() + gun);
  return y;
}

/**
 * Bir sipariş için talep durumu: ne açılabilir, ne açılamaz, neden.
 *
 * Kural motoru burada tek yerde; ekran yalnızca gösteriyor ve eylem aynı
 * işlevi yeniden çağırıyor. İkisi ayrışırsa tarayıcıdan zorlanan bir istek
 * kuralı atlatabilirdi.
 */
export async function talepDurumu(numara: string): Promise<TalepDurumBilgisi | undefined> {
  const siparis = await db.order.findUnique({
    where: { numara: numara.trim().toUpperCase() },
    select: {
      id: true,
      durum: true,
      teslimTarihi: true,
      satirlar: {
        orderBy: { id: "asc" },
        select: { id: true, urunAd: true, beden: true, renk: true, adet: true },
      },
      talepler: {
        orderBy: { olusturuldu: "desc" },
        select: {
          id: true,
          tur: true,
          sebep: true,
          aciklama: true,
          durum: true,
          cevap: true,
          olusturuldu: true,
          satirlar: { select: { orderItemId: true, adet: true } },
        },
      },
    },
  });
  if (!siparis) return undefined;

  // Reddedilen talep satırı yeniden talep edilebilsin: müşteri eksik bilgiyle
  // reddedilmişse ikinci kez denemek hakkı.
  const harcanan = new Map<string, number>();
  for (const t of siparis.talepler) {
    if (t.durum === "reddedildi") continue;
    for (const s of t.satirlar) {
      harcanan.set(s.orderItemId, (harcanan.get(s.orderItemId) ?? 0) + s.adet);
    }
  }

  const satirlar: TalepSatiri[] = siparis.satirlar.map((s) => ({
    orderItemId: s.id,
    urunAd: s.urunAd,
    beden: s.beden,
    renk: s.renk,
    adet: s.adet,
    kalanAdet: Math.max(0, s.adet - (harcanan.get(s.id) ?? 0)),
  }));

  const satirAdi = new Map(siparis.satirlar.map((s) => [s.id, s]));
  const talepler: Talep[] = siparis.talepler.map((t) => ({
    id: t.id,
    tur: t.tur,
    sebep: t.sebep,
    aciklama: t.aciklama,
    durum: t.durum,
    cevap: t.cevap,
    olusturuldu: t.olusturuldu,
    satirlar: t.satirlar.map((s) => {
      const k = satirAdi.get(s.orderItemId);
      return {
        urunAd: k?.urunAd ?? "Ürün",
        beden: k?.beden ?? "",
        renk: k?.renk ?? "",
        adet: s.adet,
      };
    }),
  }));

  const sonGun = siparis.teslimTarihi ? gunEkle(siparis.teslimTarihi, CAYMA_GUN) : undefined;

  const bos = (engel: string): TalepDurumBilgisi => ({ turler: [], engel, sonGun, talepler, satirlar });

  if (siparis.talepler.some((t) => ACIK_DURUMLAR.includes(t.durum))) {
    return bos("Bu sipariş için zaten açık bir talebin var; sonucunu aşağıda görebilirsin.");
  }
  if (siparis.durum === "iptal") {
    return bos("Bu sipariş iptal edilmiş.");
  }
  if (satirlar.every((s) => s.kalanAdet === 0)) {
    return bos("Siparişteki bütün ürünler için talep açılmış.");
  }

  if (siparis.durum === "bekliyor" || siparis.durum === "hazirlaniyor") {
    return { turler: ["iptal"], sonGun, talepler, satirlar };
  }

  if (siparis.durum === "kargoda") {
    // Kargoya verilmiş sipariş geri çağrılamıyor ama cayma hakkı işliyor.
    return { turler: ["iade"], sonGun, talepler, satirlar };
  }

  if (siparis.durum === "teslim") {
    if (sonGun && Date.now() > sonGun.getTime()) {
      return bos(
        `Cayma hakkı süresi (${CAYMA_GUN} gün) doldu. Üründe bir ayıp varsa bu süreden bağımsız olarak bize yazabilirsin.`,
      );
    }
    return { turler: ["iade", "degisim"], sonGun, talepler, satirlar };
  }

  return bos("Bu sipariş için şu an talep açılamıyor.");
}

export type TalepGirdisi = {
  numara: string;
  tur: string;
  sebep: string;
  aciklama: string;
  /** orderItemId → adet */
  satirlar: Record<string, number>;
};

export type TalepSonucu =
  | { tamam: true; id: string }
  | { tamam: false; hata: string };

/** Talebi açar. Kuralları yeniden denetliyor: ekran kandırılabilir, burası değil. */
export async function talepAc(girdi: TalepGirdisi): Promise<TalepSonucu> {
  if (!(TALEP_TURLERI as readonly string[]).includes(girdi.tur)) {
    return { tamam: false, hata: "Tanınmayan talep türü." };
  }

  const durum = await talepDurumu(girdi.numara);
  if (!durum) return { tamam: false, hata: "Sipariş bulunamadı." };
  if (!durum.turler.includes(girdi.tur as TalepTuru)) {
    return { tamam: false, hata: durum.engel ?? "Bu talep şu an açılamıyor." };
  }

  // İptal bütün siparişi kapsıyor: parça parça iptal diye bir şey yok.
  const secilen =
    girdi.tur === "iptal"
      ? durum.satirlar.filter((s) => s.kalanAdet > 0).map((s) => ({ id: s.orderItemId, adet: s.kalanAdet }))
      : durum.satirlar
          .map((s) => ({ id: s.orderItemId, adet: Math.min(girdi.satirlar[s.orderItemId] ?? 0, s.kalanAdet) }))
          .filter((s) => s.adet > 0);

  if (secilen.length === 0) {
    return { tamam: false, hata: "En az bir ürün seçilmeli." };
  }

  const siparis = await db.order.findUniqueOrThrow({
    where: { numara: girdi.numara.trim().toUpperCase() },
    select: { id: true },
  });

  const talep = await db.orderRequest.create({
    data: {
      orderId: siparis.id,
      tur: girdi.tur,
      sebep: girdi.sebep || "belirtmiyorum",
      aciklama: girdi.aciklama.slice(0, 1000),
      satirlar: { create: secilen.map((s) => ({ orderItemId: s.id, adet: s.adet })) },
    },
    select: { id: true },
  });

  return { tamam: true, id: talep.id };
}

/**
 * Talebi sonuçlandırır (panel).
 *
 * Üç türün üçü de farklı işliyor, çünkü üçünde de fiziksel dünyada olan şey
 * farklı (K-58):
 *
 * - **İptal onaylanınca** sipariş iptal ediliyor, stok geri veriliyor ve
 *   parası alınmışsa iade kaydı açılıyor. Ürün hiç çıkmadı.
 * - **İade tamamlanınca** — yani ürün fiilen elimize geçince — iade edilen
 *   adetler stoğa geri giriyor ve o satırların tutarı kadar iade kaydı
 *   açılıyor. "Onaylandı" tek başına bunu yapmıyor: onay, "gönderebilirsin"
 *   demek; ürün gelmeden ne stok ne para hareket etmeli.
 * - **Değişim tamamlanınca** eski ürün stoğa giriyor, yerine gönderilen
 *   varyantın stoğu düşüyor. Para hareketi yok. Yeni varyant verilmezse
 *   yalnızca geri gelen stoğa ekleniyor — mağaza sahibi elle düzeltebilsin
 *   diye engellenmiyor, ama panel bunu soruyor.
 *
 * Hepsi tek işlem içinde: yarıda kalan bir sonuçlandırma, stoğu artmış ama
 * parası kaydedilmemiş bir sipariş bırakırdı.
 */
export async function talebiSonuclandir(
  id: string,
  yeniDurum: "onaylandi" | "reddedildi" | "tamamlandi",
  cevap: string,
  /** Değişimde yerine gönderilen varyant. */
  yeniVaryantId?: string,
): Promise<{ numara: string; tur: string } | undefined> {
  const talep = await db.orderRequest.findUnique({
    where: { id },
    select: {
      id: true,
      tur: true,
      durum: true,
      order: { select: { id: true, numara: true } },
      satirlar: {
        select: {
          adet: true,
          orderItemId: true,
          orderItem: { select: { variantId: true, fiyatKurus: true } },
        },
      },
    },
  });
  if (!talep) return undefined;
  // Aynı sonucu iki kez uygulamak stoğu iki kez artırırdı.
  if (talep.durum === yeniDurum) {
    return { numara: talep.order.numara, tur: talep.tur };
  }

  await db.orderRequest.update({
    where: { id },
    data: { durum: yeniDurum, cevap: cevap.slice(0, 2000) },
  });

  if (talep.tur === "iptal" && yeniDurum === "onaylandi") {
    await siparisiIptalEtVeStoguIadeEt(talep.order.id);
    return { numara: talep.order.numara, tur: talep.tur };
  }

  if (yeniDurum === "tamamlandi" && (talep.tur === "iade" || talep.tur === "degisim")) {
    await urunGeriGeldi(talep.order.id, id, talep.tur, talep.satirlar, yeniVaryantId);
  }

  return { numara: talep.order.numara, tur: talep.tur };
}

/**
 * İade ya da değişimde ürün fiilen geri geldiğinde olanlar.
 *
 * Stoğu geri vermek ve iade kaydını açmak tek işlemde; ikisi ayrı olsaydı
 * arada düşen bir istek stoğu artırmış ama borcu kaydetmemiş olurdu.
 */
async function urunGeriGeldi(
  orderId: string,
  requestId: string,
  tur: string,
  satirlar: {
    adet: number;
    orderItemId: string;
    orderItem: { variantId: string | null; fiyatKurus: number };
  }[],
  yeniVaryantId?: string,
): Promise<void> {
  const geriGelen: string[] = [];

  await db.$transaction(async (islem) => {
    for (const s of satirlar) {
      if (!s.orderItem.variantId) continue; // Ürünü silinmiş satır
      await islem.productVariant.update({
        where: { id: s.orderItem.variantId },
        data: { stok: { increment: s.adet } },
      });
      geriGelen.push(s.orderItem.variantId);
    }

    if (tur === "degisim") {
      // Yerine gönderilen varyantın stoğu düşüyor; sıfırın altına inmiyor.
      if (yeniVaryantId) {
        const toplamAdet = satirlar.reduce((t, s) => t + s.adet, 0);
        await islem.productVariant.updateMany({
          where: { id: yeniVaryantId, stok: { gte: toplamAdet } },
          data: { stok: { decrement: toplamAdet } },
        });
      }
      return; // Değişimde para hareketi yok.
    }

    const tutar = await iadeTutari(
      orderId,
      satirlar.map((s) => ({ orderItemId: s.orderItemId, adet: s.adet })),
      islem,
    );
    if (tutar) {
      await iadeKaydiAc(
        orderId,
        tutar.toplamKurus,
        {
          requestId,
          aciklama: tutar.tamami
            ? "Siparişin tamamı iade edildi."
            : "Siparişin bir kısmı iade edildi.",
        },
        islem,
      );
    }
  });

  // Geri gelen stok son adetse "gelince haber ver" diyen bekliyordur.
  // İşlemin dışında: e-posta gönderimi veritabanı işlemini uzatmamalı.
  await stokBildirimleriniGonder(geriGelen);
}

/** Panelde bekleyen talep sayısı. */
export async function bekleyenTalepSayisi(): Promise<number> {
  return db.orderRequest.count({ where: { durum: "yeni" } });
}
