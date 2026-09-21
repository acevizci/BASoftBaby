import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yönetim",
  robots: { index: false, follow: false },
};

const MENU = [
  { yol: "/yonetim", ad: "Özet" },
  { yol: "/yonetim/siparisler", ad: "Siparişler" },
  { yol: "/yonetim/urunler", ad: "Ürünler" },
  { yol: "/yonetim/kategoriler", ad: "Kategoriler" },
  { yol: "/yonetim/stok", ad: "Stok" },
  { yol: "/yonetim/kampanyalar", ad: "Kampanyalar" },
  { yol: "/yonetim/banner", ad: "Ana sayfa banner" },
  { yol: "/yonetim/duyuru", ad: "Duyuru şeridi" },
  { yol: "/yonetim/ayarlar", ad: "Satış ayarları" },
  { yol: "/yonetim/yasal", ad: "Yasal metinler" },
  { yol: "/yonetim/tani", ad: "Tanı" },
];

export default function YonetimDuzeni({ children }: LayoutProps<"/yonetim">) {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[180px_1fr]">
      <aside className="flex flex-col gap-1">
        <p className="px-3 pb-2 font-baslik text-base font-bold">Yönetim</p>
        {MENU.map((m) => (
          <Link
            key={m.yol}
            href={m.yol}
            className="rounded-full px-3 py-2 text-sm font-semibold text-metin-2 transition hover:bg-yuzey-sicak hover:text-metin"
          >
            {m.ad}
          </Link>
        ))}
        <Link
          href="/"
          className="mt-3 rounded-full px-3 py-2 text-sm font-semibold text-mavi-koyu hover:underline"
        >
          Mağazayı gör
        </Link>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
