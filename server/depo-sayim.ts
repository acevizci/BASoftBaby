import "server-only";

/**
 * Depo ekranında sayım (K-177): okutarak sayma.
 *
 * Sayım mantığı `server/sayim.ts`'teki (K-107, K-165): fark satır sayıldığı
 * ana göre, rafta olması gereken = stok + kargolanmamış siparişte ayrılan,
 * bitirince fark stoğa **eklenerek** uygulanıyor. Değişen akış:
 *
 * - **Sunucu asıl kayıt.** Okutulanlar birkaç saniyede bir yazılıyor
 *   (mutlak değer: aynı liste iki kez gelse de sonuç aynı). Telefon değişse
 *   ya da sayfa kapansa da sayım kaldığı yerden sürüyor.
 * - **Kapsam:** "yalnızca okuttuklarım" (raf raf sayım; satırlar okutuldukça
 *   açılıyor), bir kategori ya da bütün mağaza.
 * - **Aynı anda tek açık sayım.** Açık sayım varken yeni sayım açılmıyor,
 *   açık olan sürüyor.
 * - Kategori ya da bütün mağaza sayımında okutulmayan bedenlere varsayılan
 *   olarak dokunulmuyor; "rafta yok, sıfır say" ayrıca seçiliyor.
 */

import { db } from "@/server/veritabani";
import { renkAdlari } from "@/server/renkler";
import {
  ayrilanAdetler,
  farkliSatirlar,
  ozetCikar,
  sayimAc,
  sayimBitir,
  sayimIptal,
  type SayimOzeti,
} from "@/server/sayim";
import type { Yapan } from "@/server/stok-hareket";
import { satirlariBirlestir, type DepoSatiri } from "@/ui/depo-bicim";

/** Yalnızca okutulanların sayıldığı kapsam; satırlar okutuldukça açılıyor. */
export const OKUTULAN = "okutulan";

export type AcikSayim = {
  id: string;
  ad: string;
  kapsam: string;
  kapsamAdi: string;
  satirlar: DepoSatiri[];
};

function tarihAdi(t: Date): string {
  return t.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Istanbul",
  });
}

async function kapsamAdi(kapsam: string): Promise<string> {
  if (kapsam === OKUTULAN) return "Okutulanlar";
  if (!kapsam) return "Bütün mağaza";
  const k = await db.category.findUnique({ where: { slug: kapsam }, select: { ad: true } });
  return k?.ad ?? kapsam;
}

/** Açık sayım ve sayılmış satırları (Depo listesi olarak); yoksa `null`. */
export async function acikSayim(): Promise<AcikSayim | null> {
  const s = await db.stockCount.findFirst({
    where: { durum: "acik" },
    orderBy: { olusturuldu: "desc" },
    select: { id: true, ad: true, kapsam: true },
  });
  if (!s) return null;
  const [satirlar, adlar] = await Promise.all([
    db.stockCountLine.findMany({
      where: { countId: s.id, sayilan: { not: null }, variantId: { not: null } },
      orderBy: { sayildi: "desc" },
      select: { variantId: true, urunAd: true, beden: true, renk: true, sayilan: true },
    }),
    renkAdlari(),
  ]);
  return {
    ...s,
    kapsamAdi: await kapsamAdi(s.kapsam),
    satirlar: satirlar.map((l) => ({
      variantId: l.variantId!,
      urunAd: l.urunAd,
      beden: l.beden,
      renkAdi: adlar[l.renk] ?? l.renk,
      stok: 0,
      adet: l.sayilan ?? 0,
    })),
  };
}

/**
 * Sayım açar; açık sayım varsa onu döndürür (aynı anda tek sayım).
 * `kapsam`: "okutulan", "" (bütün mağaza) ya da kategori adresi.
 */
export async function depoSayimAc(kapsam: string, yapan?: Yapan): Promise<string> {
  const acik = await db.stockCount.findFirst({ where: { durum: "acik" }, select: { id: true } });
  if (acik) return acik.id;
  const bugun = tarihAdi(new Date());
  if (kapsam === OKUTULAN) {
    const s = await db.stockCount.create({
      data: {
        ad: `Raf sayımı · ${bugun}`,
        kapsam: OKUTULAN,
        adminId: yapan?.id ?? null,
        yapan: yapan?.adSoyad ?? "",
      },
      select: { id: true },
    });
    return s.id;
  }
  return sayimAc({ ad: `${await kapsamAdi(kapsam)} sayımı · ${bugun}`, kapsam, yapan });
}

/**
 * Sayılanları yazar (mutlak). Listede olup sayımda satırı olmayan beden için
 * satır açılıyor (raf sayımı ya da kapsam dışından gelen ürün). `kaldirilan`
 * bedenlerin sayılanı siliniyor ("henüz sayılmadı"). Açık olmayan sayıma
 * yazılmıyor.
 */
