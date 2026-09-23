"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/veritabani";
import { girisYapan } from "@/server/uyelik";

/**
 * Ürünü favorilere ekler ya da çıkarır (K-94).
 *
 * Kimlik oturumdan geliyor, istekten değil: başkasının listesine ürün
 * eklenemiyor. Sonuç düğmeye dönüyor; sayfa yenilenmiyor, müşteri
 * gezindiği yerde kalıyor.
 */
export async function favoriCevir(
  productId: string,
): Promise<{ tamam: true; favori: boolean } | { tamam: false; sebep: "giris" | "urun" }> {
  const musteri = await girisYapan();
  if (!musteri) return { tamam: false, sebep: "giris" };

  const urun = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!urun) return { tamam: false, sebep: "urun" };

  const anahtar = { customerId_productId: { customerId: musteri.id, productId } };
  const var_ = await db.favorite.findUnique({ where: anahtar, select: { id: true } });
  if (var_) {
    await db.favorite.delete({ where: anahtar });
  } else {
    // Aynı anda iki tıklama: tekil anahtar ikinciyi reddediyor, o da
    // "zaten favoride" demek.
    await db.favorite
      .create({ data: { customerId: musteri.id, productId } })
      .catch(() => undefined);
  }

  revalidatePath("/hesabim/favoriler");
  return { tamam: true, favori: !var_ };
}
