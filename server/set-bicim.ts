/**
 * Set hesapları (K-133). Saf modül.
 */

export type SetParcasi = { variantId: string; adet: number; stok: number };

/** Parçaların stoğuyla en çok kaç set hazırlanabilir. */
export function hazirlanabilir(parcalar: SetParcasi[]): number {
  if (parcalar.length === 0) return 0;
  return Math.min(...parcalar.map((p) => Math.floor(p.stok / Math.max(1, p.adet))));
}

/** Parçalar ayrı ayrı alınsa tutar; setin fiyatıyla karşılaştırmak için. */
export function ayriAyriKurus(parcalar: { adet: number; fiyatKurus: number }[]): number {
  return parcalar.reduce((t, p) => t + p.adet * p.fiyatKurus, 0);
}
