import "./hazirlik";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  enIyiKampanya,
  kampanyaIndirimi,
  type IndirimSatiri,
  type KampanyaKaydi,
} from "@/server/kampanya";
import { kargoHesapla } from "@/server/sepet";
import { belgeBasilabilirMi } from "@/server/siparis-belge";
import { fiyatYaz } from "@/ui/katalog-bicim";

/**
 * Paranın hesaplandığı yerler.
 *
 * Bu dosyadaki her sınav bir kuralın karşılığı; kural bozulursa müşteriden
 * yanlış para alınır ya da mağaza zarar eder. En pahalı hatalar burada
 * oluyor, o yüzden testlerin de ilki bunlar (K-68).
 */

function kampanya(ek: Partial<KampanyaKaydi> = {}): KampanyaKaydi {
  return {
    id: "k1",
    ad: "Deneme",
    tip: "yuzde",
    deger: 10,
    kapsam: "hepsi",
    categoryId: null,
    productId: null,
    kuponKodu: null,
    enAzSepetKurus: 0,
    ...ek,
  };
}

const satir = (ek: Partial<IndirimSatiri> = {}): IndirimSatiri => ({
  productId: "u1",
  categoryId: "kat1",
  araToplamKurus: 10000,
  ...ek,
});

describe("kampanyaIndirimi", () => {
  it("yüzde indirimini aşağı yuvarlar — kuruş kesri müşteriye yazılmaz", () => {
    // 3333 kuruşun %10'u 333,3; yukarı yuvarlansaydı mağaza her siparişte
    // bir kuruş kaybederdi.
    assert.equal(kampanyaIndirimi(kampanya({ deger: 10 }), [satir({ araToplamKurus: 3333 })], 3333), 333);
  });

  it("tutar indirimi kapsamdaki tabanı aşamaz — sepet eksiye düşmez", () => {
    const k = kampanya({ tip: "tutar", deger: 50000 });
    assert.equal(kampanyaIndirimi(k, [satir({ araToplamKurus: 10000 })], 10000), 10000);
  });

  it("en az sepet tutarı altında hiç uygulanmaz", () => {
    const k = kampanya({ enAzSepetKurus: 20000 });
    assert.equal(kampanyaIndirimi(k, [satir()], 10000), 0);
  });

  it("en az sepet tutarına tam eşitken uygulanır", () => {
    const k = kampanya({ enAzSepetKurus: 10000 });
    assert.equal(kampanyaIndirimi(k, [satir()], 10000), 1000);
  });

  it("kategori kapsamı yalnızca o kategorinin satırlarını taban alır", () => {
    const k = kampanya({ kapsam: "kategori", categoryId: "kat1", deger: 50 });
    const satirlar = [
      satir({ categoryId: "kat1", araToplamKurus: 10000 }),
      satir({ categoryId: "kat2", araToplamKurus: 90000 }),
    ];
    // Taban 10000, indirim 5000 — 100000'in yarısı değil.
    assert.equal(kampanyaIndirimi(k, satirlar, 100000), 5000);
  });

  it("ürün kapsamı yalnızca o ürünü taban alır", () => {
    const k = kampanya({ kapsam: "urun", productId: "u1", tip: "tutar", deger: 99999 });
    const satirlar = [satir({ productId: "u1", araToplamKurus: 4000 }), satir({ productId: "u2" })];
    assert.equal(kampanyaIndirimi(k, satirlar, 14000), 4000);
  });

  it("kapsamda hiç satır yoksa indirim yok", () => {
    const k = kampanya({ kapsam: "urun", productId: "yok" });
    assert.equal(kampanyaIndirimi(k, [satir()], 10000), 0);
  });

  it("yüzde 100'ü aşamaz", () => {
    assert.equal(kampanyaIndirimi(kampanya({ deger: 500 }), [satir()], 10000), 10000);
  });

  it("sıfır ve eksi yüzde indirim vermez", () => {
    assert.equal(kampanyaIndirimi(kampanya({ deger: 0 }), [satir()], 10000), 0);
    assert.equal(kampanyaIndirimi(kampanya({ deger: -20 }), [satir()], 10000), 0);
  });
});

