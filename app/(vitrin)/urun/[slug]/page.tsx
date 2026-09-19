import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import UrunGorseli from "@/ui/urun-gorseli";
import UrunKarti from "@/ui/urun-karti";
import VaryantSecici from "@/ui/varyant-secici";
import {
  benzerUrunler,
  fiyatYaz,
  kategoriGetir,
  urunGetir,
  urununBedenleri,
} from "@/server/katalog";

export async function generateMetadata({ params }: PageProps<"/urun/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const urun = await urunGetir(slug);
  if (!urun) return {};
  return {
    title: urun.ad,
    description: `${urun.ozet} · ${urun.kumasIcerigi}`,
  };
}

export default async function UrunSayfasi({ params }: PageProps<"/urun/[slug]">) {
  const { slug } = await params;
  const urun = await urunGetir(slug);
  if (!urun) notFound();

  const [kategori, benzerler] = await Promise.all([
    kategoriGetir(urun.kategori),
    benzerUrunler(urun),
  ]);
  const bedenler = urununBedenleri(urun);

  const indirimYuzdesi = urun.eskiFiyatKurus
    ? Math.round((1 - urun.fiyatKurus / urun.eskiFiyatKurus) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-xs text-metin-3">
        <Link href="/" className="hover:underline">
          Ana sayfa
        </Link>
        {kategori && (
          <>
            <span> · </span>
            <Link href={`/${kategori.slug}`} className="hover:underline">
              {kategori.ad}
            </Link>
          </>
        )}
        <span> · {urun.ad}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <UrunGorseli tip={urun.gorsel} palet={urun.palet} className="aspect-square" />
          <div className="grid grid-cols-4 gap-3">
            {urun.renkler.slice(0, 4).map((r) => (
              <UrunGorseli key={r} tip={urun.gorsel} palet={r} className="aspect-square" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-2xl sm:text-3xl">{urun.ad}</h1>
            <p className="mt-1 text-sm text-metin-2">{urun.ozet}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-metin-3">
              <span className="text-sari-koyu" aria-hidden="true">
                {"★".repeat(Math.round(urun.puan))}
              </span>
              <span className="rakam font-semibold text-metin-2">
                {urun.puan.toLocaleString("tr-TR", { minimumFractionDigits: 1 })}
              </span>
              <span className="rakam">· {urun.yorumSayisi} değerlendirme</span>
            </p>
          </div>

          <p className="flex flex-wrap items-baseline gap-3">
            <span className="rakam font-baslik text-3xl font-bold text-mercan-koyu">
              {fiyatYaz(urun.fiyatKurus)}
            </span>
            {urun.eskiFiyatKurus && (
              <>
                <span className="rakam text-lg text-metin-3 line-through">
                  {fiyatYaz(urun.eskiFiyatKurus)}
                </span>
                <span className="rakam rounded-full bg-nane-soluk px-2.5 py-1 text-sm font-bold text-nane-koyu">
                  %{indirimYuzdesi} indirim
                </span>
              </>
            )}
          </p>

          <VaryantSecici
            bedenler={bedenler}
            renkler={urun.renkler}
            varyantlar={urun.varyantlar}
          />

          <div className="flex flex-col gap-3 rounded-marka border border-cizgi bg-yuzey p-4 text-sm">
            <div>
              <p className="font-bold">Ürün özellikleri</p>
              <ul className="mt-1.5 flex flex-col gap-1 text-metin-2">
                {urun.ozellikler.map((o) => (
                  <li key={o}>· {o}</li>
                ))}
              </ul>
            </div>
            <div className="border-t border-cizgi-soluk pt-3">
              <p className="font-bold">Kumaş içeriği</p>
              <p className="mt-1 text-metin-2">{urun.kumasIcerigi}</p>
            </div>
            <div className="border-t border-cizgi-soluk pt-3">
              <p className="font-bold">Yıkama talimatı</p>
              <p className="mt-1 text-metin-2">{urun.yikamaTalimati}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="text-xl">Bunlara da bakabilirsin</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {benzerler.map((u) => (
            <UrunKarti key={u.slug} urun={u} />
          ))}
        </div>
      </section>
    </div>
  );
}
