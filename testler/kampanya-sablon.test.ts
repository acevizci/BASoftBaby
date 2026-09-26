import "./hazirlik";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { atlamaSebebi, testDb } from "./veritabani";
import {
  adimHatasi,
  adOnerisi,
  BOS_TASLAK,
  calismaDurumu,
  durumaCevir,
  hataAdimi,
  kampanyaOzeti,
  SABLONLAR,
  taslagaCevir,
  tarihGirdisi,
  type SihirbazDurumu,
} from "@/ui/kampanya-bicim";
import { sablonuCevir } from "@/server/kampanya-sablon";

/** Hazır kampanyalar ve kampanya sihirbazı (K-172). */

const durum = (ek: Partial<SihirbazDurumu> = {}): SihirbazDurumu => ({
  ...durumaCevir(BOS_TASLAK),
  ...ek,
});

describe("Kampanya sihirbazı", () => {
  it("hazır kampanyalar sihirbaz kutularına gidip aynen dönüyor", () => {
    for (const s of SABLONLAR) {
      const t = { ...BOS_TASLAK, ...s.taslak };
      const geri = taslagaCevir(durumaCevir(t));
      for (const alan of [
        "tip",
        "deger",
        "kademeler",
        "kuponKodu",
        "enAzSepetKurus",
        "uyelereOzel",
        "ilkSiparis",
        "kisiBasiSinir",
      ] as const) {
        assert.deepEqual(geri[alan], t[alan], `${s.anahtar}.${alan}`);
      }
      if (t.tip === "al-ode" || t.tip === "nci-urun") assert.equal(geri.alAdet, t.alAdet);
      if (t.tip === "al-ode") assert.equal(geri.odeAdet, t.odeAdet);
      // Hazır kampanyaların hiçbir adımı hatalı değil.
      for (let i = 0; i < 6; i++) assert.equal(adimHatasi(durumaCevir(t), i), null, s.anahtar);
    }
  });

  it("tarih kutusu İstanbul saatiyle gidip geliyor", () => {
    const iso = "2026-10-01T11:30:00.000Z"; // İstanbul 14:30
    assert.equal(tarihGirdisi(iso), "2026-10-01T14:30");
    const t = taslagaCevir(durum({ zaman: "aralik", baslangic: "2026-10-01T14:30" }));
    assert.equal(t.baslangic, iso);
  });

  it("tutarlar Türkçe yazımla okunuyor", () => {
    const t = taslagaCevir(
      durum({
        tip: "kademeli",
        kademeler: [
          { esik: "1.000", indirim: "150" },
          { esik: "500", indirim: "49,90" },
        ],
      }),
    );
    // Basamaklar sıralanıyor
    assert.deepEqual(t.kademeler, [
      { esikKurus: 50000, indirimKurus: 4990 },
      { esikKurus: 100000, indirimKurus: 15000 },
    ]);
  });

  it("adım hataları", () => {
    assert.match(adimHatasi(durum({ tip: "yuzde", yuzde: "" }), 1)!, /yüzde/i);
    assert.match(adimHatasi(durum({ tip: "yuzde", yuzde: "120" }), 1)!, /yüzde/i);
    assert.equal(adimHatasi(durum({ tip: "yuzde", yuzde: "20" }), 1), null);
    assert.ok(adimHatasi(durum({ tip: "al-ode", alAdet: "3", odeAdet: "3" }), 1));
    assert.ok(adimHatasi(durum({ tip: "tutar", tutar: "abc" }), 1));
    assert.ok(
      adimHatasi(durum({ tip: "kademeli", kademeler: [{ esik: "50", indirim: "50" }] }), 1),
    );
    assert.ok(
      adimHatasi(
        durum({
          tip: "kademeli",
          kademeler: [
            { esik: "500", indirim: "50" },
            { esik: "500,00", indirim: "60" },
          ],
        }),
        1,
      ),
    );
    assert.ok(adimHatasi(durum({ kapsam: "urun", urunIdleri: [] }), 2));
    assert.ok(adimHatasi(durum({ kuponVar: true, kuponKodu: "İNDİRİM" }), 3));
    assert.equal(adimHatasi(durum({ kuponVar: true, kuponKodu: "yaz25" }), 3), null);
    assert.ok(adimHatasi(durum({ enFazlaKullanim: "0" }), 3));
    assert.ok(adimHatasi(durum({ zaman: "aralik" }), 4));
    assert.ok(
      adimHatasi(
        durum({ zaman: "aralik", baslangic: "2026-10-02T10:00", bitis: "2026-10-01T10:00" }),
        4,
      ),
    );
    assert.ok(adimHatasi(durum({ ad: "  " }), 5));
  });

  it("herkese açık kampanyada kişi başı sınır gönderilmiyor", () => {
    const t = taslagaCevir(durum({ uyelik: "herkes", kisiBasiSinir: "3" }));
    assert.equal(t.kisiBasiSinir, null);
    assert.equal(t.uyelereOzel, false);
  });

  it("özet ve ad önerisi", () => {
    const t = taslagaCevir(
      durum({ tip: "yuzde", yuzde: "10", enAzSepet: "750", kuponVar: true, kuponKodu: "YAZ" }),
    );
    assert.equal(adOnerisi(t), "750 ₺ üzeri %10");
    const ozet = kampanyaOzeti(t).join(" ");
    assert.match(ozet, /Bütün ürünlerde %10 indirim/);
    assert.match(ozet, /YAZ kodunu/);
    assert.match(ozet, /en az 750,00 ₺/);
  });

  it("çalışma durumu", () => {
    const simdi = new Date("2026-10-01T12:00:00Z");
    const once = new Date("2026-09-30T12:00:00Z");
    const sonra = new Date("2026-10-02T12:00:00Z");
    assert.equal(calismaDurumu({ aktif: false, baslangic: null, bitis: null }, simdi), "kapali");
    assert.equal(calismaDurumu({ aktif: true, baslangic: null, bitis: once }, simdi), "bitti");
    assert.equal(calismaDurumu({ aktif: true, baslangic: sonra, bitis: null }, simdi), "bekliyor");
    assert.equal(calismaDurumu({ aktif: true, baslangic: once, bitis: sonra }, simdi), "acik");
    const sinirli = { aktif: true, baslangic: null, bitis: null, enFazlaKullanim: 100 };
    assert.equal(calismaDurumu({ ...sinirli, kullanim: 100 }, simdi), "doldu");
    assert.equal(calismaDurumu({ ...sinirli, kullanim: 99 }, simdi), "acik");
  });

  it("bitişi geçmiş kampanya açık kaydedilmiyor, kapalı kaydediliyor", () => {
    const simdi = new Date("2026-10-01T12:00:00Z");
    const gecmis = { zaman: "aralik" as const, bitis: "2026-10-01T10:00" }; // İstanbul, 3 saat önce
    assert.match(adimHatasi(durum({ ...gecmis, aktif: true }), 4, simdi)!, /geçmişte/);
    assert.equal(adimHatasi(durum({ ...gecmis, aktif: false }), 4, simdi), null);
  });

  it("sunucu hatası ilgili adımı açıyor", () => {
    assert.equal(hataAdimi("kupon"), 3);
    assert.equal(hataAdimi("al-ode"), 1);
    assert.equal(hataAdimi("urun"), 2);
    assert.equal(hataAdimi("gecmis"), 4);
    assert.equal(hataAdimi("ad"), 5);
  });

  it("kapsamlı ücretsiz kargo cümlesi", () => {
    const t = taslagaCevir(durum({ tip: "kargo", kapsam: "kategori", kategoriIdleri: ["z"] }));
    const [ilk] = kampanyaOzeti(t, { kategori: new Map([["z", "Zıbın"]]), urun: new Map() });
    assert.equal(ilk, "Sepette Zıbın kategorisinden en az biri varsa ücretsiz kargo.");
  });
});

