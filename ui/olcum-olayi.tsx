"use client";

import { useEffect } from "react";
import { olcumOlayi } from "@/ui/olcum";
import type { OlayAdi, OlayVerisi } from "@/ui/olcum-bicim";

/**
 * Sunucu sayfasından bir ölçüm olayı (K-124): ürün görüntüleme, ödeme
 * başlangıcı, satış. Hiçbir şey çizmiyor.
 *
 * `tekSeferlik` verilirse olay o anahtarla bir kez gidiyor: sipariş
 * onay sayfası yenilenince ya da sonra yeniden açılınca satış iki kez
 * sayılmasın.
 *
 * Onay yoksa olay hiçbir yere gitmiyor (`olcumOlayi`).
 */
export default function OlcumOlayi({
  ad,
  veri,
  tekSeferlik,
}: {
  ad: OlayAdi;
  veri?: OlayVerisi;
  tekSeferlik?: string;
}) {
  const anahtar = JSON.stringify(veri ?? {});
  useEffect(() => {
    const k = tekSeferlik ? `olcum:${tekSeferlik}` : undefined;
    try {
      if (k && localStorage.getItem(k)) return;
    } catch {
      // Depolama kapalıysa tekrar sayılma ihtimali, hiç sayılmamaktan iyi.
    }
    const gitti = olcumOlayi(ad, JSON.parse(anahtar) as OlayVerisi);
    // Onay yoksa işaretlenmiyor: sonradan onay verilip sayfa yeniden
    // açılırsa satış yine de sayılabilsin.
    try {
      if (k && gitti) localStorage.setItem(k, "1");
    } catch {
      // Yukarıdaki gibi.
    }
  }, [ad, anahtar, tekSeferlik]);
  return null;
}
