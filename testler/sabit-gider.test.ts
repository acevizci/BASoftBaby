import { atlamaSebebi, temizle, testDb } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ayAdi,
  ayAraligi,
  ayEkle,
  ayGecerliMi,
  aySonGunu,
  aydaGecerliMi,
  aylikKar,
  ayinGiderleri,
  buAy,
  tutarCoz,
} from "@/server/sabit-gider";

/** Sabit giderler ve aylık net kâr (K-115). */

describe("ay hesapları", () => {
  it("Türkiye saatiyle ay; yıl dönümü", () => {
    assert.equal(buAy(new Date("2026-09-30T21:30:00Z")), "2026-10"); // TR 1 Ekim 00:30
    assert.equal(ayEkle("2026-12", 1), "2027-01");
    assert.equal(ayEkle("2026-01", -1), "2025-12");
    assert.equal(aySonGunu("2028-02"), "2028-02-29");
    assert.equal(ayAdi("2026-09"), "Eylül 2026");
    const { baslangic, bitis } = ayAraligi("2026-09");
    assert.equal(baslangic.toISOString(), "2026-08-31T21:00:00.000Z");
    assert.equal(bitis.toISOString(), "2026-09-30T21:00:00.000Z");
    assert.equal(ayGecerliMi("2026-13"), false);
  });

  it("Türkçe tutar: nokta binlik, virgül ondalık", () => {
    assert.deepEqual(
      ["12.500", "12.500,75", "1.250.000", "2500", "1500,5", "1500.50", "12,5", "12.5", "₺ 3.000", "abc", "", "1.2.3"].map(tutarCoz),
      [1250000, 1250075, 125000000, 250000, 150050, 150050, 1250, 1250, 300000, null, null, null],
    );
  });

  it("tekrarlı gider başladığı aydan durdurulana kadar; tek seferlik yalnızca kendi ayında", () => {
    const kira = { ay: "2026-03", bitisAy: "2026-08", tekrarli: true };
    assert.deepEqual(
      ["2026-02", "2026-03", "2026-08", "2026-09"].map((a) => aydaGecerliMi(kira, a)),
      [false, true, true, false],
    );
    assert.equal(aydaGecerliMi({ ay: "2026-05", bitisAy: null, tekrarli: true }, "2027-01"), true);
    assert.equal(aydaGecerliMi({ ay: "2026-05", bitisAy: null, tekrarli: false }, "2026-06"), false);
  });
});

describe("aylık kâr (veritabanı)", { skip: atlamaSebebi }, () => {
  const sil = async () => {
    await testDb().expense.deleteMany({ where: { aciklama: { startsWith: "T_" } } });
    await temizle();
  };
  before(sil);
  after(sil);

  it("ayın giderleri ve net kâr = katkı payı − sabit gider", async () => {
    const db = testDb();
    // Uzak bir ay: başka testlerin siparişleri karışmasın.
    await db.expense.createMany({
      data: [
        { ay: "2019-01", tekrarli: true, kategori: "kira", aciklama: "T_kira", tutarKurus: 1000000 },
        { ay: "2019-03", tekrarli: false, kategori: "reklam", aciklama: "T_reklam", tutarKurus: 250000 },
        { ay: "2019-02", tekrarli: true, bitisAy: "2019-02", kategori: "diger", aciklama: "T_eski", tutarKurus: 5000 },
      ],
    });
    const mart = (await ayinGiderleri("2019-03")).filter((g) => g.aciklama.startsWith("T_"));
    assert.deepEqual(mart.map((g) => g.aciklama).sort(), ["T_kira", "T_reklam"]);

    const a = await aylikKar("2019-03", { onceki: false });
    assert.equal(a.kar.siparis, 0);
    assert.equal(a.sabitKurus, 1250000);
    assert.equal(a.netKurus, -1250000);
    assert.equal(a.netMarjYuzde, null);
  });
});
