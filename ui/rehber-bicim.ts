/**
 * Panelden yazılan rehber metninin biçimi (K-130, K-132). Saf modül.
 *
 * HTML ya da tam Markdown değil, dört kural: boş satır paragraf, "## " ara
 * başlık, "- " madde, `[yazı](/adres)` bağlantı. Mağaza sahibi biçim dili
 * öğrenmesin, sayfaya da HTML sızmasın (her şey React ile düz metin olarak
 * yazılıyor). Bağlantı yalnızca site içi ("/…") ya da https adresi olabiliyor:
 * `javascript:` gibi adresler bağlantı olmuyor, düz yazı kalıyor.
 */

export type Parca = { metin: string; adres?: string };

export type RehberBloku =
  | { tur: "baslik"; metin: string }
  | { tur: "paragraf"; parcalar: Parca[] }
  | { tur: "liste"; maddeler: Parca[][] };

const BAGLANTI = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

function gecerliAdres(a: string): boolean {
  return (a.startsWith("/") && !a.startsWith("//")) || /^https:\/\/[^\s]+$/.test(a);
}

/** Satırı düz yazı ve bağlantı parçalarına böler. */
export function satirParcala(satir: string): Parca[] {
  const parcalar: Parca[] = [];
  let son = 0;
  for (const m of satir.matchAll(BAGLANTI)) {
    const [tam, yazi, adres] = m;
    if (!gecerliAdres(adres)) continue;
    if (m.index > son) parcalar.push({ metin: satir.slice(son, m.index) });
    parcalar.push({ metin: yazi, adres });
    son = m.index + tam.length;
  }
  if (son < satir.length) parcalar.push({ metin: satir.slice(son) });
  return parcalar;
}

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
        return [{ tur: "liste", maddeler: satirlar.map((s) => satirParcala(s.slice(2).trim())) }];
      }
      return [{ tur: "paragraf", parcalar: satirParcala(satirlar.join(" ")) }];
    });
}

/** Kelime sayısı: panelde uzunluk göstergesi için. */
export function kelimeSayisi(metin: string): number {
  return metin
    .replace(BAGLANTI, "$1")
    .split(/\s+/)
    .filter((k) => /[\p{L}\p{N}]/u.test(k)).length;
}

/** Metnin düz hâli: yapısal verideki `articleBody` ve kısa açıklama için. */
export function duzMetin(metin: string): string {
  return metin
    .replace(BAGLANTI, "$1")
    .replace(/^##\s+/gm, "")
    .replace(/^-\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
