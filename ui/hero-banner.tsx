import Image from "next/image";
import Link from "next/link";
import UrunGorseli from "@/ui/urun-gorseli";
import { bannerSaniyeGetir, yayindakiBannerlar, type Banner } from "@/server/banner";
import type { GorselTipi } from "@/ui/katalog-bicim";
import { bannerPaleti } from "@/ui/banner-bicim";

/** Bir slaytın ekranda durduğu süre, geçiş payı dışarıda kalacak şekilde. */
const DURMA_ORANI = 0.82;

/**
 * Panelde hiç banner tanımlı değilken gösterilen varsayılan. Ana sayfa asla
 * başlıksız kalmasın diye var; panelden ilk banner eklenince yerini bırakır.
 */
const VARSAYILAN: Banner = {
  id: "varsayilan",
  baslik: "Minik bedenlere, yumuşacık kumaşlar",
  altYazi:
    "%100 organik pamuk, dikişsiz bantlar, kolay çıtçıtlı kalıplar. Bebeğin hassas cildi için seçilmiş ürünler.",
  dugmeYazi: "Tüm ürünler",
  dugmeLink: "/urunler",
  palet: "sari",
  gorsel: "amblem",
};

/**
 * Kaç slayt varsa o kadar duraklı bir kayma üretir. Son slayttan ilkine
 * dönerken geriye sarmasın diye ilk slaytın bir kopyası sona ekleniyor ve
 * şerit tam o kopyanın üstünde başa dönüyor; birleşme yeri görünmüyor.
 */
function izKareleri(adet: number): string {
  const toplam = adet + 1;
  const adim = 100 / adet;
  const kareler: string[] = [];

  for (let i = 0; i < adet; i += 1) {
    const yer = -((i * 100) / toplam);
    kareler.push(`${(i * adim).toFixed(4)}% { transform: translateX(${yer.toFixed(4)}%); }`);
    kareler.push(
      `${(i * adim + adim * DURMA_ORANI).toFixed(4)}% { transform: translateX(${yer.toFixed(4)}%); }`,
    );
  }
  kareler.push(`100% { transform: translateX(${(-(adet * 100) / toplam).toFixed(4)}%); }`);

  return kareler.join("\n");
}

/** Noktanın yanık kaldığı süre bir slaytın payı kadar. */
function noktaKareleri(adet: number): string {
  const pay = (100 / adet).toFixed(4);
  return [
    "0% { opacity: 1; width: 18px; }",
    `${pay}% { opacity: 1; width: 18px; }`,
    `${(100 / adet + 0.01).toFixed(4)}% { opacity: 0.35; width: 7px; }`,
    "100% { opacity: 0.35; width: 7px; }",
  ].join("\n");
}

function Gorsel({ banner }: { banner: Banner }) {
  // Mağazanın rozet logosu olduğu gibi, yazısıyla (K-138).
  if (banner.gorsel === "amblem") {
    return (
      <Image
        src="/marka/basoftbaby-logo-440.webp"
        alt=""
        width={220}
        height={220}
        priority
        unoptimized
        className="h-44 w-44 sm:h-[220px] sm:w-[220px]"
      />
    );
  }
  return (
    <UrunGorseli
      tip={banner.gorsel as GorselTipi}
      palet={bannerPaleti(banner.palet)}
      className="h-28 w-28 rounded-marka"
    />
  );
}

/**
 * Resimli banner (K-89): yalnızca resim. Yazı resmin içinde olduğu için
 * sayfaya ayrıca yazılmıyor; başlık resmin alternatif metni. Bağlantı varsa
 * resmin tamamı tıklanıyor. Telefon resmi varsa dar ekranda o gösteriliyor —
 * geniş bir kampanya görseli telefonda okunmayacak kadar küçülüyor.
 */