export async function depoSayimYaz(
  countId: string,
  satirlar: { variantId: string; adet: number }[],
  kaldirilan: string[] = [],
): Promise<{ tamam: boolean; yazilan: number }> {
  const sayim = await db.stockCount.findUnique({ where: { id: countId }, select: { durum: true } });
  if (sayim?.durum !== "acik") return { tamam: false, yazilan: 0 };
  const liste = satirlariBirlestir(satirlar).slice(0, 2000);
  const idler = liste.map((s) => s.variantId);

  const [varyantlar, mevcut, ayrilan] = await Promise.all([
    db.productVariant.findMany({
      where: { id: { in: idler } },
      select: {
        id: true,
        beden: true,
        renk: true,
        sku: true,
        stok: true,
        fiyatKurus: true,
        productId: true,
        product: { select: { ad: true, fiyatKurus: true, alisFiyatKurus: true } },
      },
    }),
    db.stockCountLine.findMany({
      where: { countId, variantId: { in: [...idler, ...kaldirilan] } },
      select: { id: true, variantId: true, sayilan: true },
    }),
    ayrilanAdetler(idler),
  ]);
  const satirId = new Map(mevcut.map((m) => [m.variantId, m.id]));
  const sayilmis = new Map(mevcut.map((m) => [m.variantId, m.sayilan]));
  const bul = new Map(varyantlar.map((v) => [v.id, v]));
  const simdi = new Date();

  const yazilacak = liste.flatMap((s) => {
    const v = bul.get(s.variantId);
    if (!v) return [];
    // Adedi değişmeyen satır yeniden yazılmıyor: "sayıldığı an" (stok ve
    // ayrılan) ilk sayıldığı anda kalmalı. Her kayıtta tazelenirse sayım
    // sürerken kargoya çıkan ürün sahte fark gösterirdi (K-180).
    if (sayilmis.get(v.id) === s.adet) return [];
    const olcum = {
      sayilan: s.adet,
      sistem: v.stok,
      ayrilan: ayrilan.get(v.id) ?? 0,
      sayildi: simdi,
    };
    const id = satirId.get(v.id);
    return [
      id
        ? db.stockCountLine.update({ where: { id }, data: olcum })
        : db.stockCountLine.create({
            data: {
              countId,
              variantId: v.id,
              productId: v.productId,
              urunAd: v.product.ad,
              beden: v.beden,
              renk: v.renk,
              sku: v.sku,
              fiyatKurus: v.fiyatKurus ?? v.product.fiyatKurus,
              alisFiyatKurus: v.product.alisFiyatKurus,
              ...olcum,
            },
          }),
    ];
  });
  const silinecek = kaldirilan.flatMap((vid) => {
    const id = satirId.get(vid);
    return id && !idler.includes(vid)
      ? [
          db.stockCountLine.update({
            where: { id },
            data: { sayilan: null, sistem: null, ayrilan: null, sayildi: null },
          }),
        ]
      : [];
  });
  await db.$transaction([...yazilacak, ...silinecek]);
  return { tamam: true, yazilan: yazilacak.length };
}

export type SayimFarklari = {
  ozet: SayimOzeti;
  farklar: {
    variantId: string | null;
    urunAd: string;
    beden: string;
    renkAdi: string;
    beklenen: number;
    sayilan: number;
    fark: number;
  }[];
  /** Kapsamda olup okutulmamış beden sayısı (raf sayımında 0). */
  okutulmayan: number;
};

/** Bitirmeden önceki fark ekranı. */
export async function sayimFarklari(countId: string): Promise<SayimFarklari | null> {
  const s = await db.stockCount.findUnique({ where: { id: countId }, select: { durum: true } });
  if (s?.durum !== "acik") return null;
  const [hepsi, farkli, adlar] = await Promise.all([
    db.stockCountLine.findMany({
      where: { countId },
      select: {
        sayilan: true,
        sistem: true,
        ayrilan: true,
        fiyatKurus: true,
        alisFiyatKurus: true,
      },
    }),
    farkliSatirlar(countId),
    renkAdlari(),
  ]);
  return {
    ozet: ozetCikar(hepsi),
    okutulmayan: hepsi.filter((l) => l.sayilan === null).length,
    farklar: farkli.map((l) => {
      const beklenen = (l.sistem ?? 0) + (l.ayrilan ?? 0);
      return {
        variantId: l.variantId,
        urunAd: l.urunAd,
        beden: l.beden,
        renkAdi: adlar[l.renk] ?? l.renk,
        beklenen,
        sayilan: l.sayilan ?? 0,
        fark: (l.sayilan ?? 0) - beklenen,
      };
    }),
  };
}

/**
 * Sayımı bitirir. `okutulmayanSifir`: kapsamda olup okutulmayan bedenler
 * "rafta yok" sayılıyor (sayılan 0); işaretsizse onlara dokunulmuyor.
 */
export async function depoSayimBitir(
  countId: string,
  secenek: { okutulmayanSifir: boolean },
  yapan?: Yapan,
): Promise<{ duzeltilen: number; artanlar: string[] } | undefined> {
  if (secenek.okutulmayanSifir) {
    const bos = await db.stockCountLine.findMany({
      where: { countId, sayilan: null, variantId: { not: null }, count: { durum: "acik" } },
      select: { variantId: true },
    });
    if (bos.length > 0) {
      // Sıfırlar doğrudan yazılıyor: `depoSayimYaz` 0 adetli satırı atıyor.
      const idler = bos.map((b) => b.variantId!);
      const [varyantlar, ayrilan] = await Promise.all([
        db.productVariant.findMany({
          where: { id: { in: idler } },
          select: { id: true, stok: true },
        }),
        ayrilanAdetler(idler),
      ]);
      const simdi = new Date();
      await db.$transaction(
        varyantlar.map((v) =>
          db.stockCountLine.updateMany({
            where: { countId, variantId: v.id, sayilan: null },
            data: { sayilan: 0, sistem: v.stok, ayrilan: ayrilan.get(v.id) ?? 0, sayildi: simdi },
          }),
        ),
      );
    }
  }
  const sonuc = await sayimBitir(countId, yapan);
  if (!sonuc) return undefined;
  const artan = await db.stockCountLine.findMany({
    where: { countId, uygulanan: { gt: 0 }, variantId: { not: null } },
    select: { variantId: true },
  });
  return { duzeltilen: sonuc.duzeltilen, artanlar: artan.map((a) => a.variantId!) };
}

export { sayimIptal as depoSayimIptal };
