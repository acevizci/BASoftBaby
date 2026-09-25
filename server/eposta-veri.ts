import "server-only";
import { db } from "@/server/veritabani";
import { renkAdlari } from "@/server/renkler";
import type { UrunSatiri } from "@/server/eposta-sablon";

/**
 * E-postaların veritabanından okuduğu şeyler (K-161): sipariş satırları,
 * ürün fotoğrafları, bedene göre öneriler. Gönderim kapalıyken hiç
 * çağrılmıyor.
 */

type Resim = { kucukYol: string; yol: string; renk: string | null };

/** Rengin fotoğrafı, yoksa renksiz, yoksa ilki; küçük sürüm. */
function fotoSec(resimler: Resim[], renk?: string): string | undefined {
  const r =
    (renk ? resimler.find((x) => x.renk === renk) : undefined) ??
    resimler.find((x) => !x.renk) ??
    resimler[0];
  return r ? r.kucukYol || r.yol : undefined;
}

const RESIM = {
  orderBy: { sira: "asc" as const },
  select: { kucukYol: true, yol: true, renk: true },
};

/** Ürün adresine göre fotoğraf; renk verilirse o rengin fotoğrafı. */
export async function urunFotolari(
  istekler: { slug: string; renk?: string }[],
): Promise<(string | undefined)[]> {
  const sluglar = [...new Set(istekler.map((i) => i.slug))];
  if (sluglar.length === 0) return [];
  const urunler = await db.product.findMany({
    where: { slug: { in: sluglar } },
    select: { slug: true, images: RESIM },
  });
  const harita = new Map(urunler.map((u) => [u.slug, u.images]));
  return istekler.map((i) => fotoSec(harita.get(i.slug) ?? [], i.renk));
}

export type SiparisDetayi = {
  satirlar: UrunSatiri[];
  araToplamKurus: number;
  indirimKurus: number;
  kampanyaAdi: string | null;
  kargoKurus: number;
  toplamKurus: number;
  hediyeCekiKurus: number;
  hediyePaketi: boolean;
};

export async function siparisDetayi(numara: string): Promise<SiparisDetayi | undefined> {
  const s = await db.order.findUnique({
    where: { numara },
    select: {
      araToplamKurus: true,
      indirimKurus: true,
      kampanyaAdi: true,
      kargoKurus: true,
      toplamKurus: true,
      hediyeCekiKurus: true,
      hediyePaketi: true,
      satirlar: {
        orderBy: { id: "asc" },
        select: {
          urunAd: true,
          slug: true,
          beden: true,
          renk: true,
          adet: true,
          fiyatKurus: true,
          variant: { select: { product: { select: { slug: true, images: RESIM } } } },
        },
      },
    },
  });
  if (!s) return undefined;
  const adlar = await renkAdlari();
  return {
    satirlar: s.satirlar.map((x) => {
      const urun = x.variant?.product;
      return {
        ad: x.urunAd,
        detay: `${x.beden} · ${adlar[x.renk] ?? x.renk}`,
        adet: x.adet,
        tutarKurus: x.fiyatKurus * x.adet,
        foto: urun ? fotoSec(urun.images, x.renk) : undefined,
        adres: `/urun/${urun?.slug ?? x.slug}`,
      };
    }),
    araToplamKurus: s.araToplamKurus,
    indirimKurus: s.indirimKurus,
    kampanyaAdi: s.kampanyaAdi,
    kargoKurus: s.kargoKurus,
    toplamKurus: s.toplamKurus,
    hediyeCekiKurus: s.hediyeCekiKurus,
    hediyePaketi: s.hediyePaketi,
  };
}

/** Bedende stokta olan ürünler, en çok değerlendirilenler önde (büyüme e-postası). */
export async function bedendekiUrunler(beden: string, adet = 4): Promise<UrunSatiri[]> {
  const urunler = await db.product.findMany({
    where: {
      aktif: true,
      category: { aktif: true },
      variants: { some: { beden, stok: { gt: 0 } } },
    },
    orderBy: [{ yorumSayisi: "desc" }, { olusturuldu: "desc" }],
    take: adet,
    select: { ad: true, slug: true, fiyatKurus: true, images: RESIM },
  });
  return urunler.map((u) => ({
    ad: u.ad,
    detay: beden,
    tutarKurus: u.fiyatKurus,
    foto: fotoSec(u.images),
    adres: `/urun/${u.slug}`,
  }));
}
