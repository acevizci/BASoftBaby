import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { siparisOlustur } from "@/server/siparis";
import { siparisiIptalEtVeStoguIadeEt } from "@/server/odeme-akis";
import { kodlaListe, listeKoduUret } from "@/server/dogum-listesi";
import type { SatisAyari } from "@/server/sepet";

/** Doğum listesi (K-144): alınan adet siparişle artıyor, iptalle düşüyor. */

const AYAR: SatisAyari = {
  kargoKurus: 4990,
  bedavaKargoEsigi: 50000,
  havaleBilgisi: "Test Bankası TR00",
  havaleSaat: 72,
  havaleHatirlatmaSaat: 24,
  kdvOrani: 10,
  varsayilanTasiyici: "yurtici",
};
const ON_EK = "t_dogumlistesi_";
const musteriler: string[] = [];

async function listeKur(istenen: number) {
  const { variantId } = await urunKur(5);
  const customerId = kimlik("musteri");
  musteriler.push(customerId);
  await testDb().customer.create({
    data: {
      id: customerId,
      eposta: `${ON_EK}${customerId.toLowerCase()}@deneme.test`,
      adSoyad: "Liste Sahibi",
      sifreOzeti: "x",
    },
  });
  const liste = await testDb().giftList.create({
    data: { customerId, kod: listeKoduUret(), baslik: "Ada'nın listesi", sahipAdi: "Ayşe" },
  });
  const kalem = await testDb().giftListItem.create({
    data: { listId: liste.id, variantId, istenen },
  });
  return { variantId, kalem, kod: liste.kod };
}

async function listedenSiparis(variantId: string, kalemId: string, adet: number) {
  const cartId = await sepetKur(variantId, adet);
  await testDb().cartItem.updateMany({ where: { cartId }, data: { giftListItemId: kalemId } });
  const s = await siparisOlustur(
    {
      adSoyad: "Hediye Eden",
      eposta: `${ON_EK}${kimlik("e").toLowerCase()}@deneme.test`,
      telefon: "05001112233",
      adres: "Deneme Mahallesi Deneme Sokak No 1",
      ilce: "Kadıköy",
      il: "İstanbul",
      postaKodu: "34000",
      not: "",
      hediyePaketi: true,
      hediyeNotu: "Hoş geldin minik",
      sozlesmeOnayi: new Date(),
    },
    AYAR,
  );
  assert.ok(s.tamam);
  return s.numara;
}

const alinan = async (id: string) =>
  (await testDb().giftListItem.findUniqueOrThrow({ where: { id } })).alinan;

async function sil() {
  const db = testDb();
  const siparisler = { eposta: { startsWith: ON_EK } };
  await db.orderItem.deleteMany({ where: { order: siparisler } });
  await db.order.deleteMany({ where: siparisler });
  await db.customer.deleteMany({ where: { id: { in: musteriler } } });
  await temizle();
}

describe("doğum listesi (veritabanı)", { skip: atlamaSebebi }, () => {
  before(sil);
  after(sil);

  it("listeden verilen sipariş alınan adedi artırıyor, satıra kalemi yazıyor", async () => {
    const { variantId, kalem } = await listeKur(3);
    const numara = await listedenSiparis(variantId, kalem.id, 2);
    assert.equal(await alinan(kalem.id), 2);
    const satir = await testDb().orderItem.findFirstOrThrow({ where: { order: { numara } } });
    assert.equal(satir.giftListItemId, kalem.id);
  });

  it("iptal alınan adedi geri düşürüyor, eksiye inmiyor", async () => {
    const { variantId, kalem } = await listeKur(1);
    const numara = await listedenSiparis(variantId, kalem.id, 1);
    assert.equal(await alinan(kalem.id), 1);
    // Sahibi arada adedi elle sıfırlamış olsun: iptal eksiye götürmemeli.
    await testDb().giftListItem.update({ where: { id: kalem.id }, data: { alinan: 0 } });
    const s = await testDb().order.findUniqueOrThrow({ where: { numara } });
    await siparisiIptalEtVeStoguIadeEt(s.id);
    assert.equal(await alinan(kalem.id), 0);
  });

  it("paylaşılan liste adres ve e-posta taşımıyor", async () => {
    const { kod } = await listeKur(1);
    const liste = await kodlaListe(kod);
    assert.ok(liste);
    const metin = JSON.stringify(liste);
    assert.ok(!metin.includes("@deneme.test"));
    assert.equal(await kodlaListe("yok-boyle-kod"), undefined);
    assert.equal(await kodlaListe("../x"), undefined);
  });
});
