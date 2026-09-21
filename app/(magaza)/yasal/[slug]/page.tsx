import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import YasalMetin, { KunyeKutusu } from "@/ui/yasal-metin";
import { kunyeGetir, yasalSayfaGetir, yasalSayfalariGetir } from "@/server/yasal";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/yasal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const sayfa = await yasalSayfaGetir(slug);
  if (!sayfa) return {};

  return {
    title: sayfa.baslik,
    description: sayfa.ozet || undefined,
    alternates: { canonical: `/yasal/${sayfa.slug}` },
    // Taslak metin arama sonuçlarına düşmesin: onaylanmamış bir sözleşme
    // Google'da görünüp müşteriye geçerli metin gibi gelmemeli.
    robots: sayfa.taslakMi ? { index: false, follow: true } : undefined,
  };
}

/** Yasal metin sayfası. İçerik panelden, künye satış ayarlarından geliyor. */
export default async function YasalSayfa({ params }: PageProps<"/yasal/[slug]">) {
  const { slug } = await params;
  const [sayfa, sayfalar, kunye] = await Promise.all([
    yasalSayfaGetir(slug),
    yasalSayfalariGetir(),
    kunyeGetir(),
  ]);
  if (!sayfa) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Yasal metinler" className="flex flex-wrap gap-2">
        {sayfalar.map((s) => (
          <Link
            key={s.slug}
            href={`/yasal/${s.slug}`}
            aria-current={s.slug === sayfa.slug ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              s.slug === sayfa.slug
                ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                : "border-cizgi bg-yuzey text-metin-2 hover:border-mercan hover:text-metin"
            }`}
          >
            {s.baslik}
          </Link>
        ))}
      </nav>

      <h1 className="mt-6 text-2xl sm:text-3xl">{sayfa.baslik}</h1>
      {sayfa.ozet && <p className="mt-2 text-sm text-metin-2">{sayfa.ozet}</p>}

      {sayfa.taslakMi && (
        <p className="mt-4 rounded-marka bg-sari-soluk px-4 py-3 text-sm font-semibold text-sari-koyu">
          Bu metin taslaktır: hukuki incelemesi tamamlanmadı, şirket ve ETBİS bilgileri
          eklenmedi. Mağaza açılmadan önce son hâli yayımlanacak.
        </p>
      )}

      <YasalMetin icerik={sayfa.icerik} />

      <KunyeKutusu kunye={kunye} />

      <p className="mt-6 text-xs text-metin-3">
        Son güncelleme:{" "}
        <span className="rakam">
          {sayfa.guncellendi.toLocaleDateString("tr-TR", { dateStyle: "long" })}
        </span>
      </p>
    </div>
  );
}
