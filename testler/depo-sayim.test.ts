import "./hazirlik";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { atlamaSebebi, temizle, testDb, urunKur } from "./veritabani";
import {
  acikSayim,
  depoSayimAc,
  depoSayimBitir,
  depoSayimIptal,
  depoSayimYaz,
  OKUTULAN,
  sayimFarklari,
} from "@/server/depo-sayim";

/** Depo ekranında okutarak sayım (K-177). */

describe("Depo · sayım", { skip: atlamaSebebi }, () => {
  const acilanlar: string[] = [];
  const kapat = async () => {
    const db = testDb();
    await db.stockCount.updateMany({ where: { durum: "acik" }, data: { durum: "iptal" } });
  };
  before(async () => {
    await temizle();
    await kapat();
  });
  after(async () => {
    await testDb().stockCount.deleteMany({ where: { id: { in: acilanlar } } });
    await temizle();
  });

  it("raf sayımı: satır okutulunca açılıyor, mutlak yazım, bitirince fark stoğa", async () => {
    const db = testDb();
    const a = await urunKur(5);
    const b = await urunKur(2);
    const id = await depoSayimAc(OKUTULAN);
    acilanlar.push(id);
    assert.equal(await db.stockCountLine.count({ where: { countId: id } }), 0);

    // Aynı liste iki kez gelse de sonuç aynı (mutlak değer).
    for (let i = 0; i < 2; i++) {
      await depoSayimYaz(id, [
        { variantId: a.variantId, adet: 4 },
        { variantId: b.variantId, adet: 2 },
      ]);
    }
    assert.equal(await db.stockCountLine.count({ where: { countId: id } }), 2);

    const acik = await acikSayim();
    assert.equal(acik?.id, id);
    assert.equal(acik?.satirlar.length, 2);

    const f = await sayimFarklari(id);
    assert.equal(f?.farklar.length, 1);
    assert.equal(f?.farklar[0].fark, -1);
    assert.equal(f?.okutulmayan, 0);

    const r = await depoSayimBitir(id, { okutulmayanSifir: false });
    assert.equal(r?.duzeltilen, 1);
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: a.variantId } })).stok,
      4,
    );
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: b.variantId } })).stok,
      2,
    );
    // Kapanmış sayıma yazılmıyor, ikinci bitirme yok.
    assert.deepEqual(await depoSayimYaz(id, [{ variantId: a.variantId, adet: 9 }]), {
      tamam: false,
      yazilan: 0,
    });
    assert.equal(await depoSayimBitir(id, { okutulmayanSifir: false }), undefined);
  });

  it("adedi değişmeyen satırın sayılma anı yeniden yazılmıyor", async () => {
    const db = testDb();
    const a = await urunKur(5);
    const b = await urunKur(5);
    const id = await depoSayimAc(OKUTULAN);
    acilanlar.push(id);
    await depoSayimYaz(id, [{ variantId: a.variantId, adet: 5 }]);
    const ilk = await db.stockCountLine.findFirstOrThrow({
      where: { countId: id, variantId: a.variantId },
    });
    // Arada stok değişti (sipariş kargoya çıktı); liste yeniden gönderildi.
    await db.productVariant.update({ where: { id: a.variantId }, data: { stok: 4 } });
    await depoSayimYaz(id, [
      { variantId: a.variantId, adet: 5 },
      { variantId: b.variantId, adet: 5 },
    ]);
    const sonra = await db.stockCountLine.findFirstOrThrow({
      where: { countId: id, variantId: a.variantId },
    });
    assert.equal(sonra.sistem, ilk.sistem);
    assert.equal(sonra.sayildi?.getTime(), ilk.sayildi?.getTime());
    assert.equal(await db.stockCountLine.count({ where: { countId: id } }), 2);
    await depoSayimIptal(id);
  });

  it("aynı anda tek açık sayım", async () => {
    const ilk = await depoSayimAc(OKUTULAN);
    acilanlar.push(ilk);
    const ikinci = await depoSayimAc("");
    assert.equal(ikinci, ilk);
    await depoSayimIptal(ilk);
    assert.equal(await acikSayim(), null);
  });

  it("silinen satırın sayılanı kalkıyor", async () => {
    const db = testDb();
    const a = await urunKur(3);
    const id = await depoSayimAc(OKUTULAN);
    acilanlar.push(id);
    await depoSayimYaz(id, [{ variantId: a.variantId, adet: 1 }]);
    await depoSayimYaz(id, [], [a.variantId]);
    const l = await db.stockCountLine.findFirstOrThrow({ where: { countId: id } });
    assert.equal(l.sayilan, null);
    assert.equal((await acikSayim())?.satirlar.length, 0);
    await depoSayimIptal(id);
  });

  it("kategori sayımı: okutulmayanlara dokunulmuyor, istenirse sıfırlanıyor", async () => {
    const db = testDb();
    const a = await urunKur(5);
    const kategori = await db.product.findUniqueOrThrow({
      where: { id: a.productId },
      select: { categoryId: true, category: { select: { slug: true } } },
    });
    const ikinci = await db.productVariant.create({
      data: {
        id: `${a.variantId}_2`,
        productId: a.productId,
        beden: "3-6 ay",
        renk: "mint",
        stok: 3,
        sku: `${a.variantId}_2`,
      },
    });

    // Dokunma
    let id = await depoSayimAc(kategori.category.slug);
    acilanlar.push(id);
    await depoSayimYaz(id, [{ variantId: a.variantId, adet: 5 }]);
    assert.equal((await sayimFarklari(id))?.okutulmayan, 1);
    await depoSayimBitir(id, { okutulmayanSifir: false });
    assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: ikinci.id } })).stok, 3);

    // Sıfırla
    id = await depoSayimAc(kategori.category.slug);
    acilanlar.push(id);
    await depoSayimYaz(id, [{ variantId: a.variantId, adet: 5 }]);
    const r = await depoSayimBitir(id, { okutulmayanSifir: true });
    assert.equal(r?.duzeltilen, 1);
    assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: ikinci.id } })).stok, 0);
    const h = await db.stockMovement.findFirstOrThrow({ where: { variantId: ikinci.id } });
    assert.deepEqual([h.sebep, h.degisim], ["sayim", -3]);
  });
});
