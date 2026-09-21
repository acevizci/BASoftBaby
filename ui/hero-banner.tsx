import Image from "next/image";
import Link from "next/link";
import UrunGorseli from "@/ui/urun-gorseli";
import { bannerSaniyeGetir, yayindakiBannerlar, type Banner } from "@/server/banner";
import type { GorselTipi, RenkAdi } from "@/ui/katalog-bicim";

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
  if (banner.gorsel === "amblem") {
    return (
      <Image
        src="/marka/basoftbaby-amblem.svg"
        alt=""
        width={116}
        height={116}
        priority
        unoptimized
      />
    );
  }
  return (
    <UrunGorseli
      tip={banner.gorsel as GorselTipi}
      palet={banner.palet as RenkAdi}
      className="h-28 w-28 rounded-marka"
    />
  );
}

function Slayt({ banner, kopya = false }: { banner: Banner; kopya?: boolean }) {
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
        {bannerlar.map((b) => (
          <Slayt key={b.id} banner={b} />
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
