import { atlamaSebebi, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { gelenAdetler, kabulIcinAra, kabulNotu, malKabulYaz } from "@/server/mal-kabul";

/** Mal kabulü (K-104). */
describe("mal kabulü formu", () => {
  it("yalnızca pozitif tam sayılar; boş, sıfır, eksi, ondalık ve aşırı büyük atlanıyor", () => {
    assert.deepEqual(
      gelenAdetler([
        ["ara", "zıbın"],
        ["gelen-a", "12"],
        ["gelen-b", ""],
        ["gelen-c", "0"],
        ["gelen-d", "-3"],
        ["gelen-e", "2.5"],
        ["gelen-f", "1000000"],
        ["gelen-g", " 4 "],
      ]),
      [
        { id: "a", adet: 12 },
        { id: "g", adet: 4 },
      ],
    );
  });

  it("not tedarikçi, irsaliye ve serbest nottan kuruluyor; boşlar atlanıyor", () => {
    assert.equal(kabulNotu({ tedarikci: "Pamuk AŞ", irsaliye: "A-77", not: "" }), "Pamuk AŞ · İrsaliye A-77");
    assert.equal(kabulNotu({ tedarikci: "", irsaliye: "", not: "eksik geldi" }), "eksik geldi");
  });
});

describe("mal kabulü (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("stoğu artırıyor (arada satış olsa da), hareketi notuyla yazıyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(5);
    // Ekran açıkken 2 satıldı: kabul yine doğru sonuca varıyor.
    await db.productVariant.update({ where: { id: variantId }, data: { stok: 3 } });

    const sonuc = await malKabulYaz(
      [
        { id: variantId, adet: 12 },
        { id: "silinmis-beden", adet: 4 },
      ],
      "Pamuk AŞ · İrsaliye A-77",
      { id: "a1", adSoyad: "Depo" },
    );
    assert.deepEqual(sonuc, { adet: 12, beden: 1, idler: [variantId] });
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v.stok, 15);
    const h = await db.stockMovement.findFirstOrThrow({ where: { variantId } });
    assert.deepEqual([h.sebep, h.degisim, h.sonra, h.not, h.yapan], ["mal-kabul", 12, 15, "Pamuk AŞ · İrsaliye A-77", "Depo"]);
  });

  it("SKU ile aramada yalnızca o ürün geliyor ve beden işaretleniyor", async () => {
    const { productId, variantId } = await urunKur(1);
    const { urunler, skuVaryant } = await kabulIcinAra(variantId.toLowerCase());
    assert.equal(skuVaryant, variantId);
    assert.deepEqual(
      urunler.map((u) => u.id),
      [productId],
    );
    assert.deepEqual(await kabulIcinAra("   "), { urunler: [] });
  });
});
