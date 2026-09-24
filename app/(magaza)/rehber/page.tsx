import Link from "next/link";
import type { Metadata } from "next";
import { yayindakiRehberler } from "@/server/rehber";

/**
 * Rehber yazıları listesi (K-132). Önbellekten veriliyor; panelde yazı
 * kaydedilince düşüyor.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Rehber",
  description: "Yenidoğan ihtiyaç listesi, hastane çantası, bebek giydirme ve beden seçimi üzerine yazılar.",
  alternates: { canonical: "/rehber" },
  openGraph: { title: "Rehber · BASoftBaby", url: "/rehber", type: "website" },
};

function tarih(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function RehberListesi() {
  const yazilar = await yayindakiRehberler();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl sm:text-3xl">Rehber</h1>
      <p className="mt-2 text-metin-2">
        Bebeğin ilk aylarında işine yarayacak listeler ve tavsiyeler.
      </p>
      {yazilar.length === 0 ? (
        <p className="mt-8 text-sm text-metin-3">Yakında burada yazılar olacak.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {yazilar.map((y) => (
            <li key={y.slug}>
              <Link
                href={`/rehber/${y.slug}`}
                className="block rounded-marka border border-cizgi bg-yuzey p-5 transition hover:border-mercan"
              >
                <h2 className="text-lg text-metin">{y.baslik}</h2>
                {y.ozet && <p className="mt-1 text-sm text-metin-2">{y.ozet}</p>}
                <p className="mt-2 text-xs text-metin-3">{tarih(y.yayinTarihi)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
