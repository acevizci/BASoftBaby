import Link from "next/link";

/**
 * Stok ekranlarının sekme satırı (K-104). Menüde tek "Stok" maddesi var;
 * mal kabulü, hareketler ve öteki stok işleri buradan açılıyor.
 */
const SEKMELER = [
  ["/yonetim/stok", "Stok"],
  ["/yonetim/stok/mal-kabul", "Mal kabulü"],
  ["/yonetim/stok/siparis-listesi", "Sipariş listesi"],
  ["/yonetim/stok/hareketler", "Hareketler"],
] as const;

export default function StokSekmeleri({ secili }: { secili: (typeof SEKMELER)[number][0] }) {
  return (
    <nav aria-label="Stok işleri" className="flex flex-wrap gap-1 border-b border-cizgi">
      {SEKMELER.map(([yol, ad]) => (
        <Link
          key={yol}
          href={yol}
          aria-current={secili === yol ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-bold transition ${
            secili === yol
              ? "border-mercan text-metin"
              : "border-transparent text-metin-2 hover:text-metin"
          }`}
        >
          {ad}
        </Link>
      ))}
    </nav>
  );
}
