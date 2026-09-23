import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { siparisOlustur } from "@/server/siparis";
import { siparisiIptalEtVeStoguIadeEt } from "@/server/odeme-akis";
import { stoklariYaz } from "@/server/stok-ekrani";
import { talebiSonuclandir } from "@/server/talep";
import { hareketCsv, hareketleriAra, hareketSuzgeciniCoz } from "@/server/stok-hareket";
import type { SatisAyari } from "@/server/sepet";

/**
 * Stok hareketleri (K-103): stoğun her değişimi bir satır ve satırların
 * toplamı stokla tutuyor.
 */

const AYAR: SatisAyari = {
  kargoKurus: 4990,
  bedavaKargoEsigi: 50000,
  havaleBilgisi: "Test",
  havaleSaat: 72,
  havaleHatirlatmaSaat: 24,
  kdvOrani: 10,
  varsayilanTasiyici: "yurtici",
};

const girdi = () => ({
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
});

describe("stok hareketleri (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("sipariş, iptal, düzeltme ve iade kendi satırını yazıyor; toplam stokla tutuyor", async () => {
    const db = testDb();
    const { productId, variantId } = await urunKur(10);
    const hareketler = () =>
      db.stockMovement.findMany({ where: { variantId }, orderBy: [{ olusturuldu: "asc" }, { id: "asc" }] });

    // Sipariş: -3
    await sepetKur(variantId, 3);
    const s1 = await siparisOlustur(girdi(), AYAR);
    assert.ok(s1.tamam);
    // İkinci sipariş: -2, sonra iptal: +2
    await sepetKur(variantId, 2);
    const s2 = await siparisOlustur(girdi(), AYAR);
    assert.ok(s2.tamam);
    const o2 = await db.order.findUniqueOrThrow({ where: { numara: s2.numara } });
    await siparisiIptalEtVeStoguIadeEt(o2.id);
    // İkinci iptal çağrısı stok da hareket de yazmıyor.
    await siparisiIptalEtVeStoguIadeEt(o2.id);

    // Elle düzeltme: 7 → 12
    const yapan = { id: "admin-x", adSoyad: "Ayşe Panel" };
    await stoklariYaz([{ id: variantId, onceki: 7, yeni: 12 }], yapan);

    // İlk siparişten 1 adet iade
    const o1 = await db.order.findUniqueOrThrow({ where: { numara: s1.numara }, include: { satirlar: true } });
    const talep = await db.orderRequest.create({
      data: {
        orderId: o1.id,
        tur: "iade",
        sebep: "beden",
        satirlar: { create: [{ orderItemId: o1.satirlar[0].id, adet: 1 }] },
      },
    });
    await talebiSonuclandir(talep.id, "tamamlandi", "");

    const h = await hareketler();
    assert.deepEqual(
      h.map((x) => [x.sebep, x.degisim, x.sonra, x.siparisNo, x.yapan]),
      [
        ["siparis", -3, 7, s1.numara, ""],
        ["siparis", -2, 5, s2.numara, ""],
        ["iptal", 2, 7, s2.numara, ""],
        ["duzeltme", 5, 12, null, "Ayşe Panel"],
        ["iade", 1, 13, s1.numara, ""],
      ],
    );
    assert.ok(h.every((x) => x.productId === productId && x.urunAd === "Test ürünü" && x.beden === "0-3 ay"));

    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(10 + h.reduce((t, x) => t + x.degisim, 0), v.stok, "hareketlerin toplamı stokla tutmalı");
  });

  it("çakışan düzeltme hareket yazmıyor; ekran süzgeci ve CSV çalışıyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(4);
    const urun = await db.productVariant.findUniqueOrThrow({
      where: { id: variantId },
      include: { product: true },
    });
    const { cakisan } = await stoklariYaz([{ id: variantId, onceki: 9, yeni: 1 }]);
    assert.equal(cakisan.length, 1);
    assert.equal(await db.stockMovement.count({ where: { variantId } }), 0);

    await stoklariYaz([{ id: variantId, onceki: 4, yeni: 1 }]);
    const sonuc = await hareketleriAra(
      hareketSuzgeciniCoz({ urun: urun.product.slug, sebep: "duzeltme" }),
    );
    assert.equal(sonuc.toplam, 1);
    assert.equal(sonuc.cikis, 3);
    const csv = hareketCsv(sonuc.satirlar, { mint: "Nane" });
    assert.match(csv, /"Nane";"-3";"1";"Elle düzeltme"/);
    assert.ok(csv.startsWith("﻿"));
  });
});
