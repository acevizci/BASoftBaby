import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { indirimiDagit } from "@/server/kampanya";
import { siparisOlustur } from "@/server/siparis";
import { iadeTutari } from "@/server/iade";
import type { SatisAyari } from "@/server/sepet";

/** Kampanya indiriminin satıra düşen payı ve kısmi iade (K-109). */

const satir = (productId: string, araToplamKurus: number) => ({ productId, categoryId: "k", araToplamKurus });

describe("indirimi dağıt", () => {
  it("ürün kampanyasında yalnızca o ürün pay alıyor", () => {
    assert.deepEqual(
      indirimiDagit({ kapsam: "urun", productId: "a", categoryId: null }, [satir("a", 20000), satir("b", 20000)], 10000),
      [10000, 0],
    );
  });

  it("sepet kampanyasında oranla; yuvarlama en büyük satıra, toplam tam", () => {
    const paylar = indirimiDagit({ kapsam: "tumu", productId: null, categoryId: null }, [satir("a", 1000), satir("b", 2000), satir("c", 3000)], 1001);
    assert.equal(paylar.reduce((t, p) => t + p, 0), 1001);
    assert.deepEqual(paylar, [166, 333, 502]);
  });

  it("kampanya yoksa ya da indirim sıfırsa hepsi sıfır", () => {
    assert.deepEqual(indirimiDagit(undefined, [satir("a", 100)], 50), [0]);
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

describe("kısmi iade (veritabanı)", { skip: atlamaSebebi }, () => {
  const kampanyalar: string[] = [];
  const sil = async () => {
    await testDb().campaign.deleteMany({ where: { id: { in: kampanyalar } } });
    await temizle();
  };
  before(sil);
  after(sil);

  it("yalnızca bir ürüne uygulanan kampanyada her ürün ödendiği kadar iade ediliyor", async () => {
    const db = testDb();
    const a = await urunKur(5);
    const b = await urunKur(5);
    for (const u of [a, b]) await db.product.update({ where: { id: u.productId }, data: { fiyatKurus: 20000 } });
    const k = await db.campaign.create({
      data: { ad: "A yarı fiyat", tip: "yuzde", deger: 50, kapsam: "urun", productId: a.productId },
    });
    kampanyalar.push(k.id);

    const cart = await sepetKur(a.variantId, 2);
    await db.cartItem.create({ data: { id: kimlik("sat"), cartId: cart, variantId: b.variantId, adet: 1 } });
    const s = await siparisOlustur(girdi(), AYAR);
    assert.ok(s.tamam);
    const o = await db.order.findUniqueOrThrow({ where: { numara: s.numara }, include: { satirlar: true } });
    assert.equal(o.toplamKurus, 40000); // 2×200 − 200 + 200

    const sa = o.satirlar.find((x) => x.variantId === a.variantId)!;
    const sb = o.satirlar.find((x) => x.variantId === b.variantId)!;
    assert.deepEqual([sa.indirimKurus, sb.indirimKurus], [20000, 0]);

    // Eskiden B için 150 ₺, A'nın biri için 150 ₺ çıkıyordu.
    assert.equal((await iadeTutari(o.id, [{ orderItemId: sb.id, adet: 1 }]))?.toplamKurus, 20000);
    assert.equal((await iadeTutari(o.id, [{ orderItemId: sa.id, adet: 1 }]))?.toplamKurus, 10000);
    // Hepsi: ödenen kadar.
    assert.equal((await iadeTutari(o.id))?.toplamKurus, 40000);
  });

  it("payı yazılmamış eski siparişte oransal hesap sürüyor", async () => {
    const db = testDb();
    const a = await urunKur(5);
    await sepetKur(a.variantId, 2);
    const s = await siparisOlustur(girdi(), AYAR);
    assert.ok(s.tamam);
    const o = await db.order.update({
      where: { numara: s.numara },
      data: { indirimKurus: 2000, toplamKurus: 18000 },
      include: { satirlar: true },
    });
    await db.orderItem.updateMany({ where: { orderId: o.id }, data: { indirimKurus: null } });
    assert.equal((await iadeTutari(o.id, [{ orderItemId: o.satirlar[0].id, adet: 1 }]))?.toplamKurus, 9000);
  });
});
