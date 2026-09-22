import { atlamaSebebi, kimlik, temizle, testDb } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Kategori adının veritabanında tekil olması (K-83).
 *
 * Uygulamadaki kontrol okuyup sonra yazıyor; aynı anda gelen iki isteği
 * yalnızca dizin yakalıyor. Büyük-küçük harf ve kenar boşluğu farkı ayrı ad
 * sayılmıyor.
 */
describe("kategori adı tekil (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("aynı ad ikinci kez yazılamıyor, harf ve boşluk farkı sayılmıyor", async () => {
    const db = testDb();
    const ad = `${kimlik("Kiz Cocuk")}`;
    const ilk = kimlik("kat");
    await db.category.create({ data: { id: ilk, slug: ilk.toLowerCase(), ad } });

    const ikinci = kimlik("kat");
    await assert.rejects(
      db.category.create({
        data: { id: ikinci, slug: ikinci.toLowerCase(), ad: `  ${ad.toUpperCase()} ` },
      }),
      (e: { code?: string }) => e.code === "P2002",
    );
  });
});
