import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import HataDinleyici from "@/ui/hata-dinleyici";
import { siteAdresi } from "@/server/site";
import YuklemeCizgisi from "@/ui/yukleme";
import "./globals.css";

// latin-ext olmadan ı, ş, ğ, İ gibi harfler yedek yazı tipinden gelir ve
// satır içinde gözle görülür şekilde bozuk durur.
const baslikYazisi = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
});

const govdeYazisi = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  // Göreli adresler buna göre mutlaklaşıyor: canonical, openGraph ve sitemap
  // hep aynı adresi göstersin. Alan adı alınınca SITE_URL tanımlanacak.
  metadataBase: new URL(siteAdresi()),
  title: {
    default: "BASoftBaby · Bebek kıyafetleri ve aksesuarları",
    template: "%s · BASoftBaby",
  },
  description:
    "Organik pamuklu bebek kıyafetleri, zıbın, tulum, uyku ürünleri ve hediyelik setler.",
  openGraph: {
    title: "BASoftBaby",
    description: "Minik bedenlere, yumuşacık kumaşlar.",
    locale: "tr_TR",
    type: "website",
  },
};

// Üst çubuktaki sepet rozeti çereze baktığı için bütün sayfalar istek anında
// üretiliyor. Bu bir mağaza için doğrusu: fiyat, stok ve duyuru her zaman o
// anki hâliyle görünür, beş dakikalık eski bir kopya gösterilmez.

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFCF7" },
    { media: "(prefers-color-scheme: dark)", color: "#1E1B16" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${baslikYazisi.variable} ${govdeYazisi.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {/* Suspense yalnızca `useSearchParams` gereği; bileşen sunucuda hiçbir
            şey çizmiyor, yani JavaScript kapalı tarayıcıda hiçbir şeyi
            bekletmiyor. */}
        <Suspense fallback={null}>
          <YuklemeCizgisi />
        </Suspense>
        {children}
        {/* Ölçümleme: çerez kullanmıyor, ziyaretçiyi tanımlıyor ve siteler
            arasında izlemiyor. Bu yüzden onay istemiyor (K-16). Reklam
            ölçümü (Meta, Google) ayrı ve onaya bağlı: mağaza düzenindeki
            çerez onay bandı (K-124). */}
        <Analytics />
        {/* Tarayıcıda olan hatalar panelin hata kaydına (K-121). */}
        <HataDinleyici />
      </body>
    </html>
  );
}
