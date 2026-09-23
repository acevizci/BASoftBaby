import "server-only";

/**
 * Raftaki malın maliyetle değeri (K-114).
 *
 * Alış fiyatı girilmiş ürünlerin stoğu × alış fiyatı. Ay başındaki değer
 * stok hareketlerinden (K-103) geriye yürünerek bulunuyor: bugünkü stoktan
 * ay başından beri olan hareketler çıkarılıyor. Bugünkü alış fiyatıyla
 * değerleniyor; ay içinde alış fiyatı değiştiyse fark da buna giriyor.
 */

import { db } from "@/server/veritabani";

export type StokDegeri = {
  degerKurus: number;
  ayBasiKurus: number;
  adet: number;
  /** Alış fiyatı olmadığı için değere girmeyen adet. */
  alissizAdet: number;
};

export async function stokDegeri(simdi: Date = new Date()): Promise<StokDegeri> {
  // Türkiye saatiyle ayın ilk günü (sabit UTC+3, K-101 ile aynı).
  const tr = new Date(simdi.getTime() + 3 * 60 * 60 * 1000);
  const ayBasi = new Date(Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), 1) - 3 * 60 * 60 * 1000);

  const [varyantlar, hareketler] = await Promise.all([
    db.productVariant.findMany({
      select: { id: true, stok: true, product: { select: { alisFiyatKurus: true } } },
    }),
    db.stockMovement.groupBy({
      by: ["variantId"],
      where: { olusturuldu: { gte: ayBasi }, variantId: { not: null } },
      _sum: { degisim: true },
    }),
  ]);
  const ayIci = new Map(hareketler.map((h) => [h.variantId, h._sum.degisim ?? 0]));

  const d: StokDegeri = { degerKurus: 0, ayBasiKurus: 0, adet: 0, alissizAdet: 0 };
  for (const v of varyantlar) {
    const alis = v.product.alisFiyatKurus;
    if (alis === null) {
      d.alissizAdet += Math.max(0, v.stok);
      continue;
    }
    d.adet += Math.max(0, v.stok);
    d.degerKurus += Math.max(0, v.stok) * alis;
    d.ayBasiKurus += Math.max(0, v.stok - (ayIci.get(v.id) ?? 0)) * alis;
  }
  return d;
}
