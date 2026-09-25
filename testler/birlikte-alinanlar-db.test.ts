import { atlamaSebebi, kimlik, temizle, testDb, urunKur } from "./veritabani";
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { birlikteAlinanlar } from "@/server/birlikte-alinanlar";

/** Birlikte alınanlar (K-148): ödenmiş siparişlerdeki ortak ürünler. */

async function siparis(varyantlar: string[], odemeDurumu = "odendi", durum = "hazirlaniyor") {
  const id = kimlik("sip");
  await testDb().order.create({
    data: {
      id,
      numara: id,
      adSoyad: "Test",
      eposta: "t_birlikte@deneme.test",
      telefon: "05001112233",
      adres: "Adres",
      ilce: "Kadıköy",
      il: "İstanbul",
      postaKodu: "34000",
      araToplamKurus: 10000,
      kargoKurus: 0,
      toplamKurus: 10000,
      odemeDurumu,
      durum,
      satirlar: {
        create: varyantlar.map((variantId) => ({
          variantId,
          urunAd: "Test ürünü",
          slug: "x",
          beden: "0-3 ay",
          renk: "mint",
          adet: 1,
          fiyatKurus: 10000,
        })),
      },
    },
  });
}

describe("birlikte alınanlar (veritabanı)", { skip: atlamaSebebi }, () => {
  after(temizle);

  it("birlikte geçme sayısına göre sıralıyor; ödenmemiş, iptal ve tükenmişi almıyor", async () => {
    const a = await urunKur(5);
    const b = await urunKur(5);
    const c = await urunKur(5);
    const odenmedi = await urunKur(5);
    const iptal = await urunKur(5);
    const tukendi = await urunKur(0);

    await siparis([a.variantId, b.variantId]);
    await siparis([a.variantId, c.variantId]);
    await siparis([a.variantId, c.variantId, tukendi.variantId]);
    await siparis([a.variantId, odenmedi.variantId], "bekliyor", "bekliyor");
    await siparis([a.variantId, iptal.variantId], "odendi", "iptal");

    const sonuc = await birlikteAlinanlar({ id: a.productId });
    assert.deepEqual(
      sonuc.map((u) => u.id),
      [c.productId, b.productId],
    );
    // Tek taraflı değil: B'nin sayfasında A çıkıyor.
    assert.deepEqual(
      (await birlikteAlinanlar({ id: b.productId })).map((u) => u.id),
      [a.productId],
    );
  });
});
