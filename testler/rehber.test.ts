import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { duzMetin, kelimeSayisi, rehberCoz, satirParcala } from "@/ui/rehber-bicim";

/** Kategori rehber yazısı (K-130). */

describe("rehber biçimi", () => {
  it("paragraf, ara başlık ve madde listesi", () => {
    const b = rehberCoz(
      "Pamuk nefes alır.\nYazın serin tutar.\n\n## Hangi beden?\n- 0-3 ay: 50-62 cm\n- 3-6 ay: 62-68 cm\n\nSon söz.",
    );
    assert.deepEqual(b, [
      { tur: "paragraf", parcalar: [{ metin: "Pamuk nefes alır. Yazın serin tutar." }] },
      { tur: "baslik", metin: "Hangi beden?" },
      { tur: "liste", maddeler: [[{ metin: "0-3 ay: 50-62 cm" }], [{ metin: "3-6 ay: 62-68 cm" }]] },
      { tur: "paragraf", parcalar: [{ metin: "Son söz." }] },
    ]);
  });

  it("HTML metin olarak kalıyor, boş metin blok üretmiyor", () => {
    assert.deepEqual(rehberCoz("<b>kalın</b>"), [{ tur: "paragraf", parcalar: [{ metin: "<b>kalın</b>" }] }]);
    assert.deepEqual(rehberCoz("  \n\n "), []);
  });

  it("kelime sayısı noktalamayı saymıyor", () => {
    assert.equal(kelimeSayisi("## Hangi beden? - 0-3 ay"), 4);
  });
});

describe("bağlantılar (K-132)", () => {
  it("site içi ve https bağlantı; tehlikeli adres düz yazı kalıyor", () => {
    assert.deepEqual(satirParcala("Bak: [tulumlar](/tulum) ve [kaynak](https://ornek.com/a)."), [
      { metin: "Bak: " },
      { metin: "tulumlar", adres: "/tulum" },
      { metin: " ve " },
      { metin: "kaynak", adres: "https://ornek.com/a" },
      { metin: "." },
    ]);
    assert.deepEqual(satirParcala("[x](javascript:alert(1))"), [{ metin: "[x](javascript:alert(1))" }]);
    assert.deepEqual(satirParcala("[x](//kotu.com)"), [{ metin: "[x](//kotu.com)" }]);
  });

  it("düz metin ve kelime sayısı bağlantıyı yazısı olarak sayıyor", () => {
    assert.equal(duzMetin("## Başlık\n- [iki kelime](/a) burada"), "Başlık iki kelime burada");
    assert.equal(kelimeSayisi("[iki kelime](/a) burada"), 3);
  });
});
