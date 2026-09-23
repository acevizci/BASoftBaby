/**
 * Kurulumda otomatik yazılan örnek verinin kimlikleri (K-97).
 *
 * `db/tohum.ts` boş bir mağazayı sekiz örnek ürün ve üç örnek banner'la
 * dolduruyor; gerçek ürünler girildikten sonra bunlar kolayca yayında
 * unutuluyor. Satışa hazırlık ekranı buradaki listeye bakıp yayında
 * kalanları gösteriyor. `db/tohum.ts`'teki bir ürünün adresi ya da bir
 * banner'ın başlığı değişirse burası da değişmeli.
 */
export const ORNEK_URUN_SLUGLARI = [
  "ayiciklu-organik-body",
  "fitilli-pamuk-tulum",
  "muslin-battaniye-120x120",
  "bambu-patik-2li",
  "kadife-sapka",
  "organik-zibin-3lu-set",
  "pamuklu-onluk-3lu",
  "uyku-tulumu-25-tog",
] as const;

export const ORNEK_BANNER_BASLIKLARI = [
  "Minik bedenlere, yumuşacık kumaşlar",
  "Yenidoğan setleri hazır",
  "750 TL üzeri kargo bizden",
] as const;
