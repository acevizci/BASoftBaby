import "server-only";

/**
 * Ürün değerlendirmeleri.
 *
 * **Yalnızca gerçekten satın almış kişi yazabiliyor.** Her yorum bir sipariş
 * satırına bağlı; satır tekil olduğu için hem alışverişin kanıtı hem de aynı
 * satır için ikinci yorumun önüne geçiyor. Aynı ürünü iki kez alan iki kez
 * yazabiliyor — o iki ayrı alışveriş.
 *
 * **Yorum kendiliğinden yayımlanıyor.** Onay kuyruğu yok. Sebebi ilke:
 * satıcı olumlu olumsuz ayrımı yapmadan yayımlamak zorunda; "önce ben
 * bakayım" düzeni, olumsuz yorumu süzmenin kibar hâli olurdu. Gizleme
 * yalnızca içerik kuralı için (hakaret, kişisel veri, alakasız metin) ve
 * sebebi kaydediliyor (K-34).
 *
 * **Puan uydurulmuyor.** Ürünün ortalaması ve yorum sayısı buradan
 * hesaplanıyor; hiç yorum yoksa boş kalıyor ve ekranda puan satırı hiç
 * görünmüyor. Tohum dosyası eskiden uydurma puan yazıyordu, o kaldırıldı.
 */

import { db } from "@/server/veritabani";
import { ETIKETLER } from "@/server/onbellek";
import { updateTag } from "next/cache";
import { sayfaCoz, type SayfaDurumu } from "@/ui/sayfalama-bicim";
import { renkAdlari } from "@/server/renkler";

export const EN_DUSUK_PUAN = 1;
export const EN_YUKSEK_PUAN = 5;

/** Olumsuz sayılan puan: panelde yanıtlanacaklar buna bakıyor. */
export const OLUMSUZ_PUAN = 3;

export type Yorum = {
  id: string;
  adSoyad: string;
  puan: number;
  yorum: string;
  yanit: string;
  olusturuldu: Date;
};

export type YorumOzeti = {
  ortalama: number;
  adet: number;
  /** Puan → kaç kişi. 1'den 5'e kadar hepsi var, sıfır olanlar da. */
  dagilim: Record<number, number>;
  /** Yalnızca görünen sayfanın yorumları. */
  yorumlar: Yorum[];
  durum: SayfaDurumu;
};

/** Değerlendirilebilecek bir sipariş satırı. */
export type DegerlendirilebilirSatir = {
  orderItemId: string;
  urunAd: string;
  slug: string;
  beden: string;
  renk: string;
};

/**
 * Ekranda görünen ad: "Ayşe Yılmaz" → "Ayşe Y."
 *
 * Tam soyadı yayımlamak gereksiz: yorumun kime ait olduğunu belli etmeye
 * yetmiyor ama kişiyi aramaya yetiyor.
 */
export function adiKisalt(adSoyad: string): string {
  const parcalar = adSoyad.trim().split(/\s+/).filter(Boolean);
  if (parcalar.length === 0) return "Müşteri";
  if (parcalar.length === 1) return parcalar[0];
  const son = parcalar[parcalar.length - 1];
  return `${parcalar.slice(0, -1).join(" ")} ${son[0].toLocaleUpperCase("tr")}.`;
}

/** Bir ürünün yayındaki değerlendirmeleri. */
/** Ürün sayfasında bir kerede görünen değerlendirme sayısı. */
export const YORUM_SAYFA_BOYU = 10;

/**
 * Bir ürünün yayındaki değerlendirmeleri, sayfalı.
 *
 * **Ortalama ve dağılım ayrı sorgudan geliyor.** Eskiden ikisi de ekrana
 * gelen ilk 50 yorumdan hesaplanıyordu: elli birinci yorumdan sonra
 * "ortalama" gerçek ortalama olmaktan çıkıyor, dağılım çubukları eksik
 * sayıyordu. Artık puan dağılımı bütün yorumlar üzerinden sayılıyor, listeye
 * yalnızca o sayfanın yorumları giriyor (K-67).
 */
export async function urunYorumlari(productId: string, sayfa: unknown = 1): Promise<YorumOzeti> {
  const kosul = { productId, durum: "yayinda" };

  const gruplar = await db.review.groupBy({
    by: ["puan"],
    where: kosul,
    _count: { _all: true },
  });

  const dagilim: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let adet = 0;
  let toplam = 0;
  for (const g of gruplar) {
    dagilim[g.puan] = g._count._all;
    adet += g._count._all;
    toplam += g.puan * g._count._all;
  }

  const durum = sayfaCoz(sayfa, adet, YORUM_SAYFA_BOYU);

  const yorumlar = await db.review.findMany({
    where: kosul,
    orderBy: { olusturuldu: "desc" },
    skip: durum.atla,
    take: durum.boy,
    select: {
      id: true,
      adSoyad: true,
      puan: true,
      yorum: true,
      yanit: true,
      olusturuldu: true,
    },
  });

  return {
    ortalama: adet > 0 ? toplam / adet : 0,
    adet,
    dagilim,
    yorumlar,
    durum,
  };
}

