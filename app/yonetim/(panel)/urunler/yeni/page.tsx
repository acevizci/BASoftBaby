import UrunFormu from "@/ui/urun-formu";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

export const dynamic = "force-dynamic";

export default async function YeniUrun() {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const kategoriler = await db.category.findMany({ orderBy: { sira: "asc" } });
  return <UrunFormu kategoriler={kategoriler.map((k) => ({ slug: k.slug, ad: k.ad }))} />;
}
