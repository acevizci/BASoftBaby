import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { sepetGetir } from "@/server/sepet";
import { siparisOlustur } from "@/server/siparis";
import type { SatisAyari } from "@/server/sepet";

/** Sepet ile stok arasındaki tutarsızlık (K-105). */

const AYAR: SatisAyari = {
  kargoKurus: 4990,
  bedavaKargoEsigi: 50000,
  havaleBilgisi: "Test",
  havaleSaat: 72,
  havaleHatirlatmaSaat: 24,
  kdvOrani: 10,
  varsayilanTasiyici: "yurtici",
};

describe("sepet ve stok (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("stok azalınca adet kayıtta da düşüyor, bir kez söyleniyor ve sipariş geçiyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(5);
    const cartId = await sepetKur(variantId, 3);
    await db.productVariant.update({ where: { id: variantId }, data: { stok: 1 } });

    const ilk = await sepetGetir();
    assert.equal(ilk.satirlar[0].adet, 1);
    assert.equal(ilk.satirlar[0].azaltildi, 3);
    const kayit = await db.cartItem.findFirstOrThrow({ where: { cartId } });
    assert.equal(kayit.adet, 1, "kayıt da düşmeli; yoksa ödeme reddederdi");

    const ikinci = await sepetGetir();
    assert.equal(ikinci.satirlar[0].azaltildi, undefined);

    const siparis = await siparisOlustur(
      {
        adSoyad: "Test",
        eposta: `${kimlik("m").toLowerCase()}@deneme.test`,
        telefon: "05001112233",
        adres: "Deneme Mahallesi No 1",
        ilce: "Kadıköy",
        il: "İstanbul",
        postaKodu: "34000",
        not: "",
        hediyePaketi: false,
        hediyeNotu: "",
        sozlesmeOnayi: new Date(),
      },
      AYAR,
    );
    assert.equal(siparis.tamam, true);
  });

  it("satıştan kalkan ürün sepetten çıkarılıyor ve bir kez söyleniyor; tükenen kalıyor", async () => {
    const db = testDb();
    const pasif = await urunKur(5);
    const tukenen = await urunKur(5);
    const cartId = await sepetKur(pasif.variantId, 1);
    await db.cartItem.create({ data: { id: kimlik("sat"), cartId, variantId: tukenen.variantId, adet: 1 } });
    await db.product.update({ where: { id: pasif.productId }, data: { aktif: false } });
    await db.productVariant.update({ where: { id: tukenen.variantId }, data: { stok: 0 } });

    const ilk = await sepetGetir();
    assert.equal(ilk.cikarilan, 1);
    assert.deepEqual(
      ilk.satirlar.map((s) => [s.variantId, s.stok]),
      [[tukenen.variantId, 0]],
    );
    assert.equal(ilk.sorunluMu, true);
    assert.equal((await sepetGetir()).cikarilan, 0);
    assert.equal(await db.cartItem.count({ where: { cartId } }), 1);
  });
});
