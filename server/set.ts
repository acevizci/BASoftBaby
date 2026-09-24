import "server-only";

/**
 * Set ve paket ürün (K-133).
 *
 * Set kendi stoğu olan normal bir ürün: sepet, sipariş, iade ve kâr hesabı
 * setin varyantı üzerinden, hiçbiri değişmiyor. Farkı, varyantlarının içinde
 * başka varyantların olması. Panelde "set hazırla" o kadar seti paketliyor:
 * parçaların stoğu düşüyor, setin stoğu artıyor; "seti boz" tersini yapıyor.
 * Hepsi tek işlemde ve stok geçmişine yazılıyor (K-103).
 */

import { db } from "@/server/veritabani";
import { hareketYaz, type Yapan } from "@/server/stok-hareket";
import { barkodNoCoz } from "@/server/barkod";
import { hazirlanabilir } from "@/server/set-bicim";
import { ETIKETLER, paylasilanOnbellekli } from "@/server/onbellek";

/** SKU ya da etiketteki barkod ("B123") ile varyant. */
export async function varyantBul(kod: string) {
  const temiz = kod.trim();
  if (!temiz) return null;
  const no = barkodNoCoz(temiz);
  return db.productVariant.findFirst({
    where: no !== undefined ? { barkodNo: no } : { sku: temiz },
    select: { id: true, productId: true },
  });
}

export type SetSonucu = { tamam: true; adet: number } | { tamam: false; sebep: string };

export async function setHazirla(setVariantId: string, adet: number, yapan: Yapan): Promise<SetSonucu> {
  if (!Number.isInteger(adet) || adet < 1 || adet > 1000) return { tamam: false, sebep: "adet" };
  return db.$transaction(async (islem) => {
    const parcalar = await islem.bundleItem.findMany({
      where: { setVariantId },
      select: { variantId: true, adet: true, variant: { select: { stok: true } } },
    });
    if (parcalar.length === 0) return { tamam: false, sebep: "bos" } as const;
    const olabilir = hazirlanabilir(parcalar.map((p) => ({ ...p, stok: p.variant.stok })));
    if (olabilir < adet) return { tamam: false, sebep: `yetersiz:${olabilir}` } as const;

    for (const p of parcalar) {
      // Koşullu düşüm: arada satılan parça stoğu eksiye düşürmesin.
      const { count } = await islem.productVariant.updateMany({
        where: { id: p.variantId, stok: { gte: p.adet * adet } },
        data: { stok: { decrement: p.adet * adet } },
      });
      if (count === 0) throw new Error("Parça stoğu hazırlama sırasında değişti.");
    }
    await islem.productVariant.update({ where: { id: setVariantId }, data: { stok: { increment: adet } } });
    await hareketYaz(islem, [
      ...parcalar.map((p) => ({
        variantId: p.variantId,
        degisim: -p.adet * adet,
        sebep: "set-hazirla" as const,
        yapan,
        not: `${adet} set`,
      })),
      { variantId: setVariantId, degisim: adet, sebep: "set-hazirla", yapan },
    ]);
    return { tamam: true, adet } as const;
  });
}

export async function setBoz(setVariantId: string, adet: number, yapan: Yapan): Promise<SetSonucu> {
  if (!Number.isInteger(adet) || adet < 1 || adet > 1000) return { tamam: false, sebep: "adet" };
  return db.$transaction(async (islem) => {
    const parcalar = await islem.bundleItem.findMany({ where: { setVariantId }, select: { variantId: true, adet: true } });
    if (parcalar.length === 0) return { tamam: false, sebep: "bos" } as const;
    const { count } = await islem.productVariant.updateMany({
      where: { id: setVariantId, stok: { gte: adet } },
      data: { stok: { decrement: adet } },
    });
    if (count === 0) return { tamam: false, sebep: "set-stok" } as const;
    for (const p of parcalar) {
      await islem.productVariant.update({ where: { id: p.variantId }, data: { stok: { increment: p.adet * adet } } });
    }
    await hareketYaz(islem, [
      { variantId: setVariantId, degisim: -adet, sebep: "set-boz", yapan },
      ...parcalar.map((p) => ({
        variantId: p.variantId,
        degisim: p.adet * adet,
        sebep: "set-boz" as const,
        yapan,
        not: `${adet} set bozuldu`,
      })),
    ]);
    return { tamam: true, adet } as const;
  });
}

/** Panel: ürünün set varyantları, içerikleri ve hazırlanabilir adet. */
export async function urununSetleri(productId: string) {
  const varyantlar = await db.productVariant.findMany({
    where: { productId },
    select: {
      id: true,
      beden: true,
      renk: true,
      stok: true,
      setIcerigi: {
        select: {
          id: true,
          adet: true,
          variant: {
            select: { id: true, beden: true, renk: true, stok: true, sku: true, product: { select: { ad: true, slug: true } } },
          },
        },
      },
    },
  });
  return varyantlar.map((v) => ({
    ...v,
    hazirlanabilir: hazirlanabilir(v.setIcerigi.map((p) => ({ variantId: p.variant.id, adet: p.adet, stok: p.variant.stok }))),
  }));
}

export type SetKalemi = {
  ad: string;
  slug: string;
  aktif: boolean;
  beden: string;
  renk: string;
  adet: number;
  fiyatKurus: number;
};

/**
 * Mağaza: ürün setse varyant kimliği → içindekiler. Önbellekte (katalog
 * etiketiyle düşüyor); düz nesne, çünkü önbellek `Map` saklayamıyor.
 */
export const setIcerikleri = paylasilanOnbellekli(
  async function setIcerikleri(productId: string): Promise<Record<string, SetKalemi[]>> {
    const satirlar = await db.bundleItem.findMany({
      where: { setVariant: { productId } },
      select: {
        setVariantId: true,
        adet: true,
        variant: {
          select: {
            beden: true,
            renk: true,
            product: { select: { ad: true, slug: true, fiyatKurus: true, aktif: true } },
          },
        },
      },
    });
    const sonuc: Record<string, SetKalemi[]> = {};
    for (const s of satirlar) {
      (sonuc[s.setVariantId] ??= []).push({
        ad: s.variant.product.ad,
        slug: s.variant.product.slug,
        aktif: s.variant.product.aktif,
        beden: s.variant.beden,
        renk: s.variant.renk,
        adet: s.adet,
        fiyatKurus: s.variant.product.fiyatKurus,
      });
    }
    return sonuc;
  },
  ["set-icerikleri"],
  [ETIKETLER.katalog],
);
