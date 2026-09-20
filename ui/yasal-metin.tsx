import type { Kunye } from "@/server/yasal";

/**
 * Yasal metinlerin görüntüleyicisi.
 *
 * Metin panelden düz yazı olarak giriliyor; burada küçük bir biçim
 * uygulanıyor: boş satır paragrafı ayırıyor, `## ` ile başlayan satır başlık,
 * `- ` ile başlayan satırlar madde listesi oluyor. Satır içinde `**kalın**`
 * çalışıyor.
 *
 * Markdown kütüphanesi eklenmedi: metni yazan kişi mağaza sahibi, gelen metin
 * de HTML değil düz yazı. Kütüphane olsaydı içeriye HTML geçirme yolu da
 * açılırdı; burada hiçbir şey HTML olarak yorumlanmıyor.
 */

function Satir({ metin }: { metin: string }) {
  // **kalın** dışında hiçbir şey yorumlanmıyor.
  const parcalar = metin.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parcalar.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
          <strong key={i} className="font-bold text-metin">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default function YasalMetin({ icerik }: { icerik: string }) {
  const bloklar = icerik.replace(/\r\n/g, "\n").split(/\n\s*\n/);

  return (
    <div className="mt-6 flex flex-col gap-4">
      {bloklar.map((blok, i) => {
        const satirlar = blok.split("\n").filter((s) => s.trim() !== "");
        if (satirlar.length === 0) return null;

        if (satirlar[0].startsWith("## ")) {
          const baslik = satirlar[0].slice(3);
          const kalan = satirlar.slice(1).join(" ");
          return (
            <section key={i}>
              <h2 className="font-baslik text-lg font-bold sm:text-xl">{baslik}</h2>
              {kalan && (
                <p className="mt-2 text-sm leading-relaxed text-metin-2 sm:text-base">
                  <Satir metin={kalan} />
                </p>
              )}
            </section>
          );
        }

        if (satirlar[0].startsWith("- ")) {
          // Madde birden çok satıra taşabiliyor: yeni madde "- " ile başlıyor.
          const maddeler: string[] = [];
          for (const satir of satirlar) {
            if (satir.startsWith("- ")) maddeler.push(satir.slice(2));
            else if (maddeler.length > 0) maddeler[maddeler.length - 1] += ` ${satir.trim()}`;
          }
          return (
            <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-metin-2 sm:text-base">
              {maddeler.map((m, j) => (
                <li key={j}>
                  <Satir metin={m} />
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className="text-sm leading-relaxed text-metin-2 sm:text-base">
            <Satir metin={satirlar.join(" ")} />
          </p>
        );
      })}
    </div>
  );
}

/** Satıcı künyesi: yasal metinlerin altında ve alt bilgide aynı veriden. */
export function KunyeKutusu({ kunye }: { kunye: Kunye }) {
  if (kunye.bosMu) {
    return (
      <div className="mt-8 rounded-marka border border-cizgi bg-yuzey-sicak px-4 py-3 text-sm text-metin-3">
        Satıcı künyesi şirket kaydı tamamlanınca burada görünecek.
      </div>
    );
  }

  const satirlar: [string, string][] = [
    ["Unvan", kunye.unvan],
    ["Adres", kunye.sirketAdresi],
    ["Vergi dairesi", kunye.vergiDairesi],
    ["Vergi no", kunye.vergiNo],
    ["MERSİS no", kunye.mersisNo],
    ["ETBİS no", kunye.etbisNo],
    ["Telefon", kunye.destekTelefon],
    ["E-posta", kunye.destekEposta],
  ];

  return (
    <dl className="mt-8 grid gap-2 rounded-marka border border-cizgi bg-yuzey-sicak px-4 py-4 text-sm sm:grid-cols-[140px_1fr]">
      {satirlar
        .filter(([, deger]) => deger !== "")
        .map(([ad, deger]) => (
          <div key={ad} className="sm:contents">
            <dt className="text-xs font-bold text-metin-3 sm:text-sm">{ad}</dt>
            <dd className="text-metin-2">{deger}</dd>
          </div>
        ))}
    </dl>
  );
}
