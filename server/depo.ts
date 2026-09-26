import "server-only";

/**
 * Depo ekranı (K-176): barkod okutarak mal kabulü ve stoktan çıkarma.
 *
 * - **Barkod bir kez öğretiliyor.** Üretici barkodu `VariantBarcode`'da;
 *   tanınmayan barkod okutulunca hangi beden olduğu soruluyor, sonra hep
 *   tanınıyor. Bizim etiketimiz (K-107), SKU ve beden kimliği de tanınıyor.
 * - **Liste tek seferde yazılıyor.** Tarayıcı bir kerelik anahtar
 *   gönderiyor; `DepoIslemi` tekil kimliği aynı listenin ikinci kez
 *   uygulanmasını engelliyor (çift basış, bağlantı koptu, K-166 gibi).
 * - **Hiçbiri mutlak yazmıyor.** Gelen artırıyor, çıkan koşullu düşüyor
 *   (`stok >= adet`); arada gelen sipariş ezilmiyor, stok eksiye inmiyor.
 */

import { Prisma } from "@/db/uretilen/client";
import { db } from "@/server/veritabani";
import { renkAdlari } from "@/server/renkler";
import { barkodNoCoz } from "@/server/barkod";
import { hareketYaz, type Yapan } from "@/server/stok-hareket";
import { ayrilanAdetler } from "@/server/sayim";
import { gunYaz, satisHizlari } from "@/server/satis-hizi";
import { stokBildirimleriniGonder } from "@/server/stok-bildirimi";
import { maliyetiGecmiseYaz } from "@/server/maliyet";
import { urunlereTedarikciYaz } from "@/server/tedarik";
import { ortalamaMaliyet } from "@/ui/tedarik-bicim";
import {
  anahtarGecerli,
  CIKIS_SEBEPLERI,
  EN_COK_SATIR,
  kodTemizle,
  satirlariBirlestir,
  type CikisSebebi,
  type CozSonucu,
  type DepoBedeni,
  type DepoSonucu,
} from "@/ui/depo-bicim";

const BEDEN_SECIMI = {
  id: true,
  beden: true,
  renk: true,
  sku: true,
  stok: true,
  productId: true,
  product: { select: { slug: true, ad: true, alisFiyatKurus: true } },
} as const;

/** Bedenlerin kart bilgisi: stok, siparişte ayrılan, kaç gün yeter. */
export async function bedenBilgileri(
  idler: string[],
  carpanlar: Map<string, number> = new Map(),
): Promise<DepoBedeni[]> {
  if (idler.length === 0) return [];
  const [varyantlar, adlar, ayrilan, hizlar] = await Promise.all([
    db.productVariant.findMany({ where: { id: { in: idler } }, select: BEDEN_SECIMI }),
    renkAdlari(),
    ayrilanAdetler(idler),
    satisHizlari(idler),
  ]);
  const sira = new Map(idler.map((id, i) => [id, i]));
  return varyantlar
    .map((v) => {
      const hiz = hizlar.get(v.id);
      return {
        variantId: v.id,
        productId: v.productId,
        slug: v.product.slug,
        urunAd: v.product.ad,
        beden: v.beden,
        renk: v.renk,
        renkAdi: adlar[v.renk] ?? v.renk,
        sku: v.sku,
        stok: v.stok,
        carpan: carpanlar.get(v.id) ?? 1,
        ayrilan: ayrilan.get(v.id) ?? 0,
        sure: hiz ? gunYaz(hiz) : "",
        alisKurus: v.product.alisFiyatKurus,
      };
    })
    .sort((a, b) => (sira.get(a.variantId) ?? 0) - (sira.get(b.variantId) ?? 0));
}

/**
 * Okutulan kodu bedene çözer. Sıra: öğretilmiş üretici barkodu, bizim
 * etiketimiz (`B` + numara), SKU, beden kimliği.
 */
export async function barkodCoz(ham: string): Promise<CozSonucu> {
  const kod = kodTemizle(ham);
  if (!kod) return { tur: "yok", kod };

  const baglar = await db.variantBarcode.findMany({
    where: { kod },
    select: { variantId: true, carpan: true },
    orderBy: { olusturuldu: "asc" },
  });
  if (baglar.length > 0) {
    const bedenler = await bedenBilgileri(
      baglar.map((b) => b.variantId),
      new Map(baglar.map((b) => [b.variantId, b.carpan])),
    );
    if (bedenler.length === 1) return { tur: "tek", kod, beden: bedenler[0] };
    if (bedenler.length > 1) return { tur: "coklu", kod, bedenler };
  }

  const no = barkodNoCoz(kod);
  const v = await db.productVariant.findFirst({
    where: {
      OR: [
        ...(no !== undefined ? [{ barkodNo: no }] : []),
        { sku: { equals: kod, mode: "insensitive" as const } },
        { id: kod },
      ],
    },
    select: { id: true },
  });
  if (!v) return { tur: "yok", kod };
  const [beden] = await bedenBilgileri([v.id]);
  return beden ? { tur: "tek", kod, beden } : { tur: "yok", kod };
}

