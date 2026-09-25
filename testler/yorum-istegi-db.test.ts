import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { siparisOlustur } from "@/server/siparis";
import { yorumIstekleriniGonder } from "@/server/yorum-istegi";
import type { SatisAyari } from "@/server/sepet";

/** Teslimden sonra değerlendirme isteği (K-141). */

const AYAR: SatisAyari = {
  kargoKurus: 4990,
  bedavaKargoEsigi: 50000,
  havaleBilgisi: "Test Bankası TR00",
  havaleSaat: 72,
  havaleHatirlatmaSaat: 24,
  kdvOrani: 10,
  varsayilanTasiyici: "yurtici",
};
const ON_EK = "t_yorumistegi_";
const GUN = 24 * 60 * 60 * 1000;
const SIMDI = new Date("2026-09-25T06:00:00Z");

async function teslimEdilmis(gunOnce: number) {
  const { variantId } = await urunKur(5);
  await sepetKur(variantId, 1);
  const s = await siparisOlustur(
    {
      adSoyad: "Test Müşteri",
      eposta: `${ON_EK}${kimlik("m").toLowerCase()}@deneme.test`,
      telefon: "05001112233",
      adres: "Deneme Mahallesi Deneme Sokak No 1",
      ilce: "Kadıköy",
      il: "İstanbul",
      postaKodu: "34000",
      not: "",
      hediyePaketi: false,
      hediyeNotu: "",
      sozlesmeOnayi: new Date(),
    },
    AYAR,
  );
  assert.ok(s.tamam);
  await testDb().order.update({
    where: { numara: s.numara },
    data: { durum: "teslim", teslimTarihi: new Date(SIMDI.getTime() - gunOnce * GUN) },
  });
  return s.numara;
}

async function sil() {
  const db = testDb();
  const siparisler = { eposta: { startsWith: ON_EK } };
  await db.orderItem.deleteMany({ where: { order: siparisler } });
  await db.order.deleteMany({ where: siparisler });
  await temizle();
}

describe("değerlendirme isteği (veritabanı)", { skip: atlamaSebebi }, () => {
  before(sil);
  after(sil);

  it("5-30 gün önce teslim edilene bir kez gidiyor; yenisine ve eskisine gitmiyor", async () => {
    const uygun = await teslimEdilmis(6);
    const yeni = await teslimEdilmis(2);
    const eski = await teslimEdilmis(40);
    const giden: string[] = [];
    const gonder = async (_kime: string, b: { numara: string; urunler: string[] }) => {
      giden.push(b.numara);
      assert.ok(b.urunler[0].startsWith("Test ürünü ("));
      return { gonderildi: true };
    };
    await yorumIstekleriniGonder(gonder, SIMDI);
    assert.ok(giden.includes(uygun));
    assert.ok(!giden.includes(yeni));
    assert.ok(!giden.includes(eski));

    giden.length = 0;
    await yorumIstekleriniGonder(gonder, SIMDI);
    assert.ok(!giden.includes(uygun), "ikinci kez gitmemeli");
  });

  it("gönderilemezse işaretlenmiyor, ertesi gün yeniden deneniyor", async () => {
    const numara = await teslimEdilmis(7);
    await yorumIstekleriniGonder(async () => ({ gonderildi: false, sebep: "anahtar-yok" }), SIMDI);
    const once = await testDb().order.findUniqueOrThrow({ where: { numara } });
    assert.equal(once.yorumIstendi, null);

    const giden: string[] = [];
    await yorumIstekleriniGonder(async (_k, b) => (giden.push(b.numara), { gonderildi: true }), SIMDI);
    assert.ok(giden.includes(numara));
  });
});
