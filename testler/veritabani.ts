import "./hazirlik";
import { db } from "@/server/veritabani";
import { cerezAyarla, cerezleriTemizle } from "./sahte-headers";

/**
 * Veritabanına bağlı testlerin ortak kurulumu.
 *
 * **Üretime asla dokunmuyor.** Ölçüt `DATABASE_URL` değil, ayrı bir
 * `TEST_DATABASE_URL`: tanımlı değilse bu dosyadaki testler **atlanıyor**
 * (K-77). Tanımlıysa `hazirlik.ts` onu `DATABASE_URL` olarak yazıyor, yani
 * testler uygulamanın **kendi** `db` istemcisiyle çalışıyor — sorguların
 * taklidi değil, gerçek kod yolu sınanıyor.
 *
 * **Her test kendi verisini kuruyor ve siliyor.** Ortak bir tohuma
 * güvenilseydi testler birbirinin sonucunu bozardı; sıra değişince
 * anlaşılmaz hatalar çıkardı. Bütün kayıtlar `T_` önekli kimliklerle
 * açılıyor, `temizle()` de yalnızca onları siliyor.
 */

const adres = process.env.TEST_DATABASE_URL?.trim();

/** Veritabanı testleri açık mı; değilse `describe(..., { skip })` kullanılıyor. */
export const veritabaniVar = Boolean(adres);

export const atlamaSebebi = veritabaniVar
  ? undefined
  : "TEST_DATABASE_URL tanımlı değil; veritabanı testleri atlandı.";

export function testDb() {
  if (!adres) throw new Error("TEST_DATABASE_URL tanımlı değil.");
  return db;
}

/** Test kayıtlarının ön eki; `temizle()` bunlara bakıyor. */
export const ON_EK = "T_";

export function kimlik(ad: string): string {
  return `${ON_EK}${ad}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Test kayıtlarını siler.
 *
 * Sıra yabancı anahtarlara göre: önce bağımlılar, sonra bağımlı olunanlar.
 */
export async function temizle(): Promise<void> {
  if (!veritabaniVar) return;
  const db = testDb();
  const onek = { startsWith: ON_EK };
  cerezleriTemizle();
  await db.cartItem.deleteMany({ where: { cart: { id: onek } } });
  await db.cart.deleteMany({ where: { id: onek } });
  await db.orderItem.deleteMany({ where: { order: { id: onek } } });
  await db.refund.deleteMany({ where: { order: { id: onek } } });
  await db.payment.deleteMany({ where: { order: { id: onek } } });
  await db.shipment.deleteMany({ where: { order: { id: onek } } });
  await db.order.deleteMany({ where: { id: onek } });
  await db.productVariant.deleteMany({ where: { id: onek } });
  await db.productImage.deleteMany({ where: { id: onek } });
  await db.product.deleteMany({ where: { id: onek } });
  await db.category.deleteMany({ where: { id: onek } });
}

/** Bir ürün ve tek varyantı; stoğu çağıran veriyor. */
export async function urunKur(stok: number): Promise<{ productId: string; variantId: string }> {
  const db = testDb();
  const categoryId = kimlik("kat");
  const productId = kimlik("urun");
  const variantId = kimlik("var");

  await db.category.create({
    data: { id: categoryId, slug: categoryId.toLowerCase(), ad: "Test kategorisi", sira: 999 },
  });
  await db.product.create({
    data: {
      id: productId,
      slug: productId.toLowerCase(),
      ad: "Test ürünü",
      ozet: "test",
      categoryId,
      fiyatKurus: 10000,
      kumasIcerigi: "test",
      yikamaTalimati: "test",
      aktif: true,
    },
  });
  await db.productVariant.create({
    data: { id: variantId, productId, beden: "0-3 ay", renk: "mint", stok, sku: variantId },
  });
  return { productId, variantId };
}

/**
 * Sepet kurar ve çerezini ayarlar.
 *
 * Sipariş oluşturma kalemleri **sepetten** okuyor, çağırana verilen
 * listeden değil: gerçek yolu sınamak için sepetin de gerçek olması
 * gerekiyor (K-77).
 */
export async function sepetKur(variantId: string, adet: number): Promise<string> {
  const db = testDb();
  const cartId = kimlik("sepet");
  await db.cart.create({ data: { id: cartId } });
  await db.cartItem.create({ data: { id: kimlik("sat"), cartId, variantId, adet } });
  cerezAyarla("sepet", cartId);
  return cartId;
}
