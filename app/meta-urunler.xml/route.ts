import { kategorileriGetir, urunleriGetir } from "@/server/katalog";
import { tamAdres } from "@/server/site";
import { beslemeXml } from "@/server/urun-beslemesi";

/**
 * Meta (Instagram/Facebook) ürün kataloğu (K-142). Google beslemesinin
 * aynısı, Meta'nın stok yazımıyla. Commerce Manager'da "zamanlanmış akış"
 * olarak bir kez tanımlanıyor.
 */
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const [urunler, kategoriler] = await Promise.all([urunleriGetir(), kategorileriGetir()]);
  const xml = beslemeXml(
    urunler,
    tamAdres,
    new Map(kategoriler.map((k) => [k.slug, k.ad])),
    "meta",
  );
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
