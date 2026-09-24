import { atlamaSebebi, kimlik, testDb } from "./veritabani";
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { pazarlamaIzniniKapat } from "@/server/sepet-hatirlatma";
import { hesabiSil } from "@/server/kisisel-veri";
import { jetonHarca, topluIptalJetonu } from "@/server/uyelik";

/** İzin kayıtları ve e-bülten jetonları (K-125). */

describe("izin kayıtları (veritabanı)", { skip: atlamaSebebi }, () => {
  const eposta = () => `${kimlik("iys").toLowerCase()}@ornek.com`;
  const epostalar: string[] = [];

  async function musteri(izin: boolean) {
    const e = eposta();
    epostalar.push(e);
    return testDb().customer.create({
      data: {
        id: kimlik("musteri"),
        adSoyad: "Test Kişi",
        eposta: e,
        sifreOzeti: "x",
        pazarlamaIzni: izin,
        pazarlamaIzniTarihi: izin ? new Date() : null,
        epostaDogrulandi: new Date(),
      },
    });
  }

  after(async () => {
    const db = testDb();
    await db.consentEvent.deleteMany({ where: { eposta: { in: epostalar } } });
    await db.customerToken.deleteMany({ where: { customer: { eposta: { in: epostalar } } } });
    await db.customer.deleteMany({ where: { eposta: { in: epostalar } } });
  });

  it("listeden çıkış RET kaydı düşürüyor; izni zaten kapalıysa düşürmüyor", async () => {
    const m = await musteri(true);
    await pazarlamaIzniniKapat(m.id);
    await pazarlamaIzniniKapat(m.id);
    const kayitlar = await testDb().consentEvent.findMany({ where: { eposta: m.eposta } });
    assert.deepEqual(kayitlar.map((k) => k.durum), ["RET"]);
    assert.equal(kayitlar[0].iysBildirildi, null);
  });

  it("hesap silinince izinli müşteri için RET kalıyor", async () => {
    const m = await musteri(true);
    await hesabiSil(m.id);
    const kayitlar = await testDb().consentEvent.findMany({ where: { eposta: m.eposta } });
    assert.deepEqual(kayitlar.map((k) => k.durum), ["RET"]);
  });

  it("toplu jetonlar kişiye özel ve listeden çıkarıyor", async () => {
    const a = await musteri(true);
    const b = await musteri(true);
    const jetonlar = await topluIptalJetonu([a.id, b.id]);
    assert.equal(jetonlar.size, 2);
    assert.notEqual(jetonlar.get(a.id), jetonlar.get(b.id));
    const sonuc = await jetonHarca(jetonlar.get(b.id)!, "pazarlama-iptal");
    assert.equal(sonuc?.customerId, b.id);
    // Tek kullanımlık.
    assert.equal(await jetonHarca(jetonlar.get(b.id)!, "pazarlama-iptal"), undefined);
  });
});
