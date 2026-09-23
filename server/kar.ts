/**
 * Kâr hesabının saf parçaları (K-111, K-112).
 *
 * Satış fiyatları KDV **dahil** giriliyor (fatura da böyle ayrıştırıyor,
 * K-20). Alış fiyatları KDV **hariç**. Karşılaştırmadan önce satış
 * KDV'den arındırılıyor; yoksa marj olduğundan büyük görünürdü.
 */

/** KDV dahil tutardan KDV hariç tutar; faturadaki ayrıştırmayla aynı yuvarlama. */
export function kdvHaric(kurus: number, kdvOrani: number): number {
  return Math.round(kurus / (1 + kdvOrani / 100));
}

export type BirimMarj = {
  /** KDV hariç satış. */
  netSatisKurus: number;
  karKurus: number;
  /** Net satışa göre yüzde; net satış sıfırsa `null`. */
  marjYuzde: number | null;
};

/** Bir ürünün birim brüt kârı: KDV hariç satış − alış. */
export function birimMarj(satisKurus: number, alisKurus: number, kdvOrani: number): BirimMarj {
  const netSatisKurus = kdvHaric(satisKurus, kdvOrani);
  const karKurus = netSatisKurus - alisKurus;
  return {
    netSatisKurus,
    karKurus,
    marjYuzde: netSatisKurus > 0 ? (karKurus / netSatisKurus) * 100 : null,
  };
}

export function yuzdeYaz(y: number | null): string {
  if (y === null) return "—";
  return `%${y.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}
