import { atlamaSebebi, testDb } from "./veritabani";
import { ipAyarla } from "./sahte-headers";
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { islemSinirla } from "@/server/istek-siniri";

/** Halka açık işlemlerde hız sınırı (K-64, K-122). */

describe("istek sınırı (veritabanı)", { skip: atlamaSebebi }, () => {
  const ip = `T_${Math.random().toString(36).slice(2)}`;
  const adres = `t_${Math.random().toString(36).slice(2)}@ornek.com`;

  after(async () => {
    ipAyarla(undefined);
    // Sayaç anahtarları özetlenmiş; bu testin açtıkları işlem ön ekinden bulunuyor.
    await testDb().loginThrottle.deleteMany({
      where: { id: { startsWith: "sifirlama-adres:" } },
    });
    await testDb().loginThrottle.deleteMany({ where: { id: { startsWith: "kupon:" } } });
  });

  it("adres başına sayaç IP'den bağımsız: IP değiştirmek işe yaramıyor", async () => {
    for (let i = 0; i < 3; i++) {
      ipAyarla(`${ip}-${i}`);
      assert.equal((await islemSinirla("sifirlama-adres", adres)).izin, true);
    }
    ipAyarla(`${ip}-yeni`);
    const son = await islemSinirla("sifirlama-adres", adres);
    assert.equal(son.izin, false);
    assert.ok(!son.izin && son.kalanDk > 0 && son.kalanDk <= 60);
    // Başka bir adresin sayacı ayrı.
    assert.equal((await islemSinirla("sifirlama-adres", `x${adres}`)).izin, true);
  });

  it("IP başına sayaç: sınırı aşan IP engelleniyor, öteki geçiyor", async () => {
    ipAyarla(ip);
    for (let i = 0; i < 20; i++) assert.equal((await islemSinirla("kupon")).izin, true);
    assert.equal((await islemSinirla("kupon")).izin, false);
    ipAyarla(`${ip}-baska`);
    assert.equal((await islemSinirla("kupon")).izin, true);
  });

  it("adres bilinmiyorsa sınır uygulanmıyor", async () => {
    ipAyarla(undefined);
    for (let i = 0; i < 25; i++) assert.equal((await islemSinirla("kupon")).izin, true);
  });
});
