import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { siparisKari, type KarGirdisi } from "@/server/kar";
import { komisyonCoz } from "@/server/odeme";
import { siparisKariGetir } from "@/server/siparis-kari";
import { siparisOlustur } from "@/server/siparis";
import type { SatisAyari } from "@/server/sepet";

/** Sipariş kârı (K-112). */

const GIDER = {
  kargoGiderKurus: 7500,
  paketGiderKurus: 500,
  hediyePaketGiderKurus: 300,
  iadeKargoGiderKurus: 4000,
  kartKomisyonOnbinde: 900,
  kartKomisyonSabitKurus: 0,
};
const temel = (): KarGirdisi => ({
  kdvOrani: 10,
  toplamKurus: 49980,
  iadeKurus: 0,
  odemeYontemi: "kart",
  odenenKurus: 49980,
  komisyonKurus: null,
  gonderiUcretleri: [],
  gonderiBekleniyor: true,
  hediyePaketi: false,
  iadeTalebi: 0,
  degisimTalebi: 0,
  satirlar: [{ adet: 2, iadeAdet: 0, alisFiyatKurus: 11000, alisTahmini: false }],
  gider: GIDER,
});

describe("sipariş kârı", () => {
  it("örnek: 2×249,90, bedava kargo, kart", () => {
    const k = siparisKari(temel());
    assert.equal(k.netSatisKurus, 45436);
    assert.equal(k.maliyet.kurus, 22000);
    assert.equal(k.brutKarKurus, 23436);
    assert.deepEqual([k.kargo.kurus, k.paket.kurus, k.komisyon.kurus], [7500, 500, 4498]);
    assert.equal(k.katkiKurus, 10938);
    assert.equal(k.eksikler.length, 0);
    assert.ok(k.kargo.tahmini && k.komisyon.tahmini);
  });

  it("gerçek komisyon ve gerçek kargo ücreti ortalamanın önüne geçiyor", () => {
    const k = siparisKari({ ...temel(), komisyonKurus: 1200, gonderiUcretleri: [6000] });
    assert.deepEqual([k.komisyon, k.kargo], [{ kurus: 1200, tahmini: false }, { kurus: 6000, tahmini: false }]);
  });

  it("havalede komisyon yok; taksitte vade farkı gelir", () => {
    assert.equal(siparisKari({ ...temel(), odemeYontemi: "havale", odenenKurus: null }).komisyon.kurus, 0);
    assert.equal(siparisKari({ ...temel(), odenenKurus: 53000 }).vadeFarkiKurus, 3020);
  });

  it("iade: satış düşüyor, iade edilen adedin maliyeti geri dönüyor", () => {
    const k = siparisKari({
      ...temel(),
      iadeKurus: 24990,
      satirlar: [{ adet: 2, iadeAdet: 1, alisFiyatKurus: 11000, alisTahmini: false }],
    });
    assert.equal(k.netSatisKurus, 22718);
    assert.equal(k.maliyet.kurus, 11000);
  });

  it("iade dönüş kargosu, değişimde yeniden gönderim de gider (K-114)", () => {
    const k = siparisKari({ ...temel(), iadeTalebi: 2, degisimTalebi: 1 });
    // 2 dönüş × 40 + 1 yeniden gönderim × 75
    assert.deepEqual(k.iadeKargo, { kurus: 15500, tahmini: true });
    assert.equal(k.katkiKurus, 10938 - 15500);
    const eksik = siparisKari({ ...temel(), iadeTalebi: 1, gider: { ...GIDER, iadeKargoGiderKurus: null } });
    assert.deepEqual(eksik.eksikler, ["iade/değişim kargo gideri girilmemiş"]);
    assert.equal(siparisKari(temel()).iadeKargo.kurus, 0);
  });

  it("eksik bilgi sıfır sayılıyor ama söyleniyor", () => {
    const k = siparisKari({
      ...temel(),
      hediyePaketi: true,
      satirlar: [
        { adet: 1, iadeAdet: 0, alisFiyatKurus: null, alisTahmini: false },
        { adet: 1, iadeAdet: 0, alisFiyatKurus: 11000, alisTahmini: true },
      ],
      gider: { ...GIDER, kargoGiderKurus: null, hediyePaketGiderKurus: null, kartKomisyonOnbinde: null },
    });
    assert.deepEqual(k.eksikler, [
      "1 ürünün alış fiyatı yok",
      "kargo gideri girilmemiş",
      "hediye paketi gideri girilmemiş",
      "kart komisyonu girilmemiş",
    ]);
    assert.equal(k.maliyet.tahmini, true);
    assert.equal(k.kargo.kurus, null);
  });

  it("iyzico cevabından komisyon", () => {
    assert.equal(komisyonCoz({ iyziCommissionRateAmount: "12.45", iyziCommissionFee: 0.25 }), 1270);
    assert.equal(komisyonCoz({}), undefined);
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

describe("sipariş kârı (veritabanı)", { skip: atlamaSebebi }, () => {
  let onceki: Record<string, number | null> | null = null;
  before(async () => {
    await temizle();
    onceki = await testDb().storeSetting.findUnique({
      where: { id: "tek" },
      select: { kargoGiderKurus: true, paketGiderKurus: true, hediyePaketGiderKurus: true, kartKomisyonOnbinde: true, kartKomisyonSabitKurus: true },
    });
    await testDb().storeSetting.upsert({ where: { id: "tek" }, update: GIDER, create: { id: "tek", ...GIDER } });
  });
  after(async () => {
    if (onceki) await testDb().storeSetting.update({ where: { id: "tek" }, data: onceki });
    await temizle();
  });

  it("siparişten kâr: maliyet satırdan, havale, iptal edilende yok", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(5);
    await db.product.update({ where: { id: productId }, data: { fiyatKurus: 22000, alisFiyatKurus: 10000 } });
    await sepetKur(variantId, 1);
    const s = await siparisOlustur(
      {
        adSoyad: "T",
        eposta: `${kimlik("m").toLowerCase()}@deneme.test`,
        telefon: "05001112233",
        adres: "Deneme Mahallesi No 1",
        ilce: "Kadıköy",
        il: "İstanbul",
        postaKodu: "",
        not: "",
        hediyePaketi: false,
        hediyeNotu: "",
        sozlesmeOnayi: new Date(),
      },
      AYAR,
    );
    assert.ok(s.tamam);
    const k = await siparisKariGetir(s.numara);
    // 220 → 200 KDV hariç; −100 maliyet; −75 kargo; −5 paket = 20
    assert.deepEqual([k?.netSatisKurus, k?.brutKarKurus, k?.katkiKurus], [20000, 10000, 2000]);
    await db.order.update({ where: { numara: s.numara }, data: { durum: "iptal" } });
    assert.equal(await siparisKariGetir(s.numara), undefined);
  });
});
