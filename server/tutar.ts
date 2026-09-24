/**
 * Türkçe yazılmış tutarı kuruşa çevirir: "12.500" → 1.250.000, "2.500,50",
 * "1500,5", "1500.50". Virgül varsa ondalık odur ve noktalar binlik; virgül
 * yoksa üçlü gruplanmış noktalar ("12.500", "1.250.000") binlik sayılıyor.
 * Eskiden "12.500" 12,50 ₺ oluyordu: kira tutarında bin kat hata.
 */
export function tutarCoz(ham: string): number | null {
  let m = ham.trim().replace(/\s/g, "").replace(/₺|tl$/i, "");
  if (!m) return null;
  if (m.includes(",")) m = m.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(m)) m = m.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(m)) return null;
  return Math.round(Number(m) * 100);
}
