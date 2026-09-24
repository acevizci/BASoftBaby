import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { rehberGetir, yayindakiRehberler } from "@/server/rehber";
import { urunleriSec } from "@/server/katalog";
import { tamAdres } from "@/server/site";
import { sayfaYolu } from "@/server/yapisal-veri";
import { duzMetin } from "@/ui/rehber-bicim";
import RehberMetni from "@/ui/rehber-metni";
import UrunKarti from "@/ui/urun-karti";
import YapisalVeri from "@/ui/yapisal-veri";

/** Rehber yazısı (K-132). Önbellekten; panelde kaydedilince düşüyor. */
export const revalidate = 3600;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return (await yayindakiRehberler()).map((y) => ({ slug: y.slug }));
}

export async function generateMetadata({ params }: PageProps<"/rehber/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const y = await rehberGetir(slug);
  if (!y) return {};
  const aciklama = y.ozet || duzMetin(y.metin).slice(0, 160);
  return {
    title: y.baslik,
    description: aciklama,
    alternates: { canonical: `/rehber/${y.slug}` },
    openGraph: {
      title: y.baslik,
      description: aciklama,
      url: `/rehber/${y.slug}`,
      type: "article",
      publishedTime: y.yayinTarihi,
      modifiedTime: y.guncellendi,
    },
  };
}

function tarih(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function RehberYazisi({ params }: PageProps<"/rehber/[slug]">) {
  const { slug } = await params;
  const y = await rehberGetir(slug);
  if (!y) notFound();
  // Yayından kalkmış ya da silinmiş ürün sessizce atlanıyor.
  const urunler = await urunleriSec({ sluglar: y.urunSluglari });

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <YapisalVeri
        veri={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: y.baslik,
          description: y.ozet || undefined,
          datePublished: y.yayinTarihi,
          dateModified: y.guncellendi,
          author: { "@type": "Organization", name: "BASoftBaby", url: tamAdres("/") },
          publisher: { "@type": "Organization", name: "BASoftBaby" },
          mainEntityOfPage: tamAdres(`/rehber/${y.slug}`),
        }}
      />
      <YapisalVeri
        veri={sayfaYolu(
          [
            { ad: "Ana sayfa", yol: "/" },
            { ad: "Rehber", yol: "/rehber" },
            { ad: y.baslik, yol: `/rehber/${y.slug}` },
          ],
          tamAdres,
        )}
      />

      <nav className="text-xs text-metin-3">
        <Link href="/" className="hover:underline">
          Ana sayfa
        </Link>
        <span> · </span>
        <Link href="/rehber" className="hover:underline">
          Rehber
        </Link>
      </nav>

      <h1 className="mt-3 text-2xl sm:text-3xl">{y.baslik}</h1>
      <p className="mt-2 text-xs text-metin-3">
        <time dateTime={y.yayinTarihi}>{tarih(y.yayinTarihi)}</time>
      </p>
      {y.ozet && <p className="mt-4 text-lg text-metin-2">{y.ozet}</p>}

      <RehberMetni metin={y.metin} className="mt-6" />

      {urunler.length > 0 && (
        <section className="mt-12 border-t border-cizgi-soluk pt-8">
          <h2 className="text-xl">Yazıda geçen ürünler</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {urunler.map((u) => (
              <UrunKarti key={u.slug} urun={u} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 text-sm">
        <Link href="/rehber" className="font-bold text-mavi-koyu hover:underline">
          ← Bütün rehber yazıları
        </Link>
      </p>
    </article>
  );
}
