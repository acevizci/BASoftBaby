import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { beslemeXml, cinsiyet, urunOgeleri, yasGrubu } from "@/server/urun-beslemesi";
import type { Urun } from "@/ui/katalog-bicim";

/** Google Merchant beslemesi (K-123). */

const adres = (yol: string) => (/^https?:/.test(yol) ? yol : `https://site.test${yol}`);

function urun(ek: Partial<Urun> = {}): Urun {
  return {
    id: "u1",
    categoryId: "k1",
    slug: "tulum",
    ad: "Pamuklu tulum",
    ozet: "Yumuşak tulum",
    kategori: "kiz-cocuk",
    gorsel: "zibin",
    palet: "mint",
    paletRenkleri: { zemin: "", c1: "", c2: "", c3: "" },
    fotograflar: [
      { id: "f1", yol: "https://b.public.blob.vercel-storage.com/pembe.webp", kucukYol: "", altMetin: "", genislik: 1, yukseklik: 1, renk: "pembe" },
      { id: "f2", yol: "/yuklenen/etiket.webp", kucukYol: "", altMetin: "", genislik: 1, yukseklik: 1 },
    ],
    fiyatKurus: 29990,
    puan: 0,
    yorumSayisi: 0,
    renkler: [{ kod: "pembe", ad: "Pembe", palet: { zemin: "", c1: "", c2: "", c3: "" } }],
    varyantlar: [
      { id: "v1", beden: "0-3 ay", renk: "pembe", stok: 2 },
      { id: "v2", beden: "2-3 yaş", renk: "pembe", stok: 0 },
    ],
    kumasIcerigi: "%100 pamuk",
    yikamaTalimati: "",
    ozellikler: [],
    ...ek,
  } as Urun;
}

describe("Merchant beslemesi", () => {
  it("bedenden yaş grubu", () => {
    assert.equal(yasGrubu("0-3 ay"), "newborn");
    assert.equal(yasGrubu("6-9 ay"), "infant");
    assert.equal(yasGrubu("9-12 ay"), "infant");
    assert.equal(yasGrubu("18-24 ay"), "toddler");
    assert.equal(yasGrubu("2-3 yaş"), "toddler");
    assert.equal(yasGrubu("7-8 yaş"), "kids");
  });

  it("kategoriden cinsiyet", () => {
    assert.equal(cinsiyet("Kız Çocuk"), "female");
    assert.equal(cinsiyet("ERKEK ÇOCUK"), "male");
    assert.equal(cinsiyet("Yenidoğan"), "unisex");
  });

  it("her varyant ayrı öğe, stok ve renkli fotoğraf doğru", () => {
    const o = urunOgeleri(urun(), adres);
    assert.equal(o.length, 2);
    assert.equal(o[0].grup, "u1");
    assert.equal(o[0].stokta, true);
    assert.equal(o[1].stokta, false);
    assert.equal(o[0].resim, "https://b.public.blob.vercel-storage.com/pembe.webp");
    assert.deepEqual(o[0].ekResimler, ["https://site.test/yuklenen/etiket.webp"]);
    assert.equal(o[0].link, "https://site.test/urun/tulum?renk=pembe");
    assert.equal(o[0].baslik, "Pamuklu tulum - Pembe - 0-3 ay");
    // Kategori adresinden adı; cinsiyet addan.
    assert.equal(o[0].kategori, "kiz-cocuk");
    const adli = urunOgeleri(urun(), adres, new Map([["kiz-cocuk", "Kız Çocuk"]]))[0];
    assert.equal(adli.kategori, "Kız Çocuk");
    assert.equal(adli.cinsiyet, "female");
  });

  it("fiyat ürün sayfasıyla aynı kural: kampanya ve elle eski fiyat", () => {
    assert.equal(urunOgeleri(urun(), adres)[0].fiyat, "299.90 TRY");
    assert.equal(urunOgeleri(urun(), adres)[0].indirimliFiyat, undefined);
    const kampanyali = urunOgeleri(urun({ kampanya: { ad: "Yaz", indirimliFiyatKurus: 24990 } }), adres)[0];
    assert.equal(kampanyali.fiyat, "299.90 TRY");
    assert.equal(kampanyali.indirimliFiyat, "249.90 TRY");
    const eskili = urunOgeleri(urun({ eskiFiyatKurus: 39990 }), adres)[0];
    assert.equal(eskili.fiyat, "399.90 TRY");
    assert.equal(eskili.indirimliFiyat, "299.90 TRY");
  });

  it("fotoğrafsız ürün beslemeye girmiyor", () => {
    assert.deepEqual(urunOgeleri(urun({ fotograflar: [] }), adres), []);
  });

  it("XML kaçışlı ve geçerli", () => {
    const xml = beslemeXml([urun({ ad: 'Ayı & "tavşan" <body>\u0007' })], adres);
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes("Ayı &amp; &quot;tavşan&quot; &lt;body&gt; - Pembe"));
    assert.ok(!xml.includes("\u0007"));
    assert.equal((xml.match(/<item>/g) ?? []).length, 2);
    assert.ok(xml.includes("<g:sale_price>") === false);
    assert.ok(xml.includes("<g:identifier_exists>no</g:identifier_exists>"));
  });

  it("Meta beslemesi stok durumunu Meta'nın yazımıyla veriyor (K-142)", () => {
    const google = beslemeXml([urun()], adres);
    const meta = beslemeXml([urun()], adres, new Map(), "meta");
    assert.ok(google.includes("<g:availability>in_stock</g:availability>"));
    assert.ok(meta.includes("<g:availability>in stock</g:availability>"));
    assert.ok(!meta.includes("in_stock"));
    // Geri kalan her şey aynı: iki kanal aynı fiyatı gösteriyor.
    assert.equal(google.replace(/in_stock|out_of_stock/g, ""), meta.replace(/in stock|out of stock/g, ""));
  });
});
