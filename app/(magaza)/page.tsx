import Link from "next/link";
import type { Metadata } from "next";
import HeroBanner from "@/ui/hero-banner";
import UrunKarti from "@/ui/urun-karti";
import YapisalVeri from "@/ui/yapisal-veri";
import { kunyeGetir } from "@/server/yasal";
import { siteAdresi, tamAdres } from "@/server/site";
import { kategorileriGetir, oneCikanUrunler, urunleriGetir } from "@/server/katalog";
import { ayarlariGetir, type SatisAyari } from "@/server/sepet";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { yasGruplari } from "@/server/yas-gruplari";
import { tonSiniflari } from "@/ui/kategori-tonu";
import { CAYMA_GUN } from "@/ui/talep-bicim";
import { SonBakilanlar } from "@/ui/son-bakilan";
import { aramaMotoruAyari } from "@/server/arama-motoru";

/**
 * Ana sayfadaki yaş kutuları yaş grubuna gidiyor, tek bedene değil: "6-12 ay"
 * kutusu önceden yalnızca 6-9 beden ürünleri getiriyor, 9-12 bedendekiler
 * görünmüyordu. Grup listesi artık panelden geliyor (K-65); hiç grup yoksa
 * bölüm çizilmiyor — boş bir "Yaşa göre" başlığı mağazayı eksik gösterir.
 */

/**
 * Kargo sınırı panelden değişebildiği için sabit yazılmıyor: ayarla sepetin
 * söylediği rakam birbirini tutmazsa müşteri haklı olarak yanıltıldığını
 * düşünür.
 */
function guvenSatirlari(ayar: SatisAyari): string[] {
  return [
    "%100 organik pamuk",
    ayar.bedavaKargoEsigi > 0
      ? `${fiyatYaz(ayar.bedavaKargoEsigi)} üzeri kargo bedava`
      : "Aynı gün kargo",
    `${CAYMA_GUN} gün içinde iade`,
    "Üyeliksiz sipariş",
  ];
}

/**
 * Arama motoru doğrulama etiketleri ana sayfada (K-129): Search Console,
 * Bing ve Yandex sahipliği buradan kontrol ediyor. Kodlar panelden.
 */
export async function generateMetadata(): Promise<Metadata> {
  const a = await aramaMotoruAyari();
  return {
    alternates: { canonical: "/" },
    verification: {
      google: a.googleDogrulama || undefined,
      yandex: a.yandexDogrulama || undefined,
      other: a.bingDogrulama ? { "msvalidate.01": a.bingDogrulama } : undefined,
    },
  };
}

