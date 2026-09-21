import "server-only";

/**
 * Ürünlerin arama metnini tazeleyen yardımcılar.
 *
 * Normalleştirilmiş hâl ürünün üstünde `aramaMetni` alanında duruyor; her
 * yazma işleminden sonra tazeleniyor. Sorgu anında hesaplamak da mümkündü ama
 * o zaman dizin kullanılamıyor ve her arama bütün katalogu tarıyor (K-35).
 */

import { db } from "@/server/veritabani";
import { aramaMetniYap } from "@/server/arama-metin";

export { aramaMetniYap, kelimeler, normalle } from "@/server/arama-metin";

/**
 * Bir ürünün arama metnini yeniden üretir.
 *
 * Kategori adı kasten dışarıda: kategori adı değişince bütün ürünlerinin
 * metnini tazelemek gerekirdi ve bayatlarsa kimse fark etmezdi. Kategoriye
 * göre daraltma zaten süzgeçlerde var.
 */
export async function aramaMetniniTazele(productId: string): Promise<void> {
  const u = await db.product.findUnique({
    where: { id: productId },
    select: { ad: true, ozet: true, aciklama: true, ozellikler: true, kumasIcerigi: true },
  });
  if (!u) return;

  await db.product.update({
    where: { id: productId },
    data: {
      aramaMetni: aramaMetniYap([u.ad, u.ozet, u.aciklama, ...u.ozellikler, u.kumasIcerigi]),
    },
  });
}

/** Birden çok ürün için; toplu yüklemede tek tek çağırmamak için. */
export async function aramaMetinleriniTazele(productIdler: string[]): Promise<void> {
  for (const id of productIdler) await aramaMetniniTazele(id);
}
