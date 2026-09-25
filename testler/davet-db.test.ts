import { atlamaSebebi, kimlik, temizle, testDb } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  davetEdeniBul,
  davetiBagla,
  davetKoduAl,
  davetOdulleriniVer,
  kisiselKuponlar,
} from "@/server/davet";

/** Arkadaşını davet et (K-152). */

const ON_EK = "t_davet_";
const GUN = 24 * 60 * 60 * 1000;
const SIMDI = new Date("2026-09-25T06:00:00Z");
const musteriler: string[] = [];
let eskiAyar: { davetOdulKurus: number; davetYuzde: number; davetEnFazla: number } | undefined;

async function musteri(telefon = ""): Promise<string> {
  const id = kimlik("musteri");
  musteriler.push(id);
  await testDb().customer.create({
    data: {
      id,
      eposta: `${ON_EK}${id.toLowerCase()}@deneme.test`,
      adSoyad: "Ece Deneme",
      sifreOzeti: "x",
      telefon,
    },
  });
  return id;
}

async function teslimEdilmis(customerId: string, gunOnce: number, telefon: string, adres: string) {
  const id = kimlik("sip");
  await testDb().order.create({
    data: {
      id,
      numara: id,
      customerId,
      adSoyad: "Ece Deneme",
      eposta: "t_davet@deneme.test",
      telefon,
      adres,
      ilce: "Kadıköy",
      il: "İstanbul",
      postaKodu: "34000",
      araToplamKurus: 10000,
      kargoKurus: 0,
      toplamKurus: 10000,
      odemeDurumu: "odendi",
      durum: "teslim",
      teslimTarihi: new Date(SIMDI.getTime() - gunOnce * GUN),
    },
  });
}

const giden: { kime: string; kod: string; tutarKurus: number }[] = [];
const sahte = async (kime: string, b: { kod: string; tutarKurus: number }) => {
  giden.push({ kime, kod: b.kod, tutarKurus: b.tutarKurus });
  return { gonderildi: true };
};

describe("arkadaşını davet et (veritabanı)", { skip: atlamaSebebi }, () => {
  before(async () => {
    eskiAyar = await testDb().storeSetting.upsert({
      where: { id: "tek" },
      update: {},
      create: { id: "tek" },
      select: { davetOdulKurus: true, davetYuzde: true, davetEnFazla: true },
    });
    await testDb().storeSetting.update({
      where: { id: "tek" },
      data: { davetOdulKurus: 10000, davetYuzde: 10, davetEnFazla: 10 },
    });
  });
  after(async () => {
    if (eskiAyar) await testDb().storeSetting.update({ where: { id: "tek" }, data: eskiAyar });
    const kodlar = (
      await testDb().customer.findMany({
        where: { id: { in: musteriler } },
        select: { davetOdulKodu: true },
      })
    )
      .map((m) => m.davetOdulKodu)
      .filter(Boolean);
    await testDb().giftCard.deleteMany({ where: { kod: { in: kodlar } } });
    await temizle();
    await testDb().customer.updateMany({
      where: { id: { in: musteriler } },
      data: { davetEdenId: null },
    });
    await testDb().customer.deleteMany({ where: { id: { in: musteriler } } });
  });

  it("kod kalıcı; kendini davet edemiyor; davetliye kişiye özel kupon", async () => {
    const eden = await musteri("05001110000");
    const kod = await davetKoduAl(eden);
    assert.equal(await davetKoduAl(eden), kod);
    assert.equal((await davetEdeniBul(kod))?.id, eden);

    assert.equal(await davetiBagla(eden, kod, SIMDI), undefined);

    const yeni = await musteri();
    const kupon = await davetiBagla(yeni, kod, SIMDI);
    assert.match(kupon ?? "", /^HOSGELDIN-[A-Z0-9]{6}$/);
    const kayit = await testDb().customer.findUniqueOrThrow({ where: { id: yeni } });
    assert.equal(kayit.davetEdenId, eden);
    const kuponlar = await kisiselKuponlar(yeni, SIMDI);
    assert.deepEqual(
      kuponlar.map((k) => [k.kod, k.yuzde]),
      [[kupon, 10]],
    );
    // İkinci kez bağlanmıyor, ikinci kupon açılmıyor.
    assert.equal(await davetiBagla(yeni, kod, SIMDI), undefined);
  });

  it("ödül cayma süresi geçince bir kez; aynı telefonla sipariş ödül kazandırmıyor", async () => {
    const eden = await musteri("0500 111 22 33");
    const kod = await davetKoduAl(eden);

    const iyi = await musteri();
    await davetiBagla(iyi, kod, SIMDI);
    await teslimEdilmis(iyi, 15, "05009990000", "Başka Mahalle 1");

    const erken = await musteri();
    await davetiBagla(erken, kod, SIMDI);
    await teslimEdilmis(erken, 5, "05008880000", "Başka Mahalle 2");

    const kendisi = await musteri();
    await davetiBagla(kendisi, kod, SIMDI);
    await teslimEdilmis(kendisi, 20, "05001112233", "Başka Mahalle 3");

    giden.length = 0;
    await davetOdulleriniVer(sahte, SIMDI);
    const edenEposta = `${ON_EK}${eden.toLowerCase()}@deneme.test`;
    const bizim = giden.filter((g) => g.kime === edenEposta);
    assert.equal(bizim.length, 1);
    assert.equal(bizim[0].tutarKurus, 10000);

    const cek = await testDb().giftCard.findUniqueOrThrow({ where: { kod: bizim[0].kod } });
    assert.equal(cek.bakiyeKurus, 10000);
    assert.equal(cek.aliciEposta, edenEposta);
    const k = await testDb().customer.findUniqueOrThrow({ where: { id: kendisi } });
    assert.ok(k.davetSonuclandi);
    assert.equal(k.davetOdulKodu, "");
    const e = await testDb().customer.findUniqueOrThrow({ where: { id: erken } });
    assert.equal(e.davetSonuclandi, null);

    giden.length = 0;
    await davetOdulleriniVer(sahte, new Date(SIMDI.getTime() + GUN));
    assert.equal(giden.filter((g) => g.kime === edenEposta).length, 0);
  });
});
