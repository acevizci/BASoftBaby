import "server-only";

/**
 * "Kaç gündür yolda?" — kargo toplayıcısı bağlanana kadarki köprü.
 *
 * Gönderi durumunu taşıyıcıdan alan uç hazır (`/api/kargo/durum`,
 * `server/kargo-islem.ts`): bildirim geldiğinde sipariş kendiliğinden
 * "teslim edildi" oluyor ve `teslimTarihi` yazılıyor. Ama toplayıcı hesabı
 * şirket kuruluşuna bağlı (A-11), yani bugün o ucu çağıran kimse yok.
 *
 * **Süreye bakıp kendiliğinden "teslim edildi" yapmak seçilmedi.** Teslim
 * tarihi 14 günlük cayma hakkının başladığı an; tahmine dayalı bir tarih
 * gerçek teslimden erkense müşterinin yasal süresini kısaltır. Bunu
 * mağazanın kendi kolaylığı için yapmak doğru değil (K-59).
 *
 * Onun yerine: kargoda bekleyen sipariş panelde **görünür** oluyor ve tek
 * tıkla teslim işaretlenebiliyor. Karar insanda kalıyor, ama unutulmuyor.
 */

/** Bu kadar gündür yoldaysa panel soruyor. Yurtiçi teslimat 1-3 gün sürüyor. */
export const SORULACAK_GUN = 4;

/** Bu kadar gündür yoldaysa bir sorun var demektir. */
export const GECIKMIS_GUN = 7;

export type KargoBeklemesi =
  | { durum: "yok" }
  | { durum: "normal"; gun: number }
  | { durum: "sorulacak"; gun: number }
  | { durum: "gecikmis"; gun: number };

function gunFarki(t: Date, simdi: Date): number {
  return Math.floor((simdi.getTime() - t.getTime()) / 86_400_000);
}

/**
 * Siparişin kargoda ne kadar beklediği.
 *
 * Yalnızca `kargoda` durumundaki siparişler için anlamlı: teslim edilmiş ya
 * da henüz hazırlanan siparişte bekleme diye bir şey yok.
 */
export function kargoBeklemesi(
  siparis: { durum: string; kargoyaVerildi: Date | null },
  simdi: Date = new Date(),
): KargoBeklemesi {
  if (siparis.durum !== "kargoda" || !siparis.kargoyaVerildi) return { durum: "yok" };

  const gun = gunFarki(siparis.kargoyaVerildi, simdi);
  if (gun >= GECIKMIS_GUN) return { durum: "gecikmis", gun };
  if (gun >= SORULACAK_GUN) return { durum: "sorulacak", gun };
  return { durum: "normal", gun };
}

/** Rozet metni ve rengi; ekranlar arasında aynı olsun diye tek yerde. */
export function beklemeRozeti(b: KargoBeklemesi): { metin: string; sinif: string } | undefined {
  if (b.durum === "yok" || b.durum === "normal") return undefined;
  return b.durum === "gecikmis"
    ? {
        metin: `${b.gun} gündür yolda`,
        sinif: "bg-mercan-soluk text-mercan-koyu",
      }
    : {
        metin: `${b.gun} gündür yolda`,
        sinif: "bg-sari-soluk text-sari-koyu",
      };
}
