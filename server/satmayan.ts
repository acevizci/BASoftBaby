import "server-only";

/**
 * Satmayan stok raporu (K-108).
 *
 * Rafta bekleyen para görünmüyordu. Son N günde (60/90/180) hiç satmamış,
 * stoğu olan beden-renkler listeleniyor; yanında stoktaki adet, son satış ve
 * son giriş, bağlı para.
 *
 * - **Yeni gelen "satmıyor" sayılmıyor.** Pencere içinde stoğa giriş olmuşsa
 *   (mal kabulü, yeni beden, toplu yükleme) ve o girişten beri pencere kadar
 *   zaman geçmemişse listede değil. Ürün de pencereden yeni açılmışsa yok.
 * - **Bağlı para** alış fiyatıyla (varsa), yoksa satış fiyatıyla ve öyle
 *   yazıyor: iki toplam ayrı.
 *
 * İndirime alınan ürün için favorilerine koyanlara zaten haber gidiyor
 * (K-100).
 */

import { db } from "@/server/veritabani";

export const PENCERELER = [60, 90, 180] as const;
const GUN = 24 * 60 * 60 * 1000;

export type SatmayanSatir = {
  variantId: string;
  urunAd: string;
  slug: string;
  beden: string;
  renk: string;
  stok: number;
  sonSatis: Date | null;
  sonGiris: Date | null;
  birimKurus: number;
  /** Birim fiyat alış fiyatı mı (değilse satış fiyatı). */
  maliyetMi: boolean;
};

export type SatmayanRapor = {
  satirlar: SatmayanSatir[];
  adet: number;
  maliyetKurus: number;
  /** Alış fiyatı girilmemiş satırların satış fiyatıyla değeri. */
  satisDegeriKurus: number;
};

export function pencereCoz(ham: unknown): number {
  const n = Number(ham);
  return (PENCERELER as readonly number[]).includes(n) ? n : 90;
}

/** Saf karar: bu beden "satmıyor" sayılır mı. */
export function satmiyorMu(
  v: { stok: number; sonSatis: Date | null; sonGiris: Date | null; urunAcildi: Date },
  sinir: Date,
): boolean {
  if (v.stok <= 0) return false;
  if (v.urunAcildi > sinir) return false;
  if (v.sonSatis && v.sonSatis > sinir) return false;
  if (v.sonGiris && v.sonGiris > sinir) return false;
  return true;
}

export async function satmayanlar(gun: number, simdi: Date = new Date()): Promise<SatmayanRapor> {
  const sinir = new Date(simdi.getTime() - gun * GUN);

  const varyantlar = await db.productVariant.findMany({
    where: { stok: { gt: 0 }, product: { aktif: true } },
    select: {
      id: true,
      beden: true,
      renk: true,
      stok: true,
      fiyatKurus: true,
      product: {
        select: { ad: true, slug: true, fiyatKurus: true, alisFiyatKurus: true, olusturuldu: true },
      },
    },
  });
  const idler = varyantlar.map((v) => v.id);
  if (idler.length === 0) return { satirlar: [], adet: 0, maliyetKurus: 0, satisDegeriKurus: 0 };

  // Son satış: iptal edilmemiş siparişin tarihi. Son giriş: stoğu artıran
  // hareket (iade ve iptal değil; onlar "yeni mal" değil).
  const [satislar, girisler] = await Promise.all([
    db.$queryRaw<{ variantId: string; son: Date }[]>`
      select i."variantId", max(o.olusturuldu) as son
        from "OrderItem" i join "Order" o on o.id = i."orderId"
       where o.durum <> 'iptal' and i."variantId" = any(${idler})
       group by i."variantId"`,
    db.stockMovement.groupBy({
      by: ["variantId"],
      where: { variantId: { in: idler }, degisim: { gt: 0 }, sebep: { in: ["mal-kabul", "yeni", "toplu", "sayim"] } },
      _max: { olusturuldu: true },
    }),
  ]);
  const sonSatis = new Map(satislar.map((s) => [s.variantId, s.son]));
  const sonGiris = new Map(girisler.map((g) => [g.variantId, g._max.olusturuldu]));

  const satirlar = varyantlar
    .map((v) => ({
      v,
      sonSatis: sonSatis.get(v.id) ?? null,
      sonGiris: sonGiris.get(v.id) ?? null,
    }))
    .filter(({ v, sonSatis, sonGiris }) =>
      satmiyorMu({ stok: v.stok, sonSatis, sonGiris, urunAcildi: v.product.olusturuldu }, sinir),
    )
    .map(({ v, sonSatis, sonGiris }) => {
      const maliyetMi = v.product.alisFiyatKurus !== null;
      return {
        variantId: v.id,
        urunAd: v.product.ad,
        slug: v.product.slug,
        beden: v.beden,
        renk: v.renk,
        stok: v.stok,
        sonSatis,
        sonGiris,
        birimKurus: v.product.alisFiyatKurus ?? v.fiyatKurus ?? v.product.fiyatKurus,
        maliyetMi,
      };
    })
    // En çok para bağlayan üstte.
    .sort((a, b) => b.stok * b.birimKurus - a.stok * a.birimKurus);

  return {
    satirlar,
    adet: satirlar.reduce((t, s) => t + s.stok, 0),
    maliyetKurus: satirlar.filter((s) => s.maliyetMi).reduce((t, s) => t + s.stok * s.birimKurus, 0),
    satisDegeriKurus: satirlar.filter((s) => !s.maliyetMi).reduce((t, s) => t + s.stok * s.birimKurus, 0),
  };
}

export function satmayanCsv(r: SatmayanRapor, renkAdlari: Record<string, string>): string {
  const kacir = (d: string) => `"${d.replace(/"/g, '""')}"`;
  const tarih = (t: Date | null) => (t ? t.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" }) : "");
  const tutar = (k: number) => (k / 100).toFixed(2).replace(".", ",");
  const basliklar = ["Ürün", "Beden", "Renk", "Stok", "Son satış", "Son giriş", "Birim", "Birim tutar", "Bağlı tutar"];
  const govde = r.satirlar.map((s) =>
    [
      s.urunAd, s.beden, renkAdlari[s.renk] ?? s.renk, String(s.stok), tarih(s.sonSatis) || "hiç",
      tarih(s.sonGiris), s.maliyetMi ? "alış" : "satış", tutar(s.birimKurus), tutar(s.stok * s.birimKurus),
    ]
      .map(kacir)
      .join(";"),
  );
  return `﻿${[basliklar.map(kacir).join(";"), ...govde].join("\r\n")}\r\n`;
}
