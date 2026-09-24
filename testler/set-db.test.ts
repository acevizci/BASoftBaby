import { atlamaSebebi, temizle, testDb, urunKur } from "./veritabani";
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { setBoz, setHazirla } from "@/server/set";
import { ayriAyriKurus, hazirlanabilir } from "@/server/set-bicim";

/** Set ve paket ürün (K-133). */

describe("set hesapları", () => {
  it("hazırlanabilir adet en kıt parçaya göre", () => {
    assert.equal(
      hazirlanabilir([
        { variantId: "a", adet: 3, stok: 10 },
        { variantId: "b", adet: 1, stok: 2 },
      ]),
      2,
    );
    assert.equal(hazirlanabilir([]), 0);
    assert.equal(ayriAyriKurus([{ adet: 3, fiyatKurus: 10000 }, { adet: 1, fiyatKurus: 5000 }]), 35000);
  });
});

describe("set hazırlama (veritabanı)", { skip: atlamaSebebi }, () => {
  after(temizle);
  const yapan = { id: "T_admin", adSoyad: "Test" };

  it("parçalar düşüyor, set artıyor; yetmezse hiçbir şey değişmiyor; bozunca geri", async () => {
    const db = testDb();
    const set = await urunKur(0);
    const body = await urunKur(7);
    const sapka = await urunKur(2);
    await db.bundleItem.createMany({
      data: [
        { setVariantId: set.variantId, variantId: body.variantId, adet: 3 },
        { setVariantId: set.variantId, variantId: sapka.variantId, adet: 1 },
      ],
    });
    const stok = async (id: string) => (await db.productVariant.findUniqueOrThrow({ where: { id } })).stok;

    assert.deepEqual(await setHazirla(set.variantId, 3, yapan), { tamam: false, sebep: "yetersiz:2" });
    assert.equal(await stok(body.variantId), 7);

    assert.deepEqual(await setHazirla(set.variantId, 2, yapan), { tamam: true, adet: 2 });
    assert.equal(await stok(set.variantId), 2);
    assert.equal(await stok(body.variantId), 1);
    assert.equal(await stok(sapka.variantId), 0);

    const hareketler = await db.stockMovement.findMany({
      where: { variantId: { in: [set.variantId, body.variantId, sapka.variantId] } },
    });
    assert.deepEqual(
      hareketler.map((h) => [h.sebep, h.degisim]).sort(),
      [["set-hazirla", -2], ["set-hazirla", -6], ["set-hazirla", 2]].sort(),
    );

    assert.deepEqual(await setBoz(set.variantId, 3, yapan), { tamam: false, sebep: "set-stok" });
    assert.deepEqual(await setBoz(set.variantId, 1, yapan), { tamam: true, adet: 1 });
    assert.equal(await stok(set.variantId), 1);
    assert.equal(await stok(body.variantId), 4);
    assert.equal(await stok(sapka.variantId), 1);
  });
});