/**
 * Ürünün ortalamasını ve yorum sayısını yeniden hesaplar.
 *
 * Liste sorguları her ürün için yorum tablosuna gitmesin diye ürünün üstünde
 * de duruyor. Yorum eklenince, gizlenince ya da açılınca burası çağrılıyor;
 * iki yerin ayrışmaması buna bağlı.
 */
export async function puaniTazele(productId: string): Promise<void> {
  const ozet = await db.review.aggregate({
    where: { productId, durum: "yayinda" },
    _avg: { puan: true },
    _count: { _all: true },
  });

  const adet = ozet._count._all;
  await db.product.update({
    where: { id: productId },
    data: {
      yorumSayisi: adet,
      // Hiç yorum yoksa boş: "0,0 puan" diye bir şey yok, puan yok.
      puan: adet > 0 ? Math.round((ozet._avg.puan ?? 0) * 10) / 10 : null,
    },
  });

  updateTag(ETIKETLER.katalog);
}

/**
 * Bir siparişte değerlendirilebilecek satırlar.
 *
 * Yalnızca teslim edilmiş siparişler: ürünü eline almadan değerlendirmek
 * anlamsız. Daha önce yorum yazılmış satır listede çıkmıyor.
 */
export async function degerlendirilebilirler(
  numara: string,
): Promise<DegerlendirilebilirSatir[]> {
  const siparis = await db.order.findUnique({
    where: { numara: numara.trim().toUpperCase() },
    select: {
      durum: true,
      satirlar: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          urunAd: true,
          slug: true,
          beden: true,
          renk: true,
          yorum: { select: { id: true } },
          variant: { select: { productId: true } },
        },
      },
    },
  });

  if (!siparis || siparis.durum !== "teslim") return [];

  const adlar = await renkAdlari();
  return siparis.satirlar
    .filter((s) => !s.yorum && s.variant?.productId)
    .map((s) => ({
      orderItemId: s.id,
      urunAd: s.urunAd,
      slug: s.slug,
      beden: s.beden,
      renk: adlar[s.renk] ?? s.renk,
    }));
}

export type YorumGirdisi = {
  numara: string;
  orderItemId: string;
  puan: number;
  yorum: string;
};

export type YorumSonucu = { tamam: true } | { tamam: false; hata: string };

/** Değerlendirmeyi kaydeder. Kuralları yeniden denetliyor. */
export async function yorumYaz(girdi: YorumGirdisi): Promise<YorumSonucu> {
  if (!Number.isInteger(girdi.puan) || girdi.puan < EN_DUSUK_PUAN || girdi.puan > EN_YUKSEK_PUAN) {
    return { tamam: false, hata: "Puan 1 ile 5 arasında olmalı." };
  }
  const metin = girdi.yorum.trim();
  if (metin.length < 10) {
    return { tamam: false, hata: "Yorum en az 10 karakter olmalı." };
  }

  const satir = await db.orderItem.findUnique({
    where: { id: girdi.orderItemId },
    select: {
      id: true,
      order: { select: { numara: true, durum: true, adSoyad: true } },
      variant: { select: { productId: true } },
      yorum: { select: { id: true } },
    },
  });

  if (!satir || satir.order.numara !== girdi.numara.trim().toUpperCase()) {
    return { tamam: false, hata: "Bu ürün bu siparişte bulunamadı." };
  }
  if (satir.order.durum !== "teslim") {
    return { tamam: false, hata: "Değerlendirme, sipariş teslim edildikten sonra yazılabiliyor." };
  }
  if (satir.yorum) {
    return { tamam: false, hata: "Bu ürün için zaten bir değerlendirme yazmışsın." };
  }
  if (!satir.variant?.productId) {
    return { tamam: false, hata: "Ürün artık katalogda yok." };
  }

  await db.review.create({
    data: {
      productId: satir.variant.productId,
      orderItemId: satir.id,
      adSoyad: adiKisalt(satir.order.adSoyad),
      puan: girdi.puan,
      yorum: metin.slice(0, 2000),
    },
  });

  await puaniTazele(satir.variant.productId);
  return { tamam: true };
}

/** Panelde yanıt bekleyen olumsuz yorum sayısı. */
export async function yanitsizOlumsuzYorum(): Promise<number> {
  return db.review.count({
    where: { durum: "yayinda", yanit: "", puan: { lte: OLUMSUZ_PUAN } },
  });
}
