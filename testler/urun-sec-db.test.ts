import { atlamaSebebi, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { urunleriSec } from "@/server/katalog";

/**
 * Favoriler ve son bakılanlar için ürün seçimi (K-94, K-95): verilen sırayı
 * koruyor, vitrinde olmayanı getirmiyor.
 */
describe("urunleriSec (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("verilen sırayı koruyor, kapalı kategori ve pasif ürünü atlıyor", async () => {
    const db = testDb();
    const a = await urunKur(1);
    const b = await urunKur(1);
    const kapali = await urunKur(1);
    const pasif = await urunKur(1);
    const k = await db.product.findUniqueOrThrow({ where: { id: kapali.productId } });
    await db.category.update({ where: { id: k.categoryId }, data: { aktif: false } });
    await db.product.update({ where: { id: pasif.productId }, data: { aktif: false } });

    const liste = await urunleriSec({
      idler: [b.productId, "yok-boyle-bir-urun", kapali.productId, a.productId, pasif.productId],
    });
    assert.deepEqual(
      liste.map((u) => u.id),
      [b.productId, a.productId],
    );
  });
});
