/**
 * Hediye çeki hesapları (K-137). Saf modül.
 */

import { randomInt } from "node:crypto";

/** Karıştırılabilen harfler yok: 0/O, 1/I/L, 5/S, 2/Z, 8/B. */
const ALFABE = "34679ACDEFGHJKMNPQRTUVWXY";

/** "HC-7K3M-Q9TX": 8 karakter, 25^8 ≈ 1,5 × 10^11 olasılık; tahmin sınırı ayrıca (K-122). */
export function kodUret(): string {
  const parca = () => Array.from({ length: 4 }, () => ALFABE[randomInt(ALFABE.length)]).join("");
  return `HC-${parca()}-${parca()}`;
}

/** Müşterinin yazdığı kod: küçük harf, boşluk, tiresiz yazım kabul. */
export function kodCoz(ham: string): string | null {
  const t = ham.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const govde = t.startsWith("HC") ? t.slice(2) : t;
  if (!/^[A-Z0-9]{8}$/.test(govde)) return null;
  return `HC-${govde.slice(0, 4)}-${govde.slice(4)}`;
}

/** Siparişte çekten kullanılacak tutar: bakiye ile ödenecek toplamın küçüğü. */
export function kullanilacak(bakiyeKurus: number, toplamKurus: number): number {
  return Math.max(0, Math.min(bakiyeKurus, toplamKurus));
}

/** Karttan ya da havaleyle tahsil edilecek kısım. */
export function tahsilat(s: { toplamKurus: number; hediyeCekiKurus?: number | null }): number {
  return Math.max(0, s.toplamKurus - (s.hediyeCekiKurus ?? 0));
}

/**
 * İadenin para ve çek bakiyesi olarak bölünmesi: sipariş hangi oranda
 * ödendiyse o oranda. Önceki iadelerle birlikte hiçbir kısım ödenenden
 * fazla geri verilmiyor.
 */
export function iadeBolustur(g: {
  tutarKurus: number;
  toplamKurus: number;
  hediyeCekiKurus: number;
  oncekiParaKurus: number;
  oncekiCekKurus: number;
}): { paraKurus: number; cekKurus: number } {
  const para = Math.max(0, g.toplamKurus - g.hediyeCekiKurus);
  const kalanPara = Math.max(0, para - g.oncekiParaKurus);
  const kalanCek = Math.max(0, g.hediyeCekiKurus - g.oncekiCekKurus);
  if (g.hediyeCekiKurus <= 0 || g.toplamKurus <= 0) return { paraKurus: Math.min(g.tutarKurus, kalanPara), cekKurus: 0 };
  let paraKurus = Math.min(Math.round((g.tutarKurus * para) / g.toplamKurus), kalanPara);
  const cekKurus = Math.min(g.tutarKurus - paraKurus, kalanCek);
  // Çekin kalanı yetmediyse eksik kısım paradan.
  paraKurus = Math.min(g.tutarKurus - cekKurus, kalanPara);
  return { paraKurus, cekKurus };
}
