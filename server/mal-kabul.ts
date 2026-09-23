import "server-only";

/**
 * Mal kabulü (K-104): gelen malı stoğa **ekleme**.
 *
 * Stok ekranı mutlak sayı istiyor: 5 varken 12 gelirse kafadan toplayıp
 * 17 yazmak gerekiyordu. Hem hata kaynağı hem de ekran açıkken gelen
 * siparişi ezmeye açıktı (K-102). Burada yalnızca **gelen adet** giriliyor ve
 * stok artırılarak yazılıyor: arada satış olsa da ikisi de doğru kalıyor.
 *
 * Tedarikçi, irsaliye numarası ve not hareket satırının notuna yazılıyor;
 * geçmişte "bu mal hangi irsaliyeyle geldi" sorusunun cevabı orada.
 */

import { db } from "@/server/veritabani";
import { kelimeler } from "@/server/arama-metin";
import { renkAdlari } from "@/server/renkler";
import { bedenSirasi, sonSira } from "@/server/bedenler";
import { hareketYaz, type Yapan } from "@/server/stok-hareket";
import { barkodNoCoz } from "@/server/barkod";

export type KabulBedeni = { id: string; beden: string; renk: string; renkAdi: string; stok: number; sku: string };
export type KabulUrunu = { id: string; slug: string; ad: string; aktif: boolean; bedenler: KabulBedeni[] };

/** Aramada en çok bu kadar ürün; kabul sırasında aranan zaten belli bir ürün. */
const EN_COK = 12;

/**
 * Ada göre ya da **tam SKU** ile arama. SKU eşleşirse yalnızca o ürün
 * geliyor ve o beden işaretleniyor — barkod okutunca doğrudan o satır.
 */
export async function kabulIcinAra(
  ara: string,
): Promise<{ urunler: KabulUrunu[]; skuVaryant?: string }> {
  const metin = ara.trim();
  if (!metin) return { urunler: [] };

  // Etiketteki barkod bedenin kısa numarasını taşıyor (K-107); SKU ve
  // beden kimliği de tanınıyor.
  const skuile = await db.productVariant.findFirst({
    where: {
      OR: [
        { sku: { equals: metin, mode: "insensitive" } },
        { id: metin },
        ...(barkodNoCoz(metin) !== undefined ? [{ barkodNo: barkodNoCoz(metin) }] : []),
      ],
    },
    select: { id: true, productId: true },
  });

  const aranan = kelimeler(metin);
  const urunler = await db.product.findMany({
    where: skuile
      ? { id: skuile.productId }
      : aranan.length > 0
        ? { AND: aranan.map((k) => ({ aramaMetni: { contains: k } })) }
        : { id: "__yok__" },
    orderBy: [{ aktif: "desc" }, { ad: "asc" }],
    take: EN_COK,
    select: {
      id: true,
      slug: true,
      ad: true,
      aktif: true,
      variants: { select: { id: true, beden: true, renk: true, stok: true, sku: true } },
    },
  });

  const [adlar, sira] = await Promise.all([renkAdlari(), bedenSirasi()]);
  return {
    skuVaryant: skuile?.id,
    urunler: urunler.map((u) => ({
      id: u.id,
      slug: u.slug,
      ad: u.ad,
      aktif: u.aktif,
      bedenler: u.variants
        .map((v) => ({ ...v, renkAdi: adlar[v.renk] ?? v.renk }))
        .sort(
          (a, b) =>
            sonSira(sira, a.beden) - sonSira(sira, b.beden) || a.renkAdi.localeCompare(b.renkAdi, "tr"),
        ),
    })),
  };
}

/** Formdan gelen adetler: `gelen-<id>` alanlarından pozitif tam sayılar. */
export function gelenAdetler(girdiler: Iterable<[string, unknown]>): { id: string; adet: number }[] {
  const sonuc: { id: string; adet: number }[] = [];
  for (const [ad, ham] of girdiler) {
    if (!ad.startsWith("gelen-")) continue;
    const metin = String(ham).trim();
    if (metin === "") continue;
    const adet = Number(metin);
    // Üst sınır yazım hatasına karşı: "120" yerine "1200000".
    if (!Number.isInteger(adet) || adet <= 0 || adet > 100_000) continue;
    sonuc.push({ id: ad.slice(6), adet });
  }
  return sonuc;
}

/** Hareket notu: "Tedarikçi · İrsaliye 123 · not". */
export function kabulNotu(b: { tedarikci: string; irsaliye: string; not: string }): string {
  return [b.tedarikci, b.irsaliye && `İrsaliye ${b.irsaliye}`, b.not].filter(Boolean).join(" · ");
}

/** Stoğu artırır ve hareketleri yazar; tek işlem. */
export async function malKabulYaz(
  kalemler: { id: string; adet: number }[],
  not: string,
  yapan?: Yapan,
): Promise<{ adet: number; beden: number; idler: string[] }> {
  const idler: string[] = [];
  let adet = 0;
  await db.$transaction(async (islem) => {
    for (const k of kalemler) {
      const { count } = await islem.productVariant.updateMany({
        where: { id: k.id },
        data: { stok: { increment: k.adet } },
      });
      if (count === 0) continue; // Arada silinmiş beden
      idler.push(k.id);
      adet += k.adet;
    }
    await hareketYaz(
      islem,
      kalemler
        .filter((k) => idler.includes(k.id))
        .map((k) => ({ variantId: k.id, degisim: k.adet, sebep: "mal-kabul" as const, yapan, not })),
    );
  });
  return { adet, beden: idler.length, idler };
}