export default async function AnaSayfa() {
  const [urunler, kategoriler, ayar, kunye, yasKutulari, indirimdekiler] = await Promise.all([
    oneCikanUrunler(8),
    kategorileriGetir(),
    ayarlariGetir(),
    kunyeGetir(),
    yasGruplari(),
    urunleriGetir({ indirim: true, sirala: "indirim" }),
  ]);
  const guven = guvenSatirlari(ayar);

  return (
    <>
      {/* Mağazanın kimliği: arama sonucunda site adı ve künye doğru görünsün.
          Telefon ve adres yalnızca künyeye girilmişse yazılıyor. */}
      <YapisalVeri
        veri={{
          "@context": "https://schema.org",
          "@type": "OnlineStore",
          name: kunye.unvan || "BASoftBaby",
          alternateName: "BASoftBaby",
          url: siteAdresi(),
          logo: tamAdres("/marka/basoftbaby-logo.png"),
          description: "Organik pamuklu bebek kıyafetleri, zıbın, tulum ve uyku ürünleri.",
          ...(kunye.destekTelefon || kunye.destekEposta
            ? {
                contactPoint: {
                  "@type": "ContactPoint",
                  contactType: "customer support",
                  ...(kunye.destekTelefon ? { telephone: kunye.destekTelefon } : {}),
                  ...(kunye.destekEposta ? { email: kunye.destekEposta } : {}),
                },
              }
            : {}),
        }}
      />

      <HeroBanner />

      {yasKutulari.length > 0 && (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl">Yaşa göre</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {yasKutulari.map((y, i) => {
            const ton = tonSiniflari(i);
            return (
              <Link
                key={y.kod}
                href={`/urunler?yas=${encodeURIComponent(y.kod)}`}
                className={`group rounded-marka border ${ton.kenar} ${ton.zemin} px-4 py-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                {/* İşaret rengi kimliği taşıyor; yazı metin tonlarında
                    kalıyor, soluk zeminde kontrast düşmesin (K-60). */}
                <span
                  aria-hidden="true"
                  className={`mx-auto mb-2 block h-2 w-8 rounded-full ${ton.isaret} transition group-hover:w-12`}
                />
                <p className="font-baslik font-bold text-metin">{y.ad}</p>
                <p className="rakam mt-1 text-sm text-metin-2">{y.aciklama}</p>
              </Link>
            );
          })}
        </div>
      </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl">Bu haftanın favorileri</h2>
          <Link href="/urunler" className="text-sm font-bold text-mavi-koyu hover:underline">
            Tümünü gör
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {urunler.map((u) => (
            <UrunKarti key={u.slug} urun={u} />
          ))}
        </div>
      </section>

      {/* İndirimdekiler (K-164): en çok indirimli dört ürün; indirim yoksa şerit yok. */}
      {indirimdekiler.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl text-mercan-koyu">İndirimdekiler</h2>
            <Link href="/indirim" className="text-sm font-bold text-mavi-koyu hover:underline">
              Tümünü gör
              {indirimdekiler.length > 4 && (
                <span className="rakam"> ({indirimdekiler.length})</span>
              )}
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {indirimdekiler.slice(0, 4).map((u) => (
              <UrunKarti key={u.slug} urun={u} />
            ))}
          </div>
        </section>
      )}

      {/* Doğum listesi tanıtımı (K-145). */}
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex flex-col items-start gap-4 rounded-marka border border-nane bg-nane-soluk p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-xl">
            <p className="text-sm font-bold text-nane-koyu">Yeni · ücretsiz</p>
            <h2 className="mt-1 text-2xl">Doğum listeni oluştur</h2>
            <p className="mt-2 text-sm text-metin-2">
              İstediklerini beden ve rengiyle listele, bağlantıyı yakınlarınla paylaş. Alınan
              hediyeler işaretlenir; aynı hediye iki kez gelmez.
            </p>
          </div>
          <Link
            href="/dogum-listesi"
            className="flex-none rounded-full bg-dugme px-6 py-3 font-bold text-dugme-yazi transition hover:brightness-95"
          >
            Nasıl çalışıyor?
          </Link>
        </div>
      </section>

      {/* Geri dönen müşteri kaldığı yeri görsün (K-95). */}
      <SonBakilanlar className="mx-auto max-w-6xl px-4 pb-12" />

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="text-xl">Kategoriler</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {kategoriler.map((k) => {
            // Ton kategorinin kendi sırasından: kapatma ötekilerin rengini
            // kaydırmıyor (K-60).
            const ton = tonSiniflari(k.sira);
            return (
              <Link
                key={k.slug}
                href={`/${k.slug}`}
                className={`group rounded-marka border ${ton.kenar} ${ton.zemin} p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <span
                  aria-hidden="true"
                  className={`mb-2 block h-2 w-8 rounded-full ${ton.isaret} transition group-hover:w-12`}
                />
                <p className="font-baslik font-bold text-metin">{k.ad}</p>
                <p className="mt-1 text-sm text-metin-2">{k.aciklama}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-t border-cizgi-soluk bg-yuzey-sicak">
        <ul className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-8 gap-y-2 px-4 py-6 text-sm font-semibold text-metin-2">
          {guven.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
