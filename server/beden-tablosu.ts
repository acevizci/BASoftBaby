import "server-only";

/**
 * Ürün sayfasındaki beden × renk tablosu (K-178).
 *
 * Eskiden her beden-renk birleşimi ayrı bir formla ekleniyordu: 5 beden × 3
 * renk için 15 gönderim, sonra stok ekranına geçip sayıları yazmak. Şimdi
 * bedenler ve renkler işaretleniyor, tablo doluyor, tek kayıt:
 *
 * - **Yeni hücre:** beden oluşturuluyor (SKU eski kuralla), başlangıç
 *   stoğu yazılıyor, hareket "Yeni beden".
 * - **Var olan hücre:** stok değiştiyse ekranda görülen değerle koşullu
 *   yazılıyor (K-102); arada sipariş geldiyse çakışma olarak dönüyor.
 * - **Barkod:** hücreye yazılan üretici barkodu bedene öğretiliyor (K-176).
 * - Silme burada yok: stoğu da silen bir işlem ayrı ve onaylı kalıyor.
 */

import { db } from "@/server/veritabani";
import { hareketYaz, type Yapan } from "@/server/stok-hareket";
import { stoklariYaz, type StokCakismasi } from "@/server/stok-ekrani";
import { barkodOgret } from "@/server/depo";
import { kodTemizle } from "@/ui/depo-bicim";

export type TabloHucresi = {
  beden: string;
  renk: string;
  /** Var olan bedenin kimliği; yoksa yeni. */
  id?: string;
  /** Ekranın açıldığı andaki stok (var olanlarda). */
  onceki?: number;
  stok: number | null;
  barkod?: string;
};

/** Bir kayıtta en çok bu kadar hücre. */
export const EN_COK_HUCRE = 400;

/** Formdaki JSON'u güvenli hücrelere çevirir; bozuk satırlar atılıyor. */
export function hucreleriCoz(ham: unknown): TabloHucresi[] {
  let dizi: unknown;
  try {
    dizi = JSON.parse(String(ham ?? "[]"));
  } catch {
    return [];
  }
  if (!Array.isArray(dizi)) return [];
  const sonuc: TabloHucresi[] = [];
  for (const x of dizi.slice(0, EN_COK_HUCRE)) {
    if (!x || typeof x !== "object") continue;
    const h = x as Record<string, unknown>;
    const beden = typeof h.beden === "string" ? h.beden.trim().slice(0, 40) : "";
    const renk = typeof h.renk === "string" ? h.renk.trim().slice(0, 40) : "";
    if (!beden || !renk) continue;
    const sayi = (d: unknown) =>
      typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 100_000 ? d : null;
    sonuc.push({
      beden,
      renk,
      id: typeof h.id === "string" && h.id ? h.id : undefined,
      onceki: sayi(h.onceki) ?? undefined,
      stok: sayi(h.stok),
      barkod: typeof h.barkod === "string" ? kodTemizle(h.barkod) || undefined : undefined,
    });
  }
  return sonuc;
}

export type TabloSonucu = {
  yeni: number;
  duzeltilen: number;
  barkod: number;
  cakisan: StokCakismasi[];
  /** Stoğu artan bedenler: "gelince haber ver" bildirimi için. */
  artan: string[];
  /** Tanınmayan beden ya da renk adıyla gelen hücreler. */
  gecersiz: number;
};

/**
 * Kullanılmayan SKU: önerilen kod başka bir bedende varsa sonuna -2, -3…
 * Eskiden aynı kod iki ürünün adından üretilince kayıt hata sayfasıyla
 * düşüyordu (K-180).
 */
async function bosSku(oneri: string): Promise<string> {
  for (let i = 1; i < 50; i++) {
    const sku = i === 1 ? oneri : `${oneri}-${i}`;
    const var_ = await db.productVariant.findUnique({ where: { sku }, select: { id: true } });
    if (!var_) return sku;
  }
  return `${oneri}-${Date.now().toString(36)}`;
}

