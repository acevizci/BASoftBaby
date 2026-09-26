import "server-only";

/**
 * Stok hareketleri (K-103).
 *
 * Stoğu değiştiren her yol, değişikliği yaptıktan hemen sonra **aynı
 * işlemin içinde** `hareketYaz`ı çağırıyor. Hareket satırı stokla birlikte
 * yazılıyor ya da hiç yazılmıyor; "stok değişti ama kaydı yok" durumu
 * oluşamıyor.
 *
 * `sonra` hareketten sonraki stok, işlemin içinden okunuyor: aynı anda
 * gelen iki sipariş kendi satırlarında doğru sırayı gösteriyor.
 */

import type { Prisma } from "@/db/uretilen/client";
import { db } from "@/server/veritabani";

export const SEBEPLER = {
  siparis: "Sipariş",
  iptal: "Sipariş iptali",
  iade: "İade",
  "degisim-geri": "Değişim · geri gelen",
  degisim: "Değişim · gönderilen",
  duzeltme: "Elle düzeltme",
  "mal-kabul": "Mal kabulü",
  sayim: "Sayım farkı",
  toplu: "Toplu yükleme",
  yeni: "Yeni beden",
  silindi: "Beden silindi",
  "set-hazirla": "Set hazırlama",
  "set-boz": "Set bozma",
  // Depo ekranında "Çıkar" (K-176).
  hasar: "Hasarlı / fire",
  kayip: "Kayıp",
  numune: "Numune, hediye",
} as const;
export type Sebep = keyof typeof SEBEPLER;

export function sebepAdi(sebep: string): string {
  return (SEBEPLER as Record<string, string>)[sebep] ?? sebep;
}

export type Yapan = { id: string; adSoyad: string };

export type Hareket = {
  variantId: string;
  /** Artı giriş, eksi çıkış. Sıfırsa satır yazılmıyor. */
  degisim: number;
  sebep: Sebep;
  siparisNo?: string;
  yapan?: Yapan;
  not?: string;
};

type Islem = Prisma.TransactionClient | typeof db;

/**
 * Hareketleri yazar. Stok değişikliğinden **sonra**, aynı işlemde
 * çağrılmalı: `sonra` o anki stoktan okunuyor.
 *
 * `silindi` için beden henüz silinmemişken çağrılıyor; `sonra` sıfır
 * yazılıyor.
 */
export async function hareketYaz(islem: Islem, hareketler: Hareket[]): Promise<void> {
  const yazilacak = hareketler.filter((h) => h.degisim !== 0);
  if (yazilacak.length === 0) return;

  const varyantlar = await islem.productVariant.findMany({
    where: { id: { in: [...new Set(yazilacak.map((h) => h.variantId))] } },
    select: {
      id: true,
      stok: true,
      beden: true,
      renk: true,
      productId: true,
      product: { select: { ad: true } },
    },
  });
  const bul = new Map(varyantlar.map((v) => [v.id, v]));

  await islem.stockMovement.createMany({
    data: yazilacak.flatMap((h) => {
      const v = bul.get(h.variantId);
      if (!v) return [];
      return [
        {
          variantId: v.id,
          productId: v.productId,
          urunAd: v.product.ad,
          beden: v.beden,
          renk: v.renk,
          degisim: h.degisim,
          sonra: h.sebep === "silindi" ? 0 : v.stok,
          sebep: h.sebep,
          siparisNo: h.siparisNo ?? null,
          adminId: h.yapan?.id ?? null,
          yapan: h.yapan?.adSoyad ?? "",
          not: (h.not ?? "").slice(0, 300),
        },
      ];
    }),
  });
}

// ── Okuma ─────────────────────────────────────────────────────────────────

export const HAREKET_SAYFA_BOYU = 50;

export type HareketSuzgeci = {
  urun: string;
  sebep?: Sebep;
  baslangic?: string;
  bitis?: string;
  sayfa: number;
};

export type HareketSatiri = {
  id: string;
  olusturuldu: Date;
  urunAd: string;
  productId: string;
  beden: string;
  renk: string;
  degisim: number;
  sonra: number;
  sebep: string;
  siparisNo: string | null;
  yapan: string;
  not: string;
};

function gunCoz(deger: string | undefined): Date | undefined {
  if (!deger || !/^\d{4}-\d{2}-\d{2}$/.test(deger)) return undefined;
  const t = new Date(`${deger}T00:00:00+03:00`);
  return Number.isNaN(t.getTime()) ? undefined : t;
}

export function hareketSuzgeciniCoz(
  p: Record<string, string | string[] | undefined>,
): HareketSuzgeci {
  const tek = (ad: string) => {
    const d = p[ad];
    return typeof d === "string" && d.trim() !== "" ? d.trim() : undefined;
  };
  const sebep = tek("sebep");
  const sayfa = Number(tek("sayfa") ?? "1");
  return {
    urun: (tek("urun") ?? "").slice(0, 120),
    sebep: sebep && sebep in SEBEPLER ? (sebep as Sebep) : undefined,
    baslangic: gunCoz(tek("baslangic")) ? tek("baslangic") : undefined,
    bitis: gunCoz(tek("bitis")) ? tek("bitis") : undefined,
    sayfa: Number.isInteger(sayfa) && sayfa > 0 ? sayfa : 1,
  };
}

