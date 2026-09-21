/**
 * Kategori ve yaş kutularının marka tonu.
 *
 * Ana sayfadaki kategori ve "yaşa göre" kutuları düz beyaz kartlardı: ince
 * bir çerçeve, siyah başlık, gri açıklama. Sayfanın en renksiz yeri, üstelik
 * hemen üstündeki ürün kartlarında marka paleti dolu dolu kullanılıyordu
 * (K-60).
 *
 * **Ton slug'ın karmasından değil sıradan geliyor.** Önce `slug`dan bir
 * karma denendi: beş kategorinin üçü aynı rengi aldı, nane hiç çıkmadı.
 * Küçük kümede hiçbir karma iyi dağılmıyor — dağılım rastgeleliğin
 * garantisi değil. Sıra numarası dört tonu sırayla veriyor, yani beş
 * kategoride dört renk de mutlaka çıkıyor.
 *
 * Sıra panelde 1'den başlayarak yeniden numaralanıyor (`kategoriTasi`), yani
 * bir kategori **kapatılınca ötekilerin rengi kaymıyor** — kapatma sırayı
 * değiştirmiyor. Yalnızca panelden bilerek sıralama değiştirilirse renkler de
 * kayıyor; bu nadir ve kasıtlı bir işlem.
 *
 * **Yazı rengi tona bağlı değil.** Soluk zemin üzerinde marka tonunun koyu
 * karşılığı 4,5:1 eşiğini her renkte geçmiyor (mercan 4,39 idi, K-50). Yazı
 * metin tonlarında kalıyor; kimliği zemin ve işaret taşıyor.
 */

export const TONLAR = ["mavi", "nane", "mercan", "sari"] as const;
export type Ton = (typeof TONLAR)[number];

/** Zemin, kenar ve işaret sınıfları; yazı sınıfı kasten yok. */
export const TON_SINIFLARI: Record<Ton, { zemin: string; kenar: string; isaret: string }> = {
  mavi: { zemin: "bg-mavi-soluk", kenar: "border-mavi", isaret: "bg-mavi" },
  nane: { zemin: "bg-nane-soluk", kenar: "border-nane", isaret: "bg-nane" },
  mercan: { zemin: "bg-mercan-soluk", kenar: "border-mercan", isaret: "bg-mercan" },
  sari: { zemin: "bg-sari-soluk", kenar: "border-sari", isaret: "bg-sari" },
};

/**
 * Sıra numarasından ton. Negatif ya da sıfır sıra da güvenli çalışıyor.
 */
export function tonSec(sira: number): Ton {
  const i = ((Math.trunc(sira) % TONLAR.length) + TONLAR.length) % TONLAR.length;
  return TONLAR[i];
}

/** Bir tonun sınıfları; tek satırda kullanılabilsin diye. */
export function tonSiniflari(sira: number) {
  return TON_SINIFLARI[tonSec(sira)];
}
