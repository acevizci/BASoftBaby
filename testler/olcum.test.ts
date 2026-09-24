import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cerezOku,
  googleKimligiCoz,
  izinCoz,
  izinDegeri,
  metaKimligiCoz,
  olayParametreleri,
} from "@/ui/olcum-bicim";

/** Reklam ölçümü ve çerez onayı (K-124). */

describe("çerez onayı", () => {
  it("karar sürümüyle saklanıyor; eski sürüm ya da bozuk değer sorulmamış sayılıyor", () => {
    assert.equal(izinCoz(izinDegeri("evet")), "evet");
    assert.equal(izinCoz(izinDegeri("hayir")), "hayir");
    assert.equal(izinCoz("evet.0"), undefined);
    assert.equal(izinCoz("belki.1"), undefined);
    assert.equal(izinCoz(undefined), undefined);
  });

  it("document.cookie metninden okuma", () => {
    assert.equal(cerezOku("a=1; cerez_izni=evet.1; b=2", "cerez_izni"), "evet.1");
    assert.equal(cerezOku("xcerez_izni=evet.1", "cerez_izni"), undefined);
  });
});

describe("ölçüm kimlikleri", () => {
  it("Meta Pixel: yalnızca rakam; boş kapatmak demek", () => {
    assert.equal(metaKimligiCoz(" 1234567890123456 "), "1234567890123456");
    assert.equal(metaKimligiCoz(""), "");
    assert.equal(metaKimligiCoz("12345"), null);
    assert.equal(metaKimligiCoz("<script>"), null);
  });

  it("Google: G- ya da AW-, büyük harfe çevriliyor", () => {
    assert.equal(googleKimligiCoz("g-abc123xyz"), "G-ABC123XYZ");
    assert.equal(googleKimligiCoz("AW-123456789"), "AW-123456789");
    assert.equal(googleKimligiCoz("UA-1234-1"), null);
    assert.equal(googleKimligiCoz("G-\"x"), null);
  });
});

describe("olay parametreleri", () => {
  it("satış: tutar TL, sipariş numarası Google'da işlem kimliği", () => {
    const p = olayParametreleri({ tutarKurus: 124990, siparisNo: "BA-2026-0007", adet: 3 });
    assert.deepEqual(p.meta, { value: 1249.9, currency: "TRY", num_items: 3 });
    assert.deepEqual(p.google, { value: 1249.9, currency: "TRY", transaction_id: "BA-2026-0007" });
  });

  it("ürün görüntüleme: grup kimliği Meta'da product_group", () => {
    const p = olayParametreleri({ urunIdleri: ["u1"], grup: true, urunAdi: "Tulum" });
    assert.equal(p.meta.content_type, "product_group");
    assert.deepEqual(p.google.items, [{ item_id: "u1", item_name: "Tulum" }]);
  });
});
