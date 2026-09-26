import Link from "next/link";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { kategoriEtiketleri } from "@/ui/kategori-etiketi";
import KampanyaSihirbazi from "@/ui/kampanya-sihirbazi";
import PanelBildirim, { ORTAK_HATALAR } from "@/ui/panel-bildirim";
import { BOS_TASLAK, KAMPANYA_HATALARI } from "@/ui/kampanya-bicim";

export const dynamic = "force-dynamic";

/** Yeni kampanya sihirbazı (K-172). */
export default async function YeniKampanya({
  searchParams,
}: PageProps<"/yonetim/kampanyalar/yeni">) {
  await yoneticiGerekli();

  const { hata } = await searchParams;
  const [kategoriler, urunler] = await Promise.all([
    db.category.findMany({ orderBy: { sira: "asc" }, select: { id: true, slug: true, ad: true } }),
    db.product.findMany({ orderBy: { ad: "asc" }, select: { id: true, ad: true } }),
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
      <PanelBildirim hata={hata} hatalar={{ ...ORTAK_HATALAR, ...KAMPANYA_HATALARI }} />
      <KampanyaSihirbazi
        baslangic={BOS_TASLAK}
        kategoriler={kategoriler.map((k) => ({ id: k.id, ad: etiketler.get(k.slug) ?? k.ad }))}
        urunler={urunler}
      />
    </div>
  );
}
