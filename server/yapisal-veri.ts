/**
 * Arama motorları için yapısal veri (schema.org JSON-LD) — K-126.
 *
 * Saf modül: sayfalar hesaplanmış değerleri veriyor, burada yalnızca
 * Google'ın beklediği biçime giriyor. Testler doğrudan çağırıyor.
 *
 * Kurallar Google'ın "ürün snippet'i" ve "satıcı listelemesi" belgelerinden:
 * - Ürün beden ve renkte değişiyorsa `ProductGroup` + `hasVariant`; her
 *   varyant kendi fiyatı, stoğu ve (varsa) o rengin fotoğrafıyla. Kimlikler
 *   Merchant beslemesiyle (K-123) aynı: varyant kimliği ve ürün grubu.
 * - Puan yalnızca gerçek değerlendirme varken (K-34): yorumu olmayan ürüne
 *   puan yazmak Google'ın manuel işlem sebebi.
 * - Kargo ücreti, teslim süresi ve iade politikası her teklifte: arama
 *   sonucunda "Ücretsiz kargo · 14 gün iade" olarak görünebiliyor.
 */

import { renginFotograflari, type Urun } from "@/ui/katalog-bicim";

const SEMA = "https://schema.org";

export type YapisalBaglam = {
  /** `/urun/x` → mutlak adres. */
  adres: (yol: string) => string;
  /** Ekrandaki satış fiyatı ve (varsa) üstü çizili fiyat, kuruş. */
  satisKurus: number;
  ustuCiziliKurus?: number;
  kargoKurus: number;
  /** Bu tutar ve üstünde kargo bedava; 0 ise hep ücretli. */
  bedavaKargoEsigi: number;
  /** Cayma süresi (gün). */
  iadeGun: number;
  yorum: {
    ortalama: number;
    adet: number;
    ornekler: { adSoyad: string; puan: number; yorum: string; olusturuldu: Date }[];
  };
};

const tl = (kurus: number) => (kurus / 100).toFixed(2);

/** Teklifin kargo ayrıntısı: yurt içi, hazırlık 0-1 iş günü, yol 1-4 iş günü. */
function kargo(b: YapisalBaglam) {
  const bedava = b.bedavaKargoEsigi > 0 && b.satisKurus >= b.bedavaKargoEsigi;
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: bedava ? "0" : tl(b.kargoKurus),
      currency: "TRY",
    },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "TR" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 4, unitCode: "DAY" },
    },
  };
}

/** İade: süre içinde postayla, anlaşmalı kodla ücretsiz (iade-değişim sayfası). */
function iade(b: YapisalBaglam) {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "TR",
    returnPolicyCategory: `${SEMA}/MerchantReturnFiniteReturnWindow`,
    merchantReturnDays: b.iadeGun,
    returnMethod: `${SEMA}/ReturnByMail`,
    returnFees: `${SEMA}/FreeReturn`,
  };
}

export function urunYapisalVerisi(u: Urun, b: YapisalBaglam): Record<string, unknown> {
  const renkAdi = new Map(u.renkler.map((r) => [r.kod, r.ad]));
  const indirimli = b.ustuCiziliKurus !== undefined && b.ustuCiziliKurus > b.satisKurus;
  const teklif = (yol: string, stokta: boolean) => ({
    "@type": "Offer",
    url: b.adres(yol),
    priceCurrency: "TRY",
    price: tl(b.satisKurus),
    // Üstü çizili fiyat "liste fiyatı" olarak: Google indirimi böyle tanıyor.
    ...(indirimli
      ? {
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            priceType: `${SEMA}/StrikethroughPrice`,
            price: tl(b.ustuCiziliKurus!),
            priceCurrency: "TRY",
          },
        }
      : {}),
    availability: stokta ? `${SEMA}/InStock` : `${SEMA}/OutOfStock`,
    itemCondition: `${SEMA}/NewCondition`,
    shippingDetails: kargo(b),
    hasMerchantReturnPolicy: iade(b),
  });

  const puan =
    b.yorum.adet > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: b.yorum.ortalama.toFixed(1),
            reviewCount: b.yorum.adet,
            bestRating: 5,
            worstRating: 1,
          },
          review: b.yorum.ornekler
            .filter((y) => y.yorum.trim())
            .slice(0, 5)
            .map((y) => ({
              "@type": "Review",
              author: { "@type": "Person", name: y.adSoyad },
              datePublished: y.olusturuldu.toISOString().slice(0, 10),
              reviewBody: y.yorum,
              reviewRating: { "@type": "Rating", ratingValue: y.puan, bestRating: 5 },
            })),
        }
      : {};

  const ortak = {
    name: u.ad,
    description: [u.ozet, u.kumasIcerigi].filter(Boolean).join(" · "),
    brand: { "@type": "Brand", name: "BASoftBaby" },
    image: u.fotograflar.map((f) => b.adres(f.yol)),
    material: u.kumasIcerigi || undefined,
    ...puan,
  };

  // Tek varyantlı ürün: grup gereksiz, düz `Product`.
  if (u.varyantlar.length <= 1) {
    const v = u.varyantlar[0];
    return {
      "@context": SEMA,
      "@type": "Product",
      ...ortak,
      sku: v?.id ?? u.id,
      offers: teklif(`/urun/${u.slug}`, (v?.stok ?? 0) > 0),
    };
  }

  const renkler = new Set(u.varyantlar.map((v) => v.renk));
  const bedenler = new Set(u.varyantlar.map((v) => v.beden));
  return {
    "@context": SEMA,
    "@type": "ProductGroup",
    ...ortak,
    productGroupID: u.id,
    url: b.adres(`/urun/${u.slug}`),
    variesBy: [
      ...(bedenler.size > 1 ? [`${SEMA}/size`] : []),
      ...(renkler.size > 1 ? [`${SEMA}/color`] : []),
    ],
    hasVariant: u.varyantlar.map((v) => {
      const renk = renkAdi.get(v.renk) ?? v.renk;
      const foto = renginFotograflari(u.fotograflar, v.renk)[0];
      return {
        "@type": "Product",
        sku: v.id,
        name: `${u.ad} - ${renk} - ${v.beden}`,
        size: v.beden,
        color: renk,
        ...(foto ? { image: b.adres(foto.yol) } : {}),
        offers: teklif(`/urun/${u.slug}?renk=${encodeURIComponent(v.renk)}`, v.stok > 0),
      };
    }),
  };
}

/** Sayfa yolu: ekrandaki "Ana sayfa · Kategori · Ürün" satırının karşılığı. */
export function sayfaYolu(
  adimlar: { ad: string; yol: string }[],
  adres: (yol: string) => string,
): Record<string, unknown> {
  return {
    "@context": SEMA,
    "@type": "BreadcrumbList",
    itemListElement: adimlar.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: a.ad,
      item: adres(a.yol),
    })),
  };
}
