import "./hazirlik";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dilimle,
  formSayfaEki,
  sayfaAdresi,
  sayfaCoz,
  sayfaNo,
  tasimaSayfaEki,
} from "@/ui/sayfalama-bicim";

describe("sayfaNo", () => {
  it("geçerli sayıyı olduğu gibi verir", () => {
    assert.equal(sayfaNo("3"), 3);
  });

  it("geçersiz, eksi ve sıfır değerleri 1'e düşürür", () => {
    for (const ham of ["abc", "", "0", "-2", "1.5", undefined, null, 7]) {
      assert.equal(sayfaNo(ham), 1, `${String(ham)} için 1 bekleniyordu`);
    }
  });
});

describe("sayfaCoz", () => {
  it("sınırı aşan sayfayı son sayfaya oturtur", () => {
    // Üçüncü sayfadayken kayıt silinirse adreste kalan ?sayfa=3 boş bir
    // ekran değil son sayfayı açmalı.
    const d = sayfaCoz("999", 25, 10);
    assert.equal(d.sayfa, 3);
    assert.equal(d.sonSayfa, 3);
    assert.equal(d.atla, 20);
  });

  it("boş listede tek sayfa sayar", () => {
    const d = sayfaCoz("1", 0, 10);
    assert.equal(d.sonSayfa, 1);
    assert.equal(d.sayfa, 1);
    assert.equal(d.atla, 0);
  });

  it("tam bölünen listede fazladan sayfa açmaz", () => {
    assert.equal(sayfaCoz("1", 20, 10).sonSayfa, 2);
  });

  it("atlama sayısı sayfa boyuyla tutarlı", () => {
    const d = sayfaCoz("4", 100, 15);
    assert.equal(d.atla, 45);
    assert.equal(d.boy, 15);
    assert.equal(d.toplam, 100);
  });
});

describe("dilimle", () => {
  const liste = Array.from({ length: 25 }, (_, i) => i + 1);

  it("sayfalar birbiriyle kesişmiyor ve hepsini kapsıyor", () => {
    const s1 = dilimle(liste, sayfaCoz("1", liste.length, 10));
    const s2 = dilimle(liste, sayfaCoz("2", liste.length, 10));
    const s3 = dilimle(liste, sayfaCoz("3", liste.length, 10));
    assert.deepEqual([s1.length, s2.length, s3.length], [10, 10, 5]);
    assert.equal(new Set([...s1, ...s2, ...s3]).size, liste.length);
  });
});

describe("sayfaAdresi", () => {
  it("birinci sayfada adresi sade bırakır", () => {
    // Aynı listenin iki adresi olmasın: ?sayfa=1 hiç yazılmıyor.
    assert.equal(sayfaAdresi("/yonetim/renkler", 1), "/yonetim/renkler");
  });

  it("var olan sorguya & ile ekler", () => {
    assert.equal(sayfaAdresi("/urunler?renk=mint", 2), "/urunler?renk=mint&sayfa=2");
  });

  it("sorgusuz adrese ? ile ekler", () => {
    assert.equal(sayfaAdresi("/urunler", 2), "/urunler?sayfa=2");
  });

  it("parametre adı değiştirilebiliyor", () => {
    assert.equal(sayfaAdresi("/urun/a", 2, "yorumSayfa"), "/urun/a?yorumSayfa=2");
  });
});

function form(alanlar: Record<string, string>): FormData {
  const f = new FormData();
  for (const [ad, d] of Object.entries(alanlar)) f.set(ad, d);
  return f;
}

describe("formSayfaEki", () => {
  it("birinci sayfada hiçbir şey eklemez", () => {
    assert.equal(formSayfaEki(form({ sayfa: "1" })), "");
    assert.equal(formSayfaEki(form({})), "");
  });

  it("sayfayı adres ekine çevirir", () => {
    assert.equal(formSayfaEki(form({ sayfa: "4" })), "&sayfa=4");
  });

  it("geçersiz değeri yok sayar", () => {
    assert.equal(formSayfaEki(form({ sayfa: "abc" })), "");
  });
});

describe("tasimaSayfaEki", () => {
  it("kaydın yeni yerine denk gelen sayfayı verir", () => {
    // 2. sayfanın ilk kaydı (dizin 15) yukarı taşınınca dizin 14'e,
    // yani 1. sayfaya geçiyor: dönüş adresi oraya bakmalı.
    assert.equal(tasimaSayfaEki(form({ sayfa: "2", boy: "15" }), 14), "");
  });

  it("aynı sayfada kalan taşımada sayfayı korur", () => {
    assert.equal(tasimaSayfaEki(form({ sayfa: "2", boy: "15" }), 20), "&sayfa=2");
  });

  it("boy yoksa formdaki sayfaya düşer", () => {
    assert.equal(tasimaSayfaEki(form({ sayfa: "3" }), 0), "&sayfa=3");
  });
});
