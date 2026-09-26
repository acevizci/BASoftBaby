/** Sipariş listesinin hedef gün seçenekleri (K-106). */
export const HEDEFLER = [7, 14, 30, 60, 90] as const;

export function hedefCoz(ham: unknown): number {
  const n = Number(ham);
  return (HEDEFLER as readonly number[]).includes(n) ? n : 30;
}
