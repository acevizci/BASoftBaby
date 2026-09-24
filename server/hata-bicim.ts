/**
 * Hata kaydının hesap kısmı (K-121): parmak izi ve kırpma.
 *
 * Veritabanına dokunmayan saf modül; testler doğrudan çağırıyor.
 */

import { createHash } from "node:crypto";

export type HataKaynagi = "sunucu" | "tarayici";

export type HataGirdisi = {
  kaynak: HataKaynagi;
  mesaj: string;
  yigin?: string;
  adres?: string;
  ozet?: string;
};

export const SINIR = { mesaj: 500, yigin: 4000, adres: 300, ozet: 64 } as const;

/**
 * Metni aynı hatanın her tekrarında aynı kalacak biçime indirir: sayılar,
 * uzun kimlikler (cuid, hex) ve tırnak içindeki değerler atılıyor.
 * "BA-2026-0012 bulunamadı" ile "BA-2026-0013 bulunamadı" aynı hata.
 */
export function sadelestir(metin: string): string {
  return metin
    .replace(/(["'`]).*?\1/g, "$1…$1")
    .replace(/\b[0-9a-z]{20,}\b/gi, "*")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

/** Yığının hatayı atan ilk satırı ("at fonksiyon (dosya:satır:sütun)"). */
function ilkCerceve(yigin: string): string {
  const satir = yigin
    .split("\n")
    .map((s) => s.trim())
    .find((s) => s.startsWith("at "));
  return satir ? sadelestir(satir) : "";
}

export function parmakIzi(g: HataGirdisi): string {
  const ham = [g.kaynak, sadelestir(g.mesaj), ilkCerceve(g.yigin ?? "")].join("|");
  return createHash("sha256").update(ham).digest("hex").slice(0, 32);
}

/**
 * Adresin yolu: sorgu ve parça atılıyor. Sorguda arama metni, e-posta
 * doğrulama jetonu gibi şeyler olabiliyor; hata kaydında durmaları gerekmiyor.
 */
export function adresYolu(adres: string): string {
  const [yol, ...ek] = adres.trim().split(" ");
  return [yol.split(/[?#]/)[0], ...ek].join(" ").slice(0, SINIR.adres);
}

/** Girdiyi kaydedilecek biçime getirir; boş mesajlı hata kaydedilmiyor. */
export function hataHazirla(
  g: HataGirdisi,
): (Required<HataGirdisi> & { parmakIzi: string }) | null {
  const mesaj = g.mesaj.trim().slice(0, SINIR.mesaj);
  if (!mesaj) return null;
  const temiz = {
    kaynak: g.kaynak,
    mesaj,
    yigin: (g.yigin ?? "").slice(0, SINIR.yigin),
    adres: adresYolu(g.adres ?? ""),
    ozet: (g.ozet ?? "").slice(0, SINIR.ozet),
  };
  return { ...temiz, parmakIzi: parmakIzi(temiz) };
}

/**
 * Tarayıcıdan gelen ve kaydetmeye değmeyen hatalar: tarayıcı eklentilerinin
 * ve başka sitelerden yüklenen betiklerin hataları ("Script error." — tarayıcı
 * ayrıntıyı gizliyor), ağ kesilince düşen yükleme hataları ve zararsız
 * `ResizeObserver` uyarısı. Bunlar kaydı doldurup gerçek hatayı gömerdi.
 */
export function gurultuMu(mesaj: string): boolean {
  return [
    /(^|: )Script error\.?$/i,
    /ResizeObserver loop/i,
    /Failed to fetch|NetworkError|Load failed|network error/i,
    /ChunkLoadError|Loading chunk .* failed/i,
    /extension:\/\//i,
    /^AbortError/i,
  ].some((k) => k.test(mesaj));
}
