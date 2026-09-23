import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { pencereCoz, satmayanCsv, satmayanlar, satmiyorMu } from "@/server/satmayan";
import { malKabulYaz } from "@/server/mal-kabul";
import { satirlariCoz } from "@/server/toplu-urun";
import { siparisOlustur } from "@/server/siparis";
import type { SatisAyari } from "@/server/sepet";

/** Satmayan stok ve alış fiyatı (K-108). */

const GUN = 24 * 60 * 60 * 1000;
const simdi = new Date("2026-09-30T12:00:00Z");
const sinir = new Date(simdi.getTime() - 90 * GUN);
const once = (g: number) => new Date(simdi.getTime() - g * GUN);

describe("satmıyor mu", () => {
  const eski = { stok: 5, sonSatis: null, sonGiris: null, urunAcildi: once(200) };
  it("eski, stoklu, hiç satmamış: evet", () => assert.equal(satmiyorMu(eski, sinir), true));
  it("pencerede satmış, mal gelmiş ya da ürün yeni: hayır", () => {
    assert.equal(satmiyorMu({ ...eski, sonSatis: once(10) }, sinir), false);
    assert.equal(satmiyorMu({ ...eski, sonGiris: once(10) }, sinir), false);
    assert.equal(satmiyorMu({ ...eski, urunAcildi: once(30) }, sinir), false);
    assert.equal(satmiyorMu({ ...eski, stok: 0 }, sinir), false);
  });
  it("son satış pencereden eskiyse: evet", () => assert.equal(satmiyorMu({ ...eski, sonSatis: once(120) }, sinir), true));
  it("pencere yalnızca 60/90/180", () => {
    assert.equal(pencereCoz("60"), 60);
    assert.equal(pencereCoz("7"), 90);
  });
});

describe("toplu yüklemede alış fiyatı", () => {
  it("'Alış fiyatı' ve 'Maliyet' başlığı tanınıyor; okunamayan hata", () => {
    const B = ["0-3 ay"];
    const R = [{ kod: "mint", ad: "Nane", palet: { zemin: "", c1: "", c2: "", c3: "" } }];
    const a = satirlariCoz(["Ürün adı", "Kategori", "Fiyat", "Alış fiyatı", "Beden", "Renk", "Stok"], [["Z", "k", "249,90", "120,50", "0-3 ay", "Nane", "1"]], B, R);
    assert.equal(a.satirlar[0].alisFiyatKurus, 12050);
    const b = satirlariCoz(["Ürün adı", "Kategori", "Maliyet", "Beden", "Renk", "Stok"], [["Z", "k", "abc", "0-3 ay", "Nane", "1"]], B, R);
    assert.equal(b.hatalar[0]?.sutun, "Alış fiyatı");
  });
});

const AYAR: SatisAyari = {
  kargoKurus: 0,
  bedavaKargoEsigi: 0,
  havaleBilgisi: "Test",
  havaleSaat: 72,
  havaleHatirlatmaSaat: 24,
  kdvOrani: 10,
  varsayilanTasiyici: "yurtici",
};

describe("satmayan stok (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("eski ve satmayan listede, alış fiyatıyla; yeni gelen ve satan değil", async () => {
    const db = testDb();
    const olu = await urunKur(4);
    const satan = await urunKur(4);
    const yeniGelen = await urunKur(4);
    const eski = new Date(Date.now() - 200 * GUN);
    for (const u of [olu, satan, yeniGelen]) {
      await db.product.update({ where: { id: u.productId }, data: { olusturuldu: eski } });
    }
    await db.product.update({ where: { id: olu.productId }, data: { alisFiyatKurus: 3000 } });
    await sepetKur(satan.variantId, 1);
    assert.ok(
      (
        await siparisOlustur(
          {
            adSoyad: "T",
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
        )
      ).tamam,
    );
    await malKabulYaz([{ id: yeniGelen.variantId, adet: 2 }], "");

    const r = await satmayanlar(90);
    const bizim = r.satirlar.filter((s) => [olu, satan, yeniGelen].some((u) => u.variantId === s.variantId));
    assert.deepEqual(
      bizim.map((s) => [s.variantId, s.stok, s.birimKurus, s.maliyetMi]),
      [[olu.variantId, 4, 3000, true]],
    );
    assert.match(satmayanCsv({ ...r, satirlar: bizim }, { mint: "Nane" }), /"Nane";"4";"hiç";"";"alış";"30,00";"120,00"/);
  });
});
