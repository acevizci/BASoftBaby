import "./hazirlik";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  AYARLAR,
  BOLUMLER,
  TUM_BOLUMLER,
  bolumOzeti,
  bolumSatiriEtkinMi,
  etkinAdres,
  etkinBolum,
  sayfaAdi,
  type Sayaclar,
} from "@/ui/panel-menu-bicim";

/** Panel menüsü: iki seviye, bağlamsal açılma (K-116). */

describe("menü işaretleme", () => {
  it("en uzun eşleşme: alt sayfa alt maddeyi, detay sayfası listesini işaretliyor", () => {
    assert.equal(etkinAdres("/yonetim/stok/sayim/abc"), "/yonetim/stok/sayim");
    assert.equal(etkinAdres("/yonetim/stok"), "/yonetim/stok");
    assert.equal(etkinAdres("/yonetim/urunler/zibin"), "/yonetim/urunler");
    assert.equal(etkinAdres("/yonetim/urunler/toplu"), "/yonetim/urunler/toplu");
    assert.equal(etkinAdres("/yonetim"), "/yonetim");
    assert.equal(etkinAdres("/yonetim/ayarlar/giderler"), "/yonetim/ayarlar/giderler");
  });

  it("alt maddenin bölümü açık; alt madde bölümle aynı adresteyse alt madde işaretli", () => {
    assert.equal(etkinBolum("/yonetim/gunluk")?.ad, "Siparişler");
    assert.equal(etkinBolum("/yonetim/yorumlar")?.ad, "Müşteriler");
    assert.equal(etkinBolum("/yonetim/kampanyalar")?.ad, "Vitrin");
    assert.equal(bolumSatiriEtkinMi("/yonetim/kampanyalar", BOLUMLER.find((b) => b.ad === "Vitrin")!), false);
    assert.equal(bolumSatiriEtkinMi("/yonetim/siparisler/BA-1", BOLUMLER.find((b) => b.ad === "Siparişler")!), true);
    assert.equal(etkinBolum("/yonetim/yasal"), AYARLAR);
    assert.equal(etkinBolum("/yonetim/hesabim"), undefined);
  });

  it("sayfa adı", () => {
    assert.equal(sayfaAdi("/yonetim/stok/depo"), "Stok › Depo");
    assert.equal(sayfaAdi("/yonetim/siparisler/BA-1"), "Siparişler");
    assert.equal(sayfaAdi("/yonetim/kampanyalar"), "Vitrin › Kampanyalar");
  });
});

describe("kapalı bölümün rozeti", () => {
  const s: Sayaclar = { siparis: 5, hazirlanacak: 3, talep: 2, iade: 1, yorum: 0, fotografsiz: 4, sorunluStok: 0, hata: 0, soru: 0 };
  it("örtüşen sayaç iki kez sayılmıyor: günün işi siparişlerin alt kümesi", () => {
    assert.deepEqual(bolumOzeti(BOLUMLER.find((b) => b.ad === "Siparişler")!, s), { sayi: 8, ton: "bekleyen" });
  });
  it("yalnızca hatırlatma varsa sessiz ton; sayaç sıfırsa sayı sıfır", () => {
    assert.deepEqual(bolumOzeti(BOLUMLER.find((b) => b.ad === "Ürünler")!, s), { sayi: 4, ton: "hatirlatma" });
    assert.equal(bolumOzeti(BOLUMLER.find((b) => b.ad === "Stok")!, s).sayi, 0);
  });
});

describe("menü kapsamı", () => {
  /**
   * Menüde yeri olmayan liste sayfası kalmasın: stok alt sayfaları eskiden
   * yalnızca sayfa içi sekmelerden bulunuyordu. Parametreli sayfalar
   * (detay) ve bir işin parçası olan sayfalar (yeni ürün, yazdırma) hariç.
   */
  const HARIC = new Set(["/yonetim/hesabim", "/yonetim/urunler/yeni", "/yonetim/kampanyalar/yeni", "/yonetim/siparisler/etiketler", "/yonetim/stok/etiketler"]);

  function sayfalar(kok: string, onek = "/yonetim"): string[] {
    return readdirSync(kok).flatMap((ad) => {
      const yol = join(kok, ad);
      if (!statSync(yol).isDirectory()) return ad === "page.tsx" ? [onek] : [];
      if (ad.startsWith("[")) return [];
      return sayfalar(yol, `${onek}/${ad}`);
    });
  }

  it("her liste sayfası menüde", () => {
    const menude = new Set(TUM_BOLUMLER.flatMap((b) => [b.yol, ...b.alt.map((a) => a.yol)]));
    const eksik = sayfalar("app/yonetim/(panel)").filter((y) => !menude.has(y) && !HARIC.has(y));
    assert.deepEqual(eksik, []);
  });

  it("menüdeki her adresin sayfası var; üst düzeyde en fazla 7 bölüm", () => {
    const var_ = new Set(sayfalar("app/yonetim/(panel)"));
    for (const b of TUM_BOLUMLER) for (const y of [b.yol, ...b.alt.map((a) => a.yol)]) assert.ok(var_.has(y), y);
    assert.ok(BOLUMLER.length <= 7);
  });
});
