/**
 * Arama metninin normalleştirilmesi.
 *
 * Türkçe aramada asıl zorluk klavye: müşteri "zibin" yazıyor, ürünün adı
 * "Zıbın". Postgres'in `ilike`'ı bunları eşleştiremiyor çünkü `ı` ile `i`
 * ayrı harf. Çözüm, iki tarafı da aynı biçime indirmek: Türkçe harfler ASCII
 * karşılığına çevriliyor, küçük harfe iniliyor, harf ve rakam dışındaki her
 * şey boşluğa dönüyor.
 *
 * Veritabanına dokunmayan saf modül: tohum dosyası ve toplu yükleme de
 * kullanıyor.
 */

const HARFLER: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
  Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u",
  â: "a", Â: "a", î: "i", Î: "i", û: "u", Û: "u",
};

/** "Zıbın & Body 3'lü" → "zibin body 3 lu" */
export function normalle(metin: string): string {
  return metin
    .split("")
    .map((h) => HARFLER[h] ?? h)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Aranabilir alanları tek bir normal metinde birleştirir. */
export function aramaMetniYap(parcalar: (string | null | undefined)[]): string {
  return normalle(parcalar.filter(Boolean).join(" "));
}

/**
 * Sorguyu kelimelere ayırır.
 *
 * Her kelime ayrı aranıyor ve hepsinin bulunması gerekiyor: "mavi tulum"
 * yazan kişi mavi **ve** tulum arıyor, mavi ya da tulum değil. Tek harflik
 * parçalar atılıyor; neredeyse her ürüne uyuyorlar.
 */
export function kelimeler(sorgu: string): string[] {
  return normalle(sorgu)
    .split(" ")
    .filter((k) => k.length >= 2)
    .slice(0, 6);
}
