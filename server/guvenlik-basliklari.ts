/**
 * Her cevaba eklenen güvenlik başlıkları (K-120).
 *
 * `next.config.ts` okuyor; burada ayrı durmasının sebebi test edilebilmesi.
 *
 * **İçerik güvenlik politikası (CSP).** Sayfaya sızmış bir betiğin
 * (örneğin bir ürün adına gizlenmiş kod) başka bir sunucudan kod
 * yükleyememesi, veriyi başka bir yere gönderememesi ve siteyi başka bir
 * sitenin içine gömememesi için. Site dışarıdan neredeyse hiçbir şey
 * yüklemiyor: fontlar `next/font` ile kendi sunucumuzda, ölçüm (Vercel
 * Analytics) kendi alan adımızdan. Tek istisna fotoğraflar: yayında Vercel
 * Blob'un adresinden geliyorlar (yerelde `/yuklenen` üzerinden).
 *
 * **Betiklerde `unsafe-inline` neden var.** Next.js sayfayı canlandırmak
 * için satır içi betik yazıyor. Onları tek tek izinlemenin yolu her istekte
 * değişen bir "nonce"; ama nonce, sayfaların önbellekten verilmesini
 * (K-22) kapatıyor, her sayfa her seferinde baştan çiziliyor. Bu mağazada
 * kullanıcı içeriği (yorum, ad) React ile yazılıyor ve kaçışlanıyor, yani
 * satır içi betik sızdırmanın yolu zaten kapalı. Kazancı düşük, bedeli her
 * sayfada yavaşlık olurdu. Dışarıdan betik yükleme ise yasak — asıl koruma o.
 *
 * **`form-action`'da iyzico.** Ödeme formu gönderilince sunucu müşteriyi
 * iyzico'nun ödeme sayfasına yönlendiriyor. Tarayıcılar bu kuralı form
 * gönderiminden sonraki yönlendirmeye de uyguluyor; iyzico listede olmasa
 * ödeme açılmazdı.
 */

const IYZICO = ["https://*.iyzipay.com", "https://*.iyzico.com"];
const BLOB = "https://*.public.blob.vercel-storage.com";

/**
 * Reklam ölçümü araçları (K-124). Betikler yalnızca ziyaretçi onaylayınca
 * yükleniyor; bu alan adları o zaman gerekli. Listeler Google'ın ve Meta'nın
 * kendi CSP belgelerinden.
 */
const GOOGLE = {
  betik: ["https://*.googletagmanager.com"],
  resim: [
    "https://*.google-analytics.com",
    "https://*.googletagmanager.com",
    "https://*.g.doubleclick.net",
    "https://*.google.com",
    "https://*.google.com.tr",
  ],
  baglanti: [
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googletagmanager.com",
    "https://*.g.doubleclick.net",
    "https://*.google.com",
    "https://*.google.com.tr",
    "https://pagead2.googlesyndication.com",
  ],
  cerceve: ["https://td.doubleclick.net", "https://www.googletagmanager.com"],
};
const META = {
  betik: ["https://connect.facebook.net"],
  resim: ["https://www.facebook.com"],
  baglanti: ["https://www.facebook.com", "https://connect.facebook.net"],
};

export function icerikPolitikasi(gelistirme: boolean): string {
  const kurallar: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Geliştirmede React hata ayıklama için `eval` kullanıyor.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...GOOGLE.betik,
      ...META.betik,
      // Geliştirmede Vercel Analytics'in hata ayıklama betiği dışarıdan geliyor.
      ...(gelistirme ? ["'unsafe-eval'", "https://va.vercel-scripts.com"] : []),
    ],
    // Tailwind ve bileşenlerin `style` öznitelikleri satır içi.
    "style-src": ["'self'", "'unsafe-inline'"],
    // Ürün ve banner fotoğrafları yayında Vercel Blob'da, tam adresle
    // (K-12). `blob:` tarayıcıda küçültülen fotoğrafın önizlemesi, `data:`
    // küçük SVG'ler.
    "img-src": ["'self'", "data:", "blob:", BLOB, ...GOOGLE.resim, ...META.resim],
    "font-src": ["'self'"],
    "connect-src": [
      "'self'",
      ...GOOGLE.baglanti,
      ...META.baglanti,
      ...(gelistirme ? ["ws:", "https://va.vercel-scripts.com"] : []),
    ],
    // Barkod okuyucu kamerayı `<video>` ile gösteriyor.
    "media-src": ["'self'", "blob:"],
    // Google Ads dönüşüm ölçümü görünmez bir çerçeve açıyor.
    "frame-src": GOOGLE.cerceve,
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'", ...IYZICO],
    ...(gelistirme ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(kurallar)
    .map(([ad, degerler]) => [ad, ...degerler].join(" "))
    .join("; ");
}

export function guvenlikBasliklari(gelistirme: boolean): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: icerikPolitikasi(gelistirme) },
    // İki yıl yalnızca HTTPS. Alt alan adları da (www ve çıplak alan adı).
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
    // Eski tarayıcılar için `frame-ancestors`'ın karşılığı.
    { key: "X-Frame-Options", value: "DENY" },
    // Yüklenen bir dosya uzantısının söylediğinden başka bir şey sanılmasın.
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Başka siteye giden bağlantıda yalnızca alan adı gidiyor, sipariş
    // numarası ya da arama gibi adres ayrıntıları gitmiyor.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Kamera yalnızca bizim sayfalarımızda (barkod okuyucu, K-107); gerisi kapalı.
    {
      key: "Permissions-Policy",
      value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    // Açılan başka bir pencere bu sekmeye erişemesin.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
