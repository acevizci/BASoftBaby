import "server-only";

/**
 * Tedarikçi ve "Sipariş ver" (K-179).
 *
 * Tedarikçi çok ve değişken, sipariş WhatsApp'tan veriliyor. Bu yüzden ağır
 * bir kayıt yok: tedarikçi adı yazıldığı yerde oluşuyor, telefonu isteğe
 * bağlı. Sipariş ver ekranı satış hızına göre öneriyi (K-106) tedarikçiye
 * göre grupluyor ve hazır mesaj üretiyor. Gönderilen mesaj kaydediliyor
 * ki aynı ürün iki kez sipariş edilmesin ("son 7 günde istendi").
 */

import { db } from "@/server/veritabani";
import { renkAdlari } from "@/server/renkler";
import { bedenSirasi, sonSira } from "@/server/bedenler";
import { siparisListesi, gunYaz } from "@/server/satis-hizi";
import type { MesajSatiri } from "@/ui/tedarik-bicim";

const GUN = 24 * 60 * 60 * 1000;
/** "Son N günde istendi" notunun penceresi. */
export const ISTENDI_GUN = 7;

/** Adı temizler: fazla boşluklar tek, en çok 80 karakter. */
export function tedarikciAdiTemizle(ham: string): string {
  return ham.replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Adla tedarikçi bulur, yoksa açar; ad boşsa `null`. */
export async function tedarikciBulYaDaAc(ham: string): Promise<string | null> {
  const ad = tedarikciAdiTemizle(ham);
  if (!ad) return null;
  const t = await db.supplier.upsert({
    where: { ad },
    update: {},
    create: { ad },
    select: { id: true },
  });
  return t.id;
}

export async function tedarikciAdlari(): Promise<string[]> {
  const liste = await db.supplier.findMany({ orderBy: { ad: "asc" }, select: { ad: true } });
  return liste.map((t) => t.ad);
}

/** Ürünlerin tedarikçisini yazar (mal gelince, "Sipariş ver"de atayınca). */
export async function urunlereTedarikciYaz(productIdler: string[], ad: string): Promise<void> {
  const id = await tedarikciBulYaDaAc(ad);
  if (!id || productIdler.length === 0) return;
  await db.product.updateMany({ where: { id: { in: productIdler } }, data: { tedarikciId: id } });
}

export type SiparisSatiri = MesajSatiri & {
  variantId: string;
  slug: string;
  stok: number;
  sure: string;
  bekleyen: number;
  oneri: number;
  /** Son 7 günde bu beden için sipariş edilen adet. */
  istenen: number;
};

export type TedarikGrubu = {
  /** Tedarikçisi olmayanlar için `null`. */
  tedarikci: { id: string; ad: string; telefon: string | null } | null;
  satirlar: SiparisSatiri[];
  /** Bugün bu tedarikçiye gönderilmiş son mesajın zamanı. */
  sonGonderim: Date | null;
};

/** Sipariş ver ekranı: öneriler tedarikçiye göre. Tedarikçisizler en sonda. */
export async function tedarikGruplari(
  hedefGun: number,
  simdi = new Date(),
): Promise<TedarikGrubu[]> {
  const liste = await siparisListesi(hedefGun, simdi);
  const productIdler = [...new Set(liste.map((s) => s.productId))];
  const [urunler, adlar, sira, gecmis] = await Promise.all([
    db.product.findMany({
      where: { id: { in: productIdler } },
      select: {
        id: true,
        tedarikciKodu: true,
        tedarikci: { select: { id: true, ad: true, telefon: true } },
      },
    }),
    renkAdlari(),
    bedenSirasi(),
    db.supplierOrder.findMany({
      where: { olusturuldu: { gte: new Date(simdi.getTime() - ISTENDI_GUN * GUN) } },
      select: { supplierId: true, satirlar: true, olusturuldu: true },
      orderBy: { olusturuldu: "desc" },
    }),
  ]);
  const urun = new Map(urunler.map((u) => [u.id, u]));

  const istenen = new Map<string, number>();
  const sonGonderim = new Map<string | null, Date>();
  for (const g of gecmis) {
    if (!sonGonderim.has(g.supplierId)) sonGonderim.set(g.supplierId, g.olusturuldu);
    for (const x of Array.isArray(g.satirlar) ? g.satirlar : []) {
      const s = x as { variantId?: unknown; adet?: unknown };
      if (typeof s.variantId === "string" && typeof s.adet === "number") {
        istenen.set(s.variantId, (istenen.get(s.variantId) ?? 0) + s.adet);
      }
    }
  }

  const gruplar = new Map<string, TedarikGrubu>();
  for (const s of liste) {
    const u = urun.get(s.productId);
    const t = u?.tedarikci ?? null;
    const anahtar = t?.id ?? "";
    if (!gruplar.has(anahtar)) {
      gruplar.set(anahtar, {
        tedarikci: t,
        satirlar: [],
        sonGonderim: sonGonderim.get(t?.id ?? null) ?? null,
      });
    }
    gruplar.get(anahtar)!.satirlar.push({
      variantId: s.variantId,
      productId: s.productId,
      slug: s.slug,
      urunAd: s.urunAd,
      tedarikciKodu: u?.tedarikciKodu ?? null,
      beden: s.beden,
      bedenSira: sonSira(sira, s.beden),
      renkAdi: adlar[s.renk] ?? s.renk,
      stok: s.stok,
      sure: gunYaz(s.hiz),
      bekleyen: s.bekleyen,
      oneri: s.oneri,
      adet: s.oneri,
      istenen: istenen.get(s.variantId) ?? 0,
    });
  }
  return [...gruplar.values()].sort((a, b) =>
    !a.tedarikci ? 1 : !b.tedarikci ? -1 : a.tedarikci.ad.localeCompare(b.tedarikci.ad, "tr"),
  );
}

/** Gönderilen mesajı kaydeder; satırlar en çok 500. */
export async function tedarikSiparisiYaz(g: {
  supplierId: string | null;
  satirlar: { variantId: string; adet: number }[];
  metin: string;
  adminId?: string;
}): Promise<void> {
  const satirlar = g.satirlar
    .filter((s) => typeof s.variantId === "string" && Number.isInteger(s.adet) && s.adet > 0)
    .slice(0, 500);
  if (satirlar.length === 0) return;
  const supplierId =
    g.supplierId &&
    (await db.supplier.findUnique({ where: { id: g.supplierId }, select: { id: true } }))?.id;
  await db.supplierOrder.create({
    data: {
      supplierId: supplierId || null,
      satirlar,
      metin: g.metin.slice(0, 5000),
      adminId: g.adminId ?? null,
    },
  });
}
