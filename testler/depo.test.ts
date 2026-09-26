import "./hazirlik";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { atlamaSebebi, kimlik, temizle, testDb, urunKur } from "./veritabani";
import {
  anahtarGecerli,
  kodTemizle,
  listeyeEkle,
  satirlariBirlestir,
  type DepoBedeni,
} from "@/ui/depo-bicim";
import { barkodCoz, barkodOgret, depoKaydet } from "@/server/depo";

/** Depo ekranı: barkod öğrenme, mal geldi, çıkar (K-176). */

const bedenOrnek = (ek: Partial<DepoBedeni> = {}): DepoBedeni => ({
  variantId: "v1",
  productId: "p1",
  slug: "zibin",
  urunAd: "Zıbın",
  beden: "0-3 ay",
  renk: "beyaz",
  renkAdi: "Beyaz",
  sku: "Z-1",
  stok: 5,
  carpan: 1,
  ayrilan: 0,
  sure: "",
  alisKurus: null,
  ...ek,
});

describe("Depo · saf parçalar", () => {
  it("kod temizleme: boşluk ve görünmez karakterler gidiyor", () => {
    assert.equal(kodTemizle(" 8690 000 111 222\n"), "8690000111222");
    assert.equal(kodTemizle("​869\t1"), "8691");
    assert.equal(kodTemizle("x".repeat(80)).length, 64);
  });

  it("anahtar biçimi", () => {
    assert.ok(anahtarGecerli("3f2a1c9e-7b6d-4e1a-9c8b-0a1b2c3d4e5f"));
    assert.ok(!anahtarGecerli("kisa"));
    assert.ok(!anahtarGecerli("boşluk var ama uzun"));
  });

  it("satırlar birleşiyor, geçersiz adet atılıyor", () => {
    assert.deepEqual(
      satirlariBirlestir([
        { variantId: "a", adet: 2 },
        { variantId: "b", adet: 0 },
        { variantId: "a", adet: 3 },
        { variantId: "c", adet: 1.5 },
        { variantId: "", adet: 4 },
      ]),
      [{ variantId: "a", adet: 5 }],
    );
  });

  it("listeye ekleme: aynı beden artıyor ve başa geçiyor; paket çarpanı", () => {
    let l = listeyeEkle([], bedenOrnek(), 1);
    l = listeyeEkle(l, bedenOrnek({ variantId: "v2", beden: "3-6 ay" }), 1);
    l = listeyeEkle(l, bedenOrnek({ stok: 7 }), 3);
    assert.deepEqual(
      l.map((s) => [s.variantId, s.adet, s.stok]),
      [
        ["v1", 4, 7],
        ["v2", 1, 5],
      ],
    );
  });
});

