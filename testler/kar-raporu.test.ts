import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { kampanyaZarari } from "@/server/kar";
import { karRaporu } from "@/server/kar-raporu";
import { siparisOlustur } from "@/server/siparis";
import type { SatisAyari } from "@/server/sepet";

/** Rapordaki kâr ve kampanya zarar uyarısı (K-113). */

describe("kampanya zarar uyarısı", () => {
  const urunler = [
    { id: "a", ad: "A", categoryId: "k1", fiyatKurus: 22000, alisFiyatKurus: 12000 },
    { id: "b", ad: "B", categoryId: "k2", fiyatKurus: 22000, alisFiyatKurus: 8000 },
    { id: "c", ad: "C", categoryId: "k1", fiyatKurus: 22000, alisFiyatKurus: null },
  ];
  it("%50'de A maliyetin altına düşüyor (110 → 100 KDV hariç < 120), B düşmüyor", () => {
    const z = kampanyaZarari({ tip: "yuzde", deger: 50, kapsam: "tumu", categoryId: null, productId: null }, urunler, 10);
    assert.deepEqual(z, [{ ad: "A", indirimliKurus: 11000, netKurus: 10000, alisKurus: 12000 }]);
  });
  it("kapsam dışı ürün ve alış fiyatı olmayan girmiyor", () => {
    assert.deepEqual(
      kampanyaZarari({ tip: "yuzde", deger: 50, kapsam: "kategori", categoryId: "k2", productId: null }, urunler, 10),
      [],
    );
  });
  it("tutar indirimi en kötü durumla (tek ürünlük sepet)", () => {
    const z = kampanyaZarari({ tip: "tutar", deger: 10000, kapsam: "urun", categoryId: null, productId: "a" }, urunler, 10);
    assert.equal(z.length, 1);
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

describe("rapordaki kâr (veritabanı)", { skip: atlamaSebebi }, () => {
  const kampanyalar: string[] = [];
  let onceki: Record<string, number | null> | null = null;
  before(async () => {
    await temizle();
    onceki = await testDb().storeSetting.findUnique({
      where: { id: "tek" },
      select: { kargoGiderKurus: true, paketGiderKurus: true, kartKomisyonOnbinde: true },
    });
    await testDb().storeSetting.upsert({
      where: { id: "tek" },
      update: { kargoGiderKurus: 5000, paketGiderKurus: 0, kartKomisyonOnbinde: 0 },
      create: { id: "tek", kargoGiderKurus: 5000, paketGiderKurus: 0, kartKomisyonOnbinde: 0 },
    });
  });
  after(async () => {
    if (onceki) await testDb().storeSetting.update({ where: { id: "tek" }, data: onceki });
    await testDb().campaign.deleteMany({ where: { id: { in: kampanyalar } } });
    await temizle();
  });

  it("yalnızca ödenmiş siparişler; ürün, kampanya ve zarar eden sipariş kırılımı", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(10);
    const ad = `Kâr ${kimlik("u")}`;
    await db.product.update({ where: { id: productId }, data: { ad, fiyatKurus: 22000, alisFiyatKurus: 10000 } });

    const ver = async () => {
      await sepetKur(variantId, 1);
      const s = await siparisOlustur(girdi(), AYAR);
      assert.ok(s.tamam);
      return s.numara;
    };
    const odenen = await ver();
    await ver(); // ödenmemiş havale: kâra girmiyor
    const k = await db.campaign.create({
      data: { ad: `Yarı ${kimlik("k")}`, tip: "yuzde", deger: 50, kapsam: "urun", productId },
    });
    kampanyalar.push(k.id);
    const indirimli = await ver();
    await db.order.updateMany({ where: { numara: { in: [odenen, indirimli] } }, data: { odemeDurumu: "odendi" } });

    const bas = new Date(Date.now() - 60_000);
    const r = await karRaporu({ baslangic: bas, bitis: new Date(Date.now() + 60_000), ad: "test" });
    // Başka testlerin siparişleri de dönemde olabilir: yalnızca bizimkilere bak.
    const urun = r.urunler.find((u) => u.ad === ad);
    // 200 − 100 = 100 ve 100 − 100 = 0 → 2 adet, 100 ₺ brüt kâr
    assert.deepEqual([urun?.adet, urun?.karKurus], [2, 10000]);
    const kamp = r.kampanyalar.find((x) => x.ad === k.ad);
    // 100 net − 100 maliyet − 50 kargo = −50
    assert.deepEqual([kamp?.adet, kamp?.indirimKurus, kamp?.karKurus], [1, 11000, -5000]);
    const zarar = r.zararEdenler.find((z) => z.numara === indirimli);
    assert.equal(zarar?.katkiKurus, -5000);
    assert.equal(r.zararEdenler.some((z) => z.numara === odenen), false);
  });
});
