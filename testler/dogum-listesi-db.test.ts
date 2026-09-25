import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { aliciyaGoster, siparisGetirPanel, siparisOlustur } from "@/server/siparis";
import { siparisiIptalEtVeStoguIadeEt } from "@/server/odeme-akis";
import {
  gelenHediyeler,
  kodlaListe,
  listeBildirimleriniGonder,
  listeKoduUret,
} from "@/server/dogum-listesi";
import type { SatisAyari } from "@/server/sepet";
import { listeOzeti } from "@/server/dogum-listesi-rapor";
import { talebiSonuclandir } from "@/server/talep";

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
  return { variantId, kalem, kod: liste.kod, customerId };
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
      listeGonderen: "Ayşe teyzesi",
      listeNotu: "Sağlıkla büyüsün",
    },
    AYAR,
  );
  assert.ok(s.tamam);
  return s.numara;
}

/** Liste sahibinin adresine gönderim denemesi (K-149); adres alanları boş. */
async function adreseSiparis(variantId: string, kalemId: string, ekVaryant?: string) {
  const cartId = await sepetKur(variantId, 1);
  await testDb().cartItem.updateMany({ where: { cartId }, data: { giftListItemId: kalemId } });
  if (ekVaryant) {
    await testDb().cartItem.create({
      data: { id: kimlik("sat"), cartId, variantId: ekVaryant, adet: 1 },
    });
  }
  return siparisOlustur(
    {
      adSoyad: "Hediye Eden",
      eposta: `${ON_EK}${kimlik("e").toLowerCase()}@deneme.test`,
      telefon: "05001112233",
      adres: "",
      ilce: "",
      il: "",
      postaKodu: "",
      not: "",
      hediyePaketi: false,
      hediyeNotu: "",
      sozlesmeOnayi: new Date(),
      listeAdresine: true,
    },
    AYAR,
  );
}

