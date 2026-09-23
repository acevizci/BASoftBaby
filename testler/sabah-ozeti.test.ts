import "./hazirlik";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dununAraligi,
  sabahMetni,
  sabahOzetiniGonder,
  soylenecekVarMi,
  type SabahVerisi,
} from "@/server/sabah-ozeti";
import { atlamaSebebi, kimlik, temizle as kayitlariTemizle, testDb, urunKur } from "./veritabani";

/** Sabah özeti (K-101). */
describe("sabah özeti metni", () => {
  it("dün Türkiye saatine göre: 06:00 TR'de 00:00–24:00 TR (21:00–21:00 UTC)", () => {
    const { bas, son } = dununAraligi(new Date("2026-09-23T03:00:00Z"));
    assert.equal(bas.toISOString(), "2026-09-21T21:00:00.000Z");
    assert.equal(son.toISOString(), "2026-09-22T21:00:00.000Z");
    // Gece yarısından hemen sonra (TR) da aynı gün sayılıyor.
    assert.equal(dununAraligi(new Date("2026-09-22T21:30:00Z")).son.toISOString(), son.toISOString());
  });

  const bos: SabahVerisi = {
    gun: new Date("2026-09-21T21:00:00Z"),
    dunAdet: 0,
    dunKurus: 0,
    siparisler: [],
    bitecekler: [],
    ozet: { isler: [], azalanlar: [], azalanToplam: 0, bekleyenler: [], bekleyenToplam: 0, eksikler: [] },
  };

  it("sipariş de iş de yoksa gönderilmiyor", () => {
    assert.equal(soylenecekVarMi(bos), false);
    const bitecek = { urunAd: "Zıbın", beden: "0-3 ay", renk: "Beyaz", stok: 2, gun: 1.6 };
    assert.equal(soylenecekVarMi({ ...bos, bitecekler: [bitecek] }), true);
    assert.match(sabahMetni({ ...bos, bitecekler: [bitecek] }).metin, /Zıbın — 0-3 ay, Beyaz: 2 adet, ~2 gün/);
    assert.equal(soylenecekVarMi({ ...bos, dunAdet: 1 }), true);
    const is = { ad: "Hazırlanacak", adet: 2, adres: "/yonetim/siparisler", acil: true, aciklama: "" };
    assert.equal(soylenecekVarMi({ ...bos, ozet: { ...bos.ozet, isler: [is] } }), true);
    assert.equal(
      soylenecekVarMi({ ...bos, ozet: { ...bos.ozet, isler: [{ ...is, adet: 0, acil: false }] } }),
      false,
    );
  });

  it("dünün siparişleri, hediye işareti, işler ve azalan stok metinde", () => {
    const { konu, metin } = sabahMetni({
      ...bos,
      dunAdet: 12,
      dunKurus: 123450,
      siparisler: Array.from({ length: 10 }, (_, i) => ({
        numara: `BA-2026-00${10 + i}`,
        adSoyad: "Ayşe Yılmaz",
        toplamKurus: 10000,
        hediyePaketi: i === 0,
      })),
      ozet: {
        ...bos.ozet,
        isler: [
          { ad: "Hazırlanacak", adet: 3, adres: "/yonetim/siparisler?durum=hazirlaniyor", acil: true, aciklama: "" },
          { ad: "Fotoğrafsız ürün", adet: 0, adres: "/yonetim/urunler", acil: false, aciklama: "" },
        ],
        azalanlar: [{ id: "v", urunAd: "Zıbın", slug: "z", beden: "0-3 ay", renk: "Beyaz", stok: 1 }],
        azalanToplam: 4,
      },
    });
    assert.match(konu, /dün 12 sipariş, 1\.234,50 ₺/);
    assert.match(metin, /Dün \(22 Eylül Salı\)/);
    assert.match(metin, /BA-2026-0010 · Ayşe Yılmaz · 100,00 ₺ · 🎁 hediye/);
    assert.match(metin, /… ve 2 sipariş daha/);
    assert.match(metin, /Hazırlanacak: 3/);
    assert.doesNotMatch(metin, /Fotoğrafsız/);
    assert.match(metin, /Zıbın — 0-3 ay, Beyaz: 1 adet kaldı/);
    assert.match(metin, /toplam 4 beden/);
    assert.doesNotMatch(metin, /7 gün içinde/);
  });
});

describe("sabahOzetiniGonder (veritabanı)", { skip: atlamaSebebi }, () => {
  const idler: string[] = [];
  const temizle = async () => {
    await testDb().adminUser.deleteMany({ where: { id: { in: idler } } });
    await kayitlariTemizle();
  };
  before(temizle);
  after(temizle);

  async function kullanici(veri: { aktif?: boolean; dogrulandi?: boolean; sabahOzeti?: boolean }) {
    const id = kimlik("admin");
    idler.push(id);
    await testDb().adminUser.create({
      data: {
        id,
        eposta: `${id.toLowerCase()}@ornek.test`,
        adSoyad: "Deneme",
        sifreOzeti: "x",
        aktif: veri.aktif ?? true,
        epostaDogrulandi: veri.dogrulandi === false ? null : new Date(),
        sabahOzeti: veri.sabahOzeti ?? true,
      },
    });
    return `${id.toLowerCase()}@ornek.test`;
  }

  it("yalnızca açık, doğrulanmış ve özeti açık kullanıcıya; aynı gün bir kez", async () => {
    // Başka testlerin açık bıraktığı kullanıcılar sonucu bozmasın.
    const oncekiler = await testDb().adminUser.findMany({ select: { eposta: true } });
    const yabanci = new Set(oncekiler.map((a) => a.eposta));

    const alan = await kullanici({});
    await kullanici({ aktif: false });
    await kullanici({ dogrulandi: false });
    await kullanici({ sabahOzeti: false });

    const gidenler: string[] = [];
    const sahte = async (kime: string) => {
      if (!yabanci.has(kime)) gidenler.push(kime);
      return { gonderildi: true } as const;
    };

    // Söylenecek bir şey olsun: stoğu sıfır bir beden "tükenen beden" işi.
    await urunKur(0);

    const simdi = new Date();
    await sabahOzetiniGonder(simdi, sahte);
    assert.deepEqual(gidenler, [alan]);

    gidenler.length = 0;
    await sabahOzetiniGonder(new Date(simdi.getTime() + 60 * 60 * 1000), sahte);
    assert.deepEqual(gidenler, [], "aynı gün ikinci kez gönderilmemeli");

    await sabahOzetiniGonder(new Date(simdi.getTime() + 24 * 60 * 60 * 1000), sahte);
    assert.deepEqual(gidenler, [alan]);
  });
});
