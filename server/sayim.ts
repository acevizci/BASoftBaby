import "server-only";

/**
 * Stok sayımı (K-107).
 *
 * Ayda bir raftaki gerçek adet girilir, sistemle farklar görülür, onaylanınca
 * düzeltilir. Farklar "sayım farkı" hareketi olarak kalıyor (K-103); geçmiş
 * sayımların toplam farkı kayıp ve fire takibi için.
 *
 * **Rafta olması gereken = stok + kargolanmamış siparişte ayrılan.** Sipariş
 * stoğu sipariş anında düşürüyor ama ürün raftan paketlenince çıkıyor.
 * Hazırlanmayı bekleyen 2 sipariş varsa rafta stoktan 2 fazla ürün durur;
 * bunu hesaba katmayan sayım her seferinde "2 fazla" der ve stoğu yanlış
 * yükseltirdi.
 *
 * **Fark satır sayıldığı ana göre.** Sayım saatler sürebilir; her satırın
 * beklenen değeri o satır girildiği an yazılıyor. Bitirirken fark şimdiki
 * stoğa **eklenerek** uygulanıyor: sayımdan sonra gelen satışlar korunuyor.
 */

import type { Prisma } from "@/db/uretilen/client";
import { db } from "@/server/veritabani";
import { aramaMetniYap, kelimeler } from "@/server/arama-metin";
import { hareketYaz, type Yapan } from "@/server/stok-hareket";
import { barkodNoCoz } from "@/server/barkod";

type Islem = Prisma.TransactionClient | typeof db;

/** Kargoya verilmemiş (bekliyor · hazırlanıyor) siparişlerde ayrılan adet. */
export async function ayrilanAdetler(
  variantIdler: string[],
  islem: Islem = db,
): Promise<Map<string, number>> {
  if (variantIdler.length === 0) return new Map();
  const gruplar = await islem.orderItem.groupBy({
    by: ["variantId"],
    where: {
      variantId: { in: variantIdler },
      order: { durum: { in: ["bekliyor", "hazirlaniyor"] } },
    },
    _sum: { adet: true },
  });
  return new Map(gruplar.flatMap((g) => (g.variantId ? [[g.variantId, g._sum.adet ?? 0]] : [])));
}

/** Satırın farkı: sayılan − (sistem + ayrılan). Sayılmamışsa `null`. */
export function satirFarki(s: { sayilan: number | null; sistem: number | null; ayrilan: number | null }): number | null {
  if (s.sayilan === null || s.sistem === null) return null;
  return s.sayilan - s.sistem - (s.ayrilan ?? 0);
}

// ── Açma ──────────────────────────────────────────────────────────────────

export async function sayimAc(bilgi: { ad: string; kapsam: string; yapan?: Yapan }): Promise<string> {
  const kategori = bilgi.kapsam
    ? await db.category.findUnique({ where: { slug: bilgi.kapsam }, select: { id: true } })
    : null;
  const varyantlar = await db.productVariant.findMany({
    where: kategori ? { product: { categoryId: kategori.id } } : {},
    select: {
      id: true,
      beden: true,
      renk: true,
      sku: true,
      fiyatKurus: true,
      productId: true,
      product: { select: { ad: true, fiyatKurus: true, alisFiyatKurus: true } },
    },
  });
  const sayim = await db.stockCount.create({
    data: {
      ad: bilgi.ad.slice(0, 80) || "Sayım",
      kapsam: kategori ? bilgi.kapsam : "",
      adminId: bilgi.yapan?.id ?? null,
      yapan: bilgi.yapan?.adSoyad ?? "",
      satirlar: {
        create: varyantlar.map((v) => ({
          variantId: v.id,
          productId: v.productId,
          urunAd: v.product.ad,
          beden: v.beden,
          renk: v.renk,
          sku: v.sku,
          fiyatKurus: v.fiyatKurus ?? v.product.fiyatKurus,
          alisFiyatKurus: v.product.alisFiyatKurus,
        })),
      },
    },
    select: { id: true },
  });
  return sayim.id;
}

// ── Sayılanı yazma ────────────────────────────────────────────────────────

/** Formdaki `say-<satırId>` alanları; boş alan "henüz sayılmadı" demek. */
export function sayilanlar(girdiler: Iterable<[string, unknown]>): { id: string; adet: number }[] {
  const sonuc: { id: string; adet: number }[] = [];
  for (const [ad, ham] of girdiler) {
    if (!ad.startsWith("say-")) continue;
    const metin = String(ham).trim();
    if (metin === "") continue;
    const adet = Number(metin);
    if (!Number.isInteger(adet) || adet < 0 || adet > 100_000) continue;
    sonuc.push({ id: ad.slice(4), adet });
  }
  return sonuc;
}

