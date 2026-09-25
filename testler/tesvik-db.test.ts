import { atlamaSebebi, kimlik, temizle, testDb } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { tesvikleriGonder } from "@/server/tesvik";
import { gecerliKampanyalar, kuponKullan } from "@/server/kampanya";

/** İkinci sipariş teşviki (K-151). */

const ON_EK = "t_tesvik_";
const GUN = 24 * 60 * 60 * 1000;
const SIMDI = new Date("2026-09-25T06:00:00Z");
const musteriler: string[] = [];
let eskiAyar: { tesvikYuzde: number; tesvikGun: number; tesvikGecerlilik: number } | undefined;

async function musteri(izin: boolean): Promise<{ id: string; eposta: string }> {
  const id = kimlik("musteri");
  musteriler.push(id);
  const eposta = `${ON_EK}${id.toLowerCase()}@deneme.test`;
  await testDb().customer.create({
    data: {
      id,
      eposta,
      adSoyad: "Deniz Deneme",
      sifreOzeti: "x",
      pazarlamaIzni: izin,
      epostaDogrulandi: new Date(),
    },
  });
  return { id, eposta };
}

async function siparis(customerId: string, teslimGunOnce: number, durum = "teslim") {
  const id = kimlik("sip");
  await testDb().order.create({
    data: {
      id,
      numara: id,
      customerId,
      adSoyad: "Deniz Deneme",
      eposta: "t_tesvik@deneme.test",
      telefon: "05001112233",
      adres: "Adres",
      ilce: "Kadıköy",
      il: "İstanbul",
      postaKodu: "34000",
      araToplamKurus: 10000,
      kargoKurus: 0,
      toplamKurus: 10000,
      odemeDurumu: "odendi",
      durum,
      teslimTarihi: new Date(SIMDI.getTime() - teslimGunOnce * GUN),
    },
  });
}

describe("ikinci sipariş teşviki (veritabanı)", { skip: atlamaSebebi }, () => {
  before(async () => {
    const ayar = await testDb().storeSetting.upsert({
      where: { id: "tek" },
      update: {},
      create: { id: "tek" },
      select: { tesvikYuzde: true, tesvikGun: true, tesvikGecerlilik: true },
    });
    eskiAyar = ayar;
    await testDb().storeSetting.update({
      where: { id: "tek" },
      data: { tesvikYuzde: 15, tesvikGun: 10, tesvikGecerlilik: 30 },
    });
  });
  after(async () => {
    if (eskiAyar) await testDb().storeSetting.update({ where: { id: "tek" }, data: eskiAyar });
    await temizle();
    await testDb().customer.deleteMany({ where: { id: { in: musteriler } } });
  });

  it("ilk siparişi teslim edilen izinli üyeye bir kez kişiye özel kupon", async () => {
    const tek = await musteri(true);
    await siparis(tek.id, 11);
    const iki = await musteri(true);
    await siparis(iki.id, 11);
    await siparis(iki.id, 2, "hazirlaniyor");
    const izinsiz = await musteri(false);
    await siparis(izinsiz.id, 11);
    const erken = await musteri(true);
    await siparis(erken.id, 3);
    const eski = await musteri(true);
    await siparis(eski.id, 60);

    const giden: { kime: string; kod: string; yuzde: number }[] = [];
    const sahte = async (kime: string, b: { kod: string; yuzde: number }) => {
      giden.push({ kime, kod: b.kod, yuzde: b.yuzde });
      return { gonderildi: true } as const;
    };
    await tesvikleriGonder(sahte, SIMDI);
    const bizim = giden.filter((g) => g.kime.startsWith(ON_EK));
    assert.deepEqual(
      bizim.map((g) => g.kime),
      [tek.eposta],
    );
    assert.equal(bizim[0].yuzde, 15);
    assert.match(bizim[0].kod, /^TESEKKUR-[A-Z0-9]{6}$/);

    giden.length = 0;
    await tesvikleriGonder(sahte, new Date(SIMDI.getTime() + GUN));
    assert.equal(giden.filter((g) => g.kime.startsWith(ON_EK)).length, 0);

    // Kupon yalnızca sahibine, tek kullanımlık.
    const kod = bizim[0].kod;
    assert.equal(
      (await gecerliKampanyalar(kod, SIMDI, tek.id)).filter((k) => k.kuponKodu).length,
      1,
    );
    assert.equal(
      (await gecerliKampanyalar(kod, SIMDI, iki.id)).filter((k) => k.kuponKodu).length,
      0,
    );
    assert.equal((await gecerliKampanyalar(kod, SIMDI)).filter((k) => k.kuponKodu).length, 0);

    const kupon = await testDb().campaign.findUniqueOrThrow({ where: { kuponKodu: kod } });
    assert.equal(await testDb().$transaction((t) => kuponKullan(t, kupon.id)), true);
    assert.equal(await testDb().$transaction((t) => kuponKullan(t, kupon.id)), false);
    assert.equal(
      (await gecerliKampanyalar(kod, SIMDI, tek.id)).filter((k) => k.kuponKodu).length,
      0,
    );
  });

  it("e-posta gitmezse kupon kalmıyor, ertesi gün yeniden deneniyor", async () => {
    const m = await musteri(true);
    await siparis(m.id, 11);
    await tesvikleriGonder(async () => ({ gonderildi: false }), SIMDI);
    assert.equal(await testDb().campaign.count({ where: { customerId: m.id } }), 0);
    const kayit = await testDb().customer.findUniqueOrThrow({ where: { id: m.id } });
    assert.equal(kayit.tesvikGonderildi, null);
  });
});
