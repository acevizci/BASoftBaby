import Link from "next/link";

/**
 * Stok sayfasının sekmeleri (K-177): liste, geçmiş, satmayanlar, sayımlar.
 * Bu sayfalar yan menüde ayrı satır değil; her ekran boyunda burada.
 */
const SEKMELER = [
  { yol: "/yonetim/stok", ad: "Stok" },
  { yol: "/yonetim/stok/hareketler", ad: "Hareketler" },
  { yol: "/yonetim/stok/satmayanlar", ad: "Satmayanlar" },
  { yol: "/yonetim/stok/sayim", ad: "Sayımlar" },
] as const;

export default function StokSekmeleri({ secili }: { secili: (typeof SEKMELER)[number]["yol"] }) {
  return (
    <nav aria-label="Stok sayfaları" className="-mx-1 overflow-x-auto [scrollbar-width:none]">
      <ul className="flex w-max gap-1 rounded-full border border-cizgi bg-yuzey p-1">
        {SEKMELER.map((s) => (
          <li key={s.yol}>
            <Link
              href={s.yol}
              aria-current={secili === s.yol ? "page" : undefined}
              className={`flex min-h-9 items-center whitespace-nowrap rounded-full px-4 text-sm font-bold transition ${
                secili === s.yol ? "bg-dugme text-dugme-yazi" : "text-metin-2 hover:text-metin"
              }`}
            >
              {s.ad}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
