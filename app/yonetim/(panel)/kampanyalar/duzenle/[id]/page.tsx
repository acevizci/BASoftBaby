import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { kaydiTaslaga } from "@/server/kampanya-sablon";
import { kategoriEtiketleri } from "@/ui/kategori-etiketi";
import KampanyaSihirbazi from "@/ui/kampanya-sihirbazi";
import PanelBildirim, { ORTAK_HATALAR } from "@/ui/panel-bildirim";
import { KAMPANYA_HATALARI } from "@/ui/kampanya-bicim";

export const dynamic = "force-dynamic";

/** Kampanyayı sihirbazda düzenleme (K-172); özet adımında açılıyor. */
export default async function KampanyaDuzenle({
  params,
  searchParams,
}: PageProps<"/yonetim/kampanyalar/duzenle/[id]">) {
  await yoneticiGerekli();

  const { id } = await params;
  const { hata } = await searchParams;
  const [kampanya, kategoriler, urunler] = await Promise.all([
    // Kişiye özel kuponlar (K-151) panelde düzenlenmiyor.
    db.campaign.findFirst({ where: { id, customerId: null } }),
    db.category.findMany({ orderBy: { sira: "asc" }, select: { id: true, slug: true, ad: true } }),
    db.product.findMany({ orderBy: { ad: "asc" }, select: { id: true, ad: true } }),
  ]);
  if (!kampanya) notFound();
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
        <h1 className="mt-1 text-2xl">{kampanya.ad}</h1>
        {kampanya.kullanim > 0 && (
          <p className="mt-1 text-sm text-metin-2">
            {kampanya.kullanim} siparişte kullanıldı. Değişiklik yalnızca bundan sonraki siparişlere
            uygulanır; verilmiş siparişlerin indirimi değişmez.
          </p>
        )}
      </div>
      <PanelBildirim hata={hata} hatalar={{ ...ORTAK_HATALAR, ...KAMPANYA_HATALARI }} />
      <KampanyaSihirbazi
        id={kampanya.id}
        baslangic={kaydiTaslaga(kampanya)}
        kategoriler={kategoriler.map((k) => ({ id: k.id, ad: etiketler.get(k.slug) ?? k.ad }))}
        urunler={urunler}
      />
    </div>
  );
}
