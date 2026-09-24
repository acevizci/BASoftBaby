import { atlamaSebebi, testDb } from "./veritabani";
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { adresYolu, gurultuMu, hataHazirla, parmakIzi, sadelestir } from "@/server/hata-bicim";
import { hataKaydet } from "@/server/hata-kaydi";

/** Hata kaydı (K-121). */

describe("parmak izi", () => {
  it("değişen sayı ve kimlikler aynı hata sayılıyor", () => {
    assert.equal(sadelestir("BA-2026-0012 bulunamadı"), sadelestir("BA-2026-0013 bulunamadı"));
    assert.equal(sadelestir('Ürün "tulum" yok'), sadelestir('Ürün "body" yok'));
    assert.equal(
      sadelestir("kayıt clx9k2m3n0000abcdefghij yok"),
      sadelestir("kayıt clz0000000000zyxwvutsrqp yok"),
    );
  });

  it("türü, metni ya da yeri farklı hatalar ayrı", () => {
    const a = parmakIzi({
      kaynak: "sunucu",
      mesaj: "TypeError: x is undefined",
      yigin: "E\n    at f (a.js:1:2)",
    });
    assert.notEqual(
      a,
      parmakIzi({
        kaynak: "tarayici",
        mesaj: "TypeError: x is undefined",
        yigin: "E\n    at f (a.js:1:2)",
      }),
    );
    assert.notEqual(
      a,
      parmakIzi({
        kaynak: "sunucu",
        mesaj: "TypeError: y is undefined",
        yigin: "E\n    at f (a.js:1:2)",
      }),
    );
    assert.notEqual(
      a,
      parmakIzi({
        kaynak: "sunucu",
        mesaj: "TypeError: x is undefined",
        yigin: "E\n    at g (b.js:1:2)",
      }),
    );
    // Satır numarası derlemeden derlemeye değişebiliyor; yer aynı.
    assert.equal(
      a,
      parmakIzi({
        kaynak: "sunucu",
        mesaj: "TypeError: x is undefined",
        yigin: "E\n    at f (a.js:9:7)",
      }),
    );
  });

  it("adreste sorgu metni tutulmuyor", () => {
    assert.equal(adresYolu("/eposta-dogrula?jeton=gizli#x"), "/eposta-dogrula");
    assert.equal(adresYolu("/odeme?a=1 (form)"), "/odeme (form)");
  });

  it("boş mesaj kaydedilmiyor, uzun alanlar kırpılıyor", () => {
    assert.equal(hataHazirla({ kaynak: "sunucu", mesaj: "   " }), null);
    const h = hataHazirla({ kaynak: "sunucu", mesaj: "x".repeat(900), yigin: "y".repeat(9000) });
    assert.equal(h?.mesaj.length, 500);
    assert.equal(h?.yigin.length, 4000);
  });

  it("tarayıcı gürültüsü ayıklanıyor", () => {
    assert.ok(gurultuMu("Script error."));
    assert.ok(gurultuMu("Error: Script error."));
    assert.ok(gurultuMu("ResizeObserver loop completed with undelivered notifications."));
    assert.ok(gurultuMu("TypeError: Failed to fetch"));
    assert.ok(!gurultuMu("TypeError: Cannot read properties of undefined (reading 'fiyat')"));
  });
});

describe("hata kaydı (veritabanı)", { skip: atlamaSebebi }, () => {
  const onek = { startsWith: "T_" };
  after(async () => {
    await testDb().errorLog.deleteMany({ where: { mesaj: onek } });
  });

  it("aynı hata tek satır, sayaç artıyor; çözülen yeniden olunca açılıyor", async () => {
    const db = testDb();
    const g = {
      kaynak: "sunucu" as const,
      mesaj: "T_Hata: sipariş 12 bulunamadı",
      adres: "/odeme?x=1",
      ozet: "123",
    };
    await hataKaydet(g);
    await hataKaydet({ ...g, mesaj: "T_Hata: sipariş 13 bulunamadı" });
    const satirlar = await db.errorLog.findMany({ where: { mesaj: onek } });
    assert.equal(satirlar.length, 1);
    assert.equal(satirlar[0].adet, 2);
    assert.equal(satirlar[0].adres, "/odeme");

    await db.errorLog.update({ where: { id: satirlar[0].id }, data: { cozuldu: true } });
    await hataKaydet(g);
    const sonra = await db.errorLog.findUniqueOrThrow({ where: { id: satirlar[0].id } });
    assert.equal(sonra.cozuldu, false);
    assert.equal(sonra.adet, 3);
  });
});
