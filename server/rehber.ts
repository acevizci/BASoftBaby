import "server-only";

/**
 * Rehber yazıları — okuma (K-132). Yayındaki yazılar önbellekte; panelden
 * kaydedilince `rehber` etiketiyle düşüyor.
 */

import { db } from "@/server/veritabani";
import { ETIKETLER, paylasilanOnbellek, paylasilanOnbellekli } from "@/server/onbellek";

/** Tarihler ISO metni: önbellek (`unstable_cache`) `Date`'i metne çeviriyor. */
export type RehberOzeti = {
  slug: string;
  baslik: string;
  ozet: string;
  yayinTarihi: string;
  guncellendi: string;
};

export type RehberYazisi = RehberOzeti & { metin: string; urunSluglari: string[] };

export const yayindakiRehberler = paylasilanOnbellek(
  async function yayindakiRehberler(): Promise<RehberOzeti[]> {
    const satirlar = await db.article.findMany({
      where: { yayinda: true },
      orderBy: { yayinTarihi: "desc" },
      select: { slug: true, baslik: true, ozet: true, yayinTarihi: true, olusturuldu: true, guncellendi: true },
    });
    return satirlar.map((s) => ({
      slug: s.slug,
      baslik: s.baslik,
      ozet: s.ozet,
      yayinTarihi: (s.yayinTarihi ?? s.olusturuldu).toISOString(),
      guncellendi: s.guncellendi.toISOString(),
    }));
  },
  ["rehberler"],
  [ETIKETLER.rehber],
);

export const rehberGetir = paylasilanOnbellekli(
  async function rehberGetir(slug: string): Promise<RehberYazisi | null> {
    const s = await db.article.findUnique({ where: { slug } });
    if (!s || !s.yayinda) return null;
    return {
      slug: s.slug,
      baslik: s.baslik,
      ozet: s.ozet,
      metin: s.metin,
      urunSluglari: s.urunSluglari,
      yayinTarihi: (s.yayinTarihi ?? s.olusturuldu).toISOString(),
      guncellendi: s.guncellendi.toISOString(),
    };
  },
  ["rehber"],
  [ETIKETLER.rehber],
);
