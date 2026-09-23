import "server-only";

/**
 * Satış hızı ve "kaç gün yeter" tahmini (K-106).
 *
 * Sabit "3 ve altı azalıyor" eşiği (`AZALAN_ESIK`) her ürüne aynı
 * davranıyor: günde 2 satan zıbın için 3 adet yarın biter, ayda 1 satan
 * şapka için 3 adet üç ay yeter. Tahmin son 30 günün satışından.
 *
 * - **Stoksuz günler sayılmıyor.** Tükenmiş ürün o günlerde satamadığı için
 *   "az satıyor" görünmesin. Stoksuz süre stok hareketlerinden (K-103) geriye
 *   doğru yürünerek bulunuyor. Hareket kaydı başlamadan önceki günler için
 *   bilgi yok; o günler stoklu sayılıyor. İlk 30 gün tahmin biraz temkinli
 *   (düşük) kalıyor.
 * - **Az veride sahte kesinlik yok.** 30 günde 3'ten az satan beden için "gün"
 *   yazılmıyor, "az veri" deniyor.
 * - İptal edilen siparişler satış sayılmıyor.
 */

import { db } from "@/server/veritabani";

export const PENCERE_GUN = 30;
/** Bu kadar satıştan azsa tahmin gösterilmiyor. */
export const EN_AZ_SATIS = 3;
const GUN = 24 * 60 * 60 * 1000;

/**
 * Pencere içinde stoğun sıfır olduğu süre (gün, kesirli).
 *
 * Şimdiki stoktan geriye yürünüyor: her hareketten önceki stok
 * `sonraki − değişim`. Sıfır ve altı stoksuz sayılıyor.
 */
export function stoksuzGun(
  simdikiStok: number,
  hareketler: { zaman: Date; degisim: number }[],
  bas: Date,
  son: Date,
): number {
  const sirali = hareketler
    .filter((h) => h.zaman >= bas && h.zaman <= son)
    .sort((a, b) => b.zaman.getTime() - a.zaman.getTime());
  let stok = simdikiStok;
  let sinir = son.getTime();
  let stoksuz = 0;
  for (const h of sirali) {
    if (stok <= 0) stoksuz += sinir - h.zaman.getTime();
    stok -= h.degisim;
    sinir = h.zaman.getTime();
  }
  if (stok <= 0) stoksuz += sinir - bas.getTime();
  return stoksuz / GUN;
}

export type Hiz = {
  /** Penceredeki satış adedi (iptaller hariç). */
  satilan: number;
  /** Stoklu geçen gün sayısı; hız buna bölünüyor. */
  etkinGun: number;
  /** Günde ortalama satış. */
  gunluk: number;
  /** Stok kaç gün yeter; az veride ya da hiç satış yoksa `null`. */
  kacGun: number | null;
  azVeri: boolean;
};

export function hizHesapla(satilan: number, stok: number, stoksuz: number): Hiz {
  // En az bir gün: pencerenin tamamı stoksuzsa sıfıra bölünmesin.
  const etkinGun = Math.max(1, PENCERE_GUN - stoksuz);
  const gunluk = satilan / etkinGun;
  const azVeri = satilan < EN_AZ_SATIS;
  return {
    satilan,
    etkinGun,
    gunluk,
    kacGun: azVeri || gunluk === 0 ? null : stok / gunluk,
    azVeri,
  };
}

/**
 * Önerilen sipariş adedi: hedef gün kadar yetecek stok, üstüne "gelince
 * haber ver" diyenler. Az veride de hesaplanıyor: satmış ama tükenmiş
 * bedeni listeden düşürmek, en çok gerekeni atlamak olurdu.
 */
export function siparisOnerisi(h: Hiz, stok: number, bekleyen: number, hedefGun: number): number {
  // Önce yüzde bire yuvarlanıyor: birkaç saniyelik stoksuz süre 9,00003'ü
  // 10'a çıkarmasın.
  const ihtiyac = Math.ceil(Math.round(h.gunluk * hedefGun * 100) / 100) + bekleyen;
  return Math.max(0, ihtiyac - Math.max(0, stok));
}