async function adresSec(customerId: string, kod: string) {
  const adres = await testDb().address.create({
    data: {
      customerId,
      adSoyad: "Ayşe Sahip",
      telefon: "05009998877",
      adres: "Gizli Mahalle Saklı Sokak No 7",
      ilce: "Çankaya",
      il: "Ankara",
      postaKodu: "06000",
    },
  });
  await testDb().giftList.update({ where: { kod }, data: { adresId: adres.id } });
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

  it("liste sahibine ödeme alınınca bir kez haber gidiyor, hediye edenin e-postası yok (K-146)", async () => {
    const { variantId, kalem, kod, customerId } = await listeKur(1);
    const numara = await listedenSiparis(variantId, kalem.id, 1);
    const giden: { kime: string; bilgi: Record<string, unknown> }[] = [];
    const gonder = async (kime: string, bilgi: Record<string, unknown>) => {
      giden.push({ kime, bilgi });
      return { gonderildi: true };
    };
    await listeBildirimleriniGonder(gonder);
    assert.equal(giden.filter((g) => g.bilgi.kod === kod).length, 0, "ödenmeden gitmemeli");
    assert.equal((await gelenHediyeler(customerId)).length, 0);

    await testDb().order.update({ where: { numara }, data: { odemeDurumu: "odendi" } });
    await listeBildirimleriniGonder(gonder);
    const bu = giden.filter((g) => g.bilgi.kod === kod);
    assert.equal(bu.length, 1);
    assert.equal(bu[0].bilgi.gonderen, "Ayşe teyzesi");
    assert.equal(bu[0].bilgi.not, "Sağlıkla büyüsün");
    assert.ok(bu[0].kime.startsWith("t_dogumlistesi_"));
    assert.ok(!JSON.stringify(bu[0].bilgi).includes("@deneme.test"));

    await listeBildirimleriniGonder(gonder);
    assert.equal(giden.filter((g) => g.bilgi.kod === kod).length, 1, "ikinci kez gitmemeli");

    const gelen = await gelenHediyeler(customerId);
    assert.equal(gelen.length, 1);
    assert.equal(gelen[0].gonderen, "Ayşe teyzesi");
    assert.ok(!JSON.stringify(gelen).includes("@deneme.test"));
  });

  it("liste sahibinin adresine gönderim: adres sahibinki, hediye edene gizli (K-149)", async () => {
    const { variantId, kalem, kod, customerId } = await listeKur(2);

    // Sahip adres seçmemişken seçenek yok.
    const once = await adreseSiparis(variantId, kalem.id);
    assert.ok(!once.tamam && once.sebep === "liste-adres");

    await adresSec(customerId, kod);
    const s = await adreseSiparis(variantId, kalem.id);
    assert.ok(s.tamam);
    const kayit = await testDb().order.findUniqueOrThrow({ where: { numara: s.numara } });
    assert.equal(kayit.listeAdresi, true);
    assert.equal(kayit.adres, "Gizli Mahalle Saklı Sokak No 7");
    assert.equal(kayit.il, "Ankara");
    assert.equal(kayit.teslimAlan, "Ayşe Sahip");
    assert.equal(kayit.teslimTelefon, "05009998877");
    // Sipariş veren yine hediye eden: e-postalar ona, onun adıyla.
    assert.equal(kayit.adSoyad, "Hediye Eden");

    const gorunen = aliciyaGoster((await siparisGetirPanel(s.numara))!);
    assert.equal(gorunen.adres, "");
    assert.equal(gorunen.il, "");
    assert.equal(gorunen.teslimAlan, "");
  });

  it("sepette listede olmayan ürün ya da kapalı liste varsa adrese gönderim yok (K-149)", async () => {
    const { variantId, kalem, kod, customerId } = await listeKur(2);
    await adresSec(customerId, kod);
    const baska = await urunKur(3);
    const karisik = await adreseSiparis(variantId, kalem.id, baska.variantId);
    assert.ok(!karisik.tamam && karisik.sebep === "liste-adres");

    await testDb().giftList.update({ where: { kod }, data: { acik: false } });
    const kapali = await adreseSiparis(variantId, kalem.id);
    assert.ok(!kapali.tamam && kapali.sebep === "liste-adres");
    // Stok ve alınan adet değişmedi.
    assert.equal(await alinan(kalem.id), 0);
  });

  it("panel özeti listeyi, alınanı ve yalnızca ödenmiş liste satışını sayıyor (K-150)", async () => {
    const once = await listeOzeti();
    const { variantId, kalem } = await listeKur(3);
    const numara = await listedenSiparis(variantId, kalem.id, 2);
    const ara = await listeOzeti();
    assert.equal(ara.liste - once.liste, 1);
    assert.equal(ara.istenen - once.istenen, 3);
    assert.equal(ara.alinan - once.alinan, 2);
    // Havale bekliyor: satışa girmiyor.
    assert.equal(ara.siparis30, once.siparis30);

    await testDb().order.update({ where: { numara }, data: { odemeDurumu: "odendi" } });
    const sonra = await listeOzeti();
    assert.equal(sonra.siparis30 - once.siparis30, 1);
    assert.equal(sonra.ciro30Kurus - once.ciro30Kurus, 2 * 10000);
    assert.equal(sonra.ciroHepsiKurus - once.ciroHepsiKurus, 2 * 10000);
    assert.ok(sonra.sonListeler.some((l) => l.istenen === 3 && l.alinan === 2));
  });

  it("iade edilen hediye listede yeniden alınabilir, değişim sayılmıyor (K-154)", async () => {
    const { variantId, kalem } = await listeKur(3);
    const numara = await listedenSiparis(variantId, kalem.id, 2);
    const o = await testDb().order.update({
      where: { numara },
      data: { odemeDurumu: "odendi", durum: "teslim", teslimTarihi: new Date() },
      include: { satirlar: true },
    });
    assert.equal(await alinan(kalem.id), 2);

    const degisim = await testDb().orderRequest.create({
      data: {
        orderId: o.id,
        tur: "degisim",
        sebep: "beden",
        satirlar: { create: [{ orderItemId: o.satirlar[0].id, adet: 1 }] },
      },
    });
    await talebiSonuclandir(degisim.id, "tamamlandi", "");
    assert.equal(await alinan(kalem.id), 2);

    const iade = await testDb().orderRequest.create({
      data: {
        orderId: o.id,
        tur: "iade",
        sebep: "beden",
        satirlar: { create: [{ orderItemId: o.satirlar[0].id, adet: 1 }] },
      },
    });
    await talebiSonuclandir(iade.id, "tamamlandi", "");
    assert.equal(await alinan(kalem.id), 1);
    // Aynı sonucu ikinci kez uygulamak bir daha düşürmüyor.
    await talebiSonuclandir(iade.id, "tamamlandi", "");
    assert.equal(await alinan(kalem.id), 1);
  });

  it("iki listeli siparişte haberi gitmiş liste ikinci kez almıyor (K-154)", async () => {
    const a = await listeKur(1);
    const b = await listeKur(1);
    const cartId = await sepetKur(a.variantId, 1);
    await testDb().cartItem.updateMany({ where: { cartId }, data: { giftListItemId: a.kalem.id } });
    await testDb().cartItem.create({
      data: {
        id: kimlik("sat"),
        cartId,
        variantId: b.variantId,
        adet: 1,
        giftListItemId: b.kalem.id,
      },
    });
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
        hediyePaketi: false,
        hediyeNotu: "",
        sozlesmeOnayi: new Date(),
      },
      AYAR,
    );
    assert.ok(s.tamam);
    await testDb().order.update({ where: { numara: s.numara }, data: { odemeDurumu: "odendi" } });

    const bKime = `${ON_EK}${b.customerId.toLowerCase()}@deneme.test`;
    const giden: string[] = [];
    const ilk = async (kime: string) => {
      if (kime === bKime) return { gonderildi: false };
      giden.push(kime);
      return { gonderildi: true };
    };
    await listeBildirimleriniGonder(ilk);
    const ikinci = async (kime: string) => {
      giden.push(kime);
      return { gonderildi: true };
    };
    await listeBildirimleriniGonder(ikinci);
    await listeBildirimleriniGonder(ikinci);

    const aKime = `${ON_EK}${a.customerId.toLowerCase()}@deneme.test`;
    assert.deepEqual(
      giden.filter((k) => k === aKime || k === bKime),
      [aKime, bKime],
    );
  });
});
