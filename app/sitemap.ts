import type { MetadataRoute } from "next";
import { BILGI_SAYFALARI } from "@/app/(magaza)/(bilgi)/bilgi-bicim";
import { kategorileriGetir, urunleriGetir } from "@/server/katalog";
import { yasalSayfalariGetir } from "@/server/yasal";
import { tamAdres } from "@/server/site";
import { db } from "@/server/veritabani";
import { yayindakiRehberler } from "@/server/rehber";

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
  const [kategoriler, urunler, yasal, tarihler, rehberler] = await Promise.all([
    kategorileriGetir(),
    urunleriGetir(),
    yasalSayfalariGetir(),
    db.product.findMany({ where: { aktif: true }, select: { slug: true, guncellendi: true, category: { select: { slug: true } } } }),
    yayindakiRehberler(),
  ]);

  // Son değişiklik tarihi (K-128): Google değişen sayfayı öncelikle yeniden
  // tarıyor. Kategorinin tarihi içindeki en son değişen ürününki.
  const urunTarihi = new Map(tarihler.map((t) => [t.slug, t.guncellendi]));
  const kategoriTarihi = new Map<string, Date>();
  for (const t of tarihler) {
    const onceki = kategoriTarihi.get(t.category.slug);
    if (!onceki || t.guncellendi > onceki) kategoriTarihi.set(t.category.slug, t.guncellendi);
  }
  const enSon = tarihler.reduce<Date | undefined>((m, t) => (!m || t.guncellendi > m ? t.guncellendi : m), undefined);

  return [
    { url: tamAdres("/"), lastModified: enSon, changeFrequency: "daily", priority: 1 },
    ...kategoriler.map((k) => ({
      url: tamAdres(`/${k.slug}`),
      lastModified: kategoriTarihi.get(k.slug),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    // Ürün fotoğrafları da haritada: Google Görseller'den gelen trafik için.
    ...urunler.map((u) => ({
      url: tamAdres(`/urun/${u.slug}`),
      lastModified: urunTarihi.get(u.slug),
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: u.fotograflar.slice(0, 10).map((f) => tamAdres(f.yol)),
    })),
    // Rehber yazıları (K-132).
    ...(rehberler.length > 0
      ? [{ url: tamAdres("/rehber"), lastModified: new Date(rehberler[0].guncellendi), changeFrequency: "weekly" as const, priority: 0.6 }]
      : []),
    ...rehberler.map((r) => ({
      url: tamAdres(`/rehber/${r.slug}`),
      lastModified: new Date(r.guncellendi),
      changeFrequency: "monthly" as const,
      priority: 0.6,
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
