import { atlamaSebebi, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { kampanyaBitisNotu, urunFiyati } from "@/ui/katalog-bicim";
import {
  fiyatiKaydet,
  fiyatUyarisi,
  indirimOncesiEnDusuk,
  kampanyaFiyatUyarilari,
} from "@/server/fiyat-gecmisi";

/** İndirimdekiler listesi ve indirim öncesi fiyat denetimi (K-164). */

const GUN = 24 * 60 * 60 * 1000;
const once = (gun: number, simdi = new Date("2026-09-26T12:00:00Z")) =>
  new Date(simdi.getTime() - gun * GUN);

describe("ürün fiyatı ve indirim yüzdesi", () => {
  it("kampanyada üstü çizili liste fiyatı", () => {
    const f = urunFiyati({ fiyatKurus: 20000, kampanya: { ad: "K", indirimliFiyatKurus: 15000 } });
    assert.deepEqual(f, { satisKurus: 15000, ustuCiziliKurus: 20000, yuzde: 25 });
  });

  it("elle girilen eski fiyat; satıştan büyük değilse indirim yok", () => {
    assert.equal(urunFiyati({ fiyatKurus: 20000, eskiFiyatKurus: 25000 }).yuzde, 20);
    assert.deepEqual(urunFiyati({ fiyatKurus: 20000, eskiFiyatKurus: 20000 }), {
      satisKurus: 20000,
      yuzde: 0,
    });
    assert.equal(urunFiyati({ fiyatKurus: 20000 }).ustuCiziliKurus, undefined);
  });

  it("yüzde aşağı yuvarlanıyor: indirim olduğundan büyük görünmüyor", () => {
    // %29,6 → %29
    assert.equal(urunFiyati({ fiyatKurus: 13300, eskiFiyatKurus: 18900 }).yuzde, 29);
    // %0,1 → rozet yok ama üstü çizili fiyat duruyor
    const f = urunFiyati({ fiyatKurus: 99900, eskiFiyatKurus: 100000 });
    assert.equal(f.yuzde, 0);
    assert.equal(f.ustuCiziliKurus, 100000);
  });
});

describe("kampanya bitiş notu", () => {
  // İstanbul 26 Eylül 15:00
  const simdi = new Date("2026-09-26T12:00:00Z");

  it("aynı gün biterse 'Son gün', üç gün sonra biterse 'Son 4 gün'", () => {
    assert.equal(kampanyaBitisNotu("2026-09-26T20:59:00Z", simdi), "Son gün");
    // İstanbul'da 27 Eylül 00:30: ertesi gün
    assert.equal(kampanyaBitisNotu("2026-09-26T21:30:00Z", simdi), "Son 2 gün");
    assert.equal(kampanyaBitisNotu("2026-09-29T20:00:00Z", simdi), "Son 4 gün");
  });

  it("bir haftadan uzak, geçmiş ya da boş bitişte not yok", () => {
    assert.equal(kampanyaBitisNotu("2026-10-10T20:00:00Z", simdi), undefined);
    assert.equal(kampanyaBitisNotu("2026-09-25T20:00:00Z", simdi), undefined);
    assert.equal(kampanyaBitisNotu(undefined, simdi), undefined);
  });
});

describe("indirim öncesi en düşük fiyat (on gün)", () => {
  const baslangic = once(0);

  it("pencerede uygulanan fiyatların en düşüğü, pencere başında geçerli olan dahil", () => {
    const kayitlar = [
      { fiyatKurus: 18000, olusturuldu: once(40) }, // 10 gün önce hâlâ geçerli
      { fiyatKurus: 25000, olusturuldu: once(5) },
      { fiyatKurus: 15000, olusturuldu: once(0) }, // indirim
    ];
    assert.equal(indirimOncesiEnDusuk(kayitlar, baslangic), 18000);
  });

  it("pencereden önce biten fiyat sayılmıyor", () => {
    const kayitlar = [
      { fiyatKurus: 12000, olusturuldu: once(30) },
      { fiyatKurus: 25000, olusturuldu: once(20) },
      { fiyatKurus: 20000, olusturuldu: once(0) },
    ];
    assert.equal(indirimOncesiEnDusuk(kayitlar, baslangic), 25000);
  });

  it("pencerede kayıt yoksa bilinmiyor", () => {
    assert.equal(
      indirimOncesiEnDusuk([{ fiyatKurus: 20000, olusturuldu: once(0) }], baslangic),
      undefined,
    );
  });
});

describe("fiyat geçmişi ve panel uyarısı (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("aynı fiyat ikinci kez yazılmıyor", async () => {
    const db = testDb();
    const { productId } = await urunKur(3);
    await fiyatiKaydet(db, productId, 10000);
    await fiyatiKaydet(db, productId, 10000);
    await fiyatiKaydet(db, productId, 9000);
    const kayitlar = await db.priceHistory.findMany({ where: { productId } });
    assert.deepEqual(kayitlar.map((k) => k.fiyatKurus).sort(), [10000, 9000]);
  });

  it("eski fiyat son on günün en düşüğünü aşarsa uyarı, eşitse yok", async () => {
    const db = testDb();
    const { productId } = await urunKur(3);
    await db.priceHistory.createMany({
      data: [
        { productId, fiyatKurus: 12000, olusturuldu: new Date(Date.now() - 30 * GUN) },
        { productId, fiyatKurus: 10000, olusturuldu: new Date(Date.now() - 60 * 1000) },
      ],
    });
    await db.product.update({ where: { id: productId }, data: { eskiFiyatKurus: 15000 } });
    const uyari = await fiyatUyarisi(productId);
    assert.equal(uyari?.tur, "eskiFiyat");
    assert.equal(uyari?.enDusukKurus, 12000);

    await db.product.update({ where: { id: productId }, data: { eskiFiyatKurus: 12000 } });
    assert.equal(await fiyatUyarisi(productId), undefined);
  });

  it("indirim öncesine ait kayıt yoksa uyarı kanıt yok diyor", async () => {
    const db = testDb();
    const { productId } = await urunKur(3);
    await fiyatiKaydet(db, productId, 10000);
    await db.product.update({ where: { id: productId }, data: { eskiFiyatKurus: 15000 } });
    const uyari = await fiyatUyarisi(productId);
    assert.equal(uyari?.enDusukKurus, undefined);
  });

  it("kampanya sayfası: başlangıçtan önceki on günün en düşüğünü aşan ürün uyarılıyor", async () => {
    const db = testDb();
    const { productId } = await urunKur(3);
    const baslangic = new Date(Date.now() + 2 * GUN); // henüz başlamamış
    await db.priceHistory.createMany({
      data: [
        { productId, fiyatKurus: 8000, olusturuldu: new Date(Date.now() - 5 * GUN) },
        { productId, fiyatKurus: 10000, olusturuldu: new Date(Date.now() - GUN) },
      ],
    });
    const k = await db.campaign.create({
      data: { ad: "T_kampanya", deger: 20, kapsam: "urun", productId, baslangic },
      select: { id: true },
    });
    try {
      const uyari = (await kampanyaFiyatUyarilari([k.id])).get(k.id);
      assert.equal(uyari?.length, 1);
      assert.equal(uyari?.[0].enDusukKurus, 8000);

      // Fiyat pencere boyunca 10000 olsaydı uyarı yok.
      await db.campaign.update({
        where: { id: k.id },
        data: { baslangic: new Date(Date.now() + 20 * GUN) },
      });
      assert.equal((await kampanyaFiyatUyarilari([k.id])).get(k.id), undefined);
    } finally {
      await db.campaign.delete({ where: { id: k.id } });
    }
  });
});