describe("enIyiKampanya", () => {
  it("en çok indireni seçer — indirimler üst üste binmez (K-10)", () => {
    const secilen = enIyiKampanya(
      [
        kampanya({ id: "az", deger: 10 }),
        kampanya({ id: "cok", deger: 30 }),
        kampanya({ id: "orta", deger: 20 }),
      ],
      [satir()],
      10000,
    );
    assert.equal(secilen?.id, "cok");
    assert.equal(secilen?.indirimKurus, 3000);
  });

  it("eşitlikte listede önce gelen kazanır — sonuç her seferinde aynı", () => {
    const liste = [kampanya({ id: "ilk", deger: 10 }), kampanya({ id: "ikinci", deger: 10 })];
    assert.equal(enIyiKampanya(liste, [satir()], 10000)?.id, "ilk");
    assert.equal(enIyiKampanya(liste, [satir()], 10000)?.id, "ilk");
  });

  it("hiçbiri uymuyorsa undefined döner", () => {
    assert.equal(enIyiKampanya([kampanya({ enAzSepetKurus: 99999 })], [satir()], 10000), undefined);
  });

  it("boş kampanya listesinde undefined döner", () => {
    assert.equal(enIyiKampanya([], [satir()], 10000), undefined);
  });

  it("kuponlu kampanyayı kuponMu ile işaretler", () => {
    const s = enIyiKampanya([kampanya({ kuponKodu: "BAHAR" })], [satir()], 10000);
    assert.equal(s?.kuponMu, true);
  });
});

describe("kargoHesapla", () => {
  const ayar = { kargoKurus: 4990, bedavaKargoEsigi: 50000 } as Parameters<typeof kargoHesapla>[1];

  it("boş sepette kargo yok", () => {
    assert.equal(kargoHesapla(0, ayar, false), 0);
  });

  it("eşiğin altında kargo alınır", () => {
    assert.equal(kargoHesapla(49900, ayar, true), 4990);
  });

  it("eşiğe tam eşitken kargo bedava", () => {
    assert.equal(kargoHesapla(50000, ayar, true), 0);
  });

  it("eşik sıfırsa kargo hep ücretli — bedava kargo kapalı demek", () => {
    const kapali = { kargoKurus: 4990, bedavaKargoEsigi: 0 } as typeof ayar;
    assert.equal(kargoHesapla(9999999, kapali, true), 4990);
  });

  it("kupon sepeti sıfırlasa da dolu sepette kargo ücretli kalır", () => {
    // Ürün bedava olabilir; kargo yine de taşınıyor (K-62).
    assert.equal(kargoHesapla(0, ayar, true), 4990);
  });
});

describe("belgeBasilabilirMi", () => {
  it("ödenmiş ve iptal olmayan siparişe basılır", () => {
    assert.equal(belgeBasilabilirMi({ odemeDurumu: "odendi", durum: "hazirlaniyor" }).basilabilir, true);
  });

  it("ödemesi bekleyen siparişe basılmaz", () => {
    assert.equal(belgeBasilabilirMi({ odemeDurumu: "bekliyor", durum: "yeni" }).basilabilir, false);
  });

  it("ödenmiş olsa bile iptal edilmişe basılmaz", () => {
    const d = belgeBasilabilirMi({ odemeDurumu: "odendi", durum: "iptal" });
    assert.equal(d.basilabilir, false);
    assert.match(d.basilabilir === false ? d.sebep : "", /iptal/i);
  });

  it("iade edilmiş ödeme durumunda basılmaz", () => {
    assert.equal(belgeBasilabilirMi({ odemeDurumu: "iade", durum: "teslim" }).basilabilir, false);
  });
});

describe("fiyatYaz", () => {
  it("kuruşu Türkçe biçimde yazar", () => {
    assert.equal(fiyatYaz(24990), "249,90 ₺");
  });

  it("tam sayıda da iki basamak gösterir", () => {
    assert.equal(fiyatYaz(10000), "100,00 ₺");
  });

  it("sıfırı yazar", () => {
    assert.equal(fiyatYaz(0), "0,00 ₺");
  });

  it("binlik ayracı koyar", () => {
    assert.equal(fiyatYaz(123456789), "1.234.567,89 ₺");
  });
});
