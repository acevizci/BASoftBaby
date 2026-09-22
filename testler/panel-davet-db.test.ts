import { atlamaSebebi, kimlik, testDb } from "./veritabani";
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { sifreOzetle } from "@/server/uyelik";
import {
  acikKullaniciSayisi,
  kimlikDogrula,
  sifirlamaJetonuHarca,
  sifirlamaJetonuUret,
  sifreyiYaz,
} from "@/server/yonetim-kimlik";

/**
 * Panel kullanıcısının e-postası davetle doğrulanıyor (K-87).
 *
 * Davet bekleyen hesap şifresi bilinse bile giremiyor; davet bağlantısıyla
 * şifre koymak hesabı doğruluyor; davet bekleyen hesap "son açık hesap"
 * sayımına girmiyor.
 */
describe("panel daveti (veritabanı)", { skip: atlamaSebebi }, () => {
  const ids: string[] = [];
  after(async () => {
    if (ids.length) await testDb().adminUser.deleteMany({ where: { id: { in: ids } } });
  });

  it("davet bekleyen giremiyor, bağlantıyla şifre koyunca giriyor", async () => {
    const db = testDb();
    const id = kimlik("admin");
    ids.push(id);
    const eposta = `${id.toLowerCase()}@deneme.test`;
    await db.adminUser.create({
      data: { id, eposta, adSoyad: "Davetli", sifreOzeti: await sifreOzetle("Bilinen123") },
    });

    const oncekiSayi = await acikKullaniciSayisi();
    assert.equal(await kimlikDogrula(eposta, "Bilinen123"), undefined, "davetli girememeli");

    const jeton = await sifirlamaJetonuUret(id, 48);
    const kullanici = await sifirlamaJetonuHarca(jeton);
    assert.equal(kullanici?.id, id);
    await sifreyiYaz(id, await sifreOzetle("YeniSifre123"));

    const kayit = await db.adminUser.findUniqueOrThrow({ where: { id } });
    assert.ok(kayit.epostaDogrulandi, "bağlantıyla şifre koymak hesabı doğrulamalı");
    assert.equal((await kimlikDogrula(eposta, "YeniSifre123"))?.id, id);
    assert.equal(await acikKullaniciSayisi(), oncekiSayi + 1, "doğrulanınca sayıma girmeli");
  });
});
