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
  /** Hediyelerin gönderilebileceği kayıtlı adres (K-149); yalnızca sahip görüyor. */
  adresId: string | null;
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
  adresId: true,
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
    adresId: k.adresId,
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

/** Ödeme sayfası için: sepette listeden ürün varsa o listelerin sahip adları. */
export async function sepettenListeler(): Promise<string[]> {
  const { sepetIdOku } = await import("@/server/sepet");
  const cartId = await sepetIdOku();
  if (!cartId) return [];
  const satirlar = await db.cartItem.findMany({
    where: { cartId, giftListItemId: { not: null } },
    select: { giftListItem: { select: { list: { select: { sahipAdi: true } } } } },
  });
  return [
    ...new Set(satirlar.map((s) => s.giftListItem?.list.sahipAdi).filter((x): x is string => !!x)),
  ];
}

export type ListeTeslimAdresi = {
  sahipAdi: string;
  adSoyad: string;
  telefon: string;
  adres: string;
  ilce: string;
  il: string;
  postaKodu: string;
};

/**
 * "Liste sahibinin adresine gönder" (K-149) kullanılabilir mi: bütün satırlar
 * listeden, hepsi aynı listeden, liste açık ve sahibi bir adres seçmiş. Öyleyse
 * o adres; değilse `undefined`. Karışık sepetin bir kısmı başka adrese
 * gidemez, o yüzden tek bir listeden olmayan satır varsa seçenek yok.
 */
export async function listeAdresiBul(
  kalemIdleri: (string | null)[],
): Promise<ListeTeslimAdresi | undefined> {
  if (kalemIdleri.length === 0 || kalemIdleri.some((k) => !k)) return undefined;
  const kalemler = await db.giftListItem.findMany({
    where: { id: { in: kalemIdleri as string[] } },
    select: {
      listId: true,
      list: {
        select: {
          acik: true,
          sahipAdi: true,
          adres: {
            select: {
              adSoyad: true,
              telefon: true,
              adres: true,
              ilce: true,
              il: true,
              postaKodu: true,
            },
          },
        },
      },
    },
  });
  const listeler = new Set(kalemler.map((k) => k.listId));
  const liste = kalemler[0]?.list;
  if (kalemler.length !== new Set(kalemIdleri).size || listeler.size !== 1) return undefined;
  if (!liste?.acik || !liste.adres) return undefined;
  return { sahipAdi: liste.sahipAdi, ...liste.adres };
}

/** Ödeme sayfası için: sepet liste sahibinin adresine gönderilebiliyorsa sahibin adı. */
export async function sepetListeAdresi(): Promise<string | undefined> {
  const { sepetIdOku } = await import("@/server/sepet");
  const cartId = await sepetIdOku();
  if (!cartId) return undefined;
  const satirlar = await db.cartItem.findMany({
    where: { cartId },
    select: { giftListItemId: true, variant: { select: { stok: true, product: { select: { aktif: true } } } } },
  });
  // Sipariş yalnızca satılabilir satırları alıyor; kontrol de aynılarına.
  const gecerli = satirlar.filter((s) => s.variant.product.aktif && s.variant.stok > 0);
  return (await listeAdresiBul(gecerli.map((s) => s.giftListItemId)))?.sahipAdi;
}

export type GelenHediye = {
  numara: string;
  tarih: string;
  gonderen: string;
  not: string;
  urunler: string[];
};

/**
 * Liste sahibinin hesabında "Gelen hediyeler" (K-146). Yalnızca ödemesi
 * alınmış ve iptal edilmemiş siparişler; hediye edenin adresi, e-postası ve
 * gerçek adı yok, yalnızca yazdığı ad ve not.
 */
