import Image from "next/image";
import Link from "next/link";
import SepetSayaci from "@/ui/sepet-sayaci";
import AramaKutusu from "@/ui/arama-kutusu";
import HesapBaglantisi from "@/ui/hesap-baglantisi";
import { kategorileriGetir } from "@/server/katalog";

/**
 * Üst çubuk.
 *
 * **Mobil menü `<details>` ile.** Tarayıcının kendi açılır öğesi: JavaScript
 * kapalıyken çalışıyor, klavyeyle açılıp kapanıyor, ekran okuyucu "genişlet"
 * diye okuyor. Aynı işi bir düğme ve durum değişkeniyle yapmak JavaScript'e
 * bağımlılık getirirdi — sitenin geri kalanı buna bağlı değil (K-40).
 *
 * Kategori bağlantıları iki kez yazılıyor: açılır menüde (küçük ekran) ve
 * düz şerit olarak (geniş ekran). `<details>` kapalıyken içeriğini tarayıcı
 * gizlediği için geniş ekranda "hep açık" hâle getirmenin temiz bir yolu yok;
 * beş-on bağlantının iki kez yazılması bu kadar kırılganlığa değmiyor.
 */
export default async function UstCubuk() {
  const kategoriler = await kategorileriGetir();

  return (
    <header className="border-b border-cizgi-soluk bg-zemin">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
        <Link href="/" className="flex-none" aria-label="BASoftBaby ana sayfa">
          <Image
            src="/marka/basoftbaby-logo-yatay.svg"
            alt="BASoftBaby"
            width={186}
            height={42}
            priority
            unoptimized
          />
        </Link>

        {/* Geniş ekran: düz şerit */}
        <nav
          aria-label="Kategoriler"
          className="hidden flex-1 flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-metin-2 sm:flex"
        >
          {kategoriler.map((k) => (
            <Link
              key={k.slug}
              href={`/${k.slug}`}
              className="whitespace-nowrap hover:text-mercan-koyu"
            >
              {k.ad}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex flex-none items-center gap-2 sm:ml-0">
          <HesapBaglantisi />
          <SepetSayaci />
        </div>

        <div className="order-3 w-full sm:order-none sm:w-56 lg:w-72">
          <AramaKutusu />
        </div>

        {/* Küçük ekran: açılır menü */}
        <details className="group order-4 w-full sm:hidden">
          <summary className="flex list-none items-center justify-between rounded-full border border-cizgi bg-yuzey px-4 py-2 text-sm font-bold text-metin-2 [&::-webkit-details-marker]:hidden">
            <span>Kategoriler</span>
            <span aria-hidden="true" className="transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <nav aria-label="Kategoriler (mobil)" className="mt-2 flex flex-col">
            {kategoriler.map((k) => (
              <Link
                key={k.slug}
                href={`/${k.slug}`}
                className="border-b border-cizgi-soluk py-2.5 text-sm font-semibold text-metin-2 last:border-0 hover:text-mercan-koyu"
              >
                {k.ad}
              </Link>
            ))}
            <Link
              href="/urunler"
              className="py-2.5 text-sm font-bold text-mavi-koyu hover:underline"
            >
              Tüm ürünler →
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
