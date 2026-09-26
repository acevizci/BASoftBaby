import "./hazirlik";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { atlamaSebebi, kimlik, ON_EK, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { siparisOlustur, type SiparisGirdisi } from "@/server/siparis";
import { iadeKaydiAc, iadeyiGecersizSay, iadeyiTamamla } from "@/server/iade";
import { siparisiIptalEtVeStoguIadeEt } from "@/server/odeme-akis";
import type { SatisAyari } from "@/server/sepet";

/** Yanlış açılmış iade kaydını geçersiz sayma (K-175). */

const AYAR: SatisAyari = {
  kargoKurus: 0,
  bedavaKargoEsigi: 0,
  havaleBilgisi: "Test",
  havaleSaat: 72,
  havaleHatirlatmaSaat: 24,
  kdvOrani: 10,
  varsayilanTasiyici: "yurtici",
};

const girdi = (): SiparisGirdisi => ({
  adSoyad: "Test Kişi",
  eposta: `${ON_EK}${kimlik("m").toLowerCase()}@deneme.test`,
  telefon: "05001112233",
  adres: "Deneme Mahallesi No 1",
  ilce: "Kadıköy",
  il: "İstanbul",
  postaKodu: "34000",
  not: "",
  hediyePaketi: false,
  hediyeNotu: "",
  sozlesmeOnayi: new Date(),
});

/** "Ödendi" işaretlenmiş (yanlışlıkla) sipariş. */
async function odenmisSiparis() {
  const db = testDb();
  const { variantId } = await urunKur(10);
  await sepetKur(variantId, 1);
  const s = await siparisOlustur(girdi(), AYAR);
  assert.ok(s.tamam);
  return db.order.update({
    where: { numara: s.numara },
    data: { odemeDurumu: "odendi" },
    select: { id: true, toplamKurus: true },
  });
}

describe("İade kaydını geçersiz sayma", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("yanlışlıkla ödendi yapılıp iptal edilen sipariş: para hiç alınmadı", async () => {
    const db = testDb();
    const o = await odenmisSiparis();
    await siparisiIptalEtVeStoguIadeEt(o.id);
    const iade = await db.refund.findFirstOrThrow({ where: { orderId: o.id } });
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: o.id } })).odemeDurumu,
      "iade-bekliyor",
    );

    assert.equal(
      await iadeyiGecersizSay(iade.id, { sebep: "havale gelmemişti", alinmadi: true }),
      "tamam",
    );
    const k = await db.refund.findUniqueOrThrow({ where: { id: iade.id } });
    assert.equal(k.durum, "gecersiz");
    assert.match(k.aciklama, /Geçersiz: havale gelmemişti/);
    const s = await db.order.findUniqueOrThrow({ where: { id: o.id } });
    assert.equal(s.odemeDurumu, "bekliyor");
    assert.equal(s.durum, "iptal");

    // Geçersiz kayıt tamamlanamıyor, ikinci kez geçersiz sayılamıyor.
    assert.equal(await iadeyiTamamla(iade.id), undefined);
    assert.equal(await iadeyiGecersizSay(iade.id, { sebep: "yine", alinmadi: false }), "kapali");
  });

  it("sürmekte olan siparişte 'para alınmadı' seçilemiyor; yanlış kayıt ödendi'ye dönüyor", async () => {
    const db = testDb();
    const o = await odenmisSiparis();
    const id = await iadeKaydiAc(o.id, 1000, { aciklama: "Yanlış tutar" });
    assert.ok(id);
    assert.equal(
      await iadeyiGecersizSay(id, { sebep: "yanlış açıldı", alinmadi: true }),
      "iptal-degil",
    );
    assert.equal((await db.refund.findUniqueOrThrow({ where: { id } })).durum, "bekliyor");

    assert.equal(await iadeyiGecersizSay(id, { sebep: "yanlış açıldı", alinmadi: false }), "tamam");
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: o.id } })).odemeDurumu, "odendi");
    // Geçersiz kayıt sonraki iadelerin sınırını yemiyor: siparişin tamamı
    // yeniden iade edilebiliyor.
    const yeni = await iadeKaydiAc(o.id, o.toplamKurus);
    assert.ok(yeni);
    const r = await db.refund.findUniqueOrThrow({ where: { id: yeni } });
    assert.equal(r.tutarKurus, o.toplamKurus);
  });

  it("tamamlanmış iade varken ödeme durumu 'iade'", async () => {
    const db = testDb();
    const o = await odenmisSiparis();
    const a = await iadeKaydiAc(o.id, 1000);
    const b = await iadeKaydiAc(o.id, 500);
    assert.ok(a && b);
    await iadeyiTamamla(a);
    assert.equal(
      (await db.order.findUniqueOrThrow({ where: { id: o.id } })).odemeDurumu,
      "iade-bekliyor",
    );
    assert.equal(await iadeyiGecersizSay(b, { sebep: "mükerrer", alinmadi: false }), "tamam");
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: o.id } })).odemeDurumu, "iade");
  });

  it("aynı anda tamamlama ve geçersiz sayma: yalnızca biri", async () => {
    const o = await odenmisSiparis();
    const id = await iadeKaydiAc(o.id, 1000);
    assert.ok(id);
    const [t, g] = await Promise.all([
      iadeyiTamamla(id),
      iadeyiGecersizSay(id, { sebep: "deneme", alinmadi: false }),
    ]);
    assert.ok((t ? 1 : 0) + (g === "tamam" ? 1 : 0) === 1, `${String(!!t)} ${g}`);
  });
});
