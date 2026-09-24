import { kategorileriGetir, urunleriGetir } from "@/server/katalog";
import { tamAdres } from "@/server/site";
import { beslemeXml } from "@/server/urun-beslemesi";

/**
 * Google Merchant Center ürün beslemesi (K-123). Site haritası gibi saatte
 * bir üretiliyor: panelde değişen fiyat ve stok bir sonraki getirmede
 * Google'a gidiyor.
 */
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const [urunler, kategoriler] = await Promise.all([urunleriGetir(), kategorileriGetir()]);
  const xml = beslemeXml(urunler, tamAdres, new Map(kategoriler.map((k) => [k.slug, k.ad])));
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
