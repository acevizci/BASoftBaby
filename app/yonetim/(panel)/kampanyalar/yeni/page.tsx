import Link from "next/link";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { kategoriEtiketleri } from "@/ui/kategori-etiketi";
import KampanyaSihirbazi from "@/ui/kampanya-sihirbazi";
import { BOS_TASLAK } from "@/ui/kampanya-bicim";

export const dynamic = "force-dynamic";

/**
 * Yeni kampanya sihirbazı (K-172). `?urun=<adres>` (Satmayanlar'dan, K-179)
 * gelirse kapsam "seçili ürünler" ve o ürünler işaretli açılıyor.
 */
export default async function YeniKampanya({
  searchParams,
}: PageProps<"/yonetim/kampanyalar/yeni">) {
  await yoneticiGerekli();

  const ham = (await searchParams).urun;
  const sluglar = [...new Set((Array.isArray(ham) ? ham : ham ? [ham] : []).map(String))].slice(
    0,
    200,
  );
  const [kategoriler, urunler, secilen] = await Promise.all([
    db.category.findMany({ orderBy: { sira: "asc" }, select: { id: true, slug: true, ad: true } }),
    db.product.findMany({ orderBy: { ad: "asc" }, select: { id: true, ad: true } }),
    sluglar.length
      ? db.product.findMany({ where: { slug: { in: sluglar } }, select: { id: true } })
      : Promise.resolve([]),
  ]);
  const etiketler = kategoriEtiketleri(kategoriler);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/yonetim/kampanyalar"
          className="text-sm font-semibold text-metin-3 hover:underline"
        >
          ← Kampanyalar
        </Link>
        <h1 className="mt-1 text-2xl">Yeni kampanya</h1>
      </div>
      <KampanyaSihirbazi
        baslangic={
          secilen.length > 0
            ? { ...BOS_TASLAK, kapsam: "urun", urunIdleri: secilen.map((u) => u.id) }
            : BOS_TASLAK
        }
        kategoriler={kategoriler.map((k) => ({ id: k.id, ad: etiketler.get(k.slug) ?? k.ad }))}
        urunler={urunler}
      />
    </div>
  );
}