/**
 * Sayılanları yazar; her satıra o anki stok ve ayrılan adet de yazılıyor.
 * Aynı satır yeniden sayılırsa hepsi yenileniyor. Açık olmayan sayıma
 * yazılmıyor.
 */
export async function sayilanlariYaz(countId: string, kalemler: { id: string; adet: number }[]): Promise<number> {
  if (kalemler.length === 0) return 0;
  const sayim = await db.stockCount.findUnique({ where: { id: countId }, select: { durum: true } });
  if (sayim?.durum !== "acik") return 0;

  const satirlar = await db.stockCountLine.findMany({
    where: { countId, id: { in: kalemler.map((k) => k.id) } },
    select: { id: true, variantId: true, variant: { select: { stok: true } } },
  });
  const ayrilan = await ayrilanAdetler(satirlar.flatMap((s) => (s.variantId ? [s.variantId] : [])));
  const simdi = new Date();

  await db.$transaction(
    satirlar.map((s) =>
      db.stockCountLine.update({
        where: { id: s.id },
        data: {
          sayilan: kalemler.find((k) => k.id === s.id)!.adet,
          sistem: s.variant?.stok ?? 0,
          ayrilan: s.variantId ? (ayrilan.get(s.variantId) ?? 0) : 0,
          sayildi: simdi,
        },
      }),
    ),
  );
  return satirlar.length;
}

// ── Okuma ─────────────────────────────────────────────────────────────────

export const SAYIM_SUZGECLERI = ["hepsi", "sayilmayan", "farkli"] as const;
export type SayimSuzgeci = (typeof SAYIM_SUZGECLERI)[number];
export const SAYIM_SAYFA_BOYU = 25;

export type SayimOzeti = {
  toplam: number;
  sayilan: number;
  farkli: number;
  eksikAdet: number;
  fazlaAdet: number;
  /** Farkların satış fiyatıyla tutarı; eksi kayıp. */
  farkKurus: number;
  /** Farkların alış fiyatıyla tutarı (K-114): gerçek kayıp. Alış fiyatı olan satırlar. */
  farkMaliyetKurus: number;
  /** Farklı olup alış fiyatı olmayan satır sayısı. */
  maliyetsizFark: number;
};

export function ozetCikar(
  satirlar: {
    sayilan: number | null;
    sistem: number | null;
    ayrilan: number | null;
    fiyatKurus: number;
    alisFiyatKurus?: number | null;
  }[],
): SayimOzeti {
  const o: SayimOzeti = {
    toplam: satirlar.length,
    sayilan: 0,
    farkli: 0,
    eksikAdet: 0,
    fazlaAdet: 0,
    farkKurus: 0,
    farkMaliyetKurus: 0,
    maliyetsizFark: 0,
  };
  for (const s of satirlar) {
    const f = satirFarki(s);
    if (f === null) continue;
    o.sayilan += 1;
    if (f === 0) continue;
    o.farkli += 1;
    if (f < 0) o.eksikAdet += -f;
    else o.fazlaAdet += f;
    o.farkKurus += f * s.fiyatKurus;
    if (s.alisFiyatKurus === null || s.alisFiyatKurus === undefined) o.maliyetsizFark += 1;
    else o.farkMaliyetKurus += f * s.alisFiyatKurus;
  }
  return o;
}

