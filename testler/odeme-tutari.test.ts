import "./hazirlik";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { odemeTutariTutuyor } from "@/server/odeme-akis";

/** Karttan çekilen tutarın kabulü (K-110). */
describe("ödeme tutarı", () => {
  it("tek çekimde birebir olmalı", () => {
    assert.equal(odemeTutariTutuyor(30000, 30000, 1), true);
    assert.equal(odemeTutariTutuyor(30100, 30000, 1), false);
    assert.equal(odemeTutariTutuyor(29900, 30000, 1), false);
  });

  it("taksitte yansıtılan vade farkı kabul, eksik hiçbir zaman", () => {
    assert.equal(odemeTutariTutuyor(32400, 30000, 6), true);
    assert.equal(odemeTutariTutuyor(30000, 30000, 6), true);
    assert.equal(odemeTutariTutuyor(29999, 30000, 6), false);
  });
});
