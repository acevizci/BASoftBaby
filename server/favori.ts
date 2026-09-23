import "server-only";
import { cache } from "react";
import { db } from "@/server/veritabani";
import { girisYapan } from "@/server/uyelik";
import { urunleriSec, type Urun } from "@/server/katalog";

/**
 * Müşterinin favorileri (K-94).
 *
 * Bebek kıyafetinde müşteri çoğunlukla bakıp sonra karar veriyor; beğendiğini
 * bir yere koyamayınca ertesi gün yeniden arıyordu. Favoriler yalnızca
 * üyelerde: hesap olmadan tutulsaydı cihazdan cihaza taşınmazdı.
 */

/**
 * Giriş yapan müşterinin favori ürün kimlikleri; giriş yoksa `null`.
 *
 * Mağaza düzeni bunu bir kez okuyup bütün kartlara dağıtıyor. İstek
 * önbelleğinde: aynı istekte ikinci kez veritabanına gidilmesin.
 */
export const favoriIdleri = cache(async function favoriIdleri(): Promise<string[] | null> {
  const musteri = await girisYapan();
  if (!musteri) return null;
  const satirlar = await db.favorite.findMany({
    where: { customerId: musteri.id },
    orderBy: { olusturuldu: "desc" },
    select: { productId: true },
  });
  return satirlar.map((f) => f.productId);
});

/** Favoriler sayfası: en son eklenen önce; yayından kalkanlar görünmüyor. */
export async function favorilerim(customerId: string): Promise<Urun[]> {
  const satirlar = await db.favorite.findMany({
    where: { customerId },
    orderBy: { olusturuldu: "desc" },
    select: { productId: true },
  });
  return urunleriSec({ idler: satirlar.map((f) => f.productId) });
}