export async function sayimGetir(
  id: string,
  secim: { ara: string; suzgec: SayimSuzgeci; sayfa: number },
) {
  const sayim = await db.stockCount.findUnique({ where: { id } });
  if (!sayim) return undefined;

  const hepsi = await db.stockCountLine.findMany({
    where: { countId: id },
    orderBy: [{ urunAd: "asc" }, { beden: "asc" }, { renk: "asc" }],
  });
  const ozet = ozetCikar(hepsi);

  // Barkod: barkod numarası, SKU ya da beden kimliği tam eşleşirse yalnızca
  // o satır.
  const ara = secim.ara.trim();
  const no = barkodNoCoz(ara);
  const barkodlu = no !== undefined
    ? await db.productVariant.findUnique({ where: { barkodNo: no }, select: { id: true } })
    : null;
  const tam = ara
    ? hepsi.filter(
        (s) =>
          s.sku.toLowerCase() === ara.toLowerCase() ||
          s.variantId === ara ||
          (barkodlu !== null && s.variantId === barkodlu.id),
      )
    : [];
  const aranan = kelimeler(ara);
  let satirlar =
    tam.length > 0
      ? tam
      : aranan.length > 0
        ? hepsi.filter((s) => {
            const metin = aramaMetniYap([s.urunAd, s.beden, s.sku]);
            return aranan.every((k) => metin.includes(k));
          })
        : hepsi;
  if (secim.suzgec === "sayilmayan") satirlar = satirlar.filter((s) => s.sayilan === null);
  if (secim.suzgec === "farkli") satirlar = satirlar.filter((s) => (satirFarki(s) ?? 0) !== 0);

  // Sayfalama ürün değil satır üzerinden; bir ürünün bedenleri iki sayfaya
  // bölünebilir ama liste kısa kalır.
  const sonSayfa = Math.max(1, Math.ceil(satirlar.length / SAYIM_SAYFA_BOYU));
  const sayfa = Math.min(Math.max(1, secim.sayfa), sonSayfa);
  return {
    sayim,
    ozet,
    tamEslesme: tam.length > 0,
    toplamSatir: satirlar.length,
    satirlar: satirlar.slice((sayfa - 1) * SAYIM_SAYFA_BOYU, sayfa * SAYIM_SAYFA_BOYU),
    sayfa,
    sonSayfa,
  };
}

export async function sayimlar() {
  const liste = await db.stockCount.findMany({
    orderBy: { olusturuldu: "desc" },
    take: 30,
    include: {
      satirlar: { select: { sayilan: true, sistem: true, ayrilan: true, fiyatKurus: true, alisFiyatKurus: true } },
    },
  });
  return liste.map(({ satirlar, ...s }) => ({ ...s, ozet: ozetCikar(satirlar) }));
}

/** Bitirme onayında gösterilen farklı satırlar. */
export async function farkliSatirlar(id: string) {
  const satirlar = await db.stockCountLine.findMany({
    where: { countId: id, sayilan: { not: null } },
    orderBy: [{ urunAd: "asc" }, { beden: "asc" }],
  });
  return satirlar.filter((s) => (satirFarki(s) ?? 0) !== 0);
}

// ── Bitirme ───────────────────────────────────────────────────────────────

/**
 * Farkları stoğa uygular. Stok eksiye düşmüyor; uygulanan fark satıra
 * yazılıyor. Sayılmayan satırlara dokunulmuyor. Tek işlem; durum koşullu
 * değiştiği için iki kez bitirilemiyor.
 */
export async function sayimBitir(id: string, yapan?: Yapan): Promise<{ duzeltilen: number } | undefined> {
  return db.$transaction(async (islem) => {
    const { count } = await islem.stockCount.updateMany({
      where: { id, durum: "acik" },
      data: { durum: "tamam", bitti: new Date() },
    });
    if (count === 0) return undefined;
    const sayim = await islem.stockCount.findUniqueOrThrow({ where: { id }, select: { ad: true } });

    const satirlar = await islem.stockCountLine.findMany({
      where: { countId: id, sayilan: { not: null }, variantId: { not: null } },
    });
    let duzeltilen = 0;
    for (const s of satirlar) {
      const fark = satirFarki(s) ?? 0;
      if (fark === 0) {
        await islem.stockCountLine.update({ where: { id: s.id }, data: { uygulanan: 0 } });
        continue;
      }
      // Satır kilitleniyor: okuma ile yazma arasında gelen sipariş stoğu
      // düşürürse o düşüş ezilmesin (K-165). Sipariş kilit kalkınca yazıyor.
      const [v] = await islem.$queryRaw<{ stok: number }[]>`
        select stok from "ProductVariant" where id = ${s.variantId!} for update`;
      if (!v) continue;
      const yeni = Math.max(0, v.stok + fark);
      const uygulanan = yeni - v.stok;
      await islem.productVariant.update({ where: { id: s.variantId! }, data: { stok: yeni } });
      await islem.stockCountLine.update({ where: { id: s.id }, data: { uygulanan } });
      await hareketYaz(islem, [
        { variantId: s.variantId!, degisim: uygulanan, sebep: "sayim", yapan, not: `Sayım: ${sayim.ad}` },
      ]);
      if (uygulanan !== 0) duzeltilen += 1;
    }
    return { duzeltilen };
  });
}

export async function sayimIptal(id: string): Promise<void> {
  await db.stockCount.updateMany({ where: { id, durum: "acik" }, data: { durum: "iptal", bitti: new Date() } });
}
