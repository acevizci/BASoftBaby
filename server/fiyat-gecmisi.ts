import "server-only";
import { db } from "@/server/veritabani";
import { enIyiKampanya, urunIndirimleri } from "@/server/kampanya";
import type { Prisma } from "@/db/uretilen/client";

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
    kampanyalar,
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
