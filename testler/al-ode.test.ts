import "./hazirlik";
import { describe, it } from "node:test";
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
