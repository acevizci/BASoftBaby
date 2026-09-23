import { atlamaSebebi, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { stokDegeri } from "@/server/stok-degeri";
import { malKabulYaz } from "@/server/mal-kabul";

/** Raftaki malın maliyetle değeri (K-114). */
describe("stok değeri (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("alış fiyatlı stok × alış; ay başı bu ayın hareketleri geri alınarak; alışsız ayrı", async () => {
    const db = testDb();
    const once = await stokDegeri();
    const a = await urunKur(3);
    await urunKur(4);
    await db.product.update({ where: { id: a.productId }, data: { alisFiyatKurus: 5000 } });
    // Bu ay 2 adet geldi: ay başında 3 vardı, şimdi 5.
    await malKabulYaz([{ id: a.variantId, adet: 2 }], "");
    const sonra = await stokDegeri();
    assert.equal(sonra.degerKurus - once.degerKurus, 5 * 5000);
    assert.equal(sonra.ayBasiKurus - once.ayBasiKurus, 3 * 5000);
    assert.equal(sonra.alissizAdet - once.alissizAdet, 4);
  });
});
