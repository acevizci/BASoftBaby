import { test } from "node:test";
import assert from "node:assert/strict";
import { siparisNumarasi, sonuclar } from "@/ui/hizli-atlama-bicim";
import { TUM_BOLUMLER } from "@/ui/panel-menu-bicim";

test("sipariş numarası farklı yazımlardan tanınıyor", () => {
  assert.equal(siparisNumarasi("BA-2026-0012"), "BA-2026-0012");
  assert.equal(siparisNumarasi("ba 2026 12"), "BA-2026-0012");
  assert.equal(siparisNumarasi("ba20260012"), "BA-2026-0012");
  assert.equal(siparisNumarasi("BA-2026"), null);
  assert.equal(siparisNumarasi("banner"), null);
});

test("sipariş numarası ilk sonuç ve detay sayfasına gidiyor", () => {
  const [ilk] = sonuclar("ba-2026-7");
  assert.equal(ilk.tur, "siparis");
  assert.equal(ilk.yol, "/yonetim/siparisler/BA-2026-0007");
});

test("boş aramada menüdeki her sayfa bir kez listeleniyor", () => {
  const liste = sonuclar("");
  const yollar = liste.filter((s) => s.tur === "sayfa").map((s) => s.yol);
  assert.equal(new Set(yollar).size, yollar.length);
  for (const b of TUM_BOLUMLER) {
    for (const adres of [b.yol, ...b.alt.map((a) => a.yol)])
      assert.ok(yollar.includes(adres), adres);
  }
  // Bölümle aynı adresteki alt madde bölümün yerine geçiyor.
  const vitrin = liste.find((s) => s.yol === "/yonetim/kampanyalar");
  assert.equal(vitrin?.baslik, "Kampanyalar");
  assert.equal(vitrin?.ek, "Vitrin");
});

test("Türkçe harfe ve büyük küçüğe takılmıyor, adı yazılanla başlayan önde", () => {
  const [ilk] = sonuclar("sayim");
  assert.equal(ilk.yol, "/yonetim/stok/sayim");
  assert.equal(sonuclar("İADE")[0].yol, "/yonetim/iadeler");
  assert.equal(sonuclar("kar")[0].yol, "/yonetim/kar");
});

test("anahtar kelimeyle ve bölüm adıyla bulunuyor", () => {
  assert.ok(sonuclar("masraf").some((s) => s.yol === "/yonetim/ayarlar/giderler"));
  assert.ok(sonuclar("yorum").some((s) => s.yol === "/yonetim/yorumlar"));
  assert.ok(sonuclar("stok hare").some((s) => s.yol === "/yonetim/stok/hareketler"));
});

test("kelime ortası eşleşmiyor", () => {
  assert.ok(!sonuclar("pari").some((s) => s.tur === "sayfa" && s.yol === "/yonetim/siparisler"));
});

test("arama kısayolları sonda ve metni adrese kodluyor", () => {
  const liste = sonuclar("mavi & tulum");
  const aramalar = liste.filter((s) => s.tur === "ara");
  assert.equal(aramalar.length, 4);
  assert.deepEqual(liste.slice(-4), aramalar);
  assert.equal(aramalar[0].yol, "/yonetim/siparisler?ara=mavi%20%26%20tulum");
  assert.ok(aramalar.some((s) => s.yol.startsWith("/yonetim/stok?ara=")));
});

test("gruplar karışmıyor: sipariş, sayfalar, eylemler, arama", () => {
  const sira = ["siparis", "sayfa", "eylem", "ara"];
  const turler = sonuclar("urun").map((s) => sira.indexOf(s.tur));
  assert.deepEqual(
    turler,
    [...turler].sort((a, b) => a - b),
  );
  assert.ok(sonuclar("urun").some((s) => s.tur === "eylem" && s.yol === "/yonetim/urunler/yeni"));
});