export async function bedenTablosunuYaz(
  productId: string,
  hucreler: TabloHucresi[],
  yapan?: Yapan,
): Promise<TabloSonucu> {
  const urun = await db.product.findUniqueOrThrow({
    where: { id: productId },
    select: { slug: true, variants: { select: { id: true, beden: true, renk: true } } },
  });
  const [bedenler, renkler] = await Promise.all([
    db.size.findMany({ select: { ad: true } }),
    db.color.findMany({ select: { kod: true } }),
  ]);
  const gecerliBeden = new Set(bedenler.map((b) => b.ad));
  const gecerliRenk = new Set(renkler.map((r) => r.kod));
  const varOlan = new Map(urun.variants.map((v) => [`${v.beden}|${v.renk}`, v.id]));
  const kendi = new Set(urun.variants.map((v) => v.id));

  const sonuc: TabloSonucu = {
    yeni: 0,
    duzeltilen: 0,
    barkod: 0,
    cakisan: [],
    artan: [],
    gecersiz: 0,
  };
  const barkodlar: { kod: string; variantId: string }[] = [];

  // Yeni hücreler
  for (const h of hucreler) {
    if (h.id) continue;
    if (!gecerliBeden.has(h.beden) || !gecerliRenk.has(h.renk)) {
      sonuc.gecersiz += 1;
      continue;
    }
    const anahtar = `${h.beden}|${h.renk}`;
    let id = varOlan.get(anahtar);
    if (!id) {
      const ilk = h.stok ?? 0;
      const v = await db.$transaction(async (islem) => {
        const olusan = await islem.productVariant.create({
          data: {
            productId,
            beden: h.beden,
            renk: h.renk,
            stok: ilk,
            sku: await bosSku(`${urun.slug}-${h.beden.replace(/\s/g, "")}-${h.renk}`),
          },
          select: { id: true },
        });
        await hareketYaz(islem, [{ variantId: olusan.id, degisim: ilk, sebep: "yeni", yapan }]);
        return olusan;
      });
      id = v.id;
      varOlan.set(anahtar, id);
      sonuc.yeni += 1;
      if (ilk > 0) sonuc.artan.push(id);
    }
    if (h.barkod) barkodlar.push({ kod: h.barkod, variantId: id });
  }

  // Var olan hücreler: yalnızca bu ürünün bedenleri, değişenler.
  const degisiklikler = hucreler.flatMap((h) =>
    h.id && kendi.has(h.id) && h.stok !== null && h.onceki !== undefined && h.stok !== h.onceki
      ? [{ id: h.id, onceki: h.onceki, yeni: h.stok }]
      : [],
  );
  if (degisiklikler.length > 0) {
    const { yazilan, cakisan } = await stoklariYaz(degisiklikler, yapan);
    sonuc.duzeltilen = yazilan.length;
    sonuc.cakisan = cakisan;
    sonuc.artan.push(
      ...degisiklikler.filter((d) => yazilan.includes(d.id) && d.yeni > d.onceki).map((d) => d.id),
    );
  }
  for (const h of hucreler) {
    if (h.id && kendi.has(h.id) && h.barkod) barkodlar.push({ kod: h.barkod, variantId: h.id });
  }

  for (const b of barkodlar) {
    const r = await barkodOgret({ kod: b.kod, variantId: b.variantId, adminId: yapan?.id });
    if (r.tamam) sonuc.barkod += 1;
  }
  return sonuc;
}

/**
 * "Bu kategorideki son ürün gibi": aynı kategoride en son eklenen, bedeni
 * olan başka ürünün beden ve renkleri.
 */
export async function sonUrunDuzeni(
  productId: string,
  categoryId: string,
): Promise<{ ad: string; bedenler: string[]; renkler: string[] } | null> {
  const u = await db.product.findFirst({
    where: { categoryId, id: { not: productId }, variants: { some: {} } },
    orderBy: { olusturuldu: "desc" },
    select: { ad: true, variants: { select: { beden: true, renk: true } } },
  });
  if (!u) return null;
  return {
    ad: u.ad,
    bedenler: [...new Set(u.variants.map((v) => v.beden))],
    renkler: [...new Set(u.variants.map((v) => v.renk))],
  };
}