/**
 * Barkodu bedene bağlar. `tekBag` işaretliyse aynı barkodun öteki bağları
 * kaldırılıyor ("bu barkod hep bunu gösteriyor"). Aynı bağ zaten varsa
 * çarpanı güncelleniyor.
 */
export async function barkodOgret(g: {
  kod: string;
  variantId: string;
  carpan?: number;
  tekBag?: boolean;
  adminId?: string;
}): Promise<
  { tamam: true; beden: DepoBedeni } | { tamam: false; sebep: "kod" | "carpan" | "beden" }
> {
  const kod = kodTemizle(g.kod);
  if (kod.length < 3) return { tamam: false, sebep: "kod" };
  const carpan = g.carpan ?? 1;
  if (!Number.isInteger(carpan) || carpan < 1 || carpan > 1000)
    return { tamam: false, sebep: "carpan" };

  const v = await db.productVariant.findUnique({
    where: { id: g.variantId },
    select: { id: true },
  });
  if (!v) return { tamam: false, sebep: "beden" };

  await db.$transaction(async (islem) => {
    if (g.tekBag) {
      await islem.variantBarcode.deleteMany({ where: { kod, variantId: { not: v.id } } });
    }
    await islem.variantBarcode.upsert({
      where: { kod_variantId: { kod, variantId: v.id } },
      update: { carpan },
      create: { kod, variantId: v.id, carpan, adminId: g.adminId ?? null },
    });
  });
  const [beden] = await bedenBilgileri([v.id], new Map([[v.id, carpan]]));
  return { tamam: true, beden };
}

/** Bedenin barkod bağını kaldırır (ürün sayfasından). */
export async function barkodKaldir(id: string): Promise<boolean> {
  const { count } = await db.variantBarcode.deleteMany({ where: { id } });
  return count > 0;
}

/** Bir ürünün bedenlerine bağlı barkodlar; ürün sayfasında. */
export async function urunBarkodlari(productId: string) {
  return db.variantBarcode.findMany({
    where: { variant: { productId } },
    orderBy: { olusturuldu: "asc" },
    select: { id: true, kod: true, carpan: true, variantId: true },
  });
}

export type DepoKaydi = {
  anahtar: string;
  tur: "gelen" | "cikar";
  satirlar: { variantId: string; adet: number }[];
  /** Çıkar'da zorunlu. */
  sebep?: string;
  not?: string;
  tedarikci?: string;
  irsaliye?: string;
  /** Mal geldi'de yeni alış fiyatları (kuruş); ortalama maliyete giriyor (K-179). */
  alislar?: { productId: string; alisKurus: number }[];
};

export type DepoHatasi = "anahtar" | "bos" | "fazla" | "sebep";

/**
 * Depo listesini stoğa yazar. Aynı anahtar ikinci kez gelirse stok yeniden
 * yazılmıyor, ilk kaydın sonucu `tekrar: true` ile dönüyor.
 */
