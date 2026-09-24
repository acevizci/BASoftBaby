import "server-only";

/**
 * Değerlendirme fotoğrafları (K-134).
 *
 * - En çok 3 fotoğraf, her biri görsel deposunun sınırları içinde (K-12):
 *   biçim denetimi, küçültme, webp.
 * - Yeniden kodlanırken **EXIF siliniyor** (telefon fotoğrafında konum
 *   olabiliyor); sharp üst veriyi yalnızca istenirse taşıyor.
 * - Panelde onaylanana kadar görünmüyor.
 * - Biri bozuksa ötekiler yine kaydediliyor; yorumun kendisi hiç düşmüyor.
 */

import { db } from "@/server/veritabani";
import { gorselYukle } from "@/server/gorsel-depo";

export const EN_COK_FOTOGRAF = 3;

export async function yorumFotograflariniKaydet(
  reviewId: string,
  dosyalar: File[],
): Promise<{ eklenen: number; hatali: number }> {
  const gecerli = dosyalar.filter((d) => d.size > 0).slice(0, EN_COK_FOTOGRAF);
  let eklenen = 0;
  let hatali = 0;
  for (const [sira, dosya] of gecerli.entries()) {
    try {
      const g = await gorselYukle(dosya, { buyuk: 1200, kucuk: 360 });
      await db.reviewPhoto.create({
        data: { reviewId, yol: g.yol, kucukYol: g.kucukYol, genislik: g.genislik, yukseklik: g.yukseklik, sira },
      });
      eklenen++;
    } catch (e) {
      console.error("[yorum-fotograf] kaydedilemedi", e);
      hatali++;
    }
  }
  return { eklenen, hatali };
}
