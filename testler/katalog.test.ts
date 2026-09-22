import "./hazirlik";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  paletCoz,
  renkYaz,
  renginFotograflari,
  toplamStok,
  urununBedenleri,
  VARSAYILAN_PALET,
  type Fotograf,
  type RenkSecenegi,
  type Urun,
} from "@/ui/katalog-bicim";
import { slugYap } from "@/server/slug";
import { kelimeler } from "@/server/arama-metin";
import { adiKisalt } from "@/server/yorum";
import { tonSec, TONLAR } from "@/ui/kategori-tonu";
import { odemeSonTarihi } from "@/server/odeme-suresi";

/** Katalog biçimi, arama metni ve ödeme süresi — hepsi veritabanısız. */

const renkler: RenkSecenegi[] = [
  { kod: "mint", ad: "Nane", palet: { zemin: "#1", c1: "#2", c2: "#3", c3: "#4" } },
  { kod: "mercan", ad: "Mercan", palet: { zemin: "#5", c1: "#6", c2: "#7", c3: "#8" } },
];

describe("renkYaz / paletCoz", () => {
  it("bilinen rengin adını ve paletini verir", () => {
    assert.equal(renkYaz(renkler, "mint"), "Nane");
    assert.equal(paletCoz(renkler, "mint").c1, "#2");
  });

  it("silinmiş renkte kodun kendisini yazar — boş yazı hiç yazmıyor", () => {
    assert.equal(renkYaz(renkler, "pudra"), "pudra");
  });

  it("silinmiş renkte nötr palete düşer — çizim renksiz kalmıyor (K-66)", () => {
    assert.deepEqual(paletCoz(renkler, "pudra"), VARSAYILAN_PALET);
    assert.deepEqual(paletCoz(renkler, undefined), VARSAYILAN_PALET);
  });
});

describe("renginFotograflari", () => {
  const foto = (id: string, renk?: string): Fotograf => ({
    id,
    yol: "/a.jpg",
    kucukYol: "/a.jpg",
    altMetin: "",
    genislik: 1,
    yukseklik: 1,
    renk,
  });

  it("renk seçilmemişse hepsini verir", () => {
    const hepsi = [foto("1", "mint"), foto("2")];
    assert.deepEqual(renginFotograflari(hepsi, undefined), hepsi);
  });

  it("seçili rengin kareleri önce, renksizler arkada (K-48)", () => {
    const sonuc = renginFotograflari([foto("kumas"), foto("mavi", "mavi"), foto("etiket")], "mavi");
    assert.deepEqual(sonuc.map((f) => f.id), ["mavi", "kumas", "etiket"]);
  });

  it("o renkte hiç fotoğraf yoksa hepsini verir — boş galeri hiç fotoğraftan kötü", () => {
    const hepsi = [foto("1", "mint"), foto("2", "krem")];
    assert.deepEqual(renginFotograflari(hepsi, "mavi"), hepsi);
  });
});

describe("urununBedenleri / toplamStok", () => {
  const urun = {
    varyantlar: [
      { id: "a", beden: "0-3 ay", renk: "mint", stok: 2 },
      { id: "b", beden: "0-3 ay", renk: "mercan", stok: 3 },
      { id: "c", beden: "3-6 ay", renk: "mint", stok: 0 },
    ],
  } as Urun;

  it("beden tekrarlarını ayıklar, sırayı bozmaz", () => {
    assert.deepEqual(urununBedenleri(urun), ["0-3 ay", "3-6 ay"]);
  });

  it("bütün varyantların stoğunu toplar", () => {
    assert.equal(toplamStok(urun), 5);
  });
});

describe("slugYap", () => {
  it("Türkçe harfleri sadeleştirir", () => {
    assert.equal(slugYap("Zıbın & Çoraplı Şık Ürün"), "zibin-corapli-sik-urun");
  });

  it("baştaki ve sondaki tireleri atar", () => {
    assert.equal(slugYap("  --Deneme--  "), "deneme");
  });

  it("büyük İ harfini doğru küçültür", () => {
    // Türkçe yerelde toLowerCase "I" harfini bozuyor; slug bunu bilerek
    // İngilizce kurallarla yapıyor.
    assert.equal(slugYap("İLK ÜRÜN"), "ilk-urun");
  });
});

describe("kelimeler", () => {
  it("aramayı kelimelere böler", () => {
    assert.deepEqual(kelimeler("mavi tulum"), ["mavi", "tulum"]);
  });

  it("Türkçe harfe takılmıyor (K-35)", () => {
    assert.deepEqual(kelimeler("ZIBIN"), kelimeler("zıbın"));
  });

  it("boş aramada boş dizi", () => {
    assert.deepEqual(kelimeler("   "), []);
  });
});

describe("adiKisalt", () => {
  it("soyadı baş harfe indirir — kişi aranabilir olmasın", () => {
    assert.equal(adiKisalt("Ayşe Yılmaz"), "Ayşe Y.");
  });

  it("tek adı olduğu gibi bırakır", () => {
    assert.equal(adiKisalt("Ayşe"), "Ayşe");
  });

  it("boş adda 'Müşteri' der", () => {
    assert.equal(adiKisalt("   "), "Müşteri");
  });

  it("üç adlı kişide yalnızca son adı kısaltır", () => {
    assert.equal(adiKisalt("Ayşe Nur Yılmaz"), "Ayşe Nur Y.");
  });
});

describe("tonSec", () => {
  it("sırayla dört tonu dağıtır — beş kategoride dördü de çıkar (K-60)", () => {
    const ilkDort = [0, 1, 2, 3].map(tonSec);
    assert.equal(new Set(ilkDort).size, TONLAR.length);
  });

  it("eksi ve büyük sıralarda da güvenli", () => {
    for (const s of [-7, 0, 999]) {
      assert.ok(TONLAR.includes(tonSec(s)), `${s} için geçerli ton bekleniyordu`);
    }
  });
});

describe("odemeSonTarihi", () => {
  const temel = {
    durum: "bekliyor",
    odemeDurumu: "bekliyor",
    odemeYontemi: "havale",
    olusturuldu: new Date("2026-01-01T00:00:00Z"),
  };

  it("bekleyen havale siparişine süre verir", () => {
    assert.equal(odemeSonTarihi(temel, 72)?.toISOString(), "2026-01-04T00:00:00.000Z");
  });

  it("kartla ödenen siparişte anlamı yok", () => {
    assert.equal(odemeSonTarihi({ ...temel, odemeYontemi: "kart" }, 72), undefined);
  });

  it("ödenmiş siparişte süre yok", () => {
    assert.equal(odemeSonTarihi({ ...temel, odemeDurumu: "odendi" }, 72), undefined);
  });

  it("iptal siparişte süre yok", () => {
    assert.equal(odemeSonTarihi({ ...temel, durum: "iptal" }, 72), undefined);
  });

  it("süre kapalıysa (0) hiç sınır yok", () => {
    assert.equal(odemeSonTarihi(temel, 0), undefined);
  });
});
