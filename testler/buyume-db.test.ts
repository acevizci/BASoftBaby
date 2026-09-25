import { atlamaSebebi, kimlik, testDb } from "./veritabani";
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { buyumeHatirlatmalariniGonder } from "@/server/buyume";

/** Büyüme hatırlatması (K-147): izinli üyeye, beden başına bir kez. */

const ON_EK = "t_buyume_";
const GUN = 24 * 60 * 60 * 1000;
const SIMDI = new Date("2026-09-25T06:00:00Z");
const musteriler: string[] = [];

async function musteriKur(bilgi: { izin: boolean; dogumGunOnce?: number; listeGunOnce?: number }) {
  const id = kimlik("musteri");
  musteriler.push(id);
  await testDb().customer.create({
    data: {
      id,
      eposta: `${ON_EK}${id.toLowerCase()}@deneme.test`,
      adSoyad: "Ayşe Deneme",
      sifreOzeti: "x",
      pazarlamaIzni: bilgi.izin,
      epostaDogrulandi: new Date(),
      bebekDogum:
        bilgi.dogumGunOnce === undefined
          ? null
          : new Date(SIMDI.getTime() - bilgi.dogumGunOnce * GUN),
    },
  });
  if (bilgi.listeGunOnce !== undefined) {
    await testDb().giftList.create({
      data: {
        customerId: id,
        kod: `${ON_EK}${id}`.slice(0, 30),
        baslik: "Liste",
        sahipAdi: "Ayşe",
        tarih: new Date(SIMDI.getTime() - bilgi.listeGunOnce * GUN),
      },
    });
  }
  return `${ON_EK}${id.toLowerCase()}@deneme.test`;
}

describe("büyüme hatırlatması (veritabanı)", { skip: atlamaSebebi }, () => {
  after(async () => {
    await testDb().giftList.deleteMany({ where: { customerId: { in: musteriler } } });
    await testDb().customer.deleteMany({ where: { id: { in: musteriler } } });
  });

  it("sıradaki bedeni bir kez gönderiyor; izinsize göndermiyor", async () => {
    // 5,8 aylık: 6-9 ay yaklaşıyor.
    const izinli = await musteriKur({ izin: true, dogumGunOnce: 177 });
    const izinsiz = await musteriKur({ izin: false, dogumGunOnce: 177 });
    // Doğum tarihi yok, listedeki tarih geçmiş: o kullanılıyor.
    const listeli = await musteriKur({ izin: true, listeGunOnce: 177 });
    // 4 aylık: yakında beden değişmiyor.
    const erken = await musteriKur({ izin: true, dogumGunOnce: 122 });

    const giden: { kime: string; beden: string; adSoyad: string }[] = [];
    const sahte = async (kime: string, b: { beden: string; adSoyad: string }) => {
      giden.push({ kime, beden: b.beden, adSoyad: b.adSoyad });
      return { gonderildi: true } as const;
    };

    await buyumeHatirlatmalariniGonder(sahte, SIMDI);
    const bizim = giden.filter((g) => g.kime.startsWith(ON_EK));
    assert.deepEqual(bizim.map((g) => g.kime).sort(), [izinli, listeli].sort());
    assert.ok(bizim.every((g) => g.beden === "6-9 ay" && g.adSoyad === "Ayşe"));
    assert.ok(!bizim.some((g) => g.kime === izinsiz || g.kime === erken));

    // İkinci çalıştırmada aynı beden yeniden gitmiyor.
    giden.length = 0;
    await buyumeHatirlatmalariniGonder(sahte, new Date(SIMDI.getTime() + GUN));
    assert.equal(giden.filter((g) => g.kime.startsWith(ON_EK)).length, 0);
  });
});
