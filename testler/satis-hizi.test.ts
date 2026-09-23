import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  gunYaz,
  hizHesapla,
  satisHizlari,
  siparisListesi,
  siparisOnerisi,
  stoksuzGun,
} from "@/server/satis-hizi";
import { siparisOlustur, type SiparisGirdisi } from "@/server/siparis";
import type { SatisAyari } from "@/server/sepet";

/** Satış hızı ve sipariş listesi (K-106). */

const GUN = 24 * 60 * 60 * 1000;
const son = new Date("2026-09-30T12:00:00Z");
const bas = new Date(son.getTime() - 30 * GUN);
const once = (gun: number) => new Date(son.getTime() - gun * GUN);

describe("stoksuz gün", () => {
  it("hareket yoksa: stok varsa sıfır, yoksa bütün pencere", () => {
    assert.equal(stoksuzGun(5, [], bas, son), 0);
    assert.equal(stoksuzGun(0, [], bas, son), 30);
  });

  it("10 gün önce tükendi, 4 gün önce 20 geldi: 6 gün stoksuz", () => {
    const h = [
      { zaman: once(10), degisim: -1 }, // son adet satıldı → 0
      { zaman: once(4), degisim: 20 }, // mal kabulü → 20
    ];
    assert.equal(stoksuzGun(20, h, bas, son), 6);
  });

  it("pencere dışındaki hareketler sayılmıyor", () => {
    assert.equal(stoksuzGun(3, [{ zaman: once(40), degisim: 3 }], bas, son), 0);
  });
});

describe("hız ve öneri", () => {
  it("stoksuz günler hıza katılmıyor", () => {
    // 20 günde 40 satış (10 gün stoksuz): günde 2, 6 adet 3 gün yeter.
    const h = hizHesapla(40, 6, 10);
    assert.equal(h.gunluk, 2);
    assert.equal(h.kacGun, 3);
    assert.equal(gunYaz(h), "~3 gün");
  });

  it("az veride gün yazılmıyor ama öneri hesaplanıyor", () => {
    const h = hizHesapla(2, 0, 0);
    assert.equal(h.azVeri, true);
    assert.equal(h.kacGun, null);
    assert.equal(gunYaz(h), "az veri");
    assert.equal(siparisOnerisi(h, 0, 0, 30), 2);
    assert.equal(gunYaz(hizHesapla(0, 5, 0)), "30 günde satış yok");
  });

  it("öneri: hedef günlük ihtiyaç + haber bekleyen − stok, eksiye düşmüyor", () => {
    const h = hizHesapla(60, 10, 0); // günde 2
    assert.equal(siparisOnerisi(h, 10, 3, 30), 60 + 3 - 10);
    assert.equal(siparisOnerisi(h, 500, 0, 30), 0);
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
const girdi = (): SiparisGirdisi => ({
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
});

describe("satış hızı (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("iptal satış sayılmıyor; sipariş listesi tükeneni ve haber bekleyeni öneriyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(10);
    for (const adet of [3, 2, 4]) {
      await sepetKur(variantId, adet);
      assert.ok((await siparisOlustur(girdi(), AYAR)).tamam);
    }
    await sepetKur(variantId, 1);
    const iptal = await siparisOlustur(girdi(), AYAR);
    assert.ok(iptal.tamam);
    await db.order.update({ where: { numara: iptal.numara }, data: { durum: "iptal" } });

    const hiz = (await satisHizlari([variantId])).get(variantId);
    assert.equal(hiz?.satilan, 9);
    assert.equal(hiz?.stok, 0);

    // Hiç satmamış ama iki kişi bekliyor.
    const bekleyen = await urunKur(0);
    await db.stockAlert.createMany({
      data: [
        { variantId: bekleyen.variantId, eposta: "a@deneme.test" },
        { variantId: bekleyen.variantId, eposta: "b@deneme.test" },
      ],
    });

    const liste = await siparisListesi(30);
    const bizim = liste.filter((s) => [variantId, bekleyen.variantId].includes(s.variantId));
    assert.deepEqual(
      bizim.map((s) => [s.variantId, s.oneri, s.bekleyen]),
      [
        [variantId, 9, 0],
        [bekleyen.variantId, 2, 2],
      ].sort((a, b) => (a[0] === variantId ? -1 : 1)),
    );
    await db.stockAlert.deleteMany({ where: { variantId: bekleyen.variantId } });
  });
});