describe("Hazır kampanya aç/kapat (veritabanı)", { skip: atlamaSebebi }, () => {
  const KODLAR = ["KARGOBEDAVA", "HOSGELDIN10", "T_FLAS"];
  const temizle = () =>
    testDb().campaign.deleteMany({
      where: { OR: [{ sablon: { not: null } }, { kuponKodu: { in: KODLAR } }] },
    });
  before(temizle);
  after(temizle);

  it("ilk açılış kuruyor, sonra aynı kaydı açıp kapatıyor", async () => {
    const db = testDb();
    assert.equal(await sablonuCevir("kargo-kuponu"), "acildi");
    const k = await db.campaign.findUniqueOrThrow({ where: { sablon: "kargo-kuponu" } });
    assert.equal(k.aktif, true);
    assert.equal(k.tip, "kargo");
    assert.equal(k.kuponKodu, "KARGOBEDAVA");

    // Düzenlenen değer korunuyor
    await db.campaign.update({ where: { id: k.id }, data: { enAzSepetKurus: 30000 } });
    assert.equal(await sablonuCevir("kargo-kuponu"), "kapatildi");
    assert.equal(await sablonuCevir("kargo-kuponu"), "acildi");
    const son = await db.campaign.findUniqueOrThrow({ where: { id: k.id } });
    assert.equal(son.aktif, true);
    assert.equal(son.enAzSepetKurus, 30000);
    assert.equal(await db.campaign.count({ where: { sablon: "kargo-kuponu" } }), 1);
  });

  it("süresi dolmuş hazır kampanya yeniden açılıyor", async () => {
    const db = testDb();
    await db.campaign.update({
      where: { sablon: "kargo-kuponu" },
      data: { aktif: true, bitis: new Date(Date.now() - 60_000) },
    });
    assert.equal(await sablonuCevir("kargo-kuponu"), "acildi");
    const k = await db.campaign.findUniqueOrThrow({ where: { sablon: "kargo-kuponu" } });
    assert.equal(k.bitis, null);
    assert.equal(k.aktif, true);
  });

  it("kupon kodu başka kampanyada varsa kurmuyor", async () => {
    const db = testDb();
    await db.campaign.create({
      data: { ad: "Elle", tip: "yuzde", deger: 5, kapsam: "tumu", kuponKodu: "HOSGELDIN10" },
    });
    assert.equal(await sablonuCevir("hosgeldin"), "kupon");
    assert.equal(await db.campaign.count({ where: { sablon: "hosgeldin" } }), 0);
  });

  it("flaş her açılışta şimdiden 24 saat", async () => {
    const db = testDb();
    // Kuponlu kurulu: öteki testlerin sepetine karışmasın.
    await db.campaign.create({
      data: {
        sablon: "flas",
        ad: "Flaş",
        tip: "yuzde",
        deger: 20,
        kapsam: "tumu",
        kuponKodu: "T_FLAS",
        aktif: false,
      },
    });
    const simdi = new Date("2026-10-01T09:00:00Z");
    assert.equal(await sablonuCevir("flas", simdi), "acildi");
    const k = await db.campaign.findUniqueOrThrow({ where: { sablon: "flas" } });
    assert.equal(k.baslangic?.toISOString(), simdi.toISOString());
    assert.equal(k.bitis?.toISOString(), "2026-10-02T09:00:00.000Z");
  });

  it("bilinmeyen şablon", async () => {
    assert.equal(await sablonuCevir("yok-boyle"), "bulunamadi");
  });
});
