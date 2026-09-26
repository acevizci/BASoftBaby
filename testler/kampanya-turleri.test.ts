import "./hazirlik";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { atlamaSebebi, kimlik, ON_EK, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import {
  enIyiKampanya,
  gecerliKampanyalar,
  indirimiDagit,
  kademeIndirimi,
  kampanyaIndirimi,
  kuponEngeli,
  nciUrunIndirimi,
  type IndirimSatiri,
  type KampanyaKaydi,
} from "@/server/kampanya";
import { siparisOlustur } from "@/server/siparis";
import { talebiSonuclandir } from "@/server/talep";
import { cerezAyarla, cerezleriTemizle } from "./sahte-headers";
import { KUPON_CEREZI } from "@/server/kampanya";
import { sepetiHesapla, type SatisAyari } from "@/server/sepet";

/** Popüler kampanya türleri (K-170). */

const k = (ek: Partial<KampanyaKaydi>): KampanyaKaydi => ({
  id: "k",
  ad: "K",
  tip: "yuzde",
  deger: 0,
  kapsam: "tumu",
  categoryId: null,
  productId: null,
  kuponKodu: null,
  enAzSepetKurus: 0,
  ...ek,
});

const satir = (birim: number, adet: number, productId = "a"): IndirimSatiri => ({
  productId,
  categoryId: "kat",
  araToplamKurus: birim * adet,
  adet,
});

describe("kampanya türleri", () => {
  it("2. ürüne %50: çiftlerde ucuz olana", () => {
    const iki = k({ tip: "nci-urun", alAdet: 2, deger: 50 });
    assert.equal(nciUrunIndirimi(iki, [satir(10000, 1), satir(6000, 1, "b")]), 3000);
    // 3 ürün: bir indirim; 4 ürün: iki indirim (en ucuz ikisi)
    assert.equal(nciUrunIndirimi(iki, [satir(10000, 3)]), 5000);
    assert.equal(nciUrunIndirimi(iki, [satir(10000, 2), satir(4000, 2, "b")]), 4000);
  });

  it("kademeli: geçilen en yüksek basamak", () => {
    const kademeler = [
      { esikKurus: 50000, indirimKurus: 5000 },
      { esikKurus: 100000, indirimKurus: 15000 },
    ];
    assert.equal(kademeIndirimi(kademeler, 40000), 0);
    assert.equal(kademeIndirimi(kademeler, 80000), 5000);
    assert.equal(kademeIndirimi(kademeler, 120000), 15000);
    assert.equal(
      kampanyaIndirimi(k({ tip: "kademeli", kademeler }), [satir(60000, 2)], 120000),
      15000,
    );
  });

  it("tavan: %20, en çok 200 ₺", () => {
    const t = k({ tip: "yuzde", deger: 20, enFazlaIndirimKurus: 20000 });
    assert.equal(kampanyaIndirimi(t, [satir(50000, 1)], 50000), 10000);
    assert.equal(kampanyaIndirimi(t, [satir(200000, 1)], 200000), 20000);
  });

  it("ücretsiz kargo öteki indirimle kargo ücretiyle yarışıyor", () => {
    const kargo = k({ id: "kargo", tip: "kargo" });
    const yuzde = k({ id: "yuzde", deger: 10 });
    // 300 ₺ sepet, kargo 49,90: %10 = 30 ₺ < 49,90 → kargo kazanıyor
    const a = enIyiKampanya([yuzde, kargo], [satir(30000, 1)], 30000, 4990);
    assert.equal(a?.id, "kargo");
    assert.equal(a?.kargoBedava, true);
    assert.equal(a?.indirimKurus, 0);
    // 1000 ₺ sepet: %10 = 100 ₺ > 49,90 → yüzde kazanıyor
    assert.equal(enIyiKampanya([yuzde, kargo], [satir(100000, 1)], 100000, 4990)?.id, "yuzde");
    // Kargo zaten bedavaysa kargo kampanyası değersiz
    assert.equal(enIyiKampanya([kargo], [satir(30000, 1)], 30000, 0), undefined);
  });

  it("müşteriye en düşük toplamı veren seçiliyor: indirim kargo eşiğini bozmuyor (K-171)", () => {
    const ayar: SatisAyari = {
      kargoKurus: 4990,
      bedavaKargoEsigi: 75000,
      havaleBilgisi: "",
      havaleSaat: 72,
      havaleHatirlatmaSaat: 24,
      kdvOrani: 10,
      varsayilanTasiyici: "yurtici",
    };
    const satirlar = [satir(75500, 1)];
    // %1 = 7,55 ₺ indirim sepeti 750 ₺ altına düşürüp 49,90 ₺ kargo getirirdi
    const az = sepetiHesapla([k({ id: "az", deger: 1 })], satirlar, 75500, ayar, true);
    assert.equal(az.kampanya, undefined);
    assert.equal(az.kargoKurus, 0);
    // %10 = 75,50 ₺ indirim, 49,90 ₺ kargoyla bile ucuz: uygulanıyor
    const cok = sepetiHesapla([k({ id: "cok", deger: 10 })], satirlar, 75500, ayar, true);
    assert.equal(cok.kampanya?.id, "cok");
    assert.equal(cok.kargoKurus, 4990);
    // Ücretsiz kargo kuponu 300 ₺ sepette
    const kargo = sepetiHesapla(
      [k({ id: "y", deger: 10 }), k({ id: "kargo", tip: "kargo" })],
      [satir(30000, 1)],
      30000,
      ayar,
      true,
    );
    assert.equal(kargo.kampanya?.id, "kargo");
    assert.equal(kargo.kargoKurus, 0);
    assert.equal(kargo.indirimKurus, 0);
  });

  it("çoklu kapsam: seçili kategoriler ve ürünler (K-171)", () => {
    const kat = k({ deger: 10, kapsam: "kategori", kategoriIdleri: ["zibin", "tulum"] });
    const satirlar = [
      { productId: "a", categoryId: "zibin", araToplamKurus: 10000 },
      { productId: "b", categoryId: "tulum", araToplamKurus: 20000 },
      { productId: "c", categoryId: "sapka", araToplamKurus: 30000 },
    ];
    assert.equal(kampanyaIndirimi(kat, satirlar, 60000), 3000);
    const urun = k({ deger: 10, kapsam: "urun", urunIdleri: ["a", "c"] });
    assert.equal(kampanyaIndirimi(urun, satirlar, 60000), 4000);
    // Liste boşalınca (silinen kategori) hiçbir ürüne uygulanmıyor, herkese değil
    assert.equal(
      kampanyaIndirimi(k({ deger: 10, kapsam: "kategori", kategoriIdleri: [] }), satirlar, 60000),
      0,
    );
  });

  it("N. üründe indirim en ucuz birimlerin satırına yazılıyor", () => {
    const iki = k({ tip: "nci-urun", alAdet: 2, deger: 50 });
    const satirlar = [satir(10000, 1), satir(6000, 1, "b")];
    assert.deepEqual(indirimiDagit(iki, satirlar, 3000), [0, 3000]);
  });
});

const AYAR: SatisAyari = {
  kargoKurus: 4990,
  bedavaKargoEsigi: 0,
  havaleBilgisi: "Test",
  havaleSaat: 72,
  havaleHatirlatmaSaat: 24,
  kdvOrani: 10,
  varsayilanTasiyici: "yurtici",
};
const girdi = (eposta = `${ON_EK}${kimlik("m").toLowerCase()}@deneme.test`) => ({
  adSoyad: "Test Kişi",
  eposta,
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

describe("kampanya kuralları (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  async function uye() {
    const id = kimlik("musteri");
    const eposta = `${id.toLowerCase()}@deneme.test`;
    await testDb().customer.create({ data: { id, adSoyad: "Üye", eposta, sifreOzeti: "x" } });
    return { id, eposta };
  }

  it("ilk siparişe özel kupon: üye değilse, sonra ikinci siparişte uygulanmıyor", async () => {
    const db = testDb();
    const kod = `T${kimlik("h").slice(-8).toUpperCase()}`;
    const kupon = await db.campaign.create({
      data: { ad: "T_hosgeldin", deger: 10, kuponKodu: kod, ilkSiparis: true, uyelereOzel: true },
      select: { id: true },
    });
    const m = await uye();
    try {
      assert.equal(await kuponEngeli(kod), "uye");
      assert.equal(
        (await gecerliKampanyalar(kod, undefined, m.id)).some((x) => x.id === kupon.id),
        true,
      );

      const { variantId } = await urunKur(10);
      await sepetKur(variantId, 1);
      cerezAyarla(KUPON_CEREZI, kod);
      const s = await siparisOlustur(girdi(m.eposta), AYAR, m.id);
      assert.ok(s.tamam);
      const o = await db.order.findUniqueOrThrow({ where: { numara: s.numara } });
      assert.equal(o.kampanyaId, kupon.id);

      // İkinci sipariş: artık ilk değil
      assert.equal(await kuponEngeli(kod, m.id), "ilk");
      await sepetKur(variantId, 1);
      cerezAyarla(KUPON_CEREZI, kod);
      const s2 = await siparisOlustur(girdi(m.eposta), AYAR, m.id);
      assert.ok(s2.tamam);
      const o2 = await db.order.findUniqueOrThrow({ where: { numara: s2.numara } });
      assert.equal(o2.kampanyaId, null);
    } finally {
      cerezleriTemizle();
      await db.order.deleteMany({ where: { eposta: m.eposta } });
      await db.campaign.delete({ where: { id: kupon.id } });
    }
  });

  it("kişi başı 1: aynı üye ikinci kez kullanamıyor", async () => {
    const db = testDb();
    const kod = `T${kimlik("k").slice(-8).toUpperCase()}`;
    const kupon = await db.campaign.create({
      data: { ad: "T_kisi", deger: 10, kuponKodu: kod, kisiBasiSinir: 1, uyelereOzel: true },
      select: { id: true },
    });
    const m = await uye();
    try {
      const { variantId } = await urunKur(10);
      await sepetKur(variantId, 1);
      cerezAyarla(KUPON_CEREZI, kod);
      assert.ok((await siparisOlustur(girdi(m.eposta), AYAR, m.id)).tamam);
      assert.equal(await kuponEngeli(kod, m.id), "kisi");
    } finally {
      cerezleriTemizle();
      await db.order.deleteMany({ where: { eposta: m.eposta } });
      await db.campaign.delete({ where: { id: kupon.id } });
    }
  });

  it("ücretsiz kargo kuponu siparişte kargoyu sıfırlıyor", async () => {
    const db = testDb();
    const kod = `T${kimlik("c").slice(-8).toUpperCase()}`;
    const kupon = await db.campaign.create({
      data: { ad: "T_kargo", tip: "kargo", deger: 0, kuponKodu: kod },
      select: { id: true },
    });
    try {
      const { variantId } = await urunKur(10);
      await sepetKur(variantId, 1);
      cerezAyarla(KUPON_CEREZI, kod);
      const s = await siparisOlustur(girdi(), AYAR);
      assert.ok(s.tamam);
      const o = await db.order.findUniqueOrThrow({ where: { numara: s.numara } });
      assert.equal(o.kargoKurus, 0);
      assert.equal(o.indirimKurus, 0);
      assert.equal(o.kampanyaAdi, "T_kargo");
    } finally {
      cerezleriTemizle();
      await db.order.deleteMany({ where: { kampanyaId: kupon.id } });
      await db.campaign.delete({ where: { id: kupon.id } });
    }
  });

  it("kademeli kampanyada kısmi iade basamak düşünce indirimi geri alıyor", async () => {
    const db = testDb();
    const kampanya = await db.campaign.create({
      data: {
        ad: "T_kademe",
        tip: "kademeli",
        deger: 0,
        kademeler: [{ esikKurus: 20000, indirimKurus: 3000 }],
      },
      select: { id: true },
    });
    const { variantId } = await urunKur(10); // 100 ₺
    await sepetKur(variantId, 2);
    const s = await siparisOlustur(girdi(), { ...AYAR, kargoKurus: 0 });
    await db.campaign.delete({ where: { id: kampanya.id } });
    assert.ok(s.tamam);
    const o = await db.order.update({
      where: { numara: s.numara },
      data: { durum: "teslim", odemeDurumu: "odendi", teslimTarihi: new Date() },
      include: { satirlar: true },
    });
    assert.equal(o.toplamKurus, 17000); // 200 − 30
    const t = await db.orderRequest.create({
      data: {
        orderId: o.id,
        tur: "iade",
        sebep: "beden",
        satirlar: { create: [{ orderItemId: o.satirlar[0].id, adet: 1 }] },
      },
    });
    await talebiSonuclandir(t.id, "tamamlandi", "");
    const r = await db.refund.findFirst({ where: { requestId: t.id } });
    // Kalan 100 ₺ basamağın altında: 30 ₺ indirim bozuldu → 100 − 30 = 70 ₺
    assert.equal(r?.tutarKurus, 7000);
  });

  it("tavanlı kampanyada kısmi iade orantılı değil, yeniden hesap (K-171)", async () => {
    const db = testDb();
    const kampanya = await db.campaign.create({
      data: { ad: "T_tavan", deger: 20, enFazlaIndirimKurus: 20000 },
      select: { id: true },
    });
    const a = await urunKur(10);
    const b = await urunKur(10);
    await db.product.update({ where: { id: a.productId }, data: { fiyatKurus: 100000 } });
    await db.product.update({ where: { id: b.productId }, data: { fiyatKurus: 100000 } });
    const cartId = await sepetKur(a.variantId, 1);
    await db.cartItem.create({
      data: { id: kimlik("sat"), cartId, variantId: b.variantId, adet: 1 },
    });
    const s = await siparisOlustur(girdi(), { ...AYAR, kargoKurus: 0 });
    await db.campaign.delete({ where: { id: kampanya.id } });
    assert.ok(s.tamam);
    const o = await db.order.update({
      where: { numara: s.numara },
      data: { durum: "teslim", odemeDurumu: "odendi", teslimTarihi: new Date() },
      include: { satirlar: true },
    });
    assert.equal(o.toplamKurus, 180000); // 2000 − 200 (tavan)
    const t = await db.orderRequest.create({
      data: {
        orderId: o.id,
        tur: "iade",
        sebep: "beden",
        satirlar: { create: [{ orderItemId: o.satirlar[0].id, adet: 1 }] },
      },
    });
    await talebiSonuclandir(t.id, "tamamlandi", "");
    const r = await db.refund.findFirst({ where: { requestId: t.id } });
    // Kalan 1000 ₺'ye yine 200 ₺ indirim: ödenen 1800 − kalan 800 = 1000 ₺
    assert.equal(r?.tutarKurus, 100000);
  });
});
