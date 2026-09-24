/**
 * Panelden yazılan rehber metninin biçimi (K-130). Saf modül.
 *
 * HTML ya da tam Markdown değil, üç kural: boş satır paragraf, "## " ara
 * başlık, "- " madde. Mağaza sahibi biçim dili öğrenmesin, sayfaya da HTML
 * sızmasın (her şey React ile düz metin olarak yazılıyor).
 */

export type RehberBloku =
  | { tur: "baslik"; metin: string }
  | { tur: "paragraf"; metin: string }
  | { tur: "liste"; maddeler: string[] };

export function rehberCoz(metin: string): RehberBloku[] {
  return metin
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .flatMap((b): RehberBloku[] => {
      const satirlar = b.split("\n").map((s) => s.trim());
      if (satirlar[0].startsWith("## ")) {
        const baslik: RehberBloku = { tur: "baslik", metin: satirlar[0].slice(3).trim() };
        const kalan = satirlar.slice(1).join("\n").trim();
        return kalan ? [baslik, ...rehberCoz(kalan)] : [baslik];
      }
      if (satirlar.every((s) => s.startsWith("- "))) {
        return [{ tur: "liste", maddeler: satirlar.map((s) => s.slice(2).trim()) }];
      }
      return [{ tur: "paragraf", metin: satirlar.join(" ") }];
    });
}

/** Kelime sayısı: panelde "150-300 kelime öneriliyor" göstergesi için. */
export function kelimeSayisi(metin: string): number {
  return metin.split(/\s+/).filter((k) => /[\p{L}\p{N}]/u.test(k)).length;
}
