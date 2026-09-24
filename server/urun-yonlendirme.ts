import "server-only";

/**
 * Yayında olmayan ürünün adresi (K-128).
 *
 * Eskiden yayından kalkan ya da silinen ürünün adresi 404 veriyordu: Google'daki
 * sırası, paylaşılmış bağlantılar ve dışarıdan gelen bağlantıların değeri boşa
 * gidiyordu. Artık:
 * - **Pasif ürün** kategorisine **geçici** yönlendiriliyor: ürün geri gelince
 *   adres yine çalışıyor, Google eski adresi unutmuyor.
 * - **Silinen ürün** kategorisine **kalıcı** (301) yönlendiriliyor; silinirken
 *   nereye gideceği kaydediliyor.
 * - Kategori de kapalıysa "Tüm ürünler"e.
 */

import { db } from "@/server/veritabani";

const TUMU = "/urunler";

async function kategoriAdresi(categoryId: string | undefined): Promise<string> {
  if (!categoryId) return TUMU;
  const k = await db.category.findUnique({ where: { id: categoryId }, select: { slug: true, aktif: true } });
  return k?.aktif ? `/${k.slug}` : TUMU;
}

/** Silinecek ürünlerin adreslerini kategorilerine bağlar; silmeden önce çağrılıyor. */
export async function silinenleriYonlendir(urunler: { slug: string; categoryId: string }[]): Promise<void> {
  for (const u of urunler) {
    const kategori = await db.category.findUnique({ where: { id: u.categoryId }, select: { slug: true } });
    const hedef = kategori ? `/${kategori.slug}` : TUMU;
    await db.productRedirect.upsert({ where: { slug: u.slug }, update: { hedef }, create: { slug: u.slug, hedef } });
  }
}

export type Yonlendirme = { hedef: string; kalici: boolean };

/** Yayında olmayan bir ürün adresi nereye gitmeli; hiç bilinmiyorsa `undefined` (404). */
export async function kaldirilanUrun(slug: string): Promise<Yonlendirme | undefined> {
  const pasif = await db.product.findUnique({ where: { slug }, select: { aktif: true, categoryId: true } });
  if (pasif) return { hedef: await kategoriAdresi(pasif.categoryId), kalici: false };

  const kayit = await db.productRedirect.findUnique({ where: { slug } });
  if (!kayit) return undefined;
  // Kaydedilen kategori sonradan kapanmış olabilir.
  const kategori = await db.category.findUnique({
    where: { slug: kayit.hedef.slice(1) },
    select: { aktif: true },
  });
  return { hedef: kategori?.aktif ? kayit.hedef : TUMU, kalici: true };
}
