import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dogrulamaKoduCoz, indexNowGovdesi } from "@/server/arama-motoru-bicim";

/** Arama motoru ayarları (K-129). */

describe("doğrulama kodu", () => {
  it("etiketin tamamı ya da yalnızca değer; boş kaldırmak", () => {
    assert.equal(
      dogrulamaKoduCoz('<meta name="google-site-verification" content="aBc123_-XyZ" />'),
      "aBc123_-XyZ",
    );
    assert.equal(dogrulamaKoduCoz("  8A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D "), "8A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D");
    assert.equal(dogrulamaKoduCoz(""), "");
  });
  it("etiket dışında kod ya da bozuk değer kabul edilmiyor", () => {
    assert.equal(dogrulamaKoduCoz('"><script>alert(1)</script>'), null);
    assert.equal(dogrulamaKoduCoz("abc"), null);
  });
});

describe("IndexNow gövdesi", () => {
  it("mutlak adres, tekrarsız, yalnızca kendi alan adı, anahtar dosyası kökte", () => {
    const g = indexNowGovdesi("https://www.basoftbaby.com", "k".repeat(32), [
      "/urun/tulum",
      "/urun/tulum",
      "https://baska.com/x",
      "/yenidogan",
    ]);
    assert.equal(g.host, "www.basoftbaby.com");
    assert.equal(g.keyLocation, "https://www.basoftbaby.com/indexnow.txt");
    assert.deepEqual(g.urlList, [
      "https://www.basoftbaby.com/urun/tulum",
      "https://www.basoftbaby.com/yenidogan",
    ]);
  });
});
