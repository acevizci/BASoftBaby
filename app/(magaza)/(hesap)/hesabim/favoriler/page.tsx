import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { girisYapan } from "@/server/uyelik";
import { favorilerim } from "@/server/favori";
import UrunKarti from "@/ui/urun-karti";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Favorilerim", robots: { index: false } };

/**
 * Favoriler (K-94). En son eklenen önce. Yayından kalkan ya da kategorisi
 * kapanan ürün listede görünmüyor ama kaydı duruyor: yeniden yayına girince
 * geri geliyor.
 */
export default async function FavorilerSayfasi() {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?hata=giris&nereye=%2Fhesabim%2Ffavoriler");

  const urunler = await favorilerim(musteri.id);

  return (
    <section className="mt-6">
      <h2 className="text-lg">Favorilerim</h2>
      {urunler.length === 0 ? (
        <div className="mt-3 rounded-marka border border-cizgi bg-yuzey p-6 text-sm text-metin-2">
          <p>Henüz favorin yok.</p>
          <p className="mt-1">
            Beğendiğin ürünün kalbine dokun, buraya eklensin; sonra karar verirken
            aramak zorunda kalma.
          </p>
          <Link
            href="/urunler"
            className="mt-4 inline-block rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
          >
            Ürünlere göz at
          </Link>
        </div>
      ) : (
        <>
          <p className="rakam mt-1 text-sm text-metin-3">{urunler.length} ürün</p>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {urunler.map((u) => (
              <UrunKarti key={u.slug} urun={u} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
