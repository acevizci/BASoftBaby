/**
 * Tarayıcıda olan hatayı sunucuya bildirir (K-121).
 *
 * `sendBeacon`: sayfa kapanırken bile gidiyor ve cevap beklemiyor. Gövde
 * `text/plain` — `application/json` tarayıcıya ön kontrol isteği
 * yaptırıyor ve `sendBeacon` onu desteklemiyor.
 *
 * Aynı sayfa açıkken aynı hata bir kez, toplamda en çok beş hata
 * gönderiliyor: döngüde patlayan bir hata ağı doldurmasın.
 */

const gonderilen = new Set<string>();
const EN_COK = 5;

export function hataBildir(h: { mesaj: string; yigin?: string; ozet?: string }): void {
  try {
    const anahtar = h.mesaj.slice(0, 200);
    if (!h.mesaj || gonderilen.has(anahtar) || gonderilen.size >= EN_COK) return;
    gonderilen.add(anahtar);
    const govde = JSON.stringify({
      mesaj: h.mesaj,
      yigin: h.yigin ?? "",
      ozet: h.ozet ?? "",
      adres: window.location.pathname,
    });
    navigator.sendBeacon?.("/api/hata", new Blob([govde], { type: "text/plain" }));
  } catch {
    // Bildirim bir kolaylık; kendisi hata atmamalı.
  }
}
