import "server-only";
import { db } from "@/server/veritabani";
import { enIyiKampanya, urunFiyatinaYansiyanlar, urunIndirimleri } from "@/server/kampanya";
import type { Prisma } from "@/db/uretilen/client";
import { kapsamdaUrunMu } from "@/server/kampanya-kapsam";

/**
 * Fiyat geçmişi ve indirim öncesi fiyat denetimi (K-164).
 *
 * Fiyat Etiketi Yönetmeliği: indirimli satışta indirimden önceki fiyat,
 * **indirimin uygulandığı tarihten önceki on gün içinde uygulanan en düşük
 * fiyat** esas alınarak belirleniyor (11.10.2025 tarihli değişiklik; önce
 * otuz gündü). İspat yükü satıcıda. Mağazada üstü çizili fiyat iki yerden
 * geliyor: ürüne elle girilen eski fiyat ve kampanyada liste fiyatı. İkisi
 * de bu geçmişle sınanıyor; panel aşan fiyatı uyarıyor, mağaza fiyatı
 * kendiliğinden değiştirilmiyor — karar mağaza sahibinin.
 *
 * Geçmişte yalnızca liste fiyatı (`fiyatKurus`) var. Geçmiş kampanyaların
 * indirimli fiyatları yazılmıyor: kampanya bitince ürün liste fiyatına
 * dönüyor, iki kampanya arasına on gün bırakmak mağaza sahibinin işi.
 */

export const INDIRIM_ONCESI_GUN = 10;
const GUN = 24 * 60 * 60 * 1000;

type Veritabani = Prisma.TransactionClient | typeof db;

/** Fiyat değiştiyse yeni satır yazar; aynıysa hiçbir şey yapmaz. */
export async function fiyatiKaydet(
  islem: Veritabani,
  productId: string,
  fiyatKurus: number,
): Promise<void> {
  const son = await islem.priceHistory.findFirst({
    where: { productId },
    orderBy: { olusturuldu: "desc" },
    select: { fiyatKurus: true },
  });
  if (son?.fiyatKurus === fiyatKurus) return;
  await islem.priceHistory.create({ data: { productId, fiyatKurus } });
}

export type FiyatKaydi = { fiyatKurus: number; olusturuldu: Date };

/**
 * `baslangic` anından önceki on günde uygulanan en düşük fiyat.
 *
 * Bir fiyat, kendi kaydından sonraki kayda kadar geçerli. Pencerenin başında
 * geçerli olan fiyat da sayılıyor (pencereden önce girilmiş ama pencere
 * boyunca uygulanmış). Pencerede hiç fiyat yoksa `undefined`: ürün o
 * tarihte satışta değildi ya da kaydı yok.
 */
export function indirimOncesiEnDusuk(
  kayitlar: readonly FiyatKaydi[],
  baslangic: Date,
  gun = INDIRIM_ONCESI_GUN,
): number | undefined {
  const pencereBasi = baslangic.getTime() - gun * GUN;
  const sirali = [...kayitlar].sort((a, b) => a.olusturuldu.getTime() - b.olusturuldu.getTime());
  let enDusuk: number | undefined;
  for (let i = 0; i < sirali.length; i++) {
    const bas = sirali[i].olusturuldu.getTime();
    const son = i + 1 < sirali.length ? sirali[i + 1].olusturuldu.getTime() : Infinity;
    // [bas, son) aralığı [pencereBasi, baslangic) ile kesişiyor mu?
    if (bas < baslangic.getTime() && son > pencereBasi) {
      enDusuk = Math.min(enDusuk ?? Infinity, sirali[i].fiyatKurus);
    }
  }
  return enDusuk;
}

/** Şu anki fiyatın başladığı an: son fiyat değişikliği. */
export function fiyatinBaslangici(kayitlar: readonly FiyatKaydi[]): Date | undefined {
  let son: FiyatKaydi | undefined;
  for (const k of kayitlar) if (!son || k.olusturuldu > son.olusturuldu) son = k;
  return son?.olusturuldu;
}

export type FiyatUyarisi = {
  /** Üstü çizili fiyatın kaynağı */
  tur: "eskiFiyat" | "kampanya";
  ustuCiziliKurus: number;
  /** Pencerede uygulanan en düşük fiyat; kayıt yoksa boş */
  enDusukKurus?: number;
  baslangic: Date;
  kampanyaAdi?: string;
};

/**
 * Ürünün mağazada görünen üstü çizili fiyatı yönetmeliğe uyuyor mu?
 * Uymuyorsa ya da kanıtlanamıyorsa uyarı döner; uyuyorsa `undefined`.
 */
