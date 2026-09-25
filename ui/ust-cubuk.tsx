import Image from "next/image";
import Link from "next/link";
import AramaKutusu from "@/ui/arama-kutusu";
import { HesapBaglantisi, SepetSayaci } from "@/ui/ziyaretci";
import OdemedeGizli from "@/ui/odemede-gizli";
import { kategorileriGetir } from "@/server/katalog";

/**
 * Üst çubuk.
 *
 * **İki sıra.** Logo, arama ve hesap üstte; kategori şeridi altta. Eskiden
 * hepsi tek bir sarmalayan kutudaydı ve kategoriler satır sonuna gelince
 * alta taşıyordu: uzun adlı altı kategoriyle şerit ikiye bölünüyor, logo ile
 * arama kutusu yer değiştiriyor, başlık her sayfada başka boyda oluyordu
 * (K-73).
 *
 * **Şerit sarmıyor, kayıyor.** Kategori sayısı ne olursa olsun tek satır:
 * sığmayanlar yatay kaydırmayla geliyor. Başlığın yüksekliği kategori
 * sayısına bağlı olmaktan çıkıyor.
 *
 * **Mobil menü `<details>` ile.** Tarayıcının kendi açılır öğesi:
 * JavaScript kapalıyken çalışıyor, klavyeyle açılıp kapanıyor, ekran
 * okuyucu "genişlet" diye okuyor. Aynı işi bir düğme ve durum değişkeniyle
 * yapmak JavaScript'e bağımlılık getirirdi (K-40).
 *
 * Kategori bağlantıları iki kez yazılıyor: açılır menüde (küçük ekran) ve
 * şeritte (geniş ekran). `<details>` kapalıyken içeriğini tarayıcı
 * gizlediği için geniş ekranda "hep açık" hâle getirmenin temiz bir yolu
 * yok; birkaç bağlantının iki kez yazılması bu kadar kırılganlığa değmiyor.
 *
 * **Ödeme sayfasında kategori menüsü yok** (K-84): müşteri işlemi bitirmeden
 * vitrine dağılmasın. Logo, arama, hesap ve sepet duruyor.
 */

const SERIT_BAGLANTISI =
  "whitespace-nowrap rounded-full border border-cizgi bg-yuzey px-3.5 py-1.5 text-sm font-semibold text-metin-2 transition hover:border-mercan hover:text-mercan-koyu";

export default async function UstCubuk() {
  const kategoriler = await kategorileriGetir();

  return (
    <header className="border-b border-cizgi-soluk bg-zemin">
      {/* Üst sıra: logo · arama · hesap ve sepet */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
        <Link href="/" className="flex-none" aria-label="BASoftBaby ana sayfa">
          {/* Yatay logo (K-160): rozetin amblemi ve yazısı yan yana, orijinal
              görselden kesildi; yeniden çizilmedi. Yuvarlak rozet yazıyı
              küçültüyordu, yatayda "BAsoftbaby" aynı yükseklikte okunuyor. */}
          <Image
            src="/marka/basoftbaby-yatay.webp"
            alt="BASoftBaby"
            width={732}
            height={185}
            priority
            unoptimized
            className="h-11 w-auto sm:h-14"
          />
        </Link>

        <div className="ml-auto flex flex-none items-center gap-2 sm:order-last sm:ml-0">
          <HesapBaglantisi />
          <SepetSayaci />
        </div>

        {/* Arama telefonda kendi satırında, geniş ekranda ortada esniyor. */}
        <div className="order-3 w-full sm:order-none sm:ml-auto sm:w-64 lg:w-80">
          <AramaKutusu />
        </div>

        {/* Küçük ekran: açılır kategori menüsü */}
        {kategoriler.length > 0 && (
          <OdemedeGizli>
          <details className="group order-4 w-full sm:hidden">
            <summary className="flex list-none items-center justify-between rounded-full border border-cizgi bg-yuzey px-4 py-2 text-sm font-bold text-metin-2 [&::-webkit-details-marker]:hidden">
              <span>Kategoriler</span>
              <span aria-hidden="true" className="transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <nav aria-label="Kategoriler" className="mt-2 flex flex-col">
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
                className="border-b border-cizgi-soluk py-2.5 text-sm font-bold text-mavi-koyu hover:underline"
              >
                Tüm ürünler →
              </Link>
              <Link
                href="/dogum-listesi"
                className="py-2.5 text-sm font-bold text-nane-koyu hover:underline"
              >
                Doğum listesi →
              </Link>
            </nav>
          </details>
          </OdemedeGizli>
        )}
      </div>

      {/* Geniş ekran: tek satırlık kategori şeridi */}
      {kategoriler.length > 0 && (
        <OdemedeGizli>
        <nav
          aria-label="Kategoriler"
          className="hidden border-t border-cizgi-soluk sm:block"
        >
          {/*
            `-mx-4 px-4`: şerit kenardan kenara kayıyor, son kategori
            çerçeveye yapışmıyor. `scrollbar-gizli` yalnızca çubuğu
            saklıyor — kaydırma, klavye ve dokunma olduğu gibi çalışıyor.
          */}
          <div className="mx-auto max-w-6xl px-4">
            <div className="scrollbar-gizli -mx-4 flex gap-2 overflow-x-auto px-4 py-2.5">
              <Link href="/urunler" className={`${SERIT_BAGLANTISI} font-bold`}>
                Tüm ürünler
              </Link>
              {/* Doğum listesi (K-145): kategorilerden ayrı dursun diye nane tonunda. */}
              <Link
                href="/dogum-listesi"
                className="whitespace-nowrap rounded-full border border-nane bg-nane-soluk px-3.5 py-1.5 text-sm font-bold text-nane-koyu transition hover:border-nane-koyu"
              >
                Doğum listesi
              </Link>
              {kategoriler.map((k) => (
                <Link key={k.slug} href={`/${k.slug}`} className={SERIT_BAGLANTISI}>
                  {k.ad}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        </OdemedeGizli>
      )}
    </header>
  );
}
