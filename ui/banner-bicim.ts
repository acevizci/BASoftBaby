/**
 * Ana sayfa afişinin marka tonu.
 *
 * **Katalog rengi değil.** İkisinin adları örtüşüyor (nane, mercan, mavi,
 * krem, sarı) ve afişin çizimi eskiden katalog paletinden besleniyordu; ama
 * bunlar iki ayrı şey (K-66). Afişin zemini `globals.css` içindeki marka
 * belirteçlerinden geliyor (`--nane-soluk` gibi) ve koyu temaya uyuyor;
 * katalog rengi ise ürünün gerçek rengi — panelden değişiyor, sabit onaltılık
 * değerler, temayla değişmiyor.
 *
 * Bağlı kalsalardı katalogdaki "Mavi"yi "Gökyüzü" diye yeniden adlandırmak ya
 * da silmek afişin zeminini de değiştirirdi. O yüzden afiş tonlarının çizim
 * renkleri burada, tanımlandıkları CSS'in yanında duruyor.
 */

import type { Palet } from "@/ui/katalog-bicim";

export const BANNER_PALET_ADLARI: Record<string, string> = {
  sari: "Sarı",
  mint: "Nane",
  mercan: "Mercan",
  mavi: "Mavi",
  krem: "Krem",
};

const CIZIM_PALETLERI: Record<string, Palet> = {
  sari: { zemin: "#FDF3DD", c1: "#F2CE85", c2: "#F9E6BC", c3: "#8F6410" },
  mint: { zemin: "#E6F7EE", c1: "#8FD9B7", c2: "#B9E9D2", c3: "#3FA478" },
  mercan: { zemin: "#FDEBE9", c1: "#F5A79E", c2: "#FAC8C2", c3: "#C2433A" },
  mavi: { zemin: "#EAF3FA", c1: "#A9CCE6", c2: "#CBE2F2", c3: "#3F82B4" },
  krem: { zemin: "#FBF3E4", c1: "#EBD3A8", c2: "#F7E7C9", c3: "#B08A45" },
};

/** Afiş tonunun çizim paleti; tanınmayan tonda sarı — CSS'teki temel tonun aynısı. */
export function bannerPaleti(ton: string): Palet {
  return CIZIM_PALETLERI[ton] ?? CIZIM_PALETLERI.sari;
}
