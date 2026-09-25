import "server-only";
import { randomInt } from "node:crypto";
import { db } from "@/server/veritabani";
import type { Prisma } from "@/db/uretilen/client";
import { renkAdlari } from "@/server/renkler";

/**
 * Doğum listesi (K-144).
 *
 * Anne adayı (üye) istediği ürünleri beden ve rengiyle listeler, bağlantıyı
 * paylaşır. Bağlantıyı açan yakını listeden sepete ekliyor; sipariş verilince
 * alınan adet artıyor, iptal olunca geri düşüyor. Böylece aynı hediye iki kez
 * alınmıyor.
 *
 * **Gizlilik:** paylaşılan sayfada yalnızca sahibin seçtiği ad, başlık, tarih
 * ve not var. Adres, e-posta ve telefon hiçbir zaman. Sayfa arama
 * motorlarına kapalı, kod tahmin edilemiyor.
 */

const KOD_HARFLERI = "abcdefghjkmnpqrstuvwxyz23456789";

/** 10 karakter, ~2 × 10^14 olasılık. */
export function listeKoduUret(): string {
  return Array.from({ length: 10 }, () => KOD_HARFLERI[randomInt(KOD_HARFLERI.length)]).join("");
}

export type ListeKalemi = {
  id: string;
  variantId: string;
  urunAd: string;
  slug: string;
  beden: string;
  renk: string;
  renkAdi: string;
  fiyatKurus: number;
  stok: number;
  aktif: boolean;
  foto?: string;
  istenen: number;
  alinan: number;
};

export type Liste = {
  id: string;
  kod: string;
  baslik: string;
  sahipAdi: string;
  tarih: string | null;
  mesaj: string;
  acik: boolean;
  kalemler: ListeKalemi[];
};

const SECIM = {
  id: true,
  kod: true,
  baslik: true,
  sahipAdi: true,
  tarih: true,
  mesaj: true,
  acik: true,
  kalemler: {
    orderBy: { olusturuldu: "asc" as const },
    select: {
      id: true,
      istenen: true,
      alinan: true,
      variant: {
        select: {
          id: true,
          beden: true,
          renk: true,
          stok: true,
          fiyatKurus: true,
          product: {
            select: {
              ad: true,
              slug: true,
              aktif: true,
              fiyatKurus: true,
              images: {
                orderBy: { sira: "asc" as const },
                select: { kucukYol: true, yol: true, renk: true },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.GiftListSelect;

type Kayit = Prisma.GiftListGetPayload<{ select: typeof SECIM }>;

function listeYap(k: Kayit, adlar: Record<string, string>): Liste {
  return {
    id: k.id,
    kod: k.kod,
    baslik: k.baslik,
    sahipAdi: k.sahipAdi,
    tarih: k.tarih?.toISOString() ?? null,
    mesaj: k.mesaj,
    acik: k.acik,
    kalemler: k.kalemler.map((x) => {
      const v = x.variant;
      const resimler = v.product.images;
      const resim =
        resimler.find((r) => r.renk === v.renk) ?? resimler.find((r) => !r.renk) ?? resimler[0];
      return {
        id: x.id,
        variantId: v.id,
        urunAd: v.product.ad,
        slug: v.product.slug,
        beden: v.beden,
        renk: v.renk,
        renkAdi: adlar[v.renk] ?? v.renk,
        fiyatKurus: v.fiyatKurus ?? v.product.fiyatKurus,
        stok: v.stok,
        aktif: v.product.aktif,
        foto: resim ? resim.kucukYol || resim.yol : undefined,
        istenen: x.istenen,
        alinan: x.alinan,
      };
    }),
  };
}

export async function musterininListesi(customerId: string): Promise<Liste | undefined> {
  const k = await db.giftList.findUnique({ where: { customerId }, select: SECIM });
  return k ? listeYap(k, await renkAdlari()) : undefined;
}

export async function kodlaListe(kod: string): Promise<Liste | undefined> {
  if (!/^[a-z0-9]{6,20}$/.test(kod)) return undefined;
  const k = await db.giftList.findUnique({ where: { kod }, select: SECIM });
  return k ? listeYap(k, await renkAdlari()) : undefined;
}

/**
 * Sipariş satırlarındaki liste kalemlerinin alınan adedini değiştirir:
 * sipariş verilince artı, iptal edilince eksi. Eksiye düşmüyor.
 */
export async function alinanlariIsle(
  islem: Prisma.TransactionClient,
  satirlar: { giftListItemId: string | null; adet: number }[],
  yon: 1 | -1,
): Promise<void> {
  for (const s of satirlar) {
    if (!s.giftListItemId) continue;
    if (yon === 1) {
      await islem.giftListItem.updateMany({
        where: { id: s.giftListItemId },
        data: { alinan: { increment: s.adet } },
      });
    } else {
      await islem.$executeRaw`update "GiftListItem" set "alinan" = greatest("alinan" - ${s.adet}, 0) where id = ${s.giftListItemId}`;
    }
  }
}
