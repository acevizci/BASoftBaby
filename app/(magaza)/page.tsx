import Link from "next/link";
import type { Metadata } from "next";
import HeroBanner from "@/ui/hero-banner";
import UrunKarti from "@/ui/urun-karti";
import YapisalVeri from "@/ui/yapisal-veri";
import { kunyeGetir } from "@/server/yasal";
import { siteAdresi, tamAdres } from "@/server/site";
import { kategorileriGetir, oneCikanUrunler } from "@/server/katalog";
import { ayarlariGetir, type SatisAyari } from "@/server/sepet";
import { fiyatYaz, YAS_GRUPLARI } from "@/ui/katalog-bicim";

/**
 * Ana sayfadaki yaş kutuları. Önceden tek bir bedene bağlıydı: "6-12 ay"
 * kutusu yalnızca 6-9 beden ürünleri getiriyor, 9-12 bedendekiler
 * görünmüyordu. Artık yaş grubuna gidiyor, grup birden çok bedeni kapsıyor.
 */
const YAS_KUTULARI = YAS_GRUPLARI;

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
    "14 gün içinde iade",
    "Üyeliksiz sipariş",
  ];
}

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function AnaSayfa() {
  const [urunler, kategoriler, ayar, kunye] = await Promise.all([
    oneCikanUrunler(8),
    kategorileriGetir(),
    ayarlariGetir(),
    kunyeGetir(),
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
          logo: tamAdres("/marka/basoftbaby-logo-yatay.svg"),
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

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl">Yaşa göre</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {YAS_KUTULARI.map((y) => (
            <Link
              key={y.kod}
              href={`/urunler?yas=${encodeURIComponent(y.kod)}`}
              className="rounded-marka border border-cizgi bg-yuzey px-4 py-5 text-center shadow-sm transition hover:border-mercan"
            >
              <p className="font-baslik font-bold">{y.ad}</p>
              <p className="rakam mt-1 text-sm text-metin-3">{y.aciklama}</p>
            </Link>
          ))}
        </div>
      </section>

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

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="text-xl">Kategoriler</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {kategoriler.map((k) => (
            <Link
              key={k.slug}
              href={`/${k.slug}`}
              className="rounded-marka border border-cizgi bg-yuzey p-4 shadow-sm transition hover:border-mercan"
            >
              <p className="font-baslik font-bold">{k.ad}</p>
              <p className="mt-1 text-sm text-metin-3">{k.aciklama}</p>
            </Link>
          ))}
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
