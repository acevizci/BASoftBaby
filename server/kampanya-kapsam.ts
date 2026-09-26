/**
 * Kampanya kapsamı (K-171). Saf modül: kâr uyarısı, fiyat denetimi, vitrin
 * ve indirim motoru aynı kuralı kullansın diye tek yerde.
 *
 * Kapsam "kategori"yse ürünün kategorisi listede, "urun"se ürünün kendisi
 * listede olmalı. Liste boşsa eski tekli alana bakılıyor (çoklu seçimden
 * önceki kayıtlar ve testler).
 */

export type Kapsam = {
  kapsam: string;
  categoryId?: string | null;
  productId?: string | null;
  kategoriIdleri?: readonly string[] | null;
  urunIdleri?: readonly string[] | null;
};

export function kapsamdaUrunMu(k: Kapsam, urun: { productId: string; categoryId: string }): boolean {
  if (k.kapsam === "urun") {
    return k.urunIdleri && k.urunIdleri.length > 0
      ? k.urunIdleri.includes(urun.productId)
      : k.productId === urun.productId;
  }
  if (k.kapsam === "kategori") {
    return k.kategoriIdleri && k.kategoriIdleri.length > 0
      ? k.kategoriIdleri.includes(urun.categoryId)
      : k.categoryId === urun.categoryId;
  }
  return true;
}
