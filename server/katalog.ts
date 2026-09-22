/**
 * Katalog — ürünler, kategoriler, bedenler ve stok.
 *
 * Sayfalar veriyi hep buradan okur, veritabanına doğrudan hiç dokunmaz.
 * Para her yerde tam sayı kuruş (docs/02-mimari.md, 01. karar).
 */

import { db } from "@/server/veritabani";
import { urunIndirimleri, urunKampanyasi, type KampanyaKaydi } from "@/server/kampanya";
import {
  paletCoz,
  type RenkAdi,
  type RenkSecenegi,
  type RozetTonu,
  type GorselTipi,
  type Urun,
  type Kategori,
} from "@/ui/katalog-bicim";
import { bedenSirasi, sonSira, yasGrubununBedenleri } from "@/server/bedenler";
import { tumYasGruplari } from "@/server/yas-gruplari";
import type { Prisma } from "@/db/uretilen/client";
import { tumRenkSecenekleri } from "@/server/renkler";
import { ETIKETLER, paylasilanOnbellek, paylasilanOnbellekli } from "@/server/onbellek";
import { kelimeler } from "@/server/arama-metin";
import { dilimle, sayfaCoz, type SayfaDurumu } from "@/ui/sayfalama-bicim";

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
    renk: string | null;
  }[];
};

/**
 * Veritabanı satırını sayfaların beklediği biçime çevirir.
 *
 * `sira` beden sıralamasını, `renkSecenekleri` renk adlarını ve paletlerini
 * taşıyor: ikisi de artık veritabanında (K-56, K-66) ama bu işlev senkron
 * kalsın diye çağıran tarafından veriliyor.
 *
 * Renk listesinde kapalı renkler de var: kapatılan bir renkte satılmış
 * varyantlar duruyor, adsız ve nötr palette görünmemeleri gerekiyor. Kapatma
 * yeni varyant eklemeyi ve süzgeçte çıkmayı engelliyor, var olanı silmiyor.
 */
