import Link from "next/link";
import HeroBanner from "@/ui/hero-banner";
import UrunKarti from "@/ui/urun-karti";
import { kategorileriGetir, oneCikanUrunler } from "@/server/katalog";
import { ayarlariGetir, type SatisAyari } from "@/server/sepet";
import { fiyatYaz } from "@/ui/katalog-bicim";

const YAS_KUTULARI = [
  { ad: "Yenidoğan", yas: "0-3 ay", beden: "0-3 ay" },
  { ad: "Bebek", yas: "3-6 ay", beden: "3-6 ay" },
  { ad: "Bebek", yas: "6-12 ay", beden: "6-9 ay" },
  { ad: "Yürüyen", yas: "12-24 ay", beden: "12-18 ay" },
];

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

export default async function AnaSayfa() {
  const [urunler, kategoriler, ayar] = await Promise.all([
    oneCikanUrunler(8),
    kategorileriGetir(),
    ayarlariGetir(),
  ]);
  const guven = guvenSatirlari(ayar);

  return (
    <>
      <HeroBanner />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl">Yaşa göre</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {YAS_KUTULARI.map((y) => (
            <Link
              key={y.yas}
              href={`/urunler?beden=${encodeURIComponent(y.beden)}`}
              className="rounded-marka border border-cizgi bg-yuzey px-4 py-5 text-center shadow-sm transition hover:border-mercan"
            >
              <p className="font-baslik font-bold">{y.ad}</p>
              <p className="rakam mt-1 text-sm text-metin-3">{y.yas}</p>
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
