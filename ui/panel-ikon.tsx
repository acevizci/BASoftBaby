import type { IkonAdi } from "@/ui/panel-menu-bicim";

/**
 * Panel menüsünün ikonları.
 *
 * Kütüphane yok: altı-yedi ikon için bir paket kurmak sayfaya inen
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
  gunluk: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 9 2 2 4-4",
  siparis: "M4 7h16l-1 12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L4 7Zm4 0V5a4 4 0 0 1 8 0v2",
  talep: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-5.2A8 8 0 1 1 21 12Z",
  iade: "M4 9h11a5 5 0 0 1 0 10H8M4 9l4-4M4 9l4 4",
  yorum: "m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8L12 4Z",
  // İki kişi: liste "kullanıcılar"dan (tek kişi) ayrılsın.
  musteri: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6m1.5 9a5.5 5.5 0 0 1 3.5 5",
  rapor: "M5 20V10m7 10V4m7 16v-7",
  urun: "M20 8 12 4 4 8m16 0v8l-8 4-8-4V8m16 0-8 4m0 0L4 8m8 4v8",
  kategori: "M4 5h7v7H4V5Zm9 0h7v7h-7V5ZM4 14h7v5H4v-5Zm9 0h7v5h-7v-5Z",
  beden: "M4 8h16M4 8v8m16-8v8M8 8v3m4-3v4m4-4v3M4 16h16",
  // Üç halka: paletteki renk noktalarının kendisi.
  renk: "M9 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm6 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-3-5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  stok: "M4 7l8-4 8 4v10l-8 4-8-4V7Zm8 4v10m0-10 8-4m-8 4L4 7",
  kampanya: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Zm13-2a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12",
  banner: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 11 4-4 3 3 4-5 6 6",
  duyuru: "M3 10v4h3l5 4V6l-5 4H3Zm13-3a7 7 0 0 1 0 10",
  ayar: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3a8 8 0 0 0-.2-1.6l2-1.5-2-3.4-2.3.9a8 8 0 0 0-2.8-1.6L14.4 2H9.6l-.3 2.8a8 8 0 0 0-2.8 1.6l-2.3-.9-2 3.4 2 1.5a8 8 0 0 0 0 3.2l-2 1.5 2 3.4 2.3-.9a8 8 0 0 0 2.8 1.6l.3 2.8h4.8l.3-2.8a8 8 0 0 0 2.8-1.6l2.3.9 2-3.4-2-1.5c.1-.5.2-1 .2-1.6Z",
  yasal: "M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 0v5h4M8 13h8M8 17h5",
  kullanici: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8a8 8 0 0 1 16 0",
  // Onay işareti: "hazır mı" sorusunun simgesi.
  hazirlik: "M9 12.5l2.5 2.5 4.5-5M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  tani: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5v5m0 3h.01",
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
