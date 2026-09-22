"use client";

import { usePathname } from "next/navigation";

/**
 * Ödeme sayfasında içeriğini çizmeyen sarmalayıcı.
 *
 * Ödeme adımında kategori menüsü gizleniyor: müşteri işlemi yarıda bırakıp
 * vitrine dağılmasın. Logo, sepet ve hesap bağlantısı duruyor; sepete dönmek
 * isteyen yine dönebiliyor (K-84).
 *
 * Üst çubuk mağazanın ortak düzeninde çiziliyor ve düzen açık sayfanın
 * yolunu bilmiyor. `usePathname()` sunucuda çizilirken de o anki yolu
 * döndürüyor, yani menü ilk boyamada hiç görünmüyor, sonradan kaybolmuyor.
 */
export default function OdemedeGizli({ children }: { children: React.ReactNode }) {
  const yol = usePathname() ?? "";
  if (yol === "/odeme" || yol.startsWith("/odeme/")) return null;
  return <>{children}</>;
}
