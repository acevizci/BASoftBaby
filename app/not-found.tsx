import Link from "next/link";
import { kategorileriGetir } from "@/server/katalog";
import DuyuruSeridi from "@/ui/duyuru-seridi";
import UstCubuk from "@/ui/ust-cubuk";
import AltBilgi from "@/ui/alt-bilgi";

export const dynamic = "force-dynamic";

/**
 * Bulunamayan sayfa.
 *
 * Next.js'in kendi ekranı İngilizceydi ("This page could not be found") ve
 * çıkış yolu sunmuyordu: yanlış yazılmış bir adres, kaldırılmış bir ürün ya
 * da süresi dolmuş bir kampanya bağlantısı müşteriyi boş bir ekranda
 * bırakıyordu (K-48).
 *
 * **Mağaza çerçevesi burada elle çiziliyor.** Kök `not-found.tsx` kök düzenin
 * içinde çalışıyor, `(magaza)` grubunun düzeninin değil — grup düzenleri
 * yalnızca kendi altlarındaki sayfalara uygulanıyor. Panelde ayrı bir 404
 * var, o da kendi çerçevesini çiziyor.
 */
export default async function Bulunamadi() {
  const kategoriler = await kategorileriGetir();

  return (
    <>
      <DuyuruSeridi />
      <UstCubuk />
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <p className="rakam font-baslik text-5xl font-bold text-mercan-koyu">404</p>
          <h1 className="mt-4 text-2xl sm:text-3xl">Bu sayfayı bulamadık</h1>
          <p className="mt-3 text-sm text-metin-2">
            Adres yanlış yazılmış olabilir ya da aradığın ürün kaldırılmış olabilir.
            Aşağıdan arayabilir veya kategorilere göz atabilirsin.
          </p>

          {/* Düz GET formu: JavaScript kapalıyken de çalışıyor. */}
          <form
            method="get"
            action="/arama"
            role="search"
            className="mx-auto mt-6 flex max-w-sm flex-wrap items-center gap-2"
          >
            <label htmlFor="bulunamadi-ara" className="sr-only">
              Ürün ara
            </label>
            <input
              id="bulunamadi-ara"
              name="q"
              placeholder="Ürün ara"
              className="min-w-[160px] flex-1 rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2.5 text-sm text-metin outline-none focus:border-mercan"
            />
            <button
              type="submit"
              className="rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
            >
              Ara
            </button>
          </form>

          {kategoriler.length > 0 && (
            <nav aria-label="Kategoriler" className="mt-8">
              <p className="text-xs font-bold uppercase tracking-wide text-metin-3">
                Kategoriler
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {kategoriler.map((k) => (
                  <Link
                    key={k.slug}
                    href={`/${k.slug}`}
                    className="rounded-full border border-cizgi bg-yuzey px-4 py-2 text-sm font-semibold text-metin-2 transition hover:border-mercan hover:text-metin"
                  >
                    {k.ad}
                  </Link>
                ))}
              </div>
            </nav>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-bold">
            <Link href="/" className="text-mavi-koyu hover:underline">
              Ana sayfa
            </Link>
            <Link href="/urunler" className="text-mavi-koyu hover:underline">
              Tüm ürünler
            </Link>
            <Link href="/siparis-takip" className="text-mavi-koyu hover:underline">
              Sipariş takibi
            </Link>
            <Link href="/sikca-sorulanlar" className="text-mavi-koyu hover:underline">
              Sıkça sorulanlar
            </Link>
          </div>
        </div>
      </main>
      <AltBilgi />
    </>
  );
}
