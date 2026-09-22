import "./hazirlik";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { odemeDurumu } from "@/ui/odeme-bicim";

/**
 * Ödeme yöntemlerinin açıklığı (K-76).
 *
 * Bu kural bozulursa sonucu şu: ödenemeyecek bir sipariş açılıyor, stok
 * düşüyor ve müşteri parayı nereye göndereceğini bilmeden bekliyor. O yüzden
 * kural tek yerde ve sınavlı.
 */

describe("odemeDurumu", () => {
  it("havale bilgisi doluysa havale açık", () => {
    const d = odemeDurumu(false, "Deneme Bankası\nTR00 0000");
    assert.equal(d.havale, true);
    assert.equal(d.alinabilir, true);
  });

  it("havale bilgisi boşsa havale kapalı", () => {
    assert.equal(odemeDurumu(false, "").havale, false);
  });

  it("yalnızca boşluk içeren havale bilgisi dolu sayılmıyor", () => {
    // Ayar kutusuna basılan bir enter "IBAN girildi" demek değil.
    assert.equal(odemeDurumu(false, "   \n\t  ").havale, false);
  });

  it("ikisi de kapalıysa sipariş alınamıyor", () => {
    assert.equal(odemeDurumu(false, "").alinabilir, false);
  });

  it("kart açıksa havale olmadan da sipariş alınabiliyor", () => {
    const d = odemeDurumu(true, "");
    assert.equal(d.kart, true);
    assert.equal(d.havale, false);
    assert.equal(d.alinabilir, true);
  });

  it("ikisi birden açık olabiliyor", () => {
    const d = odemeDurumu(true, "TR00 0000");
    assert.deepEqual(d, { kart: true, havale: true, alinabilir: true });
  });
});
