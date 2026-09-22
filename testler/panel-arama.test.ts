import "./hazirlik";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  alanAramasi,
  aramaCoz,
  aramaKosulu,
  aramayaGoreSuz,
  aramayaUyuyorMu,
} from "@/ui/panel-arama-bicim";

/** Panel listelerinin araması (K-69). */

describe("aramaCoz", () => {
  it("boşlukları kırpar", () => {
    assert.equal(aramaCoz("  tulum  "), "tulum");
  });

  it("metin olmayan değerleri boşa çevirir", () => {
    for (const ham of [undefined, null, 5, ["a"]]) assert.equal(aramaCoz(ham), "");
  });

  it("çok uzun metni kısaltır — adres satırı şişmesin", () => {
    assert.equal(aramaCoz("a".repeat(500)).length, 100);
  });
});

describe("aramayaUyuyorMu", () => {
  it("Türkçe klavyeye takılmıyor: 'zibin' yazan 'Zıbın'ı buluyor (K-35)", () => {
    assert.equal(aramayaUyuyorMu(["Zıbın Body"], "zibin"), true);
    assert.equal(aramayaUyuyorMu(["Şık Çorap"], "sik corap"), true);
  });

  it("her kelime bulunmak zorunda — 'mavi tulum' mavi VE tulum demek", () => {
    assert.equal(aramayaUyuyorMu(["Mavi Tulum"], "mavi tulum"), true);
    assert.equal(aramayaUyuyorMu(["Mavi Zıbın"], "mavi tulum"), false);
  });

  it("kelimeler farklı alanlara dağılmış olabilir", () => {
    assert.equal(aramayaUyuyorMu(["Tulum", "Mavi"], "mavi tulum"), true);
  });

  it("boş aramada her kayıt uyuyor", () => {
    assert.equal(aramayaUyuyorMu(["herhangi"], ""), true);
  });

  it("boş ve tanımsız alanlara takılmıyor", () => {
    assert.equal(aramayaUyuyorMu([null, undefined, "Tulum"], "tulum"), true);
  });

  it("tek harflik parçalar aramayı bozmuyor", () => {
    // `kelimeler` tek harfi atıyor: neredeyse her kayda uyuyor.
    assert.equal(aramayaUyuyorMu(["Tulum"], "a tulum"), true);
  });

  it("kısa kod araması listeyi sessizce açmıyor: '0-3' yalnızca 0-3'ü bulur", () => {
    // Bütün parçalar tek harf olduğunda `kelimeler` boş dizi veriyordu ve
    // arama her kayda uyuyordu — süzdüğünü sanan kullanıcı tam listeyi
    // görüyordu (K-69).
    assert.equal(aramayaUyuyorMu(["0-3 ay", "56 - 62 cm"], "0-3"), true);
    assert.equal(aramayaUyuyorMu(["3-6 ay", "62 - 68 cm"], "0-3"), false);
    assert.equal(aramayaUyuyorMu(["12-18 ay"], "0-3"), false);
  });

  it("kısa kodda da Türkçe harf katlaması çalışıyor", () => {
    assert.equal(aramayaUyuyorMu(["Şık"], "sik"), true);
  });
});

describe("aramayaGoreSuz", () => {
  const liste = [
    { ad: "Mavi Tulum", kod: "mt" },
    { ad: "Zıbın", kod: "zb" },
    { ad: "Mavi Şapka", kod: "ms" },
  ];

  it("boş aramada listeyi olduğu gibi verir", () => {
    assert.equal(aramayaGoreSuz(liste, "", (k) => [k.ad]).length, 3);
  });

  it("uyanları sırayı bozmadan süzer", () => {
    const sonuc = aramayaGoreSuz(liste, "mavi", (k) => [k.ad]);
    assert.deepEqual(sonuc.map((k) => k.kod), ["mt", "ms"]);
  });

  it("kod üzerinden de bulunabiliyor", () => {
    assert.deepEqual(
      aramayaGoreSuz(liste, "zb", (k) => [k.ad, k.kod]).map((k) => k.kod),
      ["zb"],
    );
  });

  it("kaynak listeyi değiştirmiyor", () => {
    const kopya = [...liste];
    aramayaGoreSuz(liste, "mavi", (k) => [k.ad]);
    assert.deepEqual(liste, kopya);
  });
});

describe("aramaKosulu", () => {
  it("boş aramada koşul üretmiyor", () => {
    assert.deepEqual(aramaKosulu(""), {});
  });

  it("her kelime için ayrı AND koşulu kuruyor", () => {
    assert.deepEqual(aramaKosulu("mavi tulum"), {
      AND: [{ aramaMetni: { contains: "mavi" } }, { aramaMetni: { contains: "tulum" } }],
    });
  });

  it("kısa kodda tek parçalı koşula düşüyor — boş koşula değil", () => {
    assert.deepEqual(aramaKosulu("0-3"), { aramaMetni: { contains: "0 3" } });
  });
});

describe("alanAramasi", () => {
  it("boş aramada koşul üretmiyor", () => {
    assert.deepEqual(alanAramasi("", ["ad"]), {});
  });

  it("alanları OR ile bağlıyor", () => {
    const k = alanAramasi("BA-2026", ["ad", "kuponKodu"]) as { OR: unknown[] };
    assert.equal(k.OR.length, 2);
  });

  it("noktalı alanı iç içe nesneye çeviriyor", () => {
    // "order.numara" → { order: { numara: { contains: ... } } }
    const k = alanAramasi("BA-1", ["order.numara"]) as {
      OR: [{ order: { numara: { contains: string; mode: string } } }];
    };
    assert.equal(k.OR[0].order.numara.contains, "BA-1");
    assert.equal(k.OR[0].order.numara.mode, "insensitive");
  });
});