export async function gelenHediyeler(customerId: string): Promise<GelenHediye[]> {
  const siparisler = await db.order.findMany({
    where: {
      durum: { not: "iptal" },
      odemeDurumu: "odendi",
      satirlar: { some: { giftListItem: { list: { customerId } } } },
    },
    orderBy: { olusturuldu: "desc" },
    take: 100,
    select: {
      numara: true,
      olusturuldu: true,
      listeGonderen: true,
      listeNotu: true,
      satirlar: {
        where: { giftListItem: { list: { customerId } } },
        select: { urunAd: true, beden: true, adet: true },
      },
    },
  });
  return siparisler.map((s) => ({
    numara: s.numara,
    tarih: s.olusturuldu.toISOString(),
    gonderen: s.listeGonderen,
    not: s.listeNotu,
    urunler: s.satirlar.map((x) => `${x.urunAd} (${x.beden})${x.adet > 1 ? ` × ${x.adet}` : ""}`),
  }));
}

type ListeHediyesiGonderici = (
  kime: string,
  bilgi: { sahipAdi: string; gonderen: string; not: string; urunler: string[]; kod: string },
) => Promise<{ gonderildi: boolean }>;

/**
 * Ödemesi alınmış liste hediyeleri için liste sahibine haber (K-146).
 * Günlük zamanlanmış işte çalışıyor: kart, havale ve hediye çeki yollarının
 * hepsi "ödendi"ye burada yakalanıyor; ödenmeyen ya da iptal edilen sipariş
 * için "hediye alındı" denmiyor. 30 günden eski siparişe bakılmıyor.
 */
export async function listeBildirimleriniGonder(
  gonder?: ListeHediyesiGonderici,
  simdi: Date = new Date(),
): Promise<{ bakilan: number; gonderilen: number }> {
  const gonderici: ListeHediyesiGonderici =
    gonder ?? (await import("@/server/eposta")).listeHediyesiEpostasi;
  const siparisler = await db.order.findMany({
    where: {
      listeBildirildi: null,
      durum: { not: "iptal" },
      odemeDurumu: "odendi",
      olusturuldu: { gte: new Date(simdi.getTime() - 30 * 24 * 60 * 60 * 1000) },
      satirlar: { some: { giftListItemId: { not: null } } },
    },
    select: {
      id: true,
      listeGonderen: true,
      listeNotu: true,
      satirlar: {
        where: { giftListItemId: { not: null } },
        select: {
          urunAd: true,
          beden: true,
          adet: true,
          giftListItem: {
            select: {
              list: {
                select: {
                  id: true,
                  kod: true,
                  sahipAdi: true,
                  customer: { select: { eposta: true } },
                },
              },
            },
          },
        },
      },
    },
    take: 100,
  });

  let gonderilen = 0;
  for (const s of siparisler) {
    // Bir siparişte birden çok listenin ürünü olabilir: her sahibe kendi ürünleri.
    const listeler = new Map<
      string,
      { kime: string; kod: string; sahipAdi: string; urunler: string[] }
    >();
    for (const x of s.satirlar) {
      const l = x.giftListItem?.list;
      if (!l) continue;
      const g = listeler.get(l.id) ?? {
        kime: l.customer.eposta,
        kod: l.kod,
        sahipAdi: l.sahipAdi,
        urunler: [],
      };
      g.urunler.push(`${x.urunAd} (${x.beden})${x.adet > 1 ? ` × ${x.adet}` : ""}`);
      listeler.set(l.id, g);
    }
    let hepsi = true;
    for (const l of listeler.values()) {
      const sonuc = await gonderici(l.kime, {
        sahipAdi: l.sahipAdi,
        gonderen: s.listeGonderen,
        not: s.listeNotu,
        urunler: l.urunler,
        kod: l.kod,
      });
      if (!sonuc.gonderildi) hepsi = false;
    }
    // Gönderilemeyen yarın yeniden denenecek (liste yoksa da işaretleniyor).
    if (!hepsi) continue;
    await db.order.update({ where: { id: s.id }, data: { listeBildirildi: simdi } });
    gonderilen += 1;
  }
  return { bakilan: siparisler.length, gonderilen };
}
