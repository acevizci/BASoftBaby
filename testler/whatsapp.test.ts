import "./hazirlik";
import { test } from "node:test";
import assert from "node:assert/strict";
import { whatsappDugmeNumarasi, whatsappNumarasi } from "@/server/whatsapp";

test("cep numarası her yazılışta aynı wa.me numarasına dönüşüyor (K-99)", () => {
  for (const t of ["0555 123 45 67", "05551234567", "+90 555 123 45 67", "555 123 4567", "0090 555 123 45 67", "(0555) 123-45-67"]) {
    assert.equal(whatsappNumarasi(t), "905551234567", t);
  }
});

test("sabit hat, boş ya da eksik numara için düğme çıkmıyor (K-99)", () => {
  for (const t of ["", "0212 123 45 67", "+90 212 123 45 67", "0555 123 45", "444 1 234"]) {
    assert.equal(whatsappNumarasi(t), undefined, t);
  }
});

test("ayrı WhatsApp numarası önce, yoksa cep numarasıysa destek telefonu (K-158)", () => {
  const sabit = "0212 123 45 67";
  assert.equal(
    whatsappDugmeNumarasi({ whatsappNumara: "0555 111 22 33", destekTelefon: sabit }),
    "905551112233",
  );
  assert.equal(
    whatsappDugmeNumarasi({ whatsappNumara: "", destekTelefon: "0532 000 11 22" }),
    "905320001122",
  );
  assert.equal(whatsappDugmeNumarasi({ whatsappNumara: "", destekTelefon: sabit }), undefined);
  // Geçersiz WhatsApp numarası girilmişse cep numarası olan destek telefonuna düşüyor.
  assert.equal(
    whatsappDugmeNumarasi({ whatsappNumara: "0212 000 00 00", destekTelefon: "0532 000 11 22" }),
    "905320001122",
  );
});
