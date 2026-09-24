/* eslint-disable @typescript-eslint/no-explicit-any -- testler JSON-LD ağacının içine bakıyor */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sayfaYolu, urunYapisalVerisi, type YapisalBaglam } from "@/server/yapisal-veri";
import type { Urun } from "@/ui/katalog-bicim";

/** Yapısal veri (K-126). */

const adres = (y: string) => (/^https?:/.test(y) ? y : `https://site.test${y}`);
const palet = { zemin: "", c1: "", c2: "", c3: "" };

function urun(ek: Partial<Urun> = {}): Urun {
  return {
    id: "u1", categoryId: "k", slug: "tulum", ad: "Tulum", ozet: "Yumuşak", kategori: "k",
    gorsel: "zibin", palet: "mint", paletRenkleri: palet,
    fotograflar: [{ id: "f", yol: "/yuklenen/a.webp", kucukYol: "", altMetin: "", genislik: 1, yukseklik: 1, renk: "mavi" }],
    fiyatKurus: 29990, puan: 0, yorumSayisi: 0,
    renkler: [{ kod: "mavi", ad: "Mavi", palet }, { kod: "krem", ad: "Krem", palet }],
    varyantlar: [
      { id: "v1", beden: "0-3 ay", renk: "mavi", stok: 3 },
      { id: "v2", beden: "3-6 ay", renk: "krem", stok: 0 },
    ],
    kumasIcerigi: "%100 pamuk", yikamaTalimati: "", ozellikler: [],
    ...ek,
  } as Urun;
}

const baglam = (ek: Partial<YapisalBaglam> = {}): YapisalBaglam => ({
  adres, satisKurus: 29990, kargoKurus: 4990, bedavaKargoEsigi: 75000, iadeGun: 14,
  yorum: { ortalama: 0, adet: 0, ornekler: [] },
  ...ek,
});

describe("ürün yapısal verisi", () => {
  it("çok varyantlı ürün ProductGroup; her varyant kendi stoğu ve fotoğrafıyla", () => {
    const v = urunYapisalVerisi(urun(), baglam()) as Record<string, any>;
    assert.equal(v["@type"], "ProductGroup");
    assert.equal(v.productGroupID, "u1");
    assert.deepEqual(v.variesBy, ["https://schema.org/size", "https://schema.org/color"]);
    assert.equal(v.hasVariant.length, 2);
    assert.equal(v.hasVariant[0].sku, "v1");
    assert.equal(v.hasVariant[0].color, "Mavi");
    assert.equal(v.hasVariant[0].image, "https://site.test/yuklenen/a.webp");
    assert.equal(v.hasVariant[0].offers.availability, "https://schema.org/InStock");
    assert.equal(v.hasVariant[1].offers.availability, "https://schema.org/OutOfStock");
    assert.equal(v.hasVariant[1].offers.url, "https://site.test/urun/tulum?renk=krem");
  });

  it("yorum yoksa puan yok; varsa gerçek ortalama ve örnek yorumlar", () => {
    const yok = urunYapisalVerisi(urun(), baglam()) as Record<string, any>;
    assert.equal(yok.aggregateRating, undefined);
    const var_ = urunYapisalVerisi(
      urun(),
      baglam({
        yorum: {
          ortalama: 4.666,
          adet: 3,
          ornekler: [{ adSoyad: "Ayşe", puan: 5, yorum: "Çok yumuşak", olusturuldu: new Date("2026-09-01") }],
        },
      }),
    ) as Record<string, any>;
    assert.equal(var_.aggregateRating.ratingValue, "4.7");
    assert.equal(var_.aggregateRating.reviewCount, 3);
    assert.equal(var_.review[0].datePublished, "2026-09-01");
  });

  it("kargo eşiği, iade süresi ve üstü çizili fiyat", () => {
    const ucretli = (urunYapisalVerisi(urun(), baglam()) as Record<string, any>).hasVariant[0].offers;
    assert.equal(ucretli.shippingDetails.shippingRate.value, "49.90");
    assert.equal(ucretli.hasMerchantReturnPolicy.merchantReturnDays, 14);
    assert.equal(ucretli.priceSpecification, undefined);
    const bedava = (
      urunYapisalVerisi(urun(), baglam({ satisKurus: 80000, ustuCiziliKurus: 99900 })) as Record<string, any>
    ).hasVariant[0].offers;
    assert.equal(bedava.shippingDetails.shippingRate.value, "0");
    assert.equal(bedava.price, "800.00");
    assert.equal(bedava.priceSpecification.price, "999.00");
  });

  it("tek varyantlı ürün düz Product", () => {
    const v = urunYapisalVerisi(urun({ varyantlar: [{ id: "v1", beden: "Tek", renk: "mavi", stok: 1 }] }), baglam()) as Record<string, any>;
    assert.equal(v["@type"], "Product");
    assert.equal(v.sku, "v1");
  });

  it("sayfa yolu sıralı ve mutlak adresli", () => {
    const y = sayfaYolu([{ ad: "Ana sayfa", yol: "/" }, { ad: "Tulum", yol: "/urun/tulum" }], adres) as Record<string, any>;
    assert.equal(y.itemListElement[1].position, 2);
    assert.equal(y.itemListElement[1].item, "https://site.test/urun/tulum");
  });
});
