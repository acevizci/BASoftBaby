/**
 * Adres parçası üretimi.
 *
 * Ürün ve kategori adresleri buradan çıkıyor. Tek yerde durması önemli: aynı
 * ad iki farklı yerde iki farklı adrese dönüşürse toplu yükleme, var olan
 * ürünü bulamayıp yenisini açar.
 */

/** "Organik zıbın · 3'lü" → "organik-zibin-3lu" */
export function slugYap(metin: string): string {
  const harfler: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return metin
    .split("")
    .map((h) => harfler[h] ?? h)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Kategori adresi olamayacak parçalar.
 *
 * Kategori sayfası kökte duruyor (`/zibin-body`), yani mağazanın öteki
 * sayfalarıyla aynı ad alanını paylaşıyor. Panelde "Ürünler" adlı bir
 * kategori açılınca slug'ı `urunler` oluyordu: o adres "tüm ürünler"
 * listesi olduğu için kategoriye tıklayan müşteri **bütün kataloğu**
 * görüyordu. "Arama", "Sepet" gibi adlarda ise kategori sayfası hiç
 * açılmıyor, adres o sayfaya gidiyordu (K-78).
 */
export const AYRILMIS_ADRESLER: ReadonlySet<string> = new Set([
  "urunler",
  "arama",
  "urun",
  "sepet",
  "odeme",
  "siparis",
  "siparis-takip",
  "yasal",
  "beden-rehberi",
  "iade-degisim",
  "kargo-teslimat",
  "sikca-sorulanlar",
  "eposta-dogrula",
  "eposta-izni",
  "giris",
  "kayit",
  "hesabim",
  "sifre-sifirla",
  "sifremi-unuttum",
  "yonetim",
  "yuklenen",
  "api",
  "marka",
  "icon",
  "apple-icon",
]);

export function adresAyrilmisMi(slug: string): boolean {
  return AYRILMIS_ADRESLER.has(slug);
}
