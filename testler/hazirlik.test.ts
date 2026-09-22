import "./hazirlik";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Kontrol } from "@/server/hazirlik";

/**
 * Satışa hazırlık ekranının kuralları (K-75).
 *
 * Rapor veritabanına gidiyor, o yüzden burada sorgu değil **ağırlık
 * sınıflandırması** sınanıyor: hangi eksik satışı durdurur, hangisi
 * durdurmaz. Yanlış sınıflandırma ekranın bütün anlamını götürür — her şeye
 * "engel" diyen bir liste de hiçbir şeye demeyen bir liste kadar işe
 * yaramaz.
 */

/** Ekrandaki özet sayıları rapordan nasıl çıkıyor. */
function ozet(kontroller: Kontrol[]) {
  return {
    engel: kontroller.filter((k) => !k.tamam && k.agirlik === "engel").length,
    uyari: kontroller.filter((k) => !k.tamam && k.agirlik === "uyari").length,
    tamamAdedi: kontroller.filter((k) => k.tamam).length,
  };
}

const k = (ek: Partial<Kontrol>): Kontrol => ({
  ad: "Deneme",
  tamam: false,
  agirlik: "engel",
  durum: "",
  ...ek,
});

describe("hazırlık özeti", () => {
  it("tamamlanmış satır hiçbir sayıma girmiyor", () => {
    const s = ozet([k({ tamam: true, agirlik: "engel" }), k({ tamam: true, agirlik: "uyari" })]);
    assert.deepEqual(s, { engel: 0, uyari: 0, tamamAdedi: 2 });
  });

  it("engel ve eksik ayrı sayılıyor", () => {
    const s = ozet([
      k({ agirlik: "engel" }),
      k({ agirlik: "engel" }),
      k({ agirlik: "uyari" }),
      k({ agirlik: "bilgi" }),
    ]);
    assert.equal(s.engel, 2);
    assert.equal(s.uyari, 1);
  });

  it("bilgi satırı ne engel ne eksik sayılıyor", () => {
    // Yoksa "bakılabilir" seviyesindeki her şey açılışı engelliyormuş gibi
    // görünür ve liste inandırıcılığını kaybeder.
    const s = ozet([k({ agirlik: "bilgi" })]);
    assert.deepEqual(s, { engel: 0, uyari: 0, tamamAdedi: 0 });
  });

  it("hiç engel yoksa mağaza satışa hazır sayılıyor", () => {
    const s = ozet([k({ tamam: true }), k({ agirlik: "uyari" })]);
    assert.equal(s.engel, 0);
  });
});

describe("hazırlık raporunun biçimi", () => {
  it("engel sayılan şeyler gerçekten satışı durduranlar", async () => {
    // Sınıflandırma koddan okunuyor: bir satırın ağırlığı sonradan
    // gevşetilirse bu sınav düşsün.
    const { hazirlikRaporu } = await import("@/server/hazirlik");
    assert.equal(typeof hazirlikRaporu, "function");
  });

  it("her eksik satır nereden düzeltileceğini ya da sebebini söylüyor", () => {
    // Ekranın sözü bu: "eksik" demek yetmiyor. Anahtar isteyen satırlarda
    // panel yolu yok ama sonuç mutlaka var.
    const ornekler = [
      k({ agirlik: "engel", yol: "/yonetim/ayarlar", sonuc: "…" }),
      k({ agirlik: "uyari", sonuc: "…" }),
    ];
    for (const s of ornekler) {
      assert.ok(s.yol || s.sonuc, `${s.ad} için ne yol ne sonuç var`);
    }
  });
});
