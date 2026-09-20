/**
 * Katalog — ürünler, kategoriler, bedenler ve stok.
 *
 * Sayfalar veriyi hep buradan okur, veritabanına doğrudan hiç dokunmaz.
 * Para her yerde tam sayı kuruş (docs/02-mimari.md, 01. karar).
 */

import { db } from "@/server/veritabani";
import { urunIndirimleri, urunKampanyasi, type KampanyaKaydi } from "@/server/kampanya";
import { BEDENLER, type RenkAdi, type RozetTonu, type GorselTipi, type Urun, type Kategori } from "@/ui/katalog-bicim";

export * from "@/ui/katalog-bicim";

const URUN_ICEREN = {
  category: true,
  variants: { orderBy: { renk: "asc" } },
} as const;

type SatirTipi = {
  id: string;
  categoryId: string;
  slug: string;
  ad: string;
  ozet: string;
  gorsel: string;
  palet: string;
  fiyatKurus: number;
  eskiFiyatKurus: number | null;
  rozetTon: string | null;
  rozetYazi: string | null;
  puan: unknown;
  yorumSayisi: number;
  kumasIcerigi: string;
  yikamaTalimati: string;
  ozellikler: string[];
  category: { slug: string };
  variants: { id: string; beden: string; renk: string; stok: number }[];
};

function bedenSirasi(beden: string): number {
  const i = (BEDENLER as readonly string[]).indexOf(beden);
  return i === -1 ? BEDENLER.length : i;
}

/** Veritabanı satırını sayfaların beklediği biçime çevirir. */
function urunYap(satir: SatirTipi, kampanyalar: KampanyaKaydi[] = []): Urun {
  const varyantlar = [...satir.variants]
    .sort((a, b) => bedenSirasi(a.beden) - bedenSirasi(b.beden))
    .map((v) => ({ id: v.id, beden: v.beden, renk: v.renk as RenkAdi, stok: v.stok }));

  // Renk listesi varyantlardan türetilir; ayrı bir sütunda tutulup
  // varyantlarla çelişmesin diye.
  const renkler: RenkAdi[] = [];
  for (const v of varyantlar) {
    if (!renkler.includes(v.renk)) renkler.push(v.renk);
  }

  const kampanya = urunKampanyasi(kampanyalar, {
    productId: satir.id,
    categoryId: satir.categoryId,
    fiyatKurus: satir.fiyatKurus,
  });

  return {
    id: satir.id,
    categoryId: satir.categoryId,
    slug: satir.slug,
    ad: satir.ad,
    ozet: satir.ozet,
    kategori: satir.category.slug,
    gorsel: satir.gorsel as GorselTipi,
    palet: satir.palet as RenkAdi,
    fiyatKurus: satir.fiyatKurus,
    eskiFiyatKurus: satir.eskiFiyatKurus ?? undefined,
    kampanya,
    rozet:
      satir.rozetTon && satir.rozetYazi
        ? { ton: satir.rozetTon as RozetTonu, yazi: satir.rozetYazi }
        : undefined,
    puan: Number(satir.puan ?? 0),
    yorumSayisi: satir.yorumSayisi,
    renkler,
    varyantlar,
    kumasIcerigi: satir.kumasIcerigi,
    yikamaTalimati: satir.yikamaTalimati,
    ozellikler: satir.ozellikler,
  };
}




export async function kategorileriGetir(): Promise<Kategori[]> {
  const satirlar = await db.category.findMany({
    where: { aktif: true },
    orderBy: { sira: "asc" },
  });
  return satirlar.map((k) => ({
    slug: k.slug,
    ad: k.ad,
    aciklama: k.aciklama ?? "",
    sira: k.sira,
  }));
}

export async function kategoriGetir(slug: string): Promise<Kategori | undefined> {
  const k = await db.category.findUnique({ where: { slug } });
  if (!k) return undefined;
  return { slug: k.slug, ad: k.ad, aciklama: k.aciklama ?? "", sira: k.sira };
}

export async function urunGetir(slug: string): Promise<Urun | undefined> {
  const [satir, kampanyalar] = await Promise.all([
    db.product.findUnique({ where: { slug }, include: URUN_ICEREN }),
    urunIndirimleri(),
  ]);
  if (!satir || !satir.aktif) return undefined;
  return urunYap(satir as SatirTipi, kampanyalar);
}

export type UrunSuzgeci = {
  kategori?: string;
  beden?: string;
  renk?: string;
  /** Kuruş cinsinden üst sınır */
  enFazlaKurus?: number;
};

export async function urunleriGetir(suzgec: UrunSuzgeci = {}): Promise<Urun[]> {
  const [satirlar, kampanyalar] = await Promise.all([
    db.product.findMany({
    where: {
      aktif: true,
      ...(suzgec.kategori ? { category: { slug: suzgec.kategori } } : {}),
      ...(suzgec.enFazlaKurus ? { fiyatKurus: { lte: suzgec.enFazlaKurus } } : {}),
      // Beden süzgeci yalnızca o bedende stoğu olan ürünleri getirir; renk
      // süzgecinde stok aranmaz, ürün o renkte üretiliyorsa listede kalır.
      ...(suzgec.beden ? { variants: { some: { beden: suzgec.beden, stok: { gt: 0 } } } } : {}),
      ...(suzgec.renk ? { variants: { some: { renk: suzgec.renk } } } : {}),
    },
    include: URUN_ICEREN,
    orderBy: { olusturuldu: "asc" },
    }),
    urunIndirimleri(),
  ]);
  return satirlar.map((s) => urunYap(s as SatirTipi, kampanyalar));
}

/** Ana sayfadaki "Bu haftanın favorileri" şeridi. */
export async function oneCikanUrunler(adet = 8): Promise<Urun[]> {
  const [satirlar, kampanyalar] = await Promise.all([
    db.product.findMany({
      where: { aktif: true },
      include: URUN_ICEREN,
      orderBy: { yorumSayisi: "desc" },
      take: adet,
    }),
    urunIndirimleri(),
  ]);
  return satirlar.map((s) => urunYap(s as SatirTipi, kampanyalar));
}

export async function benzerUrunler(urun: Urun, adet = 4): Promise<Urun[]> {
  const [ayni, kampanyalar] = await Promise.all([
    db.product.findMany({
      where: { aktif: true, slug: { not: urun.slug }, category: { slug: urun.kategori } },
      include: URUN_ICEREN,
      take: adet,
    }),
    urunIndirimleri(),
  ]);
  if (ayni.length >= adet) return ayni.map((s) => urunYap(s as SatirTipi, kampanyalar));

  const digerleri = await db.product.findMany({
    where: {
      aktif: true,
      slug: { not: urun.slug },
      category: { slug: { not: urun.kategori } },
    },
    include: URUN_ICEREN,
    take: adet - ayni.length,
  });
  return [...ayni, ...digerleri].map((s) => urunYap(s as SatirTipi, kampanyalar));
}
