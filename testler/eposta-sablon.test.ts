import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { epostaYap, tutar, type Eposta } from "@/server/eposta-sablon";

/** E-posta şablonu (K-161): bloklar, alt bilgi, düz metin sürümü. */

const ORTAM = {
  site: "https://www.basoftbaby.com",
  kunye: {
    unvan: "BA Tekstil Ltd.",
    sirketAdresi: "Malatya",
    destekTelefon: "0555 111 22 33",
    destekEposta: "destek@basoftbaby.com",
  },
  whatsapp: "905551112233",
};

const ORNEK: Eposta = {
  konu: "Siparişin alındı · BA-2026-0001",
  onizleme: "Siparişini aldık",
  bloklar: [
    { tur: "metin", metin: "Merhaba Ayşe,\n\nSiparişini aldık." },
    { tur: "durum", adim: 1 },
    {
      tur: "urunler",
      satirlar: [
        {
          ad: "Organik zıbın <3'lü>",
          detay: "0-3 ay · Mint",
          adet: 2,
          tutarKurus: 49980,
          foto: "/yuklenen/z-k.webp",
          adres: "/urun/organik-zibin",
        },
      ],
    },
    { tur: "tutarlar", satirlar: [{ ad: "Toplam", deger: tutar(49980), vurgu: true }] },
    { tur: "kupon", baslik: "Kuponun", kod: "TESEKKUR-ABC123" },
    { tur: "dugme", yazi: "Siparişimi görüntüle", adres: "/siparis-takip?numara=BA-1" },
  ],
  iptalAdresi: "/eposta-izni?jeton=x",
};

describe("e-posta şablonu", () => {
  const { html, text } = epostaYap(ORNEK, ORTAM);

  it("site içi adresler tam adres, ürün adı kaçışlanıyor", () => {
    assert.match(html, /src="https:\/\/www\.basoftbaby\.com\/yuklenen\/z-k\.webp"/);
    assert.match(html, /href="https:\/\/www\.basoftbaby\.com\/urun\/organik-zibin"/);
    assert.ok(
      html.includes("Organik zıbın &lt;3&#39;lü&gt;") ||
        html.includes("Organik zıbın &lt;3'lü&gt;"),
    );
    assert.ok(!html.includes("<3'lü>"));
  });

  it("düğme, kupon, durum ve önizleme HTML'de", () => {
    assert.match(
      html,
      /<a href="https:\/\/www\.basoftbaby\.com\/siparis-takip\?numara=BA-1"[^>]*>Siparişimi görüntüle<\/a>/,
    );
    assert.ok(html.includes("TESEKKUR-ABC123"));
    assert.ok(html.includes("Hazırlanıyor"));
    assert.ok(html.includes("Siparişini aldık"));
    assert.ok(html.includes('content="light"'));
  });

  it("alt bilgide künye, WhatsApp ve listeden çıkma", () => {
    assert.ok(html.includes("BA Tekstil Ltd. · Malatya"));
    assert.ok(html.includes("https://wa.me/905551112233"));
    assert.match(html, /listeden çık<\/a>/);
    assert.ok(html.includes("https://www.basoftbaby.com/eposta-izni?jeton=x"));
  });

  it("düz metin sürümü: tam adresler, tutar, kupon, künye", () => {
    assert.ok(
      text.includes("Siparişimi görüntüle:\nhttps://www.basoftbaby.com/siparis-takip?numara=BA-1"),
    );
    assert.ok(text.includes("• Organik zıbın <3'lü> (0-3 ay · Mint, 2 adet) — 499,80 ₺"));
    assert.ok(text.includes("Kuponun: TESEKKUR-ABC123"));
    assert.ok(text.includes("Durum: Hazırlanıyor"));
    assert.ok(text.includes("BA Tekstil Ltd."));
    assert.ok(text.includes("https://www.basoftbaby.com/eposta-izni?jeton=x"));
  });

  it("tutar binlik ayırıcıyla", () => {
    assert.equal(tutar(123456789), "1.234.567,89 ₺");
    assert.equal(tutar(4990), "49,90 ₺");
  });

  it("javascript: adresi bağlantı olmuyor", () => {
    const h = epostaYap(
      { konu: "x", bloklar: [{ tur: "dugme", yazi: "Tıkla", adres: "javascript:alert(1)" }] },
      ORTAM,
    ).html;
    assert.ok(!h.includes("javascript:"));
  });

  it("iptal adresi yoksa listeden çıkma satırı yok, WhatsApp yoksa bağlantısı yok", () => {
    const h = epostaYap(
      { konu: "x", bloklar: [{ tur: "metin", metin: "Merhaba" }] },
      { ...ORTAM, whatsapp: undefined },
    ).html;
    assert.ok(!h.includes("listeden çık"));
    assert.ok(!h.includes("wa.me"));
  });
});
