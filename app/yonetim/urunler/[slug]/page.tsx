import { notFound } from "next/navigation";
import UrunFormu from "@/ui/urun-formu";
import { db } from "@/server/veritabani";
import { BEDENLER } from "@/ui/katalog-bicim";

export const dynamic = "force-dynamic";

export default async function UrunDuzenle({
  params,
  searchParams,
}: PageProps<"/yonetim/urunler/[slug]">) {
  const { slug } = await params;
  const { kayit } = await searchParams;

  const [urun, kategoriler] = await Promise.all([
    db.product.findUnique({
      where: { slug },
      include: { category: true, variants: true },
    }),
    db.category.findMany({ orderBy: { sira: "asc" } }),
  ]);
  if (!urun) notFound();

  const sirali = [...urun.variants].sort((a, b) => {
    const fark =
      (BEDENLER as readonly string[]).indexOf(a.beden) -
      (BEDENLER as readonly string[]).indexOf(b.beden);
    return fark !== 0 ? fark : a.renk.localeCompare(b.renk, "tr");
  });

  return (
    <UrunFormu
      kaydedildi={kayit === "1"}
      kategoriler={kategoriler.map((k) => ({ slug: k.slug, ad: k.ad }))}
      urun={{
        slug: urun.slug,
        ad: urun.ad,
        ozet: urun.ozet,
        kategoriSlug: urun.category.slug,
        fiyatKurus: urun.fiyatKurus,
        eskiFiyatKurus: urun.eskiFiyatKurus,
        kumasIcerigi: urun.kumasIcerigi,
        yikamaTalimati: urun.yikamaTalimati,
        ozellikler: urun.ozellikler,
        rozetTon: urun.rozetTon,
        rozetYazi: urun.rozetYazi,
        gorsel: urun.gorsel,
        palet: urun.palet,
        aktif: urun.aktif,
        variants: sirali.map((v) => ({ id: v.id, beden: v.beden, renk: v.renk, stok: v.stok })),
      }}
    />
  );
}
