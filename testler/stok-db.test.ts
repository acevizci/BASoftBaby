import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { siparisOlustur } from "@/server/siparis";
import { siparisiIptalEtVeStoguIadeEt } from "@/server/odeme-akis";
import { iadeTutari } from "@/server/iade";
import type { SatisAyari } from "@/server/sepet";

/**
 * Stok ve paranın veritabanına bağlı kuralları (K-77).
 *
 * Buradaki her sınav gerçek para kaybettirebilecek bir şeyi koruyor:
 * olmayan ürünü satmak, iptal edilen siparişin stoğunu kaybetmek, iade
 * tutarını yanlış hesaplamak. Saf mantık sınavlarının (K-68) aksine bunlar
 * gerçek bir Postgres istiyor; `TEST_DATABASE_URL` yoksa atlanıyorlar.
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

const girdi = () => ({
  adSoyad: "Test Müşteri",
  eposta: `${kimlik("m").toLowerCase()}@deneme.test`,
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

/** Sepeti kurup siparişi açar; gerçek yolun tamamı. */
async function siparisVer(variantId: string, adet: number) {
  await sepetKur(variantId, adet);
  return siparisOlustur(girdi(), AYAR);
}

describe("stok ve iade (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("hediye paketi ve notu siparişe yazılıyor; paket yoksa not yazılmıyor (K-98)", async () => {
    const { variantId } = await urunKur(5);
    await sepetKur(variantId, 1);
    const hediyeli = await siparisOlustur(
      { ...girdi(), hediyePaketi: true, hediyeNotu: "Minik Ada'ya sevgilerle" },
      AYAR,
    );
    await sepetKur(variantId, 1);
    const hediyesiz = await siparisOlustur(
      { ...girdi(), hediyePaketi: false, hediyeNotu: "unutulmuş not" },
      AYAR,
    );
    assert.ok(hediyeli.tamam && hediyesiz.tamam);
    const [a, b] = await Promise.all(
      [hediyeli, hediyesiz].map((s) =>
        testDb().order.findUniqueOrThrow({
          where: { numara: s.tamam ? s.numara : "" },
          select: { hediyePaketi: true, hediyeNotu: true },
        }),
      ),
    );
    assert.deepEqual(a, { hediyePaketi: true, hediyeNotu: "Minik Ada'ya sevgilerle" });
    assert.deepEqual(b, { hediyePaketi: false, hediyeNotu: "" });
  });

  it("sipariş stoğu düşürüyor", async () => {
    const { variantId } = await urunKur(5);
    const sonuc = await siparisVer(variantId, 2);
    assert.equal(sonuc.tamam, true);

    const v = await testDb().productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v.stok, 3);
  });

  it("stoktan fazlası sipariş edilemiyor ve stok değişmiyor", async () => {
    const { variantId } = await urunKur(1);
    const sonuc = await siparisVer(variantId, 2);
    assert.equal(sonuc.tamam, false);

    const v = await testDb().productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v.stok, 1, "başarısız sipariş stoğa dokunmamalı");
  });

  it("son adedi aynı anda iki kişi alırsa yalnızca biri alıyor", async () => {
    // Asıl koruma bu: koşullu düşüm (`where stok >= adet`) olmasaydı iki
    // sipariş de geçer, stok eksiye düşer ve olmayan ürün satılırdı.
    const { variantId } = await urunKur(1);
    const [a, b] = await Promise.all([
      siparisVer(variantId, 1),
      siparisVer(variantId, 1),
    ]);

    const basarili = [a, b].filter((s) => s.tamam).length;
    assert.equal(basarili, 1, "iki siparişten tam olarak biri geçmeliydi");

    const v = await testDb().productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v.stok, 0);
  });

  it("on kişi aynı anda üç adede saldırınca stok eksiye düşmüyor", async () => {
    const { variantId } = await urunKur(3);
    const sonuclar = await Promise.all(
      Array.from({ length: 10 }, () => siparisVer(variantId, 1)),
    );
    assert.equal(sonuclar.filter((s) => s.tamam).length, 3);

    const v = await testDb().productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v.stok, 0);
  });

  it("iptal edilen siparişin stoğu geri dönüyor", async () => {
    const { variantId } = await urunKur(4);
    const sonuc = await siparisVer(variantId, 3);
    assert.equal(sonuc.tamam, true);
    if (!sonuc.tamam) return;

    const siparis = await testDb().order.findUniqueOrThrow({
      where: { numara: sonuc.numara },
      select: { id: true },
    });
    await siparisiIptalEtVeStoguIadeEt(siparis.id);

    const v = await testDb().productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v.stok, 4, "iptal stoğu tam olarak geri vermeliydi");
  });

  it("iptal iki kez çağrılırsa stok iki kez artmıyor", async () => {
    // Çift tıklama ya da yeniden gönderilen form: stok uydurulmamalı.
    const { variantId } = await urunKur(2);
    const sonuc = await siparisVer(variantId, 2);
    if (!sonuc.tamam) throw new Error("sipariş açılmadı");

    const siparis = await testDb().order.findUniqueOrThrow({
      where: { numara: sonuc.numara },
      select: { id: true },
    });
    await siparisiIptalEtVeStoguIadeEt(siparis.id);
    await siparisiIptalEtVeStoguIadeEt(siparis.id);

    const v = await testDb().productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v.stok, 2, "ikinci iptal stoğu tekrar artırmamalı");
  });
});

describe("iade tutarı (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("tamamı iade edilince kargo da iade ediliyor", async () => {
    const { variantId } = await urunKur(5);
    const sonuc = await siparisVer(variantId, 1);
    if (!sonuc.tamam) throw new Error("sipariş açılmadı");

    const siparis = await testDb().order.findUniqueOrThrow({
      where: { numara: sonuc.numara },
      select: { id: true, toplamKurus: true, kargoKurus: true, araToplamKurus: true },
    });

    const tutar = await iadeTutari(siparis.id);
    assert.ok(tutar);
    assert.equal(tutar!.tamami, true);
    assert.equal(tutar!.kargoKurus, siparis.kargoKurus);
    assert.equal(tutar!.toplamKurus, siparis.toplamKurus);
  });

  it("iade tutarı siparişin toplamını aşamıyor", async () => {
    const { variantId } = await urunKur(5);
    const sonuc = await siparisVer(variantId, 3);
    if (!sonuc.tamam) throw new Error("sipariş açılmadı");

    const siparis = await testDb().order.findUniqueOrThrow({
      where: { numara: sonuc.numara },
      select: { id: true, toplamKurus: true },
    });

    const tutar = await iadeTutari(siparis.id);
    assert.ok(tutar);
    assert.ok(
      tutar!.toplamKurus <= siparis.toplamKurus,
      `iade ${tutar!.toplamKurus}, tahsilat ${siparis.toplamKurus}`,
    );
  });

  it("olmayan siparişte tutar hesaplanmıyor", async () => {
    assert.equal(await iadeTutari("T_yok_boyle_bir_siparis"), undefined);
  });
});