export function hareketAdresi(s: Partial<HareketSuzgeci>, kok = "/yonetim/stok/hareketler"): string {
  const p = new URLSearchParams();
  if (s.urun) p.set("urun", s.urun);
  if (s.sebep) p.set("sebep", s.sebep);
  if (s.baslangic) p.set("baslangic", s.baslangic);
  if (s.bitis) p.set("bitis", s.bitis);
  if (s.sayfa && s.sayfa > 1) p.set("sayfa", String(s.sayfa));
  const m = p.toString();
  return m ? `${kok}?${m}` : kok;
}

/**
 * Süzgeç koşulu. Ürün, adres (slug) ya da ad parçasıyla aranabiliyor;
 * adres tam eşleşirse yalnızca o ürün — ürün sayfasındaki "hepsi"
 * bağlantısı böyle geliyor.
 */
async function kosul(s: HareketSuzgeci): Promise<Prisma.StockMovementWhereInput> {
  const ve: Prisma.StockMovementWhereInput[] = [];
  if (s.urun) {
    const urun = await db.product.findUnique({ where: { slug: s.urun }, select: { id: true } });
    ve.push(
      urun ? { productId: urun.id } : { urunAd: { contains: s.urun, mode: "insensitive" } },
    );
  }
  if (s.sebep) ve.push({ sebep: s.sebep });
  const bas = gunCoz(s.baslangic);
  const bit = gunCoz(s.bitis);
  if (bas || bit) {
    ve.push({
      olusturuldu: {
        ...(bas ? { gte: bas } : {}),
        ...(bit ? { lt: new Date(bit.getTime() + 24 * 60 * 60 * 1000) } : {}),
      },
    });
  }
  return ve.length > 0 ? { AND: ve } : {};
}

const SECIM = {
  id: true,
  olusturuldu: true,
  urunAd: true,
  productId: true,
  beden: true,
  renk: true,
  degisim: true,
  sonra: true,
  sebep: true,
  siparisNo: true,
  yapan: true,
  not: true,
} as const;

export async function hareketleriAra(s: HareketSuzgeci): Promise<{
  satirlar: HareketSatiri[];
  toplam: number;
  giris: number;
  cikis: number;
  sayfa: number;
  sonSayfa: number;
}> {
  const where = await kosul(s);
  const [toplam, giris, cikis] = await Promise.all([
    db.stockMovement.count({ where }),
    db.stockMovement.aggregate({ where: { AND: [where, { degisim: { gt: 0 } }] }, _sum: { degisim: true } }),
    db.stockMovement.aggregate({ where: { AND: [where, { degisim: { lt: 0 } }] }, _sum: { degisim: true } }),
  ]);
  const sonSayfa = Math.max(1, Math.ceil(toplam / HAREKET_SAYFA_BOYU));
  const sayfa = Math.min(s.sayfa, sonSayfa);
  const satirlar = await db.stockMovement.findMany({
    where,
    orderBy: [{ olusturuldu: "desc" }, { id: "desc" }],
    skip: (sayfa - 1) * HAREKET_SAYFA_BOYU,
    take: HAREKET_SAYFA_BOYU,
    select: SECIM,
  });
  return {
    satirlar,
    toplam,
    giris: giris._sum.degisim ?? 0,
    cikis: -(cikis._sum.degisim ?? 0),
    sayfa,
    sonSayfa,
  };
}

/** CSV için süzgece uyan bütün satırlar; üst sınır bir yıllık yoğun mağaza. */
export async function hareketleriDisaAktar(s: HareketSuzgeci): Promise<HareketSatiri[]> {
  return db.stockMovement.findMany({
    where: await kosul(s),
    orderBy: [{ olusturuldu: "desc" }, { id: "desc" }],
    take: 50_000,
    select: SECIM,
  });
}

/** Ürün ekranı için son hareketler. */
export async function urunHareketleri(productId: string, adet = 15): Promise<HareketSatiri[]> {
  return db.stockMovement.findMany({
    where: { productId },
    orderBy: [{ olusturuldu: "desc" }, { id: "desc" }],
    take: adet,
    select: SECIM,
  });
}

/** Hareket dökümü; noktalı virgül ve BOM, Türkçe Excel doğru açsın (K-26). */
export function hareketCsv(satirlar: HareketSatiri[], renkAdlari: Record<string, string>): string {
  const kacir = (d: string) => `"${d.replace(/"/g, '""')}"`;
  const basliklar = [
    "Tarih", "Ürün", "Beden", "Renk", "Değişim", "Sonraki stok", "Sebep", "Sipariş no", "Yapan", "Not",
  ];
  const govde = satirlar.map((h) =>
    [
      h.olusturuldu.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }),
      h.urunAd,
      h.beden,
      renkAdlari[h.renk] ?? h.renk,
      String(h.degisim),
      String(h.sonra),
      sebepAdi(h.sebep),
      h.siparisNo ?? "",
      h.yapan,
      h.not,
    ]
      .map(kacir)
      .join(";"),
  );
  return `﻿${[basliklar.map(kacir).join(";"), ...govde].join("\r\n")}\r\n`;
}