function ResimSlayt({
  banner,
  kopya,
  ilk,
}: {
  banner: Banner;
  kopya: boolean;
  ilk: boolean;
}) {
  const r = banner.resim!;
  const t = banner.telefonResmi;
  const resim = (
    <picture>
      {t && <source media="(max-width: 639px)" srcSet={t.yol} />}
      {/* next/image değil: dosyalar yüklenirken zaten küçültülüp webp'ye
          çevriliyor, iyileştiricinin aylık sınırı var (ürün fotoğraflarıyla aynı). */}
      <img
        src={r.yol}
        srcSet={`${r.kucukYol} 1000w, ${r.yol} ${r.genislik || 2400}w`}
        sizes="100vw"
        width={r.genislik || undefined}
        height={r.yukseklik || undefined}
        alt={kopya ? "" : banner.baslik}
        loading={ilk && !kopya ? "eager" : "lazy"}
        fetchPriority={ilk && !kopya ? "high" : undefined}
        decoding="async"
        className="mx-auto block h-auto w-full max-w-[2400px]"
      />
    </picture>
  );
  return (
    <article className="hero-slayt" data-resim="1" aria-hidden={kopya || undefined}>
      {banner.dugmeLink ? (
        <Link
          href={banner.dugmeLink}
          tabIndex={kopya ? -1 : undefined}
          aria-label={banner.dugmeYazi || banner.baslik || undefined}
          className="block w-full"
        >
          {resim}
        </Link>
      ) : (
        <div className="w-full">{resim}</div>
      )}
    </article>
  );
}

function Slayt({
  banner,
  kopya = false,
  ilk = false,
}: {
  banner: Banner;
  kopya?: boolean;
  ilk?: boolean;
}) {
  if (banner.resim) return <ResimSlayt banner={banner} kopya={kopya} ilk={ilk} />;
  return (
    <article className="hero-slayt" data-palet={banner.palet} aria-hidden={kopya || undefined}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-14 text-center sm:py-20">
        <Gorsel banner={banner} />
        <h2 className="max-w-xl font-baslik text-3xl font-bold sm:text-5xl">{banner.baslik}</h2>
        {banner.altYazi && (
          <p className="max-w-lg text-base text-metin-2 sm:text-lg">{banner.altYazi}</p>
        )}
        {banner.dugmeYazi && banner.dugmeLink && (
          <Link
            href={banner.dugmeLink}
            tabIndex={kopya ? -1 : undefined}
            className="rounded-full bg-dugme px-6 py-3 font-bold text-dugme-yazi transition hover:brightness-95"
          >
            {banner.dugmeYazi}
          </Link>
        )}
      </div>
    </article>
  );
}

/**
 * Ana sayfanın dönen banner'ı. Tek banner varsa sabit durur; birden çoksa
 * kendiliğinden geçer. Geçiş tamamen CSS, sayfada bunun için JavaScript yok.
 */
export default async function HeroBanner() {
  const [kayitlar, saniye] = await Promise.all([yayindakiBannerlar(), bannerSaniyeGetir()]);
  const bannerlar = kayitlar.length > 0 ? kayitlar : [VARSAYILAN];

  const adet = bannerlar.length;
  const tek = adet === 1;
  const toplam = adet + 1;
  const sure = Math.max(2, saniye) * adet;

  return (
    <section
      className="hero"
      data-tek={tek ? "1" : "0"}
      style={
        {
          "--hero-adet": toplam,
          "--hero-sure": `${sure}s`,
        } as React.CSSProperties
      }
      aria-label="Öne çıkanlar"
    >
      {!tek && (
        <style
          // Kare sayısı slayt sayısına bağlı; bu yüzden burada üretiliyor.
          dangerouslySetInnerHTML={{
            __html:
              `@keyframes hero-gec {\n${izKareleri(adet)}\n}\n` +
              `@keyframes hero-nokta {\n${noktaKareleri(adet)}\n}`,
          }}
        />
      )}

      <div className="hero-iz">
        {bannerlar.map((b, i) => (
          <Slayt key={b.id} banner={b} ilk={i === 0} />
        ))}
        {!tek && <Slayt banner={bannerlar[0]} kopya />}
      </div>

      {!tek && (
        <div className="hero-noktalar" aria-hidden="true">
          {bannerlar.map((b, i) => (
            <span
              key={b.id}
              className="hero-nokta"
              style={
                {
                  animationDelay: `calc(var(--hero-sure) * -${((adet - i) / adet).toFixed(4)})`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
