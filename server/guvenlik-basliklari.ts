/**
 * Her cevaba eklenen güvenlik başlıkları (K-120).
 *
 * `next.config.ts` okuyor; burada ayrı durmasının sebebi test edilebilmesi.
 *
 * **İçerik güvenlik politikası (CSP).** Sayfaya sızmış bir betiğin
 * (örneğin bir ürün adına gizlenmiş kod) başka bir sunucudan kod
 * yükleyememesi, veriyi başka bir yere gönderememesi ve siteyi başka bir
 * sitenin içine gömememesi için. Site dışarıdan hiçbir şey yüklemiyor:
 * fontlar `next/font` ile kendi sunucumuzda, fotoğraflar `/yuklenen`
 * üzerinden, ölçüm (Vercel Analytics) kendi alan adımızdan. O yüzden kural
 * neredeyse her şeyi "yalnızca kendimiz" ile sınırlıyor.
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

export function icerikPolitikasi(gelistirme: boolean): string {
  const kurallar: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Geliştirmede React hata ayıklama için `eval` kullanıyor.
    "script-src": ["'self'", "'unsafe-inline'", ...(gelistirme ? ["'unsafe-eval'"] : [])],
    // Tailwind ve bileşenlerin `style` öznitelikleri satır içi.
    "style-src": ["'self'", "'unsafe-inline'"],
    // `blob:` tarayıcıda küçültülen fotoğrafın önizlemesi, `data:` küçük SVG'ler.
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(gelistirme ? ["ws:", "https://va.vercel-scripts.com"] : [])],
    // Barkod okuyucu kamerayı `<video>` ile gösteriyor.
    "media-src": ["'self'", "blob:"],
    "frame-src": ["'none'"],
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
