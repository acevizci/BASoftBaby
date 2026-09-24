import { test } from "node:test";
import assert from "node:assert/strict";
import { guvenlikBasliklari, icerikPolitikasi } from "@/server/guvenlik-basliklari";

const kural = (politika: string, ad: string) =>
  politika
    .split("; ")
    .find((k) => k.startsWith(`${ad} `) || k === ad)
    ?.split(" ")
    .slice(1);

test("yayında dışarıdan betik yüklenemiyor, eval yok", () => {
  const p = icerikPolitikasi(false);
  assert.deepEqual(kural(p, "script-src"), ["'self'", "'unsafe-inline'"]);
  assert.deepEqual(kural(p, "connect-src"), ["'self'"]);
  assert.deepEqual(kural(p, "object-src"), ["'none'"]);
  assert.deepEqual(kural(p, "frame-ancestors"), ["'none'"]);
  assert.ok(p.includes("upgrade-insecure-requests"));
});

test("ödeme yönlendirmesi için form-action'da iyzico var", () => {
  const formAction = kural(icerikPolitikasi(false), "form-action") ?? [];
  assert.ok(formAction.includes("'self'"));
  assert.ok(formAction.includes("https://*.iyzipay.com"));
});

test("geliştirmede eval ve sıcak yenileme serbest, yayında değil", () => {
  assert.ok(kural(icerikPolitikasi(true), "script-src")?.includes("'unsafe-eval'"));
  assert.ok(kural(icerikPolitikasi(true), "connect-src")?.includes("ws:"));
  assert.ok(!icerikPolitikasi(true).includes("upgrade-insecure-requests"));
});

test("kamera yalnızca kendi sayfalarımızda (barkod okuyucu)", () => {
  const b = guvenlikBasliklari(false);
  const izin = b.find((x) => x.key === "Permissions-Policy")?.value ?? "";
  assert.ok(izin.includes("camera=(self)"));
  for (const ad of [
    "Strict-Transport-Security",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
  ]) {
    assert.ok(
      b.some((x) => x.key === ad),
      ad,
    );
  }
});
