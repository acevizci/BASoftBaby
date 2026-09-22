import Link from "next/link";
import type { Metadata } from "next";
import UrunKarti from "@/ui/urun-karti";
import AramaKutusu from "@/ui/arama-kutusu";
import {
  SIRALAMALAR,
  SIRALAMA_ADLARI,
  kategorileriGetir,
  urunSayfasi,
  urunleriGetir,
} from "@/server/katalog";
import Sayfalama from "@/ui/sayfalama";
import { sayfaAdresi } from "@/ui/sayfalama-bicim";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arama",
  // Arama sonuçları dizine girmemeli: her sorgu ayrı bir sayfa gibi görünüp
  // sitenin kendi sayfalarının sırasını yer.
  robots: { index: false, follow: true },
};

const ROZET = "rounded-full border px-3 py-1.5 text-xs font-bold transition";

/** Sonuç ızgarası dört sütuna kadar çıkıyor; 24 her genişlikte tam sıra. */
const IZGARA_BOYU = 24;

/** Sonuç yokken sayfalama da olmamalı; boş bir durum nesnesi. */
const BOS_DURUM = { sayfa: 1, sonSayfa: 1, atla: 0, boy: IZGARA_BOYU, toplam: 0 };

export default async function AramaSayfasi({ searchParams }: PageProps<"/arama">) {
  const aranan = await searchParams;
  const q = typeof aranan.q === "string" ? aranan.q.slice(0, 100) : "";
  const kategori = typeof aranan.kategori === "string" ? aranan.kategori : undefined;
  const siralama = typeof aranan.sirala === "string" ? aranan.sirala : undefined;

  const [sayfali, kategoriler] = await Promise.all([
    q
      ? urunSayfasi({ ara: q, kategori, sirala: siralama }, aranan.sayfa, IZGARA_BOYU)
      : Promise.resolve({ urunler: [], durum: BOS_DURUM }),
    kategorileriGetir(),
  ]);
  const sonuclar = sayfali.urunler;
  const durum = sayfali.durum;

  // Kategori rozetleri yalnızca sonucu olan kategorileri gösteriyor; boş bir
  // daraltmayı tıklatmanın anlamı yok.
  // Kategori rozetlerindeki sayılar bütün sonuçtan geliyor, sayfadakinden
  // değil: "bu kategoride 3" yazarken ekrandaki üç kartı değil gerçek sayıyı
  // söylemeli (K-67).
  const hepsi = q ? await urunleriGetir({ ara: q }) : [];
  const sayilar = new Map<string, number>();
  for (const u of hepsi) sayilar.set(u.kategori, (sayilar.get(u.kategori) ?? 0) + 1);

  const adres = (k?: string, sr?: string) => {
    const p = new URLSearchParams({ q });
    if (k) p.set("kategori", k);
    if (sr && sr !== "onerilen") p.set("sirala", sr);
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
            {kategori && durum.toplam !== hepsi.length && (
              <span className="text-metin-3">
                {" "}
                · bu kategoride <span className="rakam">{durum.toplam}</span>
              </span>
            )}
          </p>

          {hepsi.length > 0 && sayilar.size > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={adres(undefined, siralama)}
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
                    href={adres(k.slug, siralama)}
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

          {durum.toplam > 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-metin-3">Sırala:</span>
              {SIRALAMALAR.map((sr) => {
                const seciliSr = (siralama ?? "onerilen") === sr;
                return (
                  <Link
                    key={sr}
                    href={adres(kategori, sr)}
                    aria-pressed={seciliSr}
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                      seciliSr
                        ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                        : "border-cizgi text-metin-2 hover:border-metin-3"
                    }`}
                  >
                    {SIRALAMA_ADLARI[sr]}
                  </Link>
                );
              })}
            </div>
          )}

          {durum.toplam === 0 ? (
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

          <div className="mt-8">
            <Sayfalama
              durum={durum}
              birim="ürün"
              adres={(n) => sayfaAdresi(adres(kategori, siralama), n)}
            />
          </div>
        </>
      )}
    </div>
  );
}
