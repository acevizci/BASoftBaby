import "./hazirlik";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { epostaHtml } from "@/server/eposta";

/** E-posta gövdesi: logo, kaçış ve tıklanır adresler. */

const SITE = "https://www.basoftbaby.com";

describe("e-posta HTML", () => {
  it("başlıkta tam adresli PNG logo", () => {
    const h = epostaHtml("Merhaba", SITE);
    assert.match(
      h,
      /<img src="https:\/\/www\.basoftbaby\.com\/marka\/basoftbaby-logo-256\.png"[^>]*alt="BASoftBaby"/,
    );
  });

  it("adresler bağlantı; sondaki nokta bağlantıya girmiyor", () => {
    const h = epostaHtml(`Takip için:\n${SITE}/siparis-takip?numara=BA-1&eposta=a%40b.c.`, SITE);
    assert.match(
      h,
      /<a href="https:\/\/www\.basoftbaby\.com\/siparis-takip\?numara=BA-1&amp;eposta=a%40b\.c"/,
    );
    assert.match(h, /<\/a>\.<\/p>/);
  });

  it("metindeki HTML kaçışlanıyor", () => {
    const h = epostaHtml("<script>alert(1)</script>", SITE);
    assert.ok(!h.includes("<script>"));
    assert.match(h, /&lt;script&gt;/);
  });
});
