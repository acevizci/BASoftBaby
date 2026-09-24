import Link from "next/link";
import { rehberCoz, type Parca } from "@/ui/rehber-bicim";

const BAG = "font-semibold text-mavi-koyu underline-offset-2 hover:underline";

function Parcalar({ parcalar }: { parcalar: Parca[] }) {
  return (
    <>
      {parcalar.map((p, i) =>
        !p.adres ? (
          <span key={i}>{p.metin}</span>
        ) : p.adres.startsWith("/") ? (
          <Link key={i} href={p.adres} className={BAG}>
            {p.metin}
          </Link>
        ) : (
          <a key={i} href={p.adres} target="_blank" rel="noopener noreferrer" className={BAG}>
            {p.metin}
          </a>
        ),
      )}
    </>
  );
}

/**
 * Rehber biçimindeki metin (K-130, K-132): kategori sayfasının altındaki
 * yazı ve rehber yazıları. `baslik` verilirse başta ara başlık olarak.
 */
export default function RehberMetni({
  baslik,
  metin,
  className = "mt-12 max-w-3xl border-t border-cizgi-soluk pt-8",
}: {
  baslik?: string;
  metin: string;
  className?: string;
}) {
  const bloklar = rehberCoz(metin);
  if (bloklar.length === 0) return null;
  return (
    <section className={`${className} text-metin-2`}>
      {baslik && <h2 className="text-xl text-metin">{baslik}</h2>}
      {bloklar.map((b, i) =>
        b.tur === "baslik" ? (
          <h3 key={i} className="mt-6 text-lg text-metin">
            {b.metin}
          </h3>
        ) : b.tur === "liste" ? (
          <ul key={i} className="mt-3 flex list-disc flex-col gap-1 pl-5 leading-relaxed">
            {b.maddeler.map((m, j) => (
              <li key={j}>
                <Parcalar parcalar={m} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="mt-3 leading-relaxed">
            <Parcalar parcalar={b.parcalar} />
          </p>
        ),
      )}
    </section>
  );
}
