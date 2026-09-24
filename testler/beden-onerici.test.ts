import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aralikCoz, ayAraligi, bedenOner, kacAylik, urundeKarsilik } from "@/ui/beden-onerici-bicim";

/** Beden önerici (K-136). */

const OLCULER = {
  "0-3 ay": { boy: "56 - 62 cm", kilo: "3 - 6 kg" },
  "3-6 ay": { boy: "62 - 68 cm", kilo: "6 - 8 kg" },
  "6-9 ay": { boy: "68 - 74 cm", kilo: "8 - 9 kg" },
  "9-12 ay": { boy: "74 - 80 cm", kilo: "9 - 10 kg" },
  "2-3 yaş": { boy: "92-98", kilo: "" },
};

describe("beden önerici", () => {
  it("aralıkları okuyor", () => {
    assert.deepEqual(aralikCoz("56 - 62 cm"), [56, 62]);
    assert.deepEqual(aralikCoz("11 - 12,5 kg"), [11, 12.5]);
    assert.deepEqual(aralikCoz("92-98"), [92, 98]);
    assert.equal(aralikCoz(""), null);
    assert.deepEqual(ayAraligi("2-3 yaş"), [24, 36]);
    assert.deepEqual(ayAraligi("0-3 ay"), [0, 3]);
  });

  it("boy öncelikli; sınırdaki bebeğe büyük beden", () => {
    assert.deepEqual(bedenOner(OLCULER, { boyCm: 65, kiloKg: 9 }), { beden: "3-6 ay", neyeGore: "boy", sinirda: false });
    // 62 hem 0-3'ün üst hem 3-6'nın alt sınırı: büyük olan.
    assert.equal(bedenOner(OLCULER, { boyCm: 62 })?.beden, "3-6 ay");
    // 67,5: 3-6 aralığının son %15'inde (eşik 67,1).
    assert.deepEqual(bedenOner(OLCULER, { boyCm: 67.5 }), { beden: "3-6 ay", neyeGore: "boy", sinirda: true });
  });

  it("boy yoksa kilo, o da yoksa yaş", () => {
    assert.deepEqual(bedenOner(OLCULER, { kiloKg: 7 }), { beden: "3-6 ay", neyeGore: "kilo", sinirda: false });
    const bugun = new Date("2026-09-24T12:00:00");
    assert.equal(kacAylik("2026-09-30", bugun), undefined);
    assert.equal(bedenOner(OLCULER, { dogum: "2026-05-01" }, bugun)?.beden, "3-6 ay");
    assert.equal(bedenOner(OLCULER, {}, bugun), null);
  });

  it("tablonun dışı: en küçük ya da en büyük", () => {
    assert.equal(bedenOner(OLCULER, { boyCm: 50 })?.beden, "0-3 ay");
    assert.equal(bedenOner(OLCULER, { boyCm: 120 })?.beden, "2-3 yaş");
  });

  it("üründe yoksa en yakın beden; sınırdaysa bir üstü", () => {
    assert.deepEqual(urundeKarsilik(OLCULER, ["0-3 ay", "6-9 ay"], { beden: "3-6 ay", neyeGore: "boy", sinirda: false }), {
      beden: "6-9 ay",
      tam: false,
    });
    assert.deepEqual(urundeKarsilik(OLCULER, ["3-6 ay", "6-9 ay"], { beden: "3-6 ay", neyeGore: "boy", sinirda: true }), {
      beden: "3-6 ay",
      tam: true,
      sonraki: "6-9 ay",
    });
  });
});
