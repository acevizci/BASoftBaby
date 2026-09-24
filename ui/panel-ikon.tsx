import type { IkonAdi } from "@/ui/panel-menu-bicim";

/**
 * Panel menüsünün ikonları.
 *
 * Kütüphane yok: birkaç ikon için bir paket kurmak sayfaya inen
 * JavaScript'i artırır ve tema uyumunu dışarı emanet ederdi. Hepsi tek
 * çizgi kalınlığında, `currentColor` ile — açık ve koyu temada
 * kendiliğinden doğru renkte (K-60).
 *
 * İkonlar `aria-hidden`: yanlarında zaten madde adı yazıyor. Menü
 * daraltıldığında ad ekran okuyucu için `sr-only` olarak duruyor, yani
 * ikonun anlam taşıması gerekmiyor.
 */

const YOLLAR: Record<IkonAdi, string> = {
  ozet: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  siparis: "M4 7h16l-1 12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L4 7Zm4 0V5a4 4 0 0 1 8 0v2",
  urun: "M20 8 12 4 4 8m16 0v8l-8 4-8-4V8m16 0-8 4m0 0L4 8m8 4v8",
  stok: "M4 7l8-4 8 4v10l-8 4-8-4V7Zm8 4v10m0-10 8-4m-8 4L4 7",
  musteri: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6m1.5 9a5.5 5.5 0 0 1 3.5 5",
  vitrin: "M4 9 5.5 4h13L20 9M4 9h16M4 9a2.67 2.67 0 0 0 5.33 0 2.67 2.67 0 0 0 5.34 0A2.67 2.67 0 0 0 20 9M5 11.5V20h14v-8.5M10 20v-5h4v5",
  rapor: "M5 20V10m7 10V4m7 16v-7",
  ayar: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3a8 8 0 0 0-.2-1.6l2-1.5-2-3.4-2.3.9a8 8 0 0 0-2.8-1.6L14.4 2H9.6l-.3 2.8a8 8 0 0 0-2.8 1.6l-2.3-.9-2 3.4 2 1.5a8 8 0 0 0 0 3.2l-2 1.5 2 3.4 2.3-.9a8 8 0 0 0 2.8 1.6l.3 2.8h4.8l.3-2.8a8 8 0 0 0 2.8-1.6l2.3.9 2-3.4-2-1.5c.1-.5.2-1 .2-1.6Z",
  ara: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4-4",
};

export default function PanelIkon({ ad }: { ad: IkonAdi }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] flex-none"
    >
      <path d={YOLLAR[ad]} />
    </svg>
  );
}
