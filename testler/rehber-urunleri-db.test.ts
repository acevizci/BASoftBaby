import { atlamaSebebi, temizle, testDb, urunKur } from "./veritabani";
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { kelimeyleSirala, rehberUrunleri } from "@/server/rehber-urunleri";

/** Rehber yazısının altındaki ürünler (K-157). */

describe("rehber ürünleri: sıralama", () => {
  it("önce yazılan kelime ağır basıyor, eşitse daha çok değerlendirilen; tutmayan yok", () => {
    const adaylar = [
      { id: "a", aramaMetni: "pamuklu tulum", yorumSayisi: 9 },
      { id: "b", aramaMetni: "organik zibin body seti", yorumSayisi: 1 },
      { id: "c", aramaMetni: "sapka", yorumSayisi: 50 },
      { id: "d", aramaMetni: "uyku tulumu", yorumSayisi: 3 },
    ];
    assert.deepEqual(
      kelimeyleSirala(adaylar, ["zibin", "body", "tulum"]).map((x) => x.id),
      ["b", "a", "d"],
    );
    // "uyku tulumu" iki kelime tutsa da ilk kelimeyi tutan zıbının önüne geçmiyor.
    assert.deepEqual(
      kelimeyleSirala(adaylar, ["zibin", "body", "tulum", "muslin", "uyku"]).map((x) => x.id),
      ["b", "d", "a"],
    );
  });
});

describe("rehber ürünleri (veritabanı)", { skip: atlamaSebebi }, () => {
  after(temizle);

  it("elle seçilen azsa anahtar kelimeyle tamamlıyor, tükeneni almıyor", async () => {
    const tog = await urunKur(5);
    const tukendi = await urunKur(0);
    const elle = await urunKur(5);
    const db = testDb();
    const ek = Date.now().toString(36);
    await db.product.update({
      where: { id: tog.productId },
      data: { aramaMetni: `uyku tulumu tog ${ek}` },
    });
    await db.product.update({
      where: { id: tukendi.productId },
      data: { aramaMetni: `uyku tulumu tog ${ek}` },
    });
    const elleSlug = elle.productId.toLowerCase();

    const sonuc = await rehberUrunleri([elleSlug], `tog ${ek}`);
    assert.equal(sonuc.elle, true);
    assert.deepEqual(
      sonuc.urunler.map((u) => u.id),
      [elle.productId, tog.productId],
    );

    const yalniz = await rehberUrunleri([], `${ek}`);
    assert.equal(yalniz.elle, false);
    assert.deepEqual(
      yalniz.urunler.map((u) => u.id),
      [tog.productId],
    );
    assert.deepEqual((await rehberUrunleri([], "")).urunler, []);
  });
});
