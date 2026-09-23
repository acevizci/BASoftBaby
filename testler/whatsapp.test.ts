import "./hazirlik";
import { test } from "node:test";
import assert from "node:assert/strict";
import { whatsappNumarasi } from "@/server/whatsapp";

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
