import "./hazirlik";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { atlamaSebebi, kimlik, temizle, testDb, urunKur } from "./veritabani";
import {
  ortalamaMaliyet,
  siparisMesaji,
  telefonCoz,
  telefonYaz,
  whatsappBaglantisi,
  type MesajSatiri,
} from "@/ui/tedarik-bicim";
import { depoKaydet } from "@/server/depo";
import { tedarikSiparisiYaz, tedarikciBulYaDaAc } from "@/server/tedarik";
import { stokKaybi } from "@/server/stok-kaybi";

/** Tedarikçi, sipariş mesajı, ortalama maliyet, stok kaybı (K-179). */

describe("Tedarik · saf parçalar", () => {
  it("telefon biçimi", () => {
    assert.equal(telefonCoz("0532 123 45 67"), "905321234567");
    assert.equal(telefonCoz("532-123-4567"), "905321234567");
    assert.equal(telefonCoz("+90 (532) 123 45 67"), "905321234567");
    assert.equal(telefonCoz("0090 532 123 45 67"), "905321234567");
    assert.equal(telefonCoz("+49 151 23456789"), "4915123456789");
    assert.equal(telefonCoz("123"), null);
    assert.equal(telefonCoz("0532 123 45"), null);
    assert.equal(telefonYaz("905321234567"), "+90 532 123 45 67");
    assert.equal(
      whatsappBaglantisi("905321234567", "a b"),
      "https://wa.me/905321234567?text=a%20b",
    );
  });

  it("sipariş mesajı: ürün başına, renk satırı, beden sırası; sıfırlar yok", () => {
    const s = (ek: Partial<MesajSatiri>): MesajSatiri => ({
      productId: "z",
      urunAd: "Zıbın",
      tedarikciKodu: "2045",
      renkAdi: "Beyaz",
      beden: "0-3 ay",
      bedenSira: 0,
      adet: 1,
      ...ek,
    });
    const m = siparisMesaji("BASoftBaby", [
      s({ beden: "3-6 ay", bedenSira: 1, adet: 8 }),
      s({ beden: "0-3 ay", bedenSira: 0, adet: 10 }),
      s({ renkAdi: "Mavi", adet: 6 }),
      s({ renkAdi: "Mavi", beden: "6-9 ay", bedenSira: 2, adet: 0 }),
      s({ productId: "p", urunAd: "Bambu patik", tedarikciKodu: null, renkAdi: "Gri", adet: 12 }),
    ]);
    assert.equal(
      m,
      [
        "Merhaba, BASoftBaby siparişi:",
        "Bambu patik\n  Gri: 0-3 ay 12",
        "Zıbın (Kod 2045)\n  Beyaz: 0-3 ay 10 · 3-6 ay 8\n  Mavi: 0-3 ay 6",
        "Toplam 36 adet. Teşekkürler.",
      ].join("\n\n"),
    );
  });

  it("ortalama maliyet", () => {
    assert.equal(ortalamaMaliyet(10, 10000, 10, 12000), 11000);
    assert.equal(ortalamaMaliyet(0, 10000, 5, 12000), 12000);
    assert.equal(ortalamaMaliyet(-3, 10000, 5, 12000), 12000);
    assert.equal(ortalamaMaliyet(10, null, 5, 12000), 12000);
    assert.equal(ortalamaMaliyet(3, 10000, 1, 10001), 10000);
  });
});

describe("Tedarik · veritabanı", { skip: atlamaSebebi }, () => {
  const tedarikciler: string[] = [];
  before(temizle);
  after(async () => {
    const db = testDb();
    await db.supplierOrder.deleteMany({ where: { supplierId: { in: tedarikciler } } });
    await temizle();
    await db.supplier.deleteMany({ where: { id: { in: tedarikciler } } });
  });
  const anahtar = () => kimlik("anahtar-uzun").replace(/[^A-Za-z0-9_-]/g, "");

  it("mal geldi: yeni alış fiyatı ortalanıyor, tedarikçi ürüne yazılıyor", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(10);
    await db.product.update({ where: { id: productId }, data: { alisFiyatKurus: 10000 } });
    const ad = `T_Tedarik ${kimlik("t")}`;
    const r = await depoKaydet({
      anahtar: anahtar(),
      tur: "gelen",
      satirlar: [{ variantId, adet: 10 }],
      tedarikci: ad,
      alislar: [{ productId, alisKurus: 12000 }],
    });
    assert.ok(r.tamam);
    const u = await db.product.findUniqueOrThrow({
      where: { id: productId },
      select: { alisFiyatKurus: true, tedarikci: { select: { id: true, ad: true } } },
    });
    assert.equal(u.alisFiyatKurus, 11000);
    assert.equal(u.tedarikci?.ad, ad);
    tedarikciler.push(u.tedarikci!.id);
  });

  it("çıkar'da alış fiyatı değişmiyor", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(10);
    await db.product.update({ where: { id: productId }, data: { alisFiyatKurus: 10000 } });
    await depoKaydet({
      anahtar: anahtar(),
      tur: "cikar",
      sebep: "hasar",
      satirlar: [{ variantId, adet: 1 }],
      alislar: [{ productId, alisKurus: 1 }],
    });
    const u = await db.product.findUniqueOrThrow({ where: { id: productId } });
    assert.equal(u.alisFiyatKurus, 10000);
  });

  it("tedarikçi adla tekil; sipariş kaydı yalnızca dolu satırlarla", async () => {
    const db = testDb();
    const ad = `T_Tedarik ${kimlik("t")}`;
    const a = await tedarikciBulYaDaAc(`  ${ad} `);
    const b = await tedarikciBulYaDaAc(ad);
    assert.ok(a);
    assert.equal(a, b);
    tedarikciler.push(a!);
    assert.equal(await tedarikciBulYaDaAc("   "), null);
    await tedarikSiparisiYaz({
      supplierId: a,
      satirlar: [
        { variantId: "v1", adet: 3 },
        { variantId: "v2", adet: 0 },
      ],
      metin: "Merhaba",
    });
    const k = await db.supplierOrder.findFirstOrThrow({ where: { supplierId: a } });
    assert.deepEqual(k.satirlar, [{ variantId: "v1", adet: 3 }]);
  });

  it("stok kaybı: hasar/kayıp/sayım eksiği alışla; numune ayrı; fazla netleşmiyor", async () => {
    const db = testDb();
    const bas = new Date();
    const { productId, variantId } = await urunKur(20);
    await db.product.update({ where: { id: productId }, data: { alisFiyatKurus: 5000 } });
    const hareket = (sebep: string, degisim: number) =>
      db.stockMovement.create({
        data: {
          variantId,
          productId,
          urunAd: "Test",
          beden: "0-3 ay",
          renk: "mint",
          degisim,
          sonra: 0,
          sebep,
        },
      });
    await hareket("hasar", -2);
    await hareket("kayip", -1);
    await hareket("sayim", -1);
    await hareket("sayim", 3);
    await hareket("numune", -2);
    await hareket("mal-kabul", 10);
    const k = await stokKaybi(bas, new Date(Date.now() + 60_000));
    assert.equal(k.kayipAdet, 4);
    assert.equal(k.kayipKurus, 20000);
    assert.equal(k.numuneAdet, 2);
    assert.equal(k.numuneKurus, 10000);
    assert.equal(k.fazlaKurus, 15000);
  });
});
