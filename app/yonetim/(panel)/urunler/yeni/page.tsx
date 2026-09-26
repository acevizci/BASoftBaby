import UrunFormu from "@/ui/urun-formu";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { kategoriEtiketleri } from "@/ui/kategori-etiketi";
import { kodTemizle } from "@/ui/depo-bicim";
import { tedarikciAdlari } from "@/server/tedarik";

export const dynamic = "force-dynamic";

export default async function YeniUrun({ searchParams }: PageProps<"/yonetim/urunler/yeni">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { barkod } = await searchParams;
  const [kategoriler, tedarikciler] = await Promise.all([
    db.category.findMany({ orderBy: { sira: "asc" } }),
    tedarikciAdlari(),
  ]);
  const etiketler = kategoriEtiketleri(kategoriler);
  return (
    <UrunFormu
      kategoriler={kategoriler.map((k) => ({ slug: k.slug, ad: etiketler.get(k.slug) ?? k.ad }))}
      tedarikciler={tedarikciler}
      bekleyenBarkod={typeof barkod === "string" ? kodTemizle(barkod) || undefined : undefined}
    />
  );
}
