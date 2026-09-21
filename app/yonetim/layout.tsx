import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yönetim",
  robots: { index: false, follow: false },
};

/**
 * `/yonetim` altındaki her şeyin en dış çerçevesi.
 *
 * Burada yalnızca başlık ve arama motoru kuralı var. Menü ve oturum kontrolü
 * bir alt katmanda, `(panel)/layout.tsx`'te: giriş sayfası da `/yonetim`
 * altında duruyor ve menüyü göremez, kendini koruyan bir düzenin içinde de
 * olamaz — sonsuz yönlendirme olurdu (K-45).
 */
export default function YonetimKok({ children }: LayoutProps<"/yonetim">) {
  return children;
}
