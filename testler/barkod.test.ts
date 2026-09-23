import "./hazirlik";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { barkodMetni, barkodNoCoz, code128Degerleri, code128Genislikleri, code128Svg, kodlanabilirMi } from "@/server/barkod";

/**
 * Code 128 B (K-107). Beklenen bit dizisi bağımsız bir kodlayıcının
 * (JsBarcode) aynı metin için ürettiği; kodlayıcı yazılırken bütün
 * yazdırılabilir ASCII karakterlerle karşılaştırıldı.
 */
const BEKLENEN =
  "1101001000010001011000101000110001001101110010011101100100110111001100101110010010110000110110111101001101110011000010010100100111101011001000011110111010111010111101100011101011";

describe("Code 128 barkod", () => {
  it("bağımsız kodlayıcıyla bit bit aynı", () => {
    const bit = code128Genislikleri("BA-0-3ay-krem")
      .map((g, i) => (i % 2 === 0 ? "1" : "0").repeat(g))
      .join("");
    assert.equal(bit, BEKLENEN);
  });

  it("başlangıç B, sağlama ve durdurma doğru; her simge 11 modül", () => {
    const d = code128Degerleri("Z");
    assert.deepEqual(d, [104, 58, (104 + 58) % 103, 106]);
    assert.equal(code128Genislikleri("abc").length, 6 * 5 + 7);
    assert.equal(code128Genislikleri("abc").reduce((t, g) => t + g, 0), 11 * 5 + 13);
  });

  it("etiket kısa numarayı taşıyor; okutulan numara çözülüyor", () => {
    assert.equal(barkodMetni(1234), "B1234");
    assert.equal(barkodNoCoz("B1234"), 1234);
    assert.equal(barkodNoCoz(" b7 "), 7);
    assert.equal(barkodNoCoz("organik-zibin-B12"), undefined);
    // Kısa numara uzun SKU'nun üçte biri kadar modül: çizgiler üç kat kalın.
    assert.ok(code128Genislikleri("B1234").reduce((t, g) => t + g, 0) < 120);
  });

  it("Türkçe harf Code 128 B'de kodlanamıyor", () => {
    assert.equal(kodlanabilirMi("zibin-3-4Yaş-mavi"), false);
    assert.throws(() => code128Degerleri("ş"));
  });

  it("SVG'de etiket metni kaçırılıyor", () => {
    assert.doesNotMatch(code128Svg('a"<b>'), /<b>/);
  });
});