export async function fiyatUyarisi(productId: string): Promise<FiyatUyarisi | undefined> {
  const [urun, kayitlar, kampanyalar] = await Promise.all([
    db.product.findUnique({
      where: { id: productId },
      select: { id: true, categoryId: true, fiyatKurus: true, eskiFiyatKurus: true },
    }),
    db.priceHistory.findMany({
      where: { productId },
      select: { fiyatKurus: true, olusturuldu: true },
    }),
    urunIndirimleri(new Date()),
  ]);
  if (!urun) return undefined;

  // Kampanya varsa üstü çizili liste fiyatı, indirim kampanyanın başlangıcında.
  const enIyi = enIyiKampanya(
    urunFiyatinaYansiyanlar(kampanyalar),
    [{ productId: urun.id, categoryId: urun.categoryId, araToplamKurus: urun.fiyatKurus }],
    urun.fiyatKurus,
  );
  if (enIyi) {
    const k = await db.campaign.findUnique({
      where: { id: enIyi.id },
      select: { baslangic: true, olusturuldu: true },
    });
    const baslangic = k?.baslangic ?? k?.olusturuldu ?? new Date();
    const enDusuk = indirimOncesiEnDusuk(kayitlar, baslangic);
    if (enDusuk !== undefined && urun.fiyatKurus <= enDusuk) return undefined;
    return {
      tur: "kampanya",
      ustuCiziliKurus: urun.fiyatKurus,
      enDusukKurus: enDusuk,
      baslangic,
      kampanyaAdi: enIyi.ad,
    };
  }

  // Elle girilen eski fiyat: indirim şu anki fiyatın girildiği an başladı.
  if (!urun.eskiFiyatKurus || urun.eskiFiyatKurus <= urun.fiyatKurus) return undefined;
  const baslangic = fiyatinBaslangici(kayitlar) ?? new Date();
  const enDusuk = indirimOncesiEnDusuk(kayitlar, baslangic);
  if (enDusuk !== undefined && urun.eskiFiyatKurus <= enDusuk) return undefined;
  return {
    tur: "eskiFiyat",
    ustuCiziliKurus: urun.eskiFiyatKurus,
    enDusukKurus: enDusuk,
    baslangic,
  };
}

export type KampanyaFiyatUyarisi = {
  slug: string;
  ad: string;
  ustuCiziliKurus: number;
  enDusukKurus?: number;
};

/**
 * Kampanyalar sayfası için (K-164): kendiliğinden uygulanan her kampanyada,
 * liste fiyatı kampanya başlangıcından önceki on günün en düşüğünü aşan ya
 * da o döneme ait kaydı olmayan ürünler. Başlamamış kampanyalar da
 * sınanıyor: uyarı kampanya başlamadan görülsün. Kuponlu ve sepet alt
 * sınırlı kampanyalar ürün fiyatında görünmediği için dışarıda.
 */
export async function kampanyaFiyatUyarilari(
  kampanyaIdleri: readonly string[],
  simdi = new Date(),
): Promise<Map<string, KampanyaFiyatUyarisi[]>> {
  const sonuc = new Map<string, KampanyaFiyatUyarisi[]>();
  const kampanyalar = await db.campaign.findMany({
    where: {
      id: { in: [...kampanyaIdleri] },
      aktif: true,
      // Ürün fiyatında yalnızca yüzde indirimi görünüyor (K-165).
      tip: "yuzde",
      kuponKodu: null,
      customerId: null,
      enAzSepetKurus: 0,
      // Üyeye göre değişen kampanya kartta üstü çizili fiyat göstermiyor (K-171).
      uyelereOzel: false,
      ilkSiparis: false,
      kisiBasiSinir: null,
      OR: [{ bitis: null }, { bitis: { gte: simdi } }],
    },
    select: {
      id: true,
      tip: true,
      deger: true,
      kapsam: true,
      categoryId: true,
      productId: true,
      kategoriIdleri: true,
      urunIdleri: true,
      baslangic: true,
      olusturuldu: true,
    },
  });
  if (kampanyalar.length === 0) return sonuc;

  const urunler = await db.product.findMany({
    where: { aktif: true },
    select: {
      id: true,
      slug: true,
      ad: true,
      categoryId: true,
      fiyatKurus: true,
      fiyatGecmisi: { select: { fiyatKurus: true, olusturuldu: true } },
    },
  });

  for (const k of kampanyalar) {
    // Başlangıç yoksa kampanya açıldığı an başladı.
    const baslangic = k.baslangic ?? k.olusturuldu;
    const liste: KampanyaFiyatUyarisi[] = [];
    for (const u of urunler) {
      if (!kapsamdaUrunMu(k, { productId: u.id, categoryId: u.categoryId })) continue;
      const enDusuk = indirimOncesiEnDusuk(u.fiyatGecmisi, baslangic);
      if (enDusuk !== undefined && u.fiyatKurus <= enDusuk) continue;
      liste.push({ slug: u.slug, ad: u.ad, ustuCiziliKurus: u.fiyatKurus, enDusukKurus: enDusuk });
    }
    if (liste.length > 0) sonuc.set(k.id, liste);
  }
  return sonuc;
}
