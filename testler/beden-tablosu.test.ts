import "./hazirlik";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { atlamaSebebi, temizle, testDb, urunKur } from "./veritabani";
import { azalanMi, AZALAN_GUN } from "@/server/satis-hizi";
import { bedenTablosunuYaz, hucreleriCoz } from "@/server/beden-tablosu";
import { barkodCoz } from "@/server/depo";

/** Beden × renk tablosu ve satış hızına göre "azaldı" (K-178). */

describe("Azaldı kuralı", () => {
  const hiz = (satilan: number, kacGun: number | null, azVeri = false) => ({
    satilan,
    kacGun,
    azVeri,
  });
  it("çok satan bedende az gün kaldıysa azaldı, adet çok olsa da", () => {
    assert.equal(azalanMi(hiz(60, 10), 20), true);
    assert.equal(azalanMi(hiz(60, AZALAN_GUN + 1), 30), false);
  });
  it("az veride 2 adet ve altı azaldı", () => {
    assert.equal(azalanMi(hiz(2, null, true), 2), true);
    assert.equal(azalanMi(hiz(2, null, true), 3), false);
  });
  it("satmayan ya da biten beden azaldı değil", () => {
    assert.equal(azalanMi(hiz(0, null, true), 1), false);
    assert.equal(azalanMi(undefined, 1), false);
    assert.equal(azalanMi(hiz(30, 0), 0), false);
  });
});

describe("Beden tablosu · çözme", () => {
  it("bozuk JSON ve geçersiz satırlar atılıyor", () => {
    assert.deepEqual(hucreleriCoz("bozuk"), []);
    assert.deepEqual(hucreleriCoz('{"a":1}'), []);
    const h = hucreleriCoz(
      JSON.stringify([
        { beden: "0-3 ay", renk: "mint", stok: 5, barkod: " 869 1 " },
        { beden: "", renk: "mint", stok: 1 },
        { beden: "3-6 ay", renk: "krem", stok: -1 },
        { beden: "6-9 ay", renk: "krem", stok: 2.5, id: "v1", onceki: 3 },
      ]),
    );
    assert.equal(h.length, 3);
    assert.equal(h[0].barkod, "8691");
    assert.equal(h[1].stok, null);
    assert.deepEqual([h[2].id, h[2].onceki, h[2].stok], ["v1", 3, null]);
  });
});

describe("Beden tablosu · veritabanı", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("yeni hücreler tek kayıtta; stok, hareket ve barkod", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(5);
    const kod = `TB${Date.now()}`;
    const r = await bedenTablosunuYaz(productId, [
      { beden: "0-3 ay", renk: "mint", id: variantId, onceki: 5, stok: null },
      { beden: "3-6 ay", renk: "mint", stok: 4, barkod: kod },
      { beden: "0-3 ay", renk: "krem", stok: null },
      { beden: "yok-boyle", renk: "mint", stok: 1 },
    ]);
    assert.deepEqual([r.yeni, r.duzeltilen, r.barkod, r.gecersiz], [2, 0, 1, 1]);
    const bedenler = await db.productVariant.findMany({
      where: { productId },
      orderBy: { beden: "asc" },
      select: { beden: true, renk: true, stok: true },
    });
    assert.equal(bedenler.length, 3);
    assert.equal(bedenler.find((b) => b.beden === "3-6 ay")?.stok, 4);
    assert.equal(bedenler.find((b) => b.renk === "krem")?.stok, 0);
    // Dokunulmayan var olan hücre (stok null) değişmedi.
    assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stok, 5);
    const c = await barkodCoz(kod);
    assert.equal(c.tur === "tek" && c.beden.beden, "3-6 ay");
    const h = await db.stockMovement.findFirstOrThrow({
      where: { productId, beden: "3-6 ay" },
    });
    assert.deepEqual([h.sebep, h.degisim], ["yeni", 4]);
  });

  it("var olan hücre: değiştiyse koşullu yazılıyor, arada satış olduysa çakışma", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(5);
    const r = await bedenTablosunuYaz(productId, [
      { beden: "0-3 ay", renk: "mint", id: variantId, onceki: 5, stok: 8 },
    ]);
    assert.equal(r.duzeltilen, 1);
    assert.deepEqual(r.artan, [variantId]);
    assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stok, 8);

    // Ekranda 8 görülürken arada bir satış: 7. Yazılan 10 geri getirmesin.
    await db.productVariant.update({ where: { id: variantId }, data: { stok: 7 } });
    const r2 = await bedenTablosunuYaz(productId, [
      { beden: "0-3 ay", renk: "mint", id: variantId, onceki: 8, stok: 10 },
    ]);
    assert.equal(r2.duzeltilen, 0);
    assert.equal(r2.cakisan.length, 1);
    assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stok, 7);
  });

  it("başka ürünün bedeni bu tablodan değiştirilemiyor", async () => {
    const db = testDb();
    const a = await urunKur(5);
    const b = await urunKur(5);
    const r = await bedenTablosunuYaz(a.productId, [
      { beden: "0-3 ay", renk: "mint", id: b.variantId, onceki: 5, stok: 0 },
    ]);
    assert.equal(r.duzeltilen, 0);
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: b.variantId } })).stok,
      5,
    );
  });
});
