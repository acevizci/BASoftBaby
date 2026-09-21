import Link from "next/link";
import type { Metadata } from "next";
import UrunKarti from "@/ui/urun-karti";
import AramaKutusu from "@/ui/arama-kutusu";
import { kategorileriGetir, urunleriGetir } from "@/server/katalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arama",
  // Arama sonuçları dizine girmemeli: her sorgu ayrı bir sayfa gibi görünüp
  // sitenin kendi sayfalarının sırasını yer.
  robots: { index: false, follow: true },
};

const ROZET = "rounded-full border px-3 py-1.5 text-xs font-bold transition";

export default async function AramaSayfasi({ searchParams }: PageProps<"/arama">) {
  const aranan = await searchParams;
  const q = typeof aranan.q === "string" ? aranan.q.slice(0, 100) : "";
  const kategori = typeof aranan.kategori === "string" ? aranan.kategori : undefined;

  const [sonuclar, kategoriler] = await Promise.all([
    q ? urunleriGetir({ ara: q, kategori }) : Promise.resolve([]),
    kategorileriGetir(),
  ]);

  // Kategori rozetleri yalnızca sonucu olan kategorileri gösteriyor; boş bir
  // daraltmayı tıklatmanın anlamı yok.
  const hepsi = q && kategori ? await urunleriGetir({ ara: q }) : sonuclar;
  const sayilar = new Map<string, number>();
  for (const u of hepsi) sayilar.set(u.kategori, (sayilar.get(u.kategori) ?? 0) + 1);

  const adres = (k?: string) => {
    const p = new URLSearchParams({ q });
    if (k) p.set("kategori", k);
    return `/arama?${p.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl sm:text-3xl">
        {q ? <>&quot;{q}&quot; için sonuçlar</> : "Arama"}
      </h1>

      <div className="mt-4 max-w-xl">
        <AramaKutusu baslangic={q} otomatikOdak={!q} />
      </div>

      {!q ? (
        <p className="mt-6 text-sm text-metin-2">
          Ürün adı, kumaş ya da bir özellik yazabilirsin — &quot;zıbın&quot;, &quot;pamuk&quot;,
          &quot;fermuarlı&quot; gibi. Türkçe harflere dikkat etmene gerek yok.
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-metin-2">
            <span className="rakam font-bold">{hepsi.length}</span> ürün bulundu
            {kategori && sonuclar.length !== hepsi.length && (
              <span className="text-metin-3">
                {" "}
                · bu kategoride <span className="rakam">{sonuclar.length}</span>
              </span>
            )}
          </p>

          {hepsi.length > 0 && sayilar.size > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={adres()}
                className={`${ROZET} ${
                  kategori
                    ? "border-cizgi text-metin-2 hover:border-metin-3"
                    : "border-mercan bg-mercan-soluk text-mercan-koyu"
                }`}
              >
                Hepsi
              </Link>
              {kategoriler
                .filter((k) => (sayilar.get(k.slug) ?? 0) > 0)
                .map((k) => (
                  <Link
                    key={k.slug}
                    href={adres(k.slug)}
                    className={`${ROZET} ${
                      kategori === k.slug
                        ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                        : "border-cizgi text-metin-2 hover:border-metin-3"
                    }`}
                  >
                    {k.ad} <span className="rakam">({sayilar.get(k.slug)})</span>
                  </Link>
                ))}
            </div>
          )}

          {sonuclar.length === 0 ? (
            <div className="mt-6 rounded-marka border border-cizgi bg-yuzey p-6">
              <p className="text-sm font-bold">Bu aramaya uyan ürün bulunamadı.</p>
              <p className="mt-1 text-sm text-metin-2">
                Daha kısa bir kelime denemek çoğu zaman işe yarıyor: &quot;organik pamuklu
                zıbın&quot; yerine &quot;zıbın&quot;.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {kategoriler.map((k) => (
                  <Link key={k.slug} href={`/${k.slug}`} className={`${ROZET} border-cizgi text-metin-2 hover:border-mercan hover:text-metin`}>
                    {k.ad}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {sonuclar.map((u) => (
                <UrunKarti key={u.slug} urun={u} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
