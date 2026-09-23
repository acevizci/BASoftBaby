import Link from "next/link";
import type { Metadata } from "next";
import HeroBanner from "@/ui/hero-banner";
import UrunKarti from "@/ui/urun-karti";
import YapisalVeri from "@/ui/yapisal-veri";
import { kunyeGetir } from "@/server/yasal";
import { siteAdresi, tamAdres } from "@/server/site";
import { kategorileriGetir, oneCikanUrunler } from "@/server/katalog";
import { ayarlariGetir, type SatisAyari } from "@/server/sepet";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { yasGruplari } from "@/server/yas-gruplari";
import { tonSiniflari } from "@/ui/kategori-tonu";
import { CAYMA_GUN } from "@/ui/talep-bicim";
import { SonBakilanlar } from "@/ui/son-bakilan";

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

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function AnaSayfa() {
  const [urunler, kategoriler, ayar, kunye, yasKutulari] = await Promise.all([
    oneCikanUrunler(8),
    kategorileriGetir(),
    ayarlariGetir(),
    kunyeGetir(),
    yasGruplari(),
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
