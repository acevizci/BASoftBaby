"use server";

/**
 * Sepet işlemleri. Hepsi düz HTML formundan çağrılır, yani JavaScript kapalı
 * bir tarayıcıda da çalışır.
 *
 * Adet her yerde stokla sınırlanır: müşteri formu kurcalayıp stoktan fazlasını
 * sepete koyamaz. Gerçek stok düşümü yine de sipariş anında, tek bir
 * veritabanı işlemi içinde yapılır (bkz. server/siparis.ts).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { sepetIdAlVeyaKur, sepetIdOku } from "@/server/sepet";

/** En fazla bu kadar adet tek kalemde satılır; yanlışlıkla 999 girilmesin. */
const EN_FAZLA = 20;

function sayiOku(deger: FormDataEntryValue | null, varsayilan = 1): number {
  const n = Number(String(deger ?? "").trim());
  return Number.isFinite(n) ? Math.floor(n) : varsayilan;
}

function sepetiYenile(): void {
  revalidatePath("/", "layout");
}

export async function sepeteEkle(veri: FormData): Promise<void> {
  const variantId = String(veri.get("variantId") ?? "");
  const istenen = Math.max(1, Math.min(EN_FAZLA, sayiOku(veri.get("adet"))));
  const nereye = String(veri.get("nereye") ?? "");
  if (!variantId) return;

  const varyant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { stok: true, product: { select: { aktif: true } } },
  });
  if (!varyant || !varyant.product.aktif || varyant.stok <= 0) return;

  const cartId = await sepetIdAlVeyaKur();
  const mevcut = await db.cartItem.findUnique({
    where: { cartId_variantId: { cartId, variantId } },
    select: { adet: true },
  });

  const yeniAdet = Math.min(varyant.stok, EN_FAZLA, (mevcut?.adet ?? 0) + istenen);
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    update: { adet: yeniAdet },
    create: { cartId, variantId, adet: yeniAdet },
  });

  sepetiYenile();
  if (nereye === "sepet") redirect("/sepet");
}

export async function adetDegistir(veri: FormData): Promise<void> {
  const variantId = String(veri.get("variantId") ?? "");
  const istenen = sayiOku(veri.get("adet"));
  const cartId = await sepetIdOku();
  if (!cartId || !variantId) return;

  if (istenen <= 0) {
    await db.cartItem.deleteMany({ where: { cartId, variantId } });
    sepetiYenile();
    return;
  }

  const varyant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { stok: true },
  });
  if (!varyant) return;

  await db.cartItem.updateMany({
    where: { cartId, variantId },
    data: { adet: Math.min(istenen, varyant.stok, EN_FAZLA) },
  });
  sepetiYenile();
}

export async function satirSil(veri: FormData): Promise<void> {
  const variantId = String(veri.get("variantId") ?? "");
  const cartId = await sepetIdOku();
  if (!cartId || !variantId) return;

  await db.cartItem.deleteMany({ where: { cartId, variantId } });
  sepetiYenile();
}
