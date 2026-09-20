/**
 * Katalog — ürünler, kategoriler, bedenler ve stok.
 *
 * Sayfalar veriyi hep buradan okur, veritabanına doğrudan hiç dokunmaz.
 * Para her yerde tam sayı kuruş (docs/02-mimari.md, 01. karar).
 */

import { db } from "@/server/veritabani";
import { urunIndirimleri, urunKampanyasi, type KampanyaKaydi } from "@/server/kampanya";
import { BEDENLER, type RenkAdi, type RozetTonu, type GorselTipi, type Urun, type Kategori, yasGrubununBedenleri } from "@/ui/katalog-bicim";
import { ETIKETLER, paylasilanOnbellek, paylasilanOnbellekli } from "@/server/onbellek";

export * from "@/ui/katalog-bicim";

const URUN_ICEREN = {
  category: true,
  variants: { orderBy: { renk: "asc" } },
  images: { orderBy: { sira: "asc" } },
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
  images: {
    id: string;
    yol: string;
    kucukYol: string;
    altMetin: string;
    genislik: number;
    yukseklik: number;
  }[];
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
    fotograflar: satir.images.map((g) => ({
      id: g.id,
      yol: g.yol,
      kucukYol: g.kucukYol || g.yol,
      altMetin: g.altMetin || satir.ad,
      genislik: g.genislik,
      yukseklik: g.yukseklik,
    })),
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




/**
 * Kategoriler her sayfanın üst çubuğunda gerekiyor ama ayda bir değişiyor:
 * paylaşılan önbellekte duruyor, panelden değişince düşüyor.
 */
export const kategorileriGetir = paylasilanOnbellek(
  async function kategorileriGetir(): Promise<Kategori[]> {
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
  },
  ["kategoriler"],
  [ETIKETLER.katalog],
);

export type PanelKategorisi = {
  id: string;
  slug: string;
  ad: string;
  aciklama: string;
  sira: number;
  aktif: boolean;
  urunAdedi: number;
};

/** Panel listesi: kapalı kategoriler de, ürün sayılarıyla birlikte. */
export async function tumKategoriler(): Promise<PanelKategorisi[]> {
  const satirlar = await db.category.findMany({
    orderBy: { sira: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return satirlar.map((k) => ({
    id: k.id,
    slug: k.slug,
    ad: k.ad,
    aciklama: k.aciklama ?? "",
    sira: k.sira,
    aktif: k.aktif,
    urunAdedi: k._count.products,
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
  /** Yaş grubu kodu: bir gruba birden çok beden giriyor (bkz. YAS_GRUPLARI). */
  yas?: string;
  renk?: string;
  /** Kuruş cinsinden üst sınır */
  enFazlaKurus?: number;
};

/**
 * Listedeki stok en fazla yarım dakika bayatlayabilir; gerekçesi
 * server/onbellek.ts içinde. Panelden bir değişiklik yapılınca zaten anında
 * düşüyor.
 */
export const urunleriGetir = paylasilanOnbellekli(
  urunleriSorgula,
  ["urunler"],
  [ETIKETLER.katalog],
  30,
);

/**
 * Beden, yaş ve renk süzgeçleri **tek bir varyant koşuluna** birleşiyor.
 *
 * Ayrı ayrı yazıldığında iki sorun vardı: aynı nesneye iki kez `variants`
 * anahtarı konduğu için sonraki öncekini siliyordu (renk seçilince beden
 * süzgeci sessizce düşüyordu), ve düşmeseydi bile "6-9 bedeni var" ile
 * "mint rengi var" ayrı varyantlardan karşılanabilirdi. Müşterinin sorduğu
 * şey ise "bu bedende, bu renkte var mı" — yani aynı varyant.
 *
 * Beden ve yaş birlikte verilirse beden kazanıyor: daha dar olan seçim.
 * Renk tek başına verildiğinde stok aranmıyor; ürün o renkte üretiliyorsa
 * listede kalıyor.
 */
function varyantKosulu(suzgec: UrunSuzgeci, yasBedenleri: readonly string[]) {
  const kosul: {
    beden?: string | { in: string[] };
    renk?: string;
    stok?: { gt: number };
  } = {};

  if (suzgec.beden) {
    kosul.beden = suzgec.beden;
    kosul.stok = { gt: 0 };
  } else if (yasBedenleri.length > 0) {
    kosul.beden = { in: [...yasBedenleri] };
    kosul.stok = { gt: 0 };
  }

  if (suzgec.renk) kosul.renk = suzgec.renk;

  return Object.keys(kosul).length > 0 ? { variants: { some: kosul } } : {};
}

async function urunleriSorgula(suzgec: UrunSuzgeci = {}): Promise<Urun[]> {
  const yasBedenleri = suzgec.yas ? yasGrubununBedenleri(suzgec.yas) : [];

  const [satirlar, kampanyalar] = await Promise.all([
    db.product.findMany({
      where: {
        aktif: true,
        ...(suzgec.kategori ? { category: { slug: suzgec.kategori } } : {}),
        ...(suzgec.enFazlaKurus ? { fiyatKurus: { lte: suzgec.enFazlaKurus } } : {}),
        ...varyantKosulu(suzgec, yasBedenleri),
      },
      include: URUN_ICEREN,
      orderBy: { olusturuldu: "asc" },
    }),
    urunIndirimleri(),
  ]);
  return satirlar.map((s) => urunYap(s as SatirTipi, kampanyalar));
}

/** Ana sayfadaki "Bu haftanın favorileri" şeridi. */
export const oneCikanUrunler = paylasilanOnbellekli(
  oneCikanlariSorgula,
  ["one-cikanlar"],
  [ETIKETLER.katalog],
  30,
);

async function oneCikanlariSorgula(adet = 8): Promise<Urun[]> {
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

/**
 * Benzer ürünler şeridi. Önbellek anahtarına ürünün kendisi değil yalnızca
 * slug'ı ve kategorisi giriyor: anahtar küçük kalsın, stok bilgisi anahtara
 * karışmasın.
 */
export function benzerUrunler(urun: Urun, adet = 4): Promise<Urun[]> {
  return benzerleriSorgula(urun.slug, urun.kategori, adet);
}

const benzerleriSorgula = paylasilanOnbellekli(
  async function benzerleriSorgula(slug: string, kategori: string, adet: number): Promise<Urun[]> {
    const urun = { slug, kategori };
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
  },
  ["benzer-urunler"],
  [ETIKETLER.katalog],
  30,
);