export async function depoKaydet(
  k: DepoKaydi,
  yapan?: Yapan,
): Promise<{ tamam: true; sonuc: DepoSonucu } | { tamam: false; hata: DepoHatasi }> {
  if (!anahtarGecerli(k.anahtar)) return { tamam: false, hata: "anahtar" };
  if (k.tur !== "gelen" && k.tur !== "cikar") return { tamam: false, hata: "bos" };
  const satirlar = satirlariBirlestir(Array.isArray(k.satirlar) ? k.satirlar : []);
  if (satirlar.length === 0) return { tamam: false, hata: "bos" };
  if (satirlar.length > EN_COK_SATIR) return { tamam: false, hata: "fazla" };
  const sebep = k.tur === "cikar" ? String(k.sebep ?? "") : "mal-kabul";
  if (k.tur === "cikar" && !(sebep in CIKIS_SEBEPLERI)) return { tamam: false, hata: "sebep" };

  const notlar = [
    (k.tedarikci ?? "").trim().slice(0, 80),
    (k.irsaliye ?? "").trim() && `İrsaliye ${(k.irsaliye ?? "").trim().slice(0, 40)}`,
    (k.not ?? "").trim().slice(0, 150),
  ].filter(Boolean);
  const not = notlar.join(" · ");

  const onceki = async (): Promise<DepoSonucu | undefined> => {
    const kayit = await db.depoIslemi.findUnique({ where: { id: k.anahtar } });
    return kayit ? { ...(kayit.sonuc as DepoSonucu), tekrar: true } : undefined;
  };
  const zaten = await onceki();
  if (zaten) return { tamam: true, sonuc: zaten };

  let sonuc: DepoSonucu;
  let artan: string[] = [];
  try {
    sonuc = await db.$transaction(async (islem) => {
      // Önce anahtar: eşzamanlı ikinci gönderim burada bekleyip tekil
      // kısıta çarpıyor, stoğa hiç dokunmuyor.
      await islem.depoIslemi.create({
        data: { id: k.anahtar, tur: k.tur, sonuc: {}, adminId: yapan?.id ?? null },
      });

      // Ortalama maliyet için gelmeden önceki stok ve alış (K-179).
      const alislar = new Map(
        (k.tur === "gelen" ? (k.alislar ?? []) : [])
          .filter((a) => typeof a.productId === "string" && Number.isInteger(a.alisKurus))
          .filter((a) => a.alisKurus > 0 && a.alisKurus <= 100_000_000)
          .map((a) => [a.productId, a.alisKurus]),
      );
      const oncesi =
        alislar.size === 0
          ? []
          : await islem.product.findMany({
              where: { id: { in: [...alislar.keys()] } },
              select: { id: true, alisFiyatKurus: true, variants: { select: { id: true, stok: true } } },
            });

      const yazilan: { variantId: string; adet: number }[] = [];
      const yetmeyen: DepoSonucu["yetmeyen"] = [];
      for (const s of satirlar) {
        const { count } = await islem.productVariant.updateMany({
          where:
            k.tur === "gelen" ? { id: s.variantId } : { id: s.variantId, stok: { gte: s.adet } },
          data: { stok: k.tur === "gelen" ? { increment: s.adet } : { decrement: s.adet } },
        });
        if (count > 0) {
          yazilan.push(s);
          continue;
        }
        if (k.tur === "cikar") {
          const v = await islem.productVariant.findUnique({
            where: { id: s.variantId },
            select: { stok: true, beden: true, product: { select: { ad: true } } },
          });
          if (v) {
            yetmeyen.push({
              variantId: s.variantId,
              urunAd: `${v.product.ad} · ${v.beden}`,
              istenen: s.adet,
              stok: v.stok,
            });
          }
        }
        // Gelen'de count 0: beden arada silinmiş; atlanıyor.
      }

      await hareketYaz(
        islem,
        yazilan.map((s) => ({
          variantId: s.variantId,
          degisim: k.tur === "gelen" ? s.adet : -s.adet,
          sebep: sebep as "mal-kabul" | CikisSebebi,
          yapan,
          not,
        })),
      );

      // Yeni alış fiyatı: eski stokla ortalanıyor; verilmiş siparişlerin
      // maliyeti satırda sabit, geçmiş kâr değişmiyor.
      for (const u of oncesi) {
        const gelen = yazilan
          .filter((s) => u.variants.some((v) => v.id === s.variantId))
          .reduce((t, s) => t + s.adet, 0);
        if (gelen === 0) continue;
        const eskiStok = u.variants.reduce((t, v) => t + Math.max(0, v.stok), 0);
        const yeni = ortalamaMaliyet(eskiStok, u.alisFiyatKurus, gelen, alislar.get(u.id)!);
        await islem.product.update({ where: { id: u.id }, data: { alisFiyatKurus: yeni } });
        // İlk kez girilen alış eski satışlara tahmini yazılıyor (K-111).
        if (u.alisFiyatKurus === null) await maliyetiGecmiseYaz(u.id, yeni, islem);
      }

      const sonuc: DepoSonucu = {
        tur: k.tur,
        kalem: yazilan.length,
        adet: yazilan.reduce((t, s) => t + s.adet, 0),
        yetmeyen,
      };
      if (k.tur === "gelen") {
        // Üretici barkodu öğretilmemiş gelenlere etiket basmak gerekebilir.
        const barkodlu = new Set(
          (
            await islem.variantBarcode.findMany({
              where: { variantId: { in: yazilan.map((s) => s.variantId) } },
              select: { variantId: true },
            })
          ).map((b) => b.variantId),
        );
        const urunler = await islem.productVariant.findMany({
          where: { id: { in: yazilan.map((s) => s.variantId).filter((id) => !barkodlu.has(id)) } },
          select: { product: { select: { slug: true, ad: true } } },
        });
        const tekil = new Map(urunler.map((u) => [u.product.slug, u.product.ad]));
        sonuc.etiketsiz = [...tekil].map(([slug, urunAd]) => ({ slug, urunAd }));
      }
      await islem.depoIslemi.update({ where: { id: k.anahtar }, data: { sonuc } });
      artan = yazilan.map((s) => s.variantId);
      return sonuc;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const ilk = await onceki();
      if (ilk) return { tamam: true, sonuc: ilk };
    }
    throw e;
  }

  if (k.tur === "gelen" && artan.length > 0) {
    // Tedarikçi yazıldıysa gelen ürünlere (K-179).
    if (k.tedarikci?.trim()) {
      const urunler = await db.productVariant.findMany({
        where: { id: { in: artan } },
        select: { productId: true },
      });
      await urunlereTedarikciYaz([...new Set(urunler.map((u) => u.productId))], k.tedarikci);
    }
    // Tükenmiş bir bedene mal geldiyse bekleyenlere haber gidiyor.
    sonuc.bildirim = await stokBildirimleriniGonder(artan);
  }
  return { tamam: true, sonuc };
}

/** Ada göre arama (barkodsuz ürün, öğretme kartı): en çok 12 ürün. */
export { kabulIcinAra as depoAra } from "@/server/mal-kabul";