function urunYap(
  satir: SatirTipi,
  kampanyalar: KampanyaKaydi[] = [],
  sira: Map<string, number> = new Map(),
  renkSecenekleri: RenkSecenegi[] = [],
): Urun {
  const varyantlar = [...satir.variants]
    .sort((a, b) => sonSira(sira, a.beden) - sonSira(sira, b.beden))
    .map((v) => ({ id: v.id, beden: v.beden, renk: v.renk as RenkAdi, stok: v.stok }));

  // Renk listesi varyantlardan türetilir; ayrı bir sütunda tutulup
  // varyantlarla çelişmesin diye. Sıra renk listesindeki sıra: ürün
  // sayfasındaki noktalar her üründe aynı düzende dizilsin.
  const gorulen = new Set<string>();
  for (const v of varyantlar) gorulen.add(v.renk);
  const renkler: RenkSecenegi[] = renkSecenekleri.filter((r) => gorulen.has(r.kod));
  for (const kod of gorulen) {
    // Listeden silinmiş bir renkte varyant kaldıysa yine de görünüyor.
    if (!renkler.some((r) => r.kod === kod)) {
      renkler.push({ kod, ad: kod, palet: paletCoz(renkSecenekleri, kod) });
    }
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
    paletRenkleri: paletCoz(renkSecenekleri, satir.palet),
    fotograflar: satir.images.map((g) => ({
      id: g.id,
      yol: g.yol,
      kucukYol: g.kucukYol || g.yol,
      altMetin: g.altMetin || satir.ad,
      genislik: g.genislik,
      yukseklik: g.yukseklik,
      renk: (g.renk as RenkAdi | null) ?? undefined,
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
/**
 * Vitrinde görünen kategoriler.
 *
 * **Boş kategori listelenmiyor.** Kategori açık olsa bile içinde yayında
 * ürün yoksa menüde, ana sayfada, arama rozetlerinde ve site haritasında
 * çıkmıyor. Sebebi basit: tıklayınca boş bir sayfa açan bir bağlantı
 * mağazanın eksik olduğunu düşündürüyor ve müşteriyi çıkmaza sokuyor
 * (K-73). Kategori panelde duruyor ve ürün atanır atanmaz menüye giriyor.
 *
 * Kategori sayfasının kendisi hâlâ açılıyor: adresi paylaşılmış olabilir,
 * sayfa da "bu kategoride henüz ürün yok" diyor.
 */
export const kategorileriGetir = paylasilanOnbellek(
  async function kategorileriGetir(): Promise<Kategori[]> {
    const satirlar = await db.category.findMany({
      where: { aktif: true, products: { some: { aktif: true } } },
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
  const [satir, kampanyalar, sira, renkSecenekleri] = await Promise.all([
    db.product.findUnique({ where: { slug }, include: URUN_ICEREN }),
    urunIndirimleri(),
    bedenSirasi(),
    tumRenkSecenekleri(),
  ]);
  if (!satir || !satir.aktif) return undefined;
  return urunYap(satir as SatirTipi, kampanyalar, sira, renkSecenekleri);
}

/**
 * Sayfalanmış ürün listesi.
 *
 * **Dilimleme sorguda değil bellekte.** Sıralama kampanyalar uygulandıktan
 * sonra yapılıyor (aşağıdaki `sirala`): "önce ucuz" listesinde müşterinin
 * gördüğü indirimli fiyat geçerli. Veritabanına `skip`/`take` verilseydi
 * sıralama liste fiyatına göre yapılmış olur, indirimli ürünler yanlış
 * sayfaya düşerdi. Liste zaten önbellekte duruyor (K-67).
 */
export async function urunSayfasi(
  suzgec: UrunSuzgeci = {},
  sayfa: unknown = 1,
  boy = 24,
): Promise<{ urunler: Urun[]; durum: SayfaDurumu }> {
  const hepsi = await urunleriGetir(suzgec);
  const durum = sayfaCoz(sayfa, hepsi.length, boy);
  return { urunler: dilimle(hepsi, durum), durum };
}

export type UrunSuzgeci = {
  kategori?: string;
  beden?: string;
  /** Yaş grubu kodu: bir gruba birden çok beden giriyor (bkz. server/yas-gruplari.ts). */
  yas?: string;
  renk?: string;
  /** Kuruş cinsinden üst sınır */
  enFazlaKurus?: number;
  /** Serbest arama metni; kelimelere bölünüp hepsi aranıyor. */
  ara?: string;
  /** Liste sıralaması; boşsa kataloğa giriş sırası. */
  sirala?: string;
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
 *
 * Yaş grubunun kategori bağı burada değil, `yasKosulu` içinde: o ürünün
 * kendisine bakıyor, varyantına değil.
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

/**
 * Yaş grubunun süzgeci: bedenleri ve varsa bağlı kategorisi.
 *
 * Grup bir kategoriye bağlıysa yalnızca o kategorinin ürünleri geliyor;
 * bedeni yoksa süzgeç yalnızca kategori (K-80). Ne bedeni ne kategorisi
 * olan ya da bilinmeyen bir grup **hiçbir şey** getirmiyor: eskiden koşul
 * boş kalıyor ve bütün katalog listeleniyordu.
 */
async function yasKosulu(kod: string): Promise<{
  bedenler: string[];
  kosul: Prisma.ProductWhereInput;
}> {
  const grup = (await tumYasGruplari()).find((g) => g.kod === kod);
  const bedenler = grup ? await yasGrubununBedenleri(kod) : [];
  if (!grup || (bedenler.length === 0 && !grup.kategori)) {
    return { bedenler, kosul: { id: { in: [] } } };
  }
  return { bedenler, kosul: grup.kategori ? { category: { slug: grup.kategori } } : {} };
}

async function urunleriSorgula(suzgec: UrunSuzgeci = {}): Promise<Urun[]> {
  const yas = suzgec.yas ? await yasKosulu(suzgec.yas) : undefined;
  const yasBedenleri = yas?.bedenler ?? [];
  const aranan = suzgec.ara ? kelimeler(suzgec.ara) : [];

  const [satirlar, kampanyalar, sira, renkSecenekleri] = await Promise.all([
    db.product.findMany({
      where: {
        aktif: true,
        ...(suzgec.kategori ? { category: { slug: suzgec.kategori } } : {}),
        ...(suzgec.enFazlaKurus ? { fiyatKurus: { lte: suzgec.enFazlaKurus } } : {}),
        ...varyantKosulu(suzgec, yasBedenleri),
        // Her kelime ayrı aranıyor ve hepsi bulunmak zorunda: "mavi tulum"
        // yazan kişi mavi VE tulum arıyor (K-35). Yaş grubunun kategori
        // koşulu da buraya giriyor: `category` anahtarı yukarıda sayfanın
        // kendi kategorisi için kullanılıyor, ikisi birlikte geçerli olmalı.
        AND: [
          ...aranan.map((k) => ({ aramaMetni: { contains: k } })),
          ...(yas ? [yas.kosul] : []),
        ],
      },
      include: URUN_ICEREN,
      orderBy: { olusturuldu: "asc" },
    }),
    urunIndirimleri(),
    bedenSirasi(),
    tumRenkSecenekleri(),
  ]);
  return sirala(
    satirlar.map((s) => urunYap(s as SatirTipi, kampanyalar, sira, renkSecenekleri)),
    suzgec.sirala,
  );
}

/**
 * Sıralama sorguda değil, kampanyalar uygulandıktan **sonra** yapılıyor.
 *
 * Fiyata göre sıralarken müşterinin gördüğü fiyat geçerli olmalı: indirimli
 * bir ürün liste fiyatına göre sıralanırsa "önce ucuz" listesinde yanlış
 * yerde çıkar. İndirim ise sorgudan sonra hesaplanıyor.
 */
function sirala(urunler: Urun[], nasil?: string): Urun[] {
  const fiyat = (u: Urun) => u.kampanya?.indirimliFiyatKurus ?? u.fiyatKurus;

  switch (nasil) {
    case "ucuz":
      return [...urunler].sort((a, b) => fiyat(a) - fiyat(b));
    case "pahali":
      return [...urunler].sort((a, b) => fiyat(b) - fiyat(a));
    case "yeni":
      // Sorgu eskiden yeniye getiriyor; tersi yeniden eskiye.
      return [...urunler].reverse();
    case "puan":
      // Hiç değerlendirmesi olmayan ürün sona: puanı yok, sıfır değil (K-34).
      return [...urunler].sort((a, b) => {
        if (a.yorumSayisi === 0 && b.yorumSayisi === 0) return 0;
        if (a.yorumSayisi === 0) return 1;
        if (b.yorumSayisi === 0) return -1;
        return b.puan - a.puan;
      });
    default:
      return urunler;
  }
}

/** Ana sayfadaki "Bu haftanın favorileri" şeridi. */
export const oneCikanUrunler = paylasilanOnbellekli(
  oneCikanlariSorgula,
  ["one-cikanlar"],
  [ETIKETLER.katalog],
  30,
);

async function oneCikanlariSorgula(adet = 8): Promise<Urun[]> {
  const [satirlar, kampanyalar, sira, renkSecenekleri] = await Promise.all([
    db.product.findMany({
      where: { aktif: true },
      include: URUN_ICEREN,
      orderBy: { yorumSayisi: "desc" },
      take: adet,
    }),
    urunIndirimleri(),
    bedenSirasi(),
    tumRenkSecenekleri(),
  ]);
  return satirlar.map((s) => urunYap(s as SatirTipi, kampanyalar, sira, renkSecenekleri));
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
    const [ayni, kampanyalar, sira, renkSecenekleri] = await Promise.all([
    db.product.findMany({
      where: { aktif: true, slug: { not: urun.slug }, category: { slug: urun.kategori } },
      include: URUN_ICEREN,
      take: adet,
    }),
    urunIndirimleri(),
    bedenSirasi(),
    tumRenkSecenekleri(),
  ]);
  if (ayni.length >= adet) return ayni.map((s) => urunYap(s as SatirTipi, kampanyalar, sira, renkSecenekleri));

  const digerleri = await db.product.findMany({
    where: {
      aktif: true,
      slug: { not: urun.slug },
      category: { slug: { not: urun.kategori } },
    },
    include: URUN_ICEREN,
    take: adet - ayni.length,
  });
    return [...ayni, ...digerleri].map((s) => urunYap(s as SatirTipi, kampanyalar, sira, renkSecenekleri));
  },
  ["benzer-urunler"],
  [ETIKETLER.katalog],
  30,
);
