import type { MetadataRoute } from "next";
import { BILGI_SAYFALARI } from "@/app/(magaza)/(bilgi)/bilgi-bicim";
import { kategorileriGetir, urunleriGetir } from "@/server/katalog";
import { yasalSayfalariGetir } from "@/server/yasal";
import { tamAdres } from "@/server/site";

/**
 * Site haritası. Yalnızca herkese açık sayfalar: ana sayfa, kategoriler,
 * ürünler, yardım sayfaları ve yayımlanmış yasal metinler.
 *
 * Taslak yasal metin haritaya girmiyor — sayfanın kendisi de arama motorlarına
 * kapalı; onaylanmamış bir sözleşme Google'da geçerli metin gibi görünmemeli.
 */
/**
 * Harita derleme anında değil saatte bir üretiliyor: panelden eklenen ürün
 * bir sonraki dağıtımı beklemeden haritaya girsin.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [kategoriler, urunler, yasal] = await Promise.all([
    kategorileriGetir(),
    urunleriGetir(),
    yasalSayfalariGetir(),
  ]);

  return [
    { url: tamAdres("/"), changeFrequency: "daily", priority: 1 },
    ...kategoriler.map((k) => ({
      url: tamAdres(`/${k.slug}`),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...urunler.map((u) => ({
      url: tamAdres(`/urun/${u.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...BILGI_SAYFALARI.map((s) => ({
      url: tamAdres(s.yol),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    ...yasal
      .filter((y) => !y.taslakMi)
      .map((y) => ({
        url: tamAdres(`/yasal/${y.slug}`),
        changeFrequency: "yearly" as const,
        priority: 0.3,
      })),
  ];
}
