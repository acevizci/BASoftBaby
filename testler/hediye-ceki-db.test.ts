import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { cerezAyarla } from "./sahte-headers";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { siparisOlustur } from "@/server/siparis";
import { siparisiIptalEtVeStoguIadeEt } from "@/server/odeme-akis";
import { HEDIYE_CEKI_CEREZI } from "@/server/hediye-ceki";
import type { SatisAyari } from "@/server/sepet";

/**
 * Hediye çeki (K-137): bakiye sipariş işleminde düşüyor, ödenmeden iptalde
 * tamamı, ödenmiş siparişin iadesinde ödendiği oranda geri dönüyor.
 */

const AYAR: SatisAyari = {
  kargoKurus: 4990,
  bedavaKargoEsigi: 50000,
  havaleBilgisi: "Test Bankası TR00",
  havaleSaat: 72,
  havaleHatirlatmaSaat: 24,
  kdvOrani: 10,
  varsayilanTasiyici: "yurtici",
};

const EPOSTA_ON_EK = "t_hediyeceki_";

const girdi = () => ({
  adSoyad: "Test Müşteri",
  eposta: `${EPOSTA_ON_EK}${kimlik("m").toLowerCase()}@deneme.test`,
  telefon: "05001112233",
  adres: "Deneme Mahallesi Deneme Sokak No 1",
  ilce: "Kadıköy",
  il: "İstanbul",
  postaKodu: "34000",
  not: "",
  hediyePaketi: false,
  hediyeNotu: "",
  sozlesmeOnayi: new Date(),
});

const cekIdleri: string[] = [];

