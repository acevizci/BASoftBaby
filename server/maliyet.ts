import "server-only";
import type { Prisma } from "@/db/uretilen/client";
import { db } from "@/server/veritabani";

/**
 * Alış fiyatı ilk kez girildiğinde geçmiş siparişler (K-111).
 *
 * Maliyeti bilinmeyen eski satırlar bu değerle dolduruluyor ve "tahmini"
 * diye işaretleniyor: sipariş anındaki maliyet bilinmiyor ama boş kalırsa o
 * satışların kârı hiç hesaplanamazdı. Maliyeti zaten yazılı satırlara
 * dokunulmuyor — alış fiyatının sonradan değişmesi geçmişi değiştirmemeli.
 */
export async function maliyetiGecmiseYaz(
  productId: string,
  alisFiyatKurus: number | null | undefined,
  islem: Prisma.TransactionClient | typeof db = db,
): Promise<number> {
  if (alisFiyatKurus === null || alisFiyatKurus === undefined) return 0;
  const { count } = await islem.orderItem.updateMany({
    where: { alisFiyatKurus: null, variant: { productId } },
    data: { alisFiyatKurus, alisTahmini: true },
  });
  return count;
}
