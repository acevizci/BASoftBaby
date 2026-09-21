/**
 * Panel menüsünün yapısı ve "hangi madde açık" kuralı.
 *
 * Prisma'ya bulaşmayan saf modül: menü artık istemci bileşeni (K-51) ve
 * `server-only` işaretli `server/panel-menu.ts`'i içeri alamıyor. Sayaçları
 * hesaplayan sorgular orada kaldı, burada yalnızca biçim var.
 */

export type MenuMaddesi = {
  yol: string;
  ad: string;
  /** Bekleyen iş sayısı; sıfırsa rozet gösterilmiyor. */
  rozet?: number;
  /**
   * Rozetin tonu. `bekleyen`: müşteri cevap bekliyor, geciktikçe zarar veriyor
   * — dikkat çeken renk. `hatirlatma`: mağazanın kendi işi, bugün yapılmazsa
   * kimse beklemiyor — sessiz renk. Hepsi kırmızı olsaydı hiçbiri
   * kırmızı olmazdı.
   */
  ton?: "bekleyen" | "hatirlatma";
};

export type MenuGrubu = { baslik: string; maddeler: MenuMaddesi[] };

/**
 * Bir menü maddesi açık sayfaya karşılık geliyor mu?
 *
 * Alt sayfalar da maddeyi işaretliyor: `/yonetim/urunler/zibin` açıkken
 * "Ürünler" işaretli kalıyor. "/yonetim" her şeyin ön eki olduğu için tam
 * eşleşme aranıyor, yoksa bütün sayfalarda Özet de işaretli görünürdü.
 */
export function acikMi(yol: string, madde: string): boolean {
  if (madde === "/yonetim") return yol === "/yonetim";
  return yol === madde || yol.startsWith(`${madde}/`);
}
