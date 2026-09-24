import { rehberCoz } from "@/ui/rehber-bicim";

/** Kategori sayfasının altındaki rehber yazısı (K-130). */
export default function RehberMetni({ baslik, metin }: { baslik: string; metin: string }) {
  const bloklar = rehberCoz(metin);
  if (bloklar.length === 0) return null;
  return (
    <section className="mt-12 max-w-3xl border-t border-cizgi-soluk pt-8 text-metin-2">
      <h2 className="text-xl text-metin">{baslik}</h2>
      {bloklar.map((b, i) =>
        b.tur === "baslik" ? (
          <h3 key={i} className="mt-6 text-lg text-metin">
            {b.metin}
          </h3>
        ) : b.tur === "liste" ? (
          <ul key={i} className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed">
            {b.maddeler.map((m, j) => (
              <li key={j}>{m}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="mt-3 text-sm leading-relaxed">
            {b.metin}
          </p>
        ),
      )}
    </section>
  );
}
