import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ozetCikar,
  satirFarki,
  sayilanlar,
  sayilanlariYaz,
  sayimAc,
  sayimBitir,
  sayimGetir,
  sayimIptal,
} from "@/server/sayim";
import { siparisOlustur } from "@/server/siparis";
import type { SatisAyari } from "@/server/sepet";

/** Stok sayımı (K-107). */

describe("sayım hesabı", () => {
  it("fark = sayılan − (stok + kargolanmamış siparişte ayrılan)", () => {
    assert.equal(satirFarki({ sayilan: 7, sistem: 5, ayrilan: 2 }), 0);
    assert.equal(satirFarki({ sayilan: 6, sistem: 5, ayrilan: 2 }), -1);
    assert.equal(satirFarki({ sayilan: null, sistem: null, ayrilan: null }), null);
  });

  it("özet eksik, fazla ve tutarı ayrı sayıyor; sayılmayan girmiyor", () => {
    assert.deepEqual(
      ozetCikar([
        { sayilan: 4, sistem: 5, ayrilan: 0, fiyatKurus: 1000 },
        { sayilan: 9, sistem: 5, ayrilan: 1, fiyatKurus: 500 },
        { sayilan: 3, sistem: 3, ayrilan: 0, fiyatKurus: 100 },
        { sayilan: null, sistem: null, ayrilan: null, fiyatKurus: 100 },
      ]),
      { toplam: 4, sayilan: 3, farkli: 2, eksikAdet: 1, fazlaAdet: 3, farkKurus: -1000 + 1500 },
    );
  });

  it("form: boş alan sayılmamış demek; sıfır geçerli", () => {
    assert.deepEqual(
      sayilanlar([
        ["say-a", "0"],
        ["say-b", ""],
        ["say-c", "-1"],
        ["say-d", "12"],
      ]),
      [
        { id: "a", adet: 0 },
        { id: "d", adet: 12 },
      ],
    );
  });
});

const AYAR: SatisAyari = {
  kargoKurus: 0,
  bedavaKargoEsigi: 0,
  havaleBilgisi: "Test",
  havaleSaat: 72,
  havaleHatirlatmaSaat: 24,
  kdvOrani: 10,
  varsayilanTasiyici: "yurtici",
};

describe("sayım (veritabanı)", { skip: atlamaSebebi }, () => {
  const sayimlar: string[] = [];
  const hepsiniSil = async () => {
    await testDb().stockCount.deleteMany({ where: { id: { in: sayimlar } } });
    await temizle();
  };
  before(hepsiniSil);
  after(hepsiniSil);

  it("kargolanmamış sipariş rafta sayılıyor; sayım sırasındaki satış korunuyor; farklar hareketle uygulanıyor", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(10);
    const kat = await db.product.findUniqueOrThrow({ where: { id: productId }, include: { category: true } });

    // Hazırlanmayı bekleyen 2 adetlik sipariş: stok 8, rafta hâlâ 10.
    await sepetKur(variantId, 2);
    const s = await siparisOlustur(
      {
        adSoyad: "Test",
        eposta: `${kimlik("m").toLowerCase()}@deneme.test`,
        telefon: "05001112233",
        adres: "Deneme Mahallesi No 1",
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

    const id = await sayimAc({ ad: "Test sayımı", kapsam: kat.category.slug, yapan: { id: "a", adSoyad: "Sayan" } });
    sayimlar.push(id);
    const satirlar = await db.stockCountLine.findMany({ where: { countId: id } });
    assert.equal(satirlar.length, 1, "yalnızca bu kategorinin bedeni");

    // Rafta 9 sayıldı: 1 eksik.
    assert.equal(await sayilanlariYaz(id, [{ id: satirlar[0].id, adet: 9 }]), 1);
    const sayilan = await db.stockCountLine.findUniqueOrThrow({ where: { id: satirlar[0].id } });
    assert.deepEqual([sayilan.sistem, sayilan.ayrilan, satirFarki(sayilan)], [8, 2, -1]);

    // Sayım sürerken 3 satıldı (stok 8 → 5). Bitirince yalnızca fark uygulanıyor.
    await db.productVariant.update({ where: { id: variantId }, data: { stok: 5 } });
    assert.deepEqual(await sayimBitir(id, { id: "a", adSoyad: "Sayan" }), { duzeltilen: 1 });
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v.stok, 4);
    const h = await db.stockMovement.findFirstOrThrow({ where: { variantId, sebep: "sayim" } });
    assert.deepEqual([h.degisim, h.sonra, h.not, h.yapan], [-1, 4, "Sayım: Test sayımı", "Sayan"]);

    // Barkod numarasıyla arama yalnızca o satırı getiriyor.
    const v2 = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    const bulunan = await sayimGetir(id, { ara: `B${v2.barkodNo}`, suzgec: "hepsi", sayfa: 1 });
    assert.equal(bulunan?.tamEslesme, true);
    assert.deepEqual(bulunan?.satirlar.map((s) => s.variantId), [variantId]);

    // İkinci kez bitirilemiyor, bitmiş sayıma yazılamıyor.
    assert.equal(await sayimBitir(id), undefined);
    assert.equal(await sayilanlariYaz(id, [{ id: satirlar[0].id, adet: 1 }]), 0);
  });

  it("stok eksiye düşmüyor; vazgeçilen sayım stoğa dokunmuyor", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(3);
    const kat = await db.product.findUniqueOrThrow({ where: { id: productId }, include: { category: true } });

    const id = await sayimAc({ ad: "Eksi", kapsam: kat.category.slug });
    sayimlar.push(id);
    const [satir] = await db.stockCountLine.findMany({ where: { countId: id } });
    await sayilanlariYaz(id, [{ id: satir.id, adet: 0 }]); // 3 eksik
    await db.productVariant.update({ where: { id: variantId }, data: { stok: 1 } }); // arada 2 satıldı
    await sayimBitir(id);
    const s = await db.stockCountLine.findUniqueOrThrow({ where: { id: satir.id } });
    assert.equal(s.uygulanan, -1);
    assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stok, 0);

    const iptal = await sayimAc({ ad: "Vazgeç", kapsam: kat.category.slug });
    sayimlar.push(iptal);
    const [s2] = await db.stockCountLine.findMany({ where: { countId: iptal } });
    await sayilanlariYaz(iptal, [{ id: s2.id, adet: 50 }]);
    await sayimIptal(iptal);
    assert.equal(await sayimBitir(iptal), undefined);
    assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stok, 0);
  });
});
