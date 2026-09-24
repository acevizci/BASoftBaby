import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { iadeBolustur, kodCoz, kodUret, kullanilacak, tahsilat } from "@/server/hediye-ceki-bicim";

/** Hediye çeki (K-137). */

describe("hediye çeki kodu", () => {
  it("biçim ve yazım toleransı", () => {
    const k = kodUret();
    assert.match(k, /^HC-[34679ACDEFGHJKMNPQRTUVWXY]{4}-[34679ACDEFGHJKMNPQRTUVWXY]{4}$/);
    assert.equal(kodCoz(k.toLowerCase().replace(/-/g, " ")), k);
    assert.equal(kodCoz("7k3mq9tx"), "HC-7K3M-Q9TX");
    assert.equal(kodCoz("HC-123"), null);
  });

  it("kullanılacak tutar ve tahsilat", () => {
    assert.equal(kullanilacak(50000, 30000), 30000);
    assert.equal(kullanilacak(20000, 30000), 20000);
    assert.equal(tahsilat({ toplamKurus: 30000, hediyeCekiKurus: 20000 }), 10000);
    assert.equal(tahsilat({ toplamKurus: 30000 }), 30000);
  });
});

describe("iadenin bölünmesi", () => {
  it("çek yoksa hepsi para", () => {
    assert.deepEqual(
      iadeBolustur({ tutarKurus: 5000, toplamKurus: 10000, hediyeCekiKurus: 0, oncekiParaKurus: 0, oncekiCekKurus: 0 }),
      { paraKurus: 5000, cekKurus: 0 },
    );
  });

  it("ödendiği oranda: 800 çek + 200 para, 500'lük iade → 100 para + 400 çek", () => {
    assert.deepEqual(
      iadeBolustur({ tutarKurus: 50000, toplamKurus: 100000, hediyeCekiKurus: 80000, oncekiParaKurus: 0, oncekiCekKurus: 0 }),
      { paraKurus: 10000, cekKurus: 40000 },
    );
  });

  it("parça parça iadelerde toplam ödeneni aşmıyor", () => {
    const ilk = iadeBolustur({ tutarKurus: 50000, toplamKurus: 100000, hediyeCekiKurus: 80000, oncekiParaKurus: 0, oncekiCekKurus: 0 });
    const ikinci = iadeBolustur({
      tutarKurus: 50000,
      toplamKurus: 100000,
      hediyeCekiKurus: 80000,
      oncekiParaKurus: ilk.paraKurus,
      oncekiCekKurus: ilk.cekKurus,
    });
    assert.equal(ilk.paraKurus + ikinci.paraKurus, 20000);
    assert.equal(ilk.cekKurus + ikinci.cekKurus, 80000);
  });

  it("tamamı çekle ödenmişse hepsi çeke", () => {
    assert.deepEqual(
      iadeBolustur({ tutarKurus: 30000, toplamKurus: 30000, hediyeCekiKurus: 30000, oncekiParaKurus: 0, oncekiCekKurus: 0 }),
      { paraKurus: 0, cekKurus: 30000 },
    );
  });
});
