import "./hazirlik";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { favoriDegisimi, urunDurumu, favoriBildirimleriniGonder } from "@/server/favori-bildirimi";
import { atlamaSebebi, kimlik, temizle, testDb, urunKur } from "./veritabani";

/** Favori bildirimleri (K-100). */
describe("favoriDegisimi", () => {
  const durum = (fiyatKurus: number, bedenler: string[]) => ({ fiyatKurus, bedenler });

  it("stokta beden varken fiyat düşünce indirim haberi", () => {
    assert.deepEqual(favoriDegisimi(durum(50000, ["0-3 ay"]), durum(40000, ["0-3 ay"])), {
      indirim: { eskiKurus: 50000, yeniKurus: 40000 },
      gelenBedenler: [],
    });
  });

  it("yeniden stoğa giren beden haber; zaten stokta olan değil", () => {
    assert.deepEqual(
      favoriDegisimi(durum(50000, ["0-3 ay"]), durum(50000, ["0-3 ay", "3-6 ay"])),
      { indirim: undefined, gelenBedenler: ["3-6 ay"] },
    );
  });

  it("fiyat artışı, değişmeyen durum ve tükenmiş üründeki indirim haber değil", () => {
    assert.equal(favoriDegisimi(durum(50000, ["0-3 ay"]), durum(60000, ["0-3 ay"])), undefined);
    assert.equal(favoriDegisimi(durum(50000, ["0-3 ay"]), durum(50000, ["0-3 ay"])), undefined);
    assert.equal(favoriDegisimi(durum(50000, ["0-3 ay"]), durum(40000, [])), undefined);
  });

  it("urunDurumu: stoğu olan bedenler bir kez, renkten bağımsız", () => {
    assert.deepEqual(
      urunDurumu({
        fiyatKurus: 100,
        varyantlar: [
          { beden: "A", stok: 0 },
          { beden: "A", stok: 2 },
          { beden: "B", stok: 0 },
          { beden: "C", stok: 1 },
        ],
      }),
      { fiyatKurus: 100, bedenler: ["A", "C"] },
    );
  });
});

describe("favoriBildirimleriniGonder (veritabanı)", { skip: atlamaSebebi }, () => {
  const musteriler: string[] = [];
  const temizleHepsi = async () => {
    await testDb().customer.deleteMany({ where: { id: { in: musteriler } } });
    await temizle();
  };
  before(temizleHepsi);
  after(temizleHepsi);

  async function musteriKur(izin: boolean, dogrulandi = true) {
    const id = kimlik("musteri");
    musteriler.push(id);
    await testDb().customer.create({
      data: {
        id,
        eposta: `${id.toLowerCase()}@ornek.test`,
        adSoyad: "Deneme Anne",
        sifreOzeti: "x",
        pazarlamaIzni: izin,
        epostaDogrulandi: dogrulandi ? new Date() : null,
      },
    });
    return id;
  }

  it("indirimi yalnızca izinli ve doğrulanmış üyeye bildiriyor, bir kez; ilk bakış sessiz", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(3);
    const urun = await db.product.findUniqueOrThrow({ where: { id: productId } });
    const izinli = await musteriKur(true);
    const izinsiz = await musteriKur(false);
    const dogrulanmamis = await musteriKur(true, false);
    const eski = await musteriKur(true);

    // Bugünkü durumla eklenmiş üç favori, bir de hiç bakılmamış eski kayıt.
    const bedenler = [(await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).beden];
    for (const customerId of [izinli, izinsiz, dogrulanmamis]) {
      await db.favorite.create({
        data: { customerId, productId, bakilanFiyatKurus: urun.fiyatKurus, stoktakiBedenler: bedenler },
      });
    }
    await db.favorite.create({ data: { customerId: eski, productId } });

    const gidenler: { kime: string; haberler: unknown[] }[] = [];
    const sahte = async (kime: string, bilgi: { haberler: unknown[] }) => {
      gidenler.push({ kime, haberler: bilgi.haberler });
      return { gonderildi: true } as const;
    };

    // Değişiklik yok: kimseye gitmiyor, eski kayda bugünkü durum yazılıyor.
    await favoriBildirimleriniGonder(sahte);
    assert.equal(gidenler.filter((g) => g.kime.startsWith("t_")).length, 0);
    const eskiKayit = await db.favorite.findFirstOrThrow({ where: { customerId: eski } });
    assert.equal(eskiKayit.bakilanFiyatKurus, urun.fiyatKurus);

    // İndirim: yalnızca izinli ve doğrulanmış iki üyeye.
    await db.product.update({ where: { id: productId }, data: { fiyatKurus: urun.fiyatKurus - 1000 } });
    await favoriBildirimleriniGonder(sahte);
    const bizim = gidenler.filter((g) => g.kime.startsWith("t_"));
    assert.deepEqual(
      bizim.map((g) => g.kime).sort(),
      [izinli, eski].map((id) => `${id.toLowerCase()}@ornek.test`).sort(),
    );
    assert.deepEqual(bizim[0].haberler, [
      {
        urunAd: urun.ad,
        slug: urun.slug,
        indirim: { eskiKurus: urun.fiyatKurus, yeniKurus: urun.fiyatKurus - 1000 },
        gelenBedenler: [],
      },
    ]);

    // Aynı indirim ikinci kez bildirilmiyor.
    gidenler.length = 0;
    await favoriBildirimleriniGonder(sahte);
    assert.equal(gidenler.filter((g) => g.kime.startsWith("t_")).length, 0);
  });

  it("tükenen beden stoğa girince bildiriyor; gönderilemezse ertesi gün yeniden deniyor", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(0);
    const urun = await db.product.findUniqueOrThrow({ where: { id: productId } });
    const musteri = await musteriKur(true);
    await db.favorite.create({
      data: { customerId: musteri, productId, bakilanFiyatKurus: urun.fiyatKurus, stoktakiBedenler: [] },
    });
    await db.productVariant.update({ where: { id: variantId }, data: { stok: 2 } });

    let deneme = 0;
    const gidenler: string[] = [];
    const sahte = async (kime: string) => {
      if (!kime.startsWith("t_")) return { gonderildi: true } as const;
      deneme += 1;
      if (deneme === 1) return { gonderildi: false, sebep: "ag-hatasi" } as const;
      gidenler.push(kime);
      return { gonderildi: true } as const;
    };

    await favoriBildirimleriniGonder(sahte);
    assert.equal(gidenler.length, 0);
    await favoriBildirimleriniGonder(sahte);
    assert.equal(gidenler.length, 1);
    await favoriBildirimleriniGonder(sahte);
    assert.equal(gidenler.length, 1);
  });
});
