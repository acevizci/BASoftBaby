/**
 * Reklam ölçümü — tarayıcı tarafı (K-124).
 *
 * Meta Pixel ve Google etiketi (gtag.js) **yalnızca ziyaretçi onaylayınca**
 * yükleniyor; onaydan önce ne betik iniyor ne çerez yazılıyor. Olaylar
 * araçlar yüklü değilse sessizce düşüyor: onay vermemiş ziyaretçinin
 * davranışı hiçbir yere gitmiyor.
 */

import {
  IZIN_CEREZI,
  OLAYLAR,
  cerezOku,
  izinCoz,
  izinDegeri,
  olayParametreleri,
  type Izin,
  type OlayAdi,
  type OlayVerisi,
} from "@/ui/olcum-bicim";

type Fbq = ((...a: unknown[]) => void) & {
  callMethod?: (...a: unknown[]) => void;
  queue?: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    gtag?: (...a: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Onay değişince yayınlanan olay; bant ve dinleyiciler buna abone. */
export const IZIN_OLAYI = "cerez-izni";
/** Alt bilgideki "Çerez tercihleri" bağlantısının bandı yeniden açması için. */
export const TERCIH_OLAYI = "cerez-tercihleri";

function betikEkle(src: string): void {
  const b = document.createElement("script");
  b.async = true;
  b.src = src;
  document.head.appendChild(b);
}

/** Ziyaretçi ölçüme onay vermiş mi (şu anki çerez). */
export function izinVarMi(): boolean {
  return izinCoz(cerezOku(document.cookie, IZIN_CEREZI)) === "evet";
}

/**
 * Araçlar kurulmadan gelen olaylar. Sayfanın olay bileşeni düzendeki onay
 * bileşeninden önce çalışıyor (React önce iç bileşenlerin etkilerini
 * çalıştırıyor); onay zaten verilmişse olay burada bekliyor, araçlar
 * kurulunca gidiyor.
 */
const bekleyenler: [OlayAdi, OlayVerisi][] = [];

/** Araçları bir kez kurar; ikinci çağrı bir şey yapmıyor. */
export function araclariBaslat(metaId: string, googleId: string): void {
  if (metaId && !window.fbq) {
    // Meta'nın kendi yükleyicisinin karşılığı: betik inene kadar çağrılar
    // kuyrukta bekliyor.
    const fbq: Fbq = (...a: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...a);
      else fbq.queue!.push(a);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
    betikEkle("https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", metaId);
  }
  if (googleId && !window.gtag) {
    window.dataLayer = window.dataLayer ?? [];
    // gtag.js `arguments` nesnesinin kendisini bekliyor; dizi işe yaramıyor.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    betikEkle(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleId)}`);
    window.gtag("js", new Date());
    // Sayfa görüntülemeyi kendimiz gönderiyoruz: istemci tarafı gezinmede
    // gtag yeni sayfayı fark etmiyor.
    window.gtag("config", googleId, { send_page_view: false });
  }
  for (const [ad, veri] of bekleyenler.splice(0)) gonder(ad, veri);
}

export function sayfaGoruntuleme(): void {
  window.fbq?.("track", "PageView");
  window.gtag?.("event", "page_view", {
    page_location: window.location.href,
    page_title: document.title,
  });
}

function gonder(ad: OlayAdi, veri: OlayVerisi): void {
  const p = olayParametreleri(veri);
  window.fbq?.("track", OLAYLAR[ad].meta, p.meta);
  window.gtag?.("event", OLAYLAR[ad].google, p.google);
}

/**
 * Olayı gönderir; onay yoksa hiçbir şey yapmıyor. Onay varsa ama araçlar
 * henüz kurulmadıysa kuyruğa alıyor. Olayın gidip gitmeyeceği bilgisini
 * döndürüyor (tek seferlik olayların işaretlenmesi için).
 *
 * Onaydan önce olan bir şey onaydan sonra gönderilmiyor: ilk ziyarette
 * "Kabul et" demeden önce görülen ürün sayılmıyor. Aksi onayın anlamını
 * boşaltırdı.
 */
export function olcumOlayi(ad: OlayAdi, veri: OlayVerisi = {}): boolean {
  if (!izinVarMi()) return false;
  if (window.fbq || window.gtag) gonder(ad, veri);
  else bekleyenler.push([ad, veri]);
  return true;
}

/** Onayı çereze yazar (bir yıl) ve abonelere haber verir. */
export function izinKaydet(karar: Izin): void {
  const guvenli = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${IZIN_CEREZI}=${izinDegeri(karar)}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${guvenli}`;
  window.dispatchEvent(new Event(IZIN_OLAYI));
}

/**
 * Onay geri alınınca araçların yazdığı çerezler siliniyor. Alan adının
 * kendisi ve üst alan adı için ayrı ayrı: araçlar çerezi `.site.com`'a da
 * yazabiliyor.
 */
export function izleyiciCerezleriniSil(): void {
  const alanlar = ["", window.location.hostname, `.${window.location.hostname.replace(/^www\./, "")}`];
  for (const parca of document.cookie.split(";")) {
    const ad = parca.split("=")[0].trim();
    if (!/^(_ga|_gid|_gcl|_fbp|_fbc)/.test(ad)) continue;
    for (const alan of alanlar) {
      document.cookie = `${ad}=; Max-Age=0; Path=/${alan ? `; Domain=${alan}` : ""}`;
    }
  }
}
