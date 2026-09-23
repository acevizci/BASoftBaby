import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { stokDegisiklikleri, stoklariYaz, cakismaAdresi, cakismalariCoz } from "@/server/stok-ekrani";
import { anlikStokAl, planiUygula, type Satir } from "@/server/toplu-urun";
import { talebiSonuclandir } from "@/server/talep";
import { siparisOlustur } from "@/server/siparis";
import { slugYap } from "@/server/slug";
import type { SatisAyari } from "@/server/sepet";

/**
 * Stok ezilmesi (K-102): ekranda görülen sayı sonradan körü körüne
 * yazılınca arada satılan ürün "geri geliyor" ve olmayan mal satılıyordu.
 */

describe("stok formu", () => {
  it("yalnızca değiştirilen ve geçerli satırlar çıkıyor", () => {
    const form: [string, string][] = [
      ["ara", "x"],
      ["once-a", "5"],
      ["stok-a", "5"], // değişmemiş
      ["once-b", "5"],
      ["stok-b", "8"],
      ["once-c", "2"],
      ["stok-c", "-1"], // geçersiz
      ["stok-d", "4"], // önceki değer yok
      ["once-e", "3"],
      ["stok-e", "1.5"], // ondalık
      ["once-f", "3"],
      ["stok-f", "0"],
    ];
    assert.deepEqual(stokDegisiklikleri(form), [
      { id: "b", onceki: 5, yeni: 8 },
      { id: "f", onceki: 3, yeni: 0 },
    ]);
  });

  it("çakışmalar adres satırında gidip geliyor; bozuk parça atlanıyor", () => {
    const c = [
      { id: "T_var_1", onceki: 5, yeni: 8 },
      { id: "cmx2", onceki: 0, yeni: 3 },
    ];
    assert.deepEqual(cakismalariCoz(cakismaAdresi(c)), c);
    assert.deepEqual(cakismalariCoz("a:1,<b>:1:2,c:x:1"), []);
  });
});

const AYAR: SatisAyari = {
  kargoKurus: 4990,
  bedavaKargoEsigi: 50000,
  havaleBilgisi: "Test",
  havaleSaat: 72,
  havaleHatirlatmaSaat: 24,
  kdvOrani: 10,
  varsayilanTasiyici: "yurtici",
};

describe("stok ezilmesi (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("stok ekranı: arada değişen satır yazılmıyor, ötekiler yazılıyor", async () => {
    const db = testDb();
    const a = await urunKur(5);
    const b = await urunKur(5);
    // Ekran açıldıktan sonra a'dan 2 satıldı.
    await db.productVariant.update({ where: { id: a.variantId }, data: { stok: 3 } });

    const { yazilan, cakisan } = await stoklariYaz([
      { id: a.variantId, onceki: 5, yeni: 10 },
      { id: b.variantId, onceki: 5, yeni: 10 },
    ]);
    assert.deepEqual(yazilan, [b.variantId]);
    assert.deepEqual(cakisan, [{ id: a.variantId, onceki: 5, yeni: 10 }]);
    const [va, vb] = await Promise.all(
      [a, b].map((x) => db.productVariant.findUniqueOrThrow({ where: { id: x.variantId } })),
    );
    assert.equal(va.stok, 3, "satılan geri gelmemeli");
    assert.equal(vb.stok, 10);
  });

  it("toplu yükleme: önizlemeden sonra değişen stok yazılmıyor, öteki alanlar yazılıyor", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(5);
    const ad = `Toplu ${kimlik("u")}`;
    const urun = await db.product.update({
      where: { id: productId },
      data: { ad, slug: slugYap(ad) },
      include: { category: true },
    });
    const satir = (stok: number, sku = ""): Satir => ({
      satirNo: 2,
      ad,
      kategori: urun.category.ad,
      fiyatKurus: null,
      eskiFiyatKurus: null,
      ozet: "yeni özet",
      aciklama: "",
      kumasIcerigi: "",
      yikamaTalimati: "",
      ureticiBilgisi: "",
      ozellikler: [],
      beden: "0-3 ay",
      renk: "mint",
      stok,
      sku,
      gorsel: "",
      palet: "",
      aktif: true,
    });

    const anlik = await anlikStokAl([satir(9)]);
    assert.equal(anlik[`${slugYap(ad)}|0-3 ay|mint`], 5);

    // Önizlemeden sonra 1 satıldı.
    await db.productVariant.update({ where: { id: variantId }, data: { stok: 4 } });
    const sonuc = await planiUygula([satir(9)], anlik);
    assert.deepEqual(sonuc.atlanan, [{ ad, beden: "0-3 ay", renk: "mint" }]);
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v.stok, 4);
    const u = await db.product.findUniqueOrThrow({ where: { id: productId } });
    assert.equal(u.ozet, "yeni özet");

    // Değişmemişse dosyadaki sayı yazılıyor.
    const anlik2 = await anlikStokAl([satir(9)]);
    const sonuc2 = await planiUygula([satir(9)], anlik2);
    assert.deepEqual(sonuc2.atlanan, []);
    const v2 = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v2.stok, 9);
  });

  it("değişim: gönderilecek bedenin stoğu yetmezse talep tamamlanmıyor, hiçbir şey değişmiyor", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(5);
    const yeniVaryant = kimlik("var");
    await db.productVariant.create({
      data: { id: yeniVaryant, productId, beden: "3-6 ay", renk: "mint", stok: 0, sku: yeniVaryant },
    });

    await sepetKur(variantId, 2);
    const siparis = await siparisOlustur(
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
    assert.ok(siparis.tamam);
    const order = await db.order.findUniqueOrThrow({
      where: { numara: siparis.numara },
      include: { satirlar: true },
    });
    const talep = await db.orderRequest.create({
      data: {
        orderId: order.id,
        tur: "degisim",
        sebep: "beden",
        satirlar: { create: [{ orderItemId: order.satirlar[0].id, adet: 2 }] },
      },
    });

    const olmadi = await talebiSonuclandir(talep.id, "tamamlandi", "", yeniVaryant);
    assert.deepEqual(olmadi, { hata: "stok", mevcut: 0, gereken: 2 });
    const [t1, eski1] = await Promise.all([
      db.orderRequest.findUniqueOrThrow({ where: { id: talep.id } }),
      db.productVariant.findUniqueOrThrow({ where: { id: variantId } }),
    ]);
    assert.equal(t1.durum, "yeni", "talep tamamlanmış görünmemeli");
    assert.equal(eski1.stok, 3, "geri gelen stok da girmemeli");

    await db.productVariant.update({ where: { id: yeniVaryant }, data: { stok: 5 } });
    const oldu = await talebiSonuclandir(talep.id, "tamamlandi", "", yeniVaryant);
    assert.ok(oldu && !("hata" in oldu));
    const [t2, eski2, yeni2] = await Promise.all([
      db.orderRequest.findUniqueOrThrow({ where: { id: talep.id } }),
      db.productVariant.findUniqueOrThrow({ where: { id: variantId } }),
      db.productVariant.findUniqueOrThrow({ where: { id: yeniVaryant } }),
    ]);
    assert.equal(t2.durum, "tamamlandi");
    assert.equal(eski2.stok, 5);
    assert.equal(yeni2.stok, 3);

    // İkinci "tamamlandı" stoğu yeniden oynatmıyor.
    await talebiSonuclandir(talep.id, "tamamlandi", "", yeniVaryant);
    const yeni3 = await db.productVariant.findUniqueOrThrow({ where: { id: yeniVaryant } });
    assert.equal(yeni3.stok, 3);
  });
});
