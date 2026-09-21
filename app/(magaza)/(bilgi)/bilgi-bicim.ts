/**
 * Yardım sayfalarının ortak görünüm parçaları. Prisma'ya bulaşmayan saf bir
 * modül, böylece hem düzen hem sayfalar kullanabiliyor.
 */

export const BILGI_SAYFALARI = [
  { yol: "/beden-rehberi", ad: "Beden rehberi" },
  { yol: "/kargo-teslimat", ad: "Kargo ve teslimat" },
  { yol: "/iade-degisim", ad: "İade ve değişim" },
  { yol: "/sikca-sorulanlar", ad: "Sıkça sorulanlar" },
] as const;

/** Sayfa içindeki bölüm başlığı. */
export const BOLUM = "mt-8 font-baslik text-lg font-bold sm:text-xl";

/** Düz paragraf. */
export const YAZI = "mt-3 text-sm leading-relaxed text-metin-2 sm:text-base";

/** Dikkat çekilen kutu: kuralın özeti. */
export const KUTU = "mt-4 rounded-marka border border-cizgi bg-yuzey-sicak px-4 py-3 text-sm text-metin-2";
