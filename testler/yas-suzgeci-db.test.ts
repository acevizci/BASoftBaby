import { atlamaSebebi, kimlik, temizle, testDb } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { urunleriGetir } from "@/server/katalog";

/**
 * Yaş grubu süzgecinin kategori bağı (K-80).
 *
 * Kız ve erkek ürünleri aynı bedenleri kullanıyor, bir beden de tek bir
 * gruba bağlanabiliyor: "Erkek Çocuk" süzgeci kız ürünlerini de getiriyor,
 * "Kız Çocuk" süzgeci hiçbir şey getirmiyordu.
 */

type Kurulum = { erkekUrun: string; kizUrun: string; erkekGrup: string; kizGrup: string; bosGrup: string };

async function kur(): Promise<Kurulum> {
  const db = testDb();
  const erkekKat = kimlik("kat");
  const kizKat = kimlik("kat");
  for (const id of [erkekKat, kizKat]) {
    await db.category.create({ data: { id, slug: id.toLowerCase(), ad: id, sira: 999 } });
  }

  // Ortak beden erkek grubuna bağlı; kız grubunun bedeni yok.
  const erkekGrup = kimlik("yas").toLowerCase();
  const kizGrup = kimlik("yas").toLowerCase();
  const bosGrup = kimlik("yas").toLowerCase();
  const beden = kimlik("beden");
  await db.size.create({ data: { id: beden, ad: beden, boy: "", kilo: "", sira: 999, yasKodu: erkekGrup } });
  await db.ageGroup.createMany({
    data: [
      { id: `T_${erkekGrup}`, kod: erkekGrup, ad: "Erkek Çocuk", aciklama: "2-14 Yaş", categoryId: erkekKat },
      { id: `T_${kizGrup}`, kod: kizGrup, ad: "Kız Çocuk", aciklama: "2-14 Yaş", categoryId: kizKat },
      { id: `T_${bosGrup}`, kod: bosGrup, ad: "Boş", aciklama: "" },
    ],
  });

  const urun = async (categoryId: string) => {
    const id = kimlik("urun");
    await db.product.create({
      data: {
        id,
        slug: id.toLowerCase(),
        ad: id,
        ozet: "test",
        categoryId,
        fiyatKurus: 10000,
        kumasIcerigi: "test",
        yikamaTalimati: "test",
        aktif: true,
        variants: { create: { id: kimlik("var"), beden, renk: "mint", stok: 3, sku: kimlik("sku") } },
      },
    });
    return id.toLowerCase();
  };
  return { erkekUrun: await urun(erkekKat), kizUrun: await urun(kizKat), erkekGrup, kizGrup, bosGrup };
}

const sluglar = async (yas: string) => (await urunleriGetir({ yas })).map((u) => u.slug);

describe("yaş grubu süzgeci (veritabanı)", { skip: atlamaSebebi }, () => {
  let k: Kurulum;
  before(async () => {
    await temizle();
    k = await kur();
  });
  after(temizle);

  it("kategoriye bağlı grup öteki kategorinin ürününü getirmiyor", async () => {
    const liste = await sluglar(k.erkekGrup);
    assert.ok(liste.includes(k.erkekUrun));
    assert.ok(!liste.includes(k.kizUrun), "erkek süzgecinde kız ürünü çıkmamalı");
  });

  it("bedeni olmayan grup kategorisine göre süzüyor", async () => {
    const liste = await sluglar(k.kizGrup);
    assert.ok(liste.includes(k.kizUrun));
    assert.ok(!liste.includes(k.erkekUrun));
  });

  it("ne bedeni ne kategorisi olan grup hiçbir şey getirmiyor — bütün kataloğu değil", async () => {
    assert.deepEqual(await sluglar(k.bosGrup), []);
    assert.deepEqual(await sluglar("boyle-bir-grup-yok"), []);
  });
});