/** Verilen bedenlerin (yoksa son 30 günde satan hepsinin) hızı. */
export async function satisHizlari(
  variantIdler?: string[],
  simdi: Date = new Date(),
): Promise<Map<string, Hiz & { stok: number }>> {
  const bas = new Date(simdi.getTime() - PENCERE_GUN * GUN);

  const satislar = await db.orderItem.groupBy({
    by: ["variantId"],
    where: {
      variantId: variantIdler ? { in: variantIdler } : { not: null },
      order: { durum: { not: "iptal" }, olusturuldu: { gte: bas, lte: simdi } },
    },
    _sum: { adet: true },
  });
  const idler = variantIdler ?? satislar.flatMap((s) => (s.variantId ? [s.variantId] : []));
  if (idler.length === 0) return new Map();

  const [varyantlar, hareketler] = await Promise.all([
    db.productVariant.findMany({ where: { id: { in: idler } }, select: { id: true, stok: true } }),
    db.stockMovement.findMany({
      where: { variantId: { in: idler }, olusturuldu: { gte: bas, lte: simdi } },
      select: { variantId: true, degisim: true, olusturuldu: true },
    }),
  ]);

  const satilan = new Map(satislar.map((s) => [s.variantId, s._sum.adet ?? 0]));
  const sonuc = new Map<string, Hiz & { stok: number }>();
  for (const v of varyantlar) {
    const kendi = hareketler
      .filter((h) => h.variantId === v.id)
      .map((h) => ({ zaman: h.olusturuldu, degisim: h.degisim }));
    const hiz = hizHesapla(satilan.get(v.id) ?? 0, v.stok, stoksuzGun(v.stok, kendi, bas, simdi));
    sonuc.set(v.id, { ...hiz, stok: v.stok });
  }
  return sonuc;
}

/** "~4 gün" gibi kısa yazım; stok ekranında ve sabah özetinde. */
export function gunYaz(h: Pick<Hiz, "kacGun" | "azVeri" | "satilan">): string {
  if (h.satilan === 0) return "30 günde satış yok";
  if (h.kacGun === null) return "az veri";
  if (h.kacGun < 1) return "bugün biter";
  if (h.kacGun > 365) return "1 yıldan fazla";
  return `~${Math.round(h.kacGun)} gün`;
}

// ── Sipariş listesi (C4) ───────────────────────────────────────────────────

export type ListeSatiri = {
  variantId: string;
  urunAd: string;
  slug: string;
  beden: string;
  renk: string;
  sku: string;
  stok: number;
  hiz: Hiz;
  bekleyen: number;
  oneri: number;
};

/**
 * Ne sipariş vermeli (K-106): son 30 günde satan ya da "gelince haber ver"
 * bekleyen, satıştaki bedenler. Önerisi sıfır olan listeye girmiyor.
 * En önce bitecek olan üstte; az veri olanlar tahminlilerden sonra.
 */
export async function siparisListesi(hedefGun: number, simdi: Date = new Date()): Promise<ListeSatiri[]> {
  const bekleyenGrup = await db.stockAlert.groupBy({ by: ["variantId"], _count: { _all: true } });
  const bekleyen = new Map(bekleyenGrup.map((b) => [b.variantId, b._count._all]));

  const satanlar = await satisHizlari(undefined, simdi);
  const idler = [...new Set([...satanlar.keys(), ...bekleyen.keys()])];
  const bekleyenHiz = await satisHizlari(
    idler.filter((id) => !satanlar.has(id)),
    simdi,
  );

  const varyantlar = await db.productVariant.findMany({
    where: { id: { in: idler }, product: { aktif: true } },
    select: {
      id: true,
      beden: true,
      renk: true,
      sku: true,
      stok: true,
      product: { select: { ad: true, slug: true } },
    },
  });

  const satirlar: ListeSatiri[] = varyantlar.flatMap((v) => {
    const hiz = satanlar.get(v.id) ?? bekleyenHiz.get(v.id) ?? hizHesapla(0, v.stok, 0);
    const b = bekleyen.get(v.id) ?? 0;
    const oneri = siparisOnerisi(hiz, v.stok, b, hedefGun);
    if (oneri === 0) return [];
    return [
      {
        variantId: v.id,
        urunAd: v.product.ad,
        slug: v.product.slug,
        beden: v.beden,
        renk: v.renk,
        sku: v.sku,
        stok: v.stok,
        hiz,
        bekleyen: b,
        oneri,
      },
    ];
  });

  // Tükenenler en üstte (kendi aralarında önerisi büyük olan önce), sonra en
  // önce bitecek olan, tahmini olmayanlar en altta.
  const anahtar = (s: ListeSatiri) => (s.stok === 0 ? -1 : s.hiz.kacGun ?? 1e9);
  return satirlar.sort(
    (a, b) => anahtar(a) - anahtar(b) || b.oneri - a.oneri || a.urunAd.localeCompare(b.urunAd, "tr"),
  );
}

export function listeCsv(satirlar: ListeSatiri[], renkAdlari: Record<string, string>, hedefGun: number): string {
  const kacir = (d: string) => `"${d.replace(/"/g, '""')}"`;
  const basliklar = [
    "Ürün", "Beden", "Renk", "SKU", "Stok", `Son ${PENCERE_GUN} gün satış`, "Kaç gün yeter",
    "Haber bekleyen", `Önerilen adet (${hedefGun} gün)`,
  ];
  const govde = satirlar.map((s) =>
    [
      s.urunAd, s.beden, renkAdlari[s.renk] ?? s.renk, s.sku, String(s.stok), String(s.hiz.satilan),
      gunYaz(s.hiz), String(s.bekleyen), String(s.oneri),
    ]
      .map(kacir)
      .join(";"),
  );
  return `﻿${[basliklar.map(kacir).join(";"), ...govde].join("\r\n")}\r\n`;
}