describe("Depo · veritabanı", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  const anahtar = () => kimlik("anahtar-uzun").replace(/[^A-Za-z0-9_-]/g, "");

  it("tanınmayan barkod öğretilince tanınıyor; bizim etiketimiz ve SKU da", async () => {
    const db = testDb();
    const { variantId } = await urunKur(5);
    const kod = `869${Date.now()}`;
    assert.equal((await barkodCoz(kod)).tur, "yok");

    const o = await barkodOgret({ kod: ` ${kod} `, variantId });
    assert.ok(o.tamam);
    const c = await barkodCoz(kod);
    assert.equal(c.tur, "tek");
    assert.equal(c.tur === "tek" && c.beden.variantId, variantId);

    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    const etiket = await barkodCoz(`B${v.barkodNo}`);
    assert.equal(etiket.tur === "tek" && etiket.beden.variantId, variantId);
    const sku = await barkodCoz(v.sku.toLowerCase());
    assert.equal(sku.tur === "tek" && sku.beden.variantId, variantId);
  });

  it("aynı barkod iki bedende: seçtiriliyor; 'hep bu' deyince tek kalıyor", async () => {
    const a = await urunKur(1);
    const b = await urunKur(1);
    const kod = `ORTAK${Date.now()}`;
    await barkodOgret({ kod, variantId: a.variantId });
    await barkodOgret({ kod, variantId: b.variantId, carpan: 3 });
    const c = await barkodCoz(kod);
    assert.equal(c.tur, "coklu");
    assert.equal(c.tur === "coklu" && c.bedenler.length, 2);
    const paket =
      c.tur === "coklu" ? c.bedenler.find((x) => x.variantId === b.variantId) : undefined;
    assert.equal(paket?.carpan, 3);

    await barkodOgret({ kod, variantId: b.variantId, carpan: 3, tekBag: true });
    const t = await barkodCoz(kod);
    assert.equal(t.tur === "tek" && t.beden.variantId, b.variantId);
  });

  it("geçersiz öğretme: kısa kod, çarpan, olmayan beden", async () => {
    const { variantId } = await urunKur(1);
    assert.deepEqual(await barkodOgret({ kod: "12", variantId }), { tamam: false, sebep: "kod" });
    assert.deepEqual(await barkodOgret({ kod: "12345", variantId, carpan: 0 }), {
      tamam: false,
      sebep: "carpan",
    });
    assert.deepEqual(await barkodOgret({ kod: "12345", variantId: "yok" }), {
      tamam: false,
      sebep: "beden",
    });
  });

  it("beden silinince barkod bağı da siliniyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(1);
    const kod = `SIL${Date.now()}`;
    await barkodOgret({ kod, variantId });
    await db.productVariant.delete({ where: { id: variantId } });
    assert.equal(await db.variantBarcode.count({ where: { kod } }), 0);
    assert.equal((await barkodCoz(kod)).tur, "yok");
  });

  it("mal geldi: stok artıyor, hareket yazılıyor; aynı anahtar ikinci kez yazılmıyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(3);
    const k = anahtar();
    const kayit = {
      anahtar: k,
      tur: "gelen" as const,
      satirlar: [
        { variantId, adet: 4 },
        { variantId, adet: 2 },
      ],
      tedarikci: "Pamuk AŞ",
      irsaliye: "A-7",
    };
    const r = await depoKaydet(kayit, { id: "y1", adSoyad: "Depo" });
    assert.ok(r.tamam);
    assert.deepEqual(r.tamam && [r.sonuc.kalem, r.sonuc.adet], [1, 6]);
    assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stok, 9);
    const h = await db.stockMovement.findFirstOrThrow({ where: { variantId } });
    assert.deepEqual(
      [h.sebep, h.degisim, h.sonra, h.not],
      ["mal-kabul", 6, 9, "Pamuk AŞ · İrsaliye A-7"],
    );

    const ikinci = await depoKaydet(kayit);
    assert.ok(ikinci.tamam && ikinci.sonuc.tekrar);
    assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stok, 9);
  });

  it("aynı anahtar aynı anda iki kez: stok bir kez artıyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(0);
    const kayit = { anahtar: anahtar(), tur: "gelen" as const, satirlar: [{ variantId, adet: 5 }] };
    const [a, b] = await Promise.all([depoKaydet(kayit), depoKaydet(kayit)]);
    assert.ok(a.tamam && b.tamam);
    assert.equal([a, b].filter((x) => x.tamam && x.sonuc.tekrar).length, 1);
    assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stok, 5);
    assert.equal(await db.stockMovement.count({ where: { variantId } }), 1);
  });

  it("çıkar: sebep zorunlu, stok eksiye inmiyor, yetmeyen satır ayrı", async () => {
    const db = testDb();
    const a = await urunKur(3);
    const b = await urunKur(1);
    assert.deepEqual(
      await depoKaydet({
        anahtar: anahtar(),
        tur: "cikar",
        satirlar: [{ variantId: a.variantId, adet: 1 }],
      }),
      { tamam: false, hata: "sebep" },
    );
    const r = await depoKaydet({
      anahtar: anahtar(),
      tur: "cikar",
      sebep: "hasar",
      not: "yırtık",
      satirlar: [
        { variantId: a.variantId, adet: 2 },
        { variantId: b.variantId, adet: 2 },
      ],
    });
    assert.ok(r.tamam);
    assert.equal(r.tamam && r.sonuc.kalem, 1);
    assert.deepEqual(r.tamam && r.sonuc.yetmeyen.map((y) => [y.variantId, y.istenen, y.stok]), [
      [b.variantId, 2, 1],
    ]);
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: a.variantId } })).stok,
      1,
    );
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: b.variantId } })).stok,
      1,
    );
    const h = await db.stockMovement.findFirstOrThrow({ where: { variantId: a.variantId } });
    assert.deepEqual([h.sebep, h.degisim, h.sonra, h.not], ["hasar", -2, 1, "yırtık"]);
  });

  it("geçersiz kayıtlar", async () => {
    const { variantId } = await urunKur(1);
    assert.deepEqual(
      await depoKaydet({ anahtar: "x", tur: "gelen", satirlar: [{ variantId, adet: 1 }] }),
      {
        tamam: false,
        hata: "anahtar",
      },
    );
    assert.deepEqual(await depoKaydet({ anahtar: anahtar(), tur: "gelen", satirlar: [] }), {
      tamam: false,
      hata: "bos",
    });
    assert.deepEqual(
      await depoKaydet({
        anahtar: anahtar(),
        tur: "cikar",
        sebep: "sil-her-seyi",
        satirlar: [{ variantId, adet: 1 }],
      }),
      { tamam: false, hata: "sebep" },
    );
  });

  it("gelen: üretici barkodu olmayanlar etiket listesinde", async () => {
    const a = await urunKur(0);
    const b = await urunKur(0);
    await barkodOgret({ kod: `ETK${Date.now()}`, variantId: a.variantId });
    const r = await depoKaydet({
      anahtar: anahtar(),
      tur: "gelen",
      satirlar: [
        { variantId: a.variantId, adet: 1 },
        { variantId: b.variantId, adet: 1 },
      ],
    });
    assert.ok(r.tamam);
    assert.deepEqual(r.tamam && r.sonuc.etiketsiz?.map((e) => e.slug), [b.productId.toLowerCase()]);
  });
});
