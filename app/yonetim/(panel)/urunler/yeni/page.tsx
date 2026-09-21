import UrunFormu from "@/ui/urun-formu";
import { db } from "@/server/veritabani";

export const dynamic = "force-dynamic";

export default async function YeniUrun() {
  const kategoriler = await db.category.findMany({ orderBy: { sira: "asc" } });
  return <UrunFormu kategoriler={kategoriler.map((k) => ({ slug: k.slug, ad: k.ad }))} />;
}
