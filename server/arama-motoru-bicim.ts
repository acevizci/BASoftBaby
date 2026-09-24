/**
 * Arama motoru ayarları — kurallar (K-129). Saf modül.
 */

/**
 * Doğrulama kodu: Search Console gibi paneller ya kodun kendisini ya da
 * `<meta name="google-site-verification" content="…">` etiketinin tamamını
 * veriyor. İkisi de kabul ediliyor, yalnızca `content` değeri saklanıyor.
 * Hatalı biçimde `null`; boş "kaldır" demek.
 */
export function dogrulamaKoduCoz(ham: string): string | null {
  let k = ham.trim();
  if (k === "") return "";
  const etiket = /content\s*=\s*["']([^"']+)["']/i.exec(k);
  if (etiket) k = etiket[1].trim();
  return /^[A-Za-z0-9_\-.:=]{6,128}$/.test(k) ? k : null;
}

/** IndexNow anahtarı: 8-128 karakter, harf, rakam ve tire. */
export function indexNowAnahtariGecerliMi(k: string): boolean {
  return /^[A-Za-z0-9-]{8,128}$/.test(k);
}

/**
 * IndexNow isteğinin gövdesi. Adresler aynı alan adında olmalı; başka
 * alan adındaki adres atılıyor. Tek istekte en çok 10 000 adres.
 */
export function indexNowGovdesi(site: string, anahtar: string, yollar: string[]) {
  const host = new URL(site).host;
  const urlList = [...new Set(yollar.map((y) => new URL(y, site).toString()))]
    .filter((u) => new URL(u).host === host)
    .slice(0, 10_000);
  return { host, key: anahtar, keyLocation: `${site}/indexnow.txt`, urlList };
}
