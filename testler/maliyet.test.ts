import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { birimMarj, kdvHaric, yuzdeYaz } from "@/server/kar";
import { kdvAyristir } from "@/server/fatura";
import { maliyetiGecmiseYaz } from "@/server/maliyet";
import { siparisOlustur } from "@/server/siparis";
import type { SatisAyari } from "@/server/sepet";

/** Satış anındaki maliyet ve KDV ayrımı (K-111). */

describe("KDV ve marj", () => {
  it("KDV hariç tutar faturadaki matrahla aynı", () => {
    for (const t of [24990, 1, 99999, 12345]) assert.equal(kdvHaric(t, 10), kdvAyristir(t, 10).matrahKurus);
  });

  it("birim marj KDV hariç satışa göre", () => {
    // 249,90 ₺ KDV dahil → 227,18 ₺; alış 110 ₺ → kâr 117,18 ₺, %51,6
    const m = birimMarj(24990, 11000, 10);
    assert.equal(m.netSatisKurus, 22718);
    assert.equal(m.karKurus, 11718);
    assert.equal(yuzdeYaz(m.marjYuzde), "%51,6");
    assert.ok(birimMarj(10000, 12000, 10).karKurus < 0);
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
const girdi = () => ({
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
});

describe("satış anındaki maliyet (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("sipariş o günkü alış fiyatını saklıyor; sonra değişse de kalıyor", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(5);
    await db.product.update({ where: { id: productId }, data: { alisFiyatKurus: 4000 } });
    await sepetKur(variantId, 1);
    const s = await siparisOlustur(girdi(), AYAR);
    assert.ok(s.tamam);
    await db.product.update({ where: { id: productId }, data: { alisFiyatKurus: 5000 } });
    await maliyetiGecmiseYaz(productId, 5000);
    const satir = await db.orderItem.findFirstOrThrow({ where: { order: { numara: s.numara } } });
    assert.deepEqual([satir.alisFiyatKurus, satir.alisTahmini], [4000, false]);
  });

  it("alış fiyatı ilk kez girilince maliyeti bilinmeyen eski satışlar tahmini doluyor", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(5);
    await sepetKur(variantId, 1);
    const s = await siparisOlustur(girdi(), AYAR);
    assert.ok(s.tamam);
    assert.equal(await maliyetiGecmiseYaz(productId, null), 0);
    assert.equal(await maliyetiGecmiseYaz(productId, 3000), 1);
    const satir = await db.orderItem.findFirstOrThrow({ where: { order: { numara: s.numara } } });
    assert.deepEqual([satir.alisFiyatKurus, satir.alisTahmini], [3000, true]);
  });
});
