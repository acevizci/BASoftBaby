import { atlamaSebebi, temizle, testDb, urunKur } from "./veritabani";
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { kaldirilanUrun, silinenleriYonlendir } from "@/server/urun-yonlendirme";

/** Yayında olmayan ürünün adresi (K-128). */

describe("kaldırılan ürün yönlendirmesi (veritabanı)", { skip: atlamaSebebi }, () => {
  const sluglar: string[] = [];
  after(async () => {
    await testDb().productRedirect.deleteMany({ where: { slug: { in: sluglar } } });
    await temizle();
  });

  it("pasif ürün kategorisine geçici, silinen kalıcı; kategori kapanınca Tüm ürünler", async () => {
    const db = testDb();
    const { productId } = await urunKur(1);
    const urun = await db.product.findUniqueOrThrow({ where: { id: productId }, include: { category: true } });
    sluglar.push(urun.slug);

    assert.equal(await kaldirilanUrun("t_hic-olmayan-urun"), undefined);

    await db.product.update({ where: { id: productId }, data: { aktif: false } });
    assert.deepEqual(await kaldirilanUrun(urun.slug), { hedef: `/${urun.category.slug}`, kalici: false });

    await silinenleriYonlendir([{ slug: urun.slug, categoryId: urun.categoryId }]);
    await db.productVariant.deleteMany({ where: { productId } });
    await db.product.delete({ where: { id: productId } });
    assert.deepEqual(await kaldirilanUrun(urun.slug), { hedef: `/${urun.category.slug}`, kalici: true });

    await db.category.update({ where: { id: urun.categoryId }, data: { aktif: false } });
    assert.deepEqual(await kaldirilanUrun(urun.slug), { hedef: "/urunler", kalici: true });
  });
});
