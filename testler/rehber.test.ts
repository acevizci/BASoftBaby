import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { kelimeSayisi, rehberCoz } from "@/ui/rehber-bicim";

/** Kategori rehber yazısı (K-130). */

describe("rehber biçimi", () => {
  it("paragraf, ara başlık ve madde listesi", () => {
    const b = rehberCoz(
      "Pamuk nefes alır.\nYazın serin tutar.\n\n## Hangi beden?\n- 0-3 ay: 50-62 cm\n- 3-6 ay: 62-68 cm\n\nSon söz.",
    );
    assert.deepEqual(b, [
      { tur: "paragraf", metin: "Pamuk nefes alır. Yazın serin tutar." },
      { tur: "baslik", metin: "Hangi beden?" },
      { tur: "liste", maddeler: ["0-3 ay: 50-62 cm", "3-6 ay: 62-68 cm"] },
      { tur: "paragraf", metin: "Son söz." },
    ]);
  });

  it("HTML metin olarak kalıyor, boş metin blok üretmiyor", () => {
    assert.deepEqual(rehberCoz("<b>kalın</b>"), [{ tur: "paragraf", metin: "<b>kalın</b>" }]);
    assert.deepEqual(rehberCoz("  \n\n "), []);
  });

  it("kelime sayısı noktalamayı saymıyor", () => {
    assert.equal(kelimeSayisi("## Hangi beden? - 0-3 ay"), 4);
  });
});
