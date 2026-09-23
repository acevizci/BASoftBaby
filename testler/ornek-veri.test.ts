import "./hazirlik";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ORNEK_BANNER_BASLIKLARI, ORNEK_URUN_SLUGLARI } from "@/server/ornek-veri";

/**
 * Satışa hazırlıktaki örnek veri listesi `db/tohum.ts` ile aynı kalmalı
 * (K-97): tohumdaki bir ürünün adresi değişip buradaki liste unutulursa, o
 * ürün yayında kalsa bile ekran "örnek ürün yok" derdi.
 *
 * Tohum dosyası içe aktarılmıyor (yüklenince veritabanına yazmaya başlıyor);
 * metni okunup bölümleri ayrıştırılıyor.
 */
const tohum = readFileSync("db/tohum.ts", "utf8");

function bolum(ad: string): string {
  const bas = tohum.indexOf(`const ${ad}`);
  const son = tohum.indexOf("\nconst ", bas + 1);
  assert.ok(bas >= 0, `${ad} tohum dosyasında bulunamadı`);
  return tohum.slice(bas, son === -1 ? undefined : son);
}

const hepsi = (metin: string, kalip: RegExp) => [...metin.matchAll(kalip)].map((m) => m[1]);

describe("örnek veri listesi", () => {
  it("örnek ürün adresleri tohumdakilerle aynı", () => {
    const tohumdaki = hepsi(bolum("URUNLER"), /^\s{4}slug: "([^"]+)"/gm);
    assert.deepEqual([...ORNEK_URUN_SLUGLARI].sort(), tohumdaki.sort());
  });

  it("örnek banner başlıkları tohumdakilerle aynı", () => {
    const tohumdaki = hepsi(bolum("BANNERLAR"), /^\s{4}baslik: "([^"]+)"/gm);
    assert.deepEqual([...ORNEK_BANNER_BASLIKLARI].sort(), tohumdaki.sort());
  });
});
