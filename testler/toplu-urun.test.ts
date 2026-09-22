import "./hazirlik";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { satirlariCoz } from "@/server/toplu-urun";
import type { RenkSecenegi } from "@/ui/katalog-bicim";

/**
 * Excel'den toplu ürün yükleme doğrulaması.
 *
 * Bu ekran yüzlerce satırı tek seferde kataloğa yazıyor; yanlış okunan bir
 * fiyat ya da sessizce atlanan bir satır doğrudan mağazaya çıkıyor. O yüzden
 * "önce göster, sonra yaz" kuralı var (K-26) ve süzgeç burada sınanıyor.
 */

const BEDENLER = ["0-3 ay", "3-6 ay", "6-9 ay"];
const RENKLER: RenkSecenegi[] = [
  { kod: "mint", ad: "Nane", palet: { zemin: "#0", c1: "#0", c2: "#0", c3: "#0" } },
  { kod: "mercan", ad: "Mercan", palet: { zemin: "#0", c1: "#0", c2: "#0", c3: "#0" } },
];

const BASLIKLAR = ["Ürün adı", "Kategori", "Fiyat", "Beden", "Renk", "Stok"];
const coz = (satirlar: string[][]) => satirlariCoz(BASLIKLAR, satirlar, BEDENLER, RENKLER);

describe("satirlariCoz — sütun başlıkları", () => {
  it("zorunlu sütun eksikse tek hata verip durur", () => {
    const { satirlar, hatalar } = satirlariCoz(["Ürün adı", "Kategori"], [], BEDENLER, RENKLER);
    assert.equal(satirlar.length, 0);
    assert.ok(hatalar.length > 0);
    assert.ok(hatalar.every((h) => h.satirNo === 1));
  });

  it("başlıkları Türkçe harf ve büyük-küçük farkına bakmadan tanır", () => {
    const { hatalar } = satirlariCoz(
      ["URUN ADI", "kategori", "FİYAT", "beden", "RENK", "Adet"],
      [["Zıbın", "zibin", "249,90", "0-3 ay", "Nane", "5"]],
      BEDENLER,
      RENKLER,
    );
    assert.deepEqual(hatalar, []);
  });
});

describe("satirlariCoz — fiyat", () => {
  it("virgüllü ve noktalı yazımı aynı kuruşa çevirir", () => {
    const a = coz([["Zıbın", "zibin", "249,90", "0-3 ay", "mint", "5"]]);
    const b = coz([["Zıbın", "zibin", "249.90", "0-3 ay", "mint", "5"]]);
    assert.equal(a.satirlar[0].fiyatKurus, 24990);
    assert.equal(b.satirlar[0].fiyatKurus, 24990);
  });

  it("kayan noktalı çarpmayı yuvarlar — 249,90 hiçbir zaman 24989 olmaz", () => {
    assert.equal(coz([["A", "k", "249,90", "0-3 ay", "mint", "1"]]).satirlar[0].fiyatKurus, 24990);
  });

  it("boş fiyatı null bırakır — var olan ürünün fiyatına dokunulmuyor", () => {
    assert.equal(coz([["A", "k", "", "0-3 ay", "mint", "1"]]).satirlar[0].fiyatKurus, null);
  });
});

describe("satirlariCoz — beden ve renk", () => {
  it("listede olmayan bedeni kabul etmez ve kabul edilenleri yazar", () => {
    const { hatalar } = coz([["A", "k", "100", "24-36 ay", "mint", "1"]]);
    const h = hatalar.find((x) => x.sutun === "Beden");
    assert.ok(h, "beden hatası bekleniyordu");
    assert.match(h!.mesaj, /0-3 ay/);
  });

  it('"0-3" yazımını "0-3 ay" bedenine oturtur', () => {
    assert.equal(coz([["A", "k", "100", "0-3", "mint", "1"]]).satirlar[0].beden, "0-3 ay");
  });

  it("rengi hem koduyla hem görünen adıyla kabul eder", () => {
    assert.equal(coz([["A", "k", "100", "0-3 ay", "mint", "1"]]).satirlar[0].renk, "mint");
    assert.equal(coz([["A", "k", "100", "0-3 ay", "Nane", "1"]]).satirlar[0].renk, "mint");
  });

  it("listede olmayan rengi kabul etmez", () => {
    const { hatalar } = coz([["A", "k", "100", "0-3 ay", "Pudra", "1"]]);
    assert.ok(hatalar.some((h) => h.sutun === "Renk"));
  });
});

describe("satirlariCoz — stok", () => {
  it("eksi stoğu kabul etmez", () => {
    assert.ok(coz([["A", "k", "100", "0-3 ay", "mint", "-3"]]).hatalar.some((h) => h.sutun === "Stok"));
  });

  it("ondalıklı stoğu kabul etmez", () => {
    assert.ok(coz([["A", "k", "100", "0-3 ay", "mint", "2,5"]]).hatalar.some((h) => h.sutun === "Stok"));
  });

  it("sıfır stok geçerli — ürün var, o beden tükenmiş demek", () => {
    const { satirlar, hatalar } = coz([["A", "k", "100", "0-3 ay", "mint", "0"]]);
    assert.deepEqual(hatalar, []);
    assert.equal(satirlar[0].stok, 0);
  });
});

describe("satirlariCoz — tekrar eden satır", () => {
  it("aynı ürün-beden-renk ikinci kez geçerse hata verir", () => {
    // Sessizce üzerine yazılsaydı hangi stoğun geçerli olduğu belirsiz olurdu.
    const { hatalar } = coz([
      ["Zıbın", "k", "100", "0-3 ay", "mint", "5"],
      ["Zıbın", "k", "100", "0-3 ay", "mint", "9"],
    ]);
    const h = hatalar.find((x) => x.sutun === "Beden/Renk");
    assert.ok(h, "tekrar hatası bekleniyordu");
    assert.match(h!.mesaj, /Nane/);
  });

  it("aynı üründe farklı beden tekrar sayılmaz", () => {
    const { hatalar } = coz([
      ["Zıbın", "k", "100", "0-3 ay", "mint", "5"],
      ["Zıbın", "k", "100", "3-6 ay", "mint", "9"],
    ]);
    assert.deepEqual(hatalar, []);
  });
});

describe("satirlariCoz — satır numarası", () => {
  it("hata başlık satırını sayarak numaralanıyor", () => {
    // Kullanıcı Excel'de o satırı bulabilmeli: başlık 1. satır.
    const { hatalar } = coz([
      ["A", "k", "100", "0-3 ay", "mint", "1"],
      ["B", "k", "100", "yok", "mint", "1"],
    ]);
    assert.equal(hatalar[0].satirNo, 3);
  });
});
