import "./hazirlik";
import { after, before, describe, it } from "node:test";
import { atlamaSebebi, kimlik, ON_EK, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { siparisOlustur } from "@/server/siparis";
import { talebiSonuclandir } from "@/server/talep";
import type { SatisAyari } from "@/server/sepet";
import assert from "node:assert/strict";
import {
  alOdeIndirimi,
  enIyiKampanya,
  indirimiDagit,
  kampanyaIndirimi,
  type IndirimSatiri,
  type KampanyaKaydi,
} from "@/server/kampanya";
import { kampanyaZarari } from "@/server/kar";

/** "X al Y öde" kampanyası (K-168). */

const ucAlIkiOde = (ek: Partial<KampanyaKaydi> = {}): KampanyaKaydi => ({
  id: "k3",
  ad: "3 al 2 öde",
  tip: "al-ode",
  deger: 0,
  kapsam: "tumu",
  categoryId: null,
  productId: null,
  kuponKodu: null,
  enAzSepetKurus: 0,
  alAdet: 3,
  odeAdet: 2,
  ...ek,
});

const satir = (
  productId: string,
  birim: number,
  adet: number,
  categoryId = "kat",
): IndirimSatiri => ({
  productId,
  categoryId,
  araToplamKurus: birim * adet,
  adet,
});

describe("X al Y öde", () => {
  it("3 aynı ürün: biri bedava", () => {
    assert.equal(alOdeIndirimi(ucAlIkiOde(), [satir("a", 10000, 3)]), 10000);
  });

  it("farklı fiyatlar: bedava olan en ucuzu", () => {
    const satirlar = [satir("a", 30000, 1), satir("b", 20000, 1), satir("c", 10000, 1)];
    assert.equal(alOdeIndirimi(ucAlIkiOde(), satirlar), 10000);
  });

  it("5 ürün 1, 6 ürün 2 bedava; 2 ürün hiç", () => {
    assert.equal(alOdeIndirimi(ucAlIkiOde(), [satir("a", 10000, 5)]), 10000);
    assert.equal(alOdeIndirimi(ucAlIkiOde(), [satir("a", 10000, 6)]), 20000);
    assert.equal(alOdeIndirimi(ucAlIkiOde(), [satir("a", 10000, 2)]), 0);
  });

  it("6 ürün, farklı fiyat: en ucuz iki birim bedava", () => {
    const satirlar = [satir("a", 50000, 2), satir("b", 20000, 2), satir("c", 10000, 2)];
    assert.equal(alOdeIndirimi(ucAlIkiOde(), satirlar), 20000);
  });

  it("kapsam dışı ürün sayılmıyor", () => {
    const k = ucAlIkiOde({ kapsam: "kategori", categoryId: "zibin" });
    const satirlar = [satir("a", 10000, 2, "zibin"), satir("b", 5000, 1, "sapka")];
    assert.equal(kampanyaIndirimi(k, satirlar, 25000), 0);
    satirlar.push(satir("c", 8000, 1, "zibin"));
    assert.equal(kampanyaIndirimi(k, satirlar, 33000), 8000);
  });

  it("sepet alt sınırı geçerli", () => {
    const k = ucAlIkiOde({ enAzSepetKurus: 50000 });
    assert.equal(kampanyaIndirimi(k, [satir("a", 10000, 3)], 30000), 0);
  });

  it("geçersiz tanım indirim vermiyor", () => {
    for (const [al, ode] of [
      [3, 3],
      [3, 0],
      [1, 1],
      [2, 5],
    ] as const) {
      assert.equal(
        alOdeIndirimi(ucAlIkiOde({ alAdet: al, odeAdet: ode }), [satir("a", 100, 9)]),
        0,
      );
    }
  });

  it("yüzde kampanyasıyla üst üste binmiyor: çok indiren kazanıyor", () => {
    const yuzde: KampanyaKaydi = { ...ucAlIkiOde(), id: "y", tip: "yuzde", deger: 20 };
    // 3 × 100 ₺: 3 al 2 öde 100 ₺, %20 60 ₺
    const en = enIyiKampanya([yuzde, ucAlIkiOde()], [satir("a", 10000, 3)], 30000);
    assert.equal(en?.id, "k3");
    assert.equal(en?.indirimKurus, 10000);
  });

  it("indirim bedava sayılan ucuz ürünün satırına yazılıyor", () => {
    const satirlar = [satir("a", 30000, 1), satir("b", 20000, 1), satir("c", 10000, 1)];
    assert.deepEqual(indirimiDagit(ucAlIkiOde(), satirlar, 10000), [0, 0, 10000]);
    // Aynı satırda 3 adet: pay o satırda
    assert.deepEqual(indirimiDagit(ucAlIkiOde(), [satir("a", 10000, 3)], 10000), [10000]);
  });

  it("zarar uyarısı ortalama indirimle hesaplıyor", () => {
    // 150 ₺ satış, 3 al 2 öde → ortalama 100 ₺; KDV %10 hariç ~90,9 ₺ < 95 ₺ alış
    const z = kampanyaZarari(
      ucAlIkiOde(),
      [{ id: "u", ad: "Zıbın", categoryId: "kat", fiyatKurus: 15000, alisFiyatKurus: 9500 }],
      10,
    );
    assert.equal(z.length, 1);
    assert.equal(z[0].indirimliKurus, 10000);
  });
});

describe("X al Y öde · kısmi iade (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

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
    adSoyad: "Test Kişi",
    eposta: `${ON_EK}${kimlik("m").toLowerCase()}@deneme.test`,
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

  /** Kampanyalı sipariş: teslim edilmiş ve ödenmiş. */
  async function siparis(satirlar: { variantId: string; adet: number }[], productIdler: string[]) {
    const db = testDb();
    const k = await db.campaign.create({
      data: {
        ad: "T_3al2",
        tip: "al-ode",
        deger: 0,
        alAdet: 3,
        odeAdet: 2,
        kapsam: productIdler.length === 1 ? "urun" : "tumu",
        productId: productIdler.length === 1 ? productIdler[0] : null,
      },
      select: { id: true },
    });
    const cartId = await sepetKur(satirlar[0].variantId, satirlar[0].adet);
    for (const x of satirlar.slice(1)) {
      await db.cartItem.create({
        data: { id: kimlik("sat"), cartId, variantId: x.variantId, adet: x.adet },
      });
    }
    const s = await siparisOlustur(girdi(), AYAR);
    await db.campaign.delete({ where: { id: k.id } });
    assert.ok(s.tamam);
    return db.order.update({
      where: { numara: s.numara },
      data: { durum: "teslim", odemeDurumu: "odendi", teslimTarihi: new Date() },
      select: { id: true, toplamKurus: true, indirimKurus: true, satirlar: true },
    });
  }

  async function iadeEt(orderId: string, kalemler: { orderItemId: string; adet: number }[]) {
    const db = testDb();
    const t = await db.orderRequest.create({
      data: { orderId, tur: "iade", sebep: "beden", satirlar: { create: kalemler } },
      select: { id: true },
    });
    await talebiSonuclandir(t.id, "tamamlandi", "");
    const r = await db.refund.findFirst({
      where: { requestId: t.id },
      select: { tutarKurus: true },
    });
    return r?.tutarKurus ?? 0;
  }

  it("3 al 2 öde'de bir ürün iade edilince para dönmüyor, hepsi edilince ödenenin tamamı", async () => {
    const { productId, variantId } = await urunKur(10); // 100 ₺
    const o = await siparis([{ variantId, adet: 3 }], [productId]);
    assert.equal(o.indirimKurus, 10000);
    assert.equal(o.toplamKurus, 20000);
    const satir = o.satirlar[0];
    assert.equal(await iadeEt(o.id, [{ orderItemId: satir.id, adet: 1 }]), 0);
    assert.equal(await iadeEt(o.id, [{ orderItemId: satir.id, adet: 2 }]), 20000);
  });

  it("farklı fiyatlar: pahalıyı iade eden bedava ucuzun bedelini ödüyor", async () => {
    const db = testDb();
    const a = await urunKur(10);
    const b = await urunKur(10);
    const c = await urunKur(10);
    await db.product.update({ where: { id: a.productId }, data: { fiyatKurus: 30000 } });
    await db.product.update({ where: { id: b.productId }, data: { fiyatKurus: 20000 } });
    // c 100 ₺: bedava olan
    const o = await siparis(
      [
        { variantId: a.variantId, adet: 1 },
        { variantId: b.variantId, adet: 1 },
        { variantId: c.variantId, adet: 1 },
      ],
      [a.productId, b.productId, c.productId],
    );
    assert.equal(o.toplamKurus, 50000);
    const pahali = o.satirlar.find((x) => x.fiyatKurus === 30000)!;
    // 300 ₺'yi iade ediyor: elinde 200 + 100 kalıyor, kampanyasız 300 ₺ → iade 200 ₺
    assert.equal(await iadeEt(o.id, [{ orderItemId: pahali.id, adet: 1 }]), 20000);
  });
});
