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
