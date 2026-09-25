import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aylik, siradakiBeden } from "@/server/buyume-bicim";

/** Büyüme hatırlatması hesabı (K-147). */

const BEDENLER = ["0-3 ay", "3-6 ay", "6-9 ay", "9-12 ay", "12-18 ay", "18-24 ay", "Standart"];
const GUN = 24 * 60 * 60 * 1000;

describe("büyüme hatırlatması", () => {
  it("doğumdan bugüne ayı hesaplıyor, doğmamışta boş", () => {
    const dogum = new Date("2026-01-01T12:00:00Z");
    assert.equal(aylik(dogum, dogum), 0);
    assert.ok(Math.abs(aylik(dogum, new Date(dogum.getTime() + 365.25 * GUN))! - 12) < 1e-9);
    assert.equal(aylik(dogum, new Date(dogum.getTime() - GUN)), undefined);
  });

  it("alt sınırı yarım ay içinde olan bedeni veriyor", () => {
    assert.deepEqual(siradakiBeden(BEDENLER, 5.7), { beden: "6-9 ay", ay: 6 });
    assert.deepEqual(siradakiBeden(BEDENLER, 11.6), { beden: "12-18 ay", ay: 12 });
    assert.deepEqual(siradakiBeden(BEDENLER, 2.5), { beden: "3-6 ay", ay: 3 });
  });

  it("pencere dışında ya da sınırı geçmişse bir şey önermiyor", () => {
    assert.equal(siradakiBeden(BEDENLER, 4), undefined);
    assert.equal(siradakiBeden(BEDENLER, 6), undefined);
    assert.equal(siradakiBeden(BEDENLER, 30), undefined);
    assert.equal(siradakiBeden(BEDENLER, 40), undefined);
    assert.equal(siradakiBeden(["Standart"], 5.8), undefined);
  });
});