async function cekKur(bakiyeKurus: number, ek: { aktif?: boolean } = {}) {
  const id = kimlik("cek");
  const kod = `HC-${id.slice(-4).toUpperCase().padEnd(4, "X")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  await testDb().giftCard.create({
    data: { id, kod, tutarKurus: bakiyeKurus, bakiyeKurus, aktif: ek.aktif ?? true },
  });
  cekIdleri.push(id);
  return { id, kod };
}

/** 100 ₺'lik bir ürün + 49,90 ₺ kargo = 149,90 ₺. */
async function cekleSiparis(
  kod: string,
  secenek?: Parameters<typeof siparisOlustur>[4],
) {
  const { variantId } = await urunKur(5);
  await sepetKur(variantId, 1);
  cerezAyarla(HEDIYE_CEKI_CEREZI, kod);
  return { variantId, sonuc: await siparisOlustur(girdi(), AYAR, undefined, "havale", secenek) };
}

const bakiye = async (id: string) =>
  (await testDb().giftCard.findUniqueOrThrow({ where: { id } })).bakiyeKurus;

async function sil() {
  const db = testDb();
  const siparisler = { eposta: { startsWith: EPOSTA_ON_EK } };
  await db.refund.deleteMany({ where: { order: siparisler } });
  await db.orderItem.deleteMany({ where: { order: siparisler } });
  await db.order.deleteMany({ where: siparisler });
  await db.giftCard.deleteMany({ where: { id: { in: cekIdleri } } });
  await temizle();
}

describe("hediye çeki (veritabanı)", { skip: atlamaSebebi }, () => {
  before(sil);
  after(sil);

  it("kısmen karşılayan çek: bakiye düşüyor, kalan havaleyle tahsil ediliyor", async () => {
    const cek = await cekKur(5000);
    const { sonuc } = await cekleSiparis(cek.kod);
    assert.ok(sonuc.tamam);
    assert.equal(sonuc.toplamKurus, 14990);
    assert.equal(sonuc.hediyeCekiKurus, 5000);
    assert.equal(sonuc.tahsilatKurus, 9990);
    assert.equal(await bakiye(cek.id), 0);
    const s = await testDb().order.findUniqueOrThrow({ where: { numara: sonuc.numara } });
    assert.equal(s.odemeYontemi, "havale");
    assert.equal(s.odemeDurumu, "bekliyor");
    assert.equal(s.giftCardId, cek.id);
    const hareket = await testDb().giftCardUse.findMany({ where: { giftCardId: cek.id } });
    assert.deepEqual(
      hareket.map((h) => [h.sebep, h.tutarKurus, h.siparisNo]),
      [["siparis", 5000, sonuc.numara]],
    );
  });

  it("tamamını karşılayan çek: sipariş ödenmiş açılıyor, kalan bakiye duruyor", async () => {
    const cek = await cekKur(20000);
    const { sonuc } = await cekleSiparis(cek.kod);
    assert.ok(sonuc.tamam);
    assert.equal(sonuc.hediyeCekiKurus, 14990);
    assert.equal(sonuc.tahsilatKurus, 0);
    assert.equal(await bakiye(cek.id), 5010);
    const s = await testDb().order.findUniqueOrThrow({ where: { numara: sonuc.numara } });
    assert.equal(s.odemeYontemi, "hediye-ceki");
    assert.equal(s.odemeDurumu, "odendi");
    assert.equal(s.durum, "hazirlaniyor");
  });

  it("kapalı çekle sipariş açılmıyor; stok ve sepet yerinde", async () => {
    const cek = await cekKur(5000, { aktif: false });
    const { variantId, sonuc } = await cekleSiparis(cek.kod);
    assert.equal(sonuc.tamam, false);
    assert.ok(!sonuc.tamam && sonuc.sebep === "cek");
    const v = await testDb().productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v.stok, 5);
    assert.equal(await bakiye(cek.id), 5000);
  });

  it("ödenmeden iptal: çekten düşülen tutarın tamamı bakiyeye dönüyor", async () => {
    const cek = await cekKur(5000);
    const { sonuc } = await cekleSiparis(cek.kod);
    assert.ok(sonuc.tamam);
    const s = await testDb().order.findUniqueOrThrow({ where: { numara: sonuc.numara } });
    await siparisiIptalEtVeStoguIadeEt(s.id);
    assert.equal(await bakiye(cek.id), 5000);
    // İkinci iptal çağrısı bakiyeyi ikinci kez yüklemiyor.
    await siparisiIptalEtVeStoguIadeEt(s.id);
    assert.equal(await bakiye(cek.id), 5000);
    const iadeler = await testDb().refund.count({ where: { orderId: s.id } });
    assert.equal(iadeler, 0);
  });

  it("ödenmiş sipariş iptali: para kısmı iade kaydına, çek kısmı bakiyeye", async () => {
    const cek = await cekKur(5000);
    const { sonuc } = await cekleSiparis(cek.kod);
    assert.ok(sonuc.tamam);
    const s = await testDb().order.update({
      where: { numara: sonuc.numara },
      data: { odemeDurumu: "odendi" },
    });
    await siparisiIptalEtVeStoguIadeEt(s.id);
    const [iade] = await testDb().refund.findMany({ where: { orderId: s.id } });
    assert.equal(iade.tutarKurus, 9990);
    assert.equal(iade.hediyeCekiKurus, 5000);
    assert.equal(iade.durum, "bekliyor");
    assert.equal(await bakiye(cek.id), 5000);
    const sonra = await testDb().order.findUniqueOrThrow({ where: { id: s.id } });
    assert.equal(sonra.odemeDurumu, "iade-bekliyor");
  });

  it("tamamı çekle ödenmiş sipariş iptali: iade hemen tamamlanıyor", async () => {
    const cek = await cekKur(20000);
    const { sonuc } = await cekleSiparis(cek.kod);
    assert.ok(sonuc.tamam);
    const s = await testDb().order.findUniqueOrThrow({ where: { numara: sonuc.numara } });
    await siparisiIptalEtVeStoguIadeEt(s.id);
    assert.equal(await bakiye(cek.id), 20000);
    const [iade] = await testDb().refund.findMany({ where: { orderId: s.id } });
    assert.equal(iade.tutarKurus, 0);
    assert.equal(iade.hediyeCekiKurus, 14990);
    assert.equal(iade.durum, "tamamlandi");
    const sonra = await testDb().order.findUniqueOrThrow({ where: { id: s.id } });
    assert.equal(sonra.odemeDurumu, "iade");
  });

  it("ekranda gösterilenden farklı tutar düşecekse sipariş açılmıyor", async () => {
    const cek = await cekKur(5000);
    // Sayfa 60 ₺ göstermişti; bakiye arada 50 ₺'ye inmiş.
    const { sonuc } = await cekleSiparis(cek.kod, { beklenenKurus: 6000 });
    assert.ok(!sonuc.tamam && sonuc.sebep === "cek");
    assert.equal(await bakiye(cek.id), 5000);
  });

  it("ekranda çek düşülmemişse (geçersiz görünmüştü) sipariş çeksiz açılıyor", async () => {
    const cek = await cekKur(5000, { aktif: false });
    const { sonuc } = await cekleSiparis(cek.kod, { beklenenKurus: 0 });
    assert.ok(sonuc.tamam);
    assert.equal(sonuc.hediyeCekiKurus, 0);
    assert.equal(sonuc.tahsilatKurus, 14990);
  });

  it("ödeme yöntemi kapalıyken çek tamamını karşılamıyorsa sipariş açılmıyor", async () => {
    const cek = await cekKur(5000);
    const { sonuc } = await cekleSiparis(cek.kod, { yalnizCek: true });
    assert.ok(!sonuc.tamam && sonuc.sebep === "cek");
    assert.equal(await bakiye(cek.id), 5000);
  });
});
