import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito_Sans } from "next/font/google";
import DuyuruSeridi from "@/ui/duyuru-seridi";
import UstCubuk from "@/ui/ust-cubuk";
import AltBilgi from "@/ui/alt-bilgi";
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
        <DuyuruSeridi />
        <UstCubuk />
        <main className="flex-1">{children}</main>
        <AltBilgi />
      </body>
    </html>
  );
}
