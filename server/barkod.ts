/**
 * Code 128 (B kümesi) barkod (K-107).
 *
 * Ürün etiketindeki barkod SKU'yu taşıyor; el okuyucu klavye gibi yazdığı
 * için okutunca mal kabulü, sayım ve stok ekranında doğrudan o beden
 * geliyor. Kütüphane eklemek yerine kodlayıcı burada: tablo sabit, kod
 * kısa ve sunucuda SVG olarak çiziliyor — tarayıcıda JavaScript gerekmiyor.
 *
 * Barkod SKU'yu değil bedenin kısa numarasını taşıyor ("B123"). SKU'lar 30
 * karaktere varıyor; 50 mm etikete sığınca çizgi başına 0,13 mm kalıyor —
 * telefon kamerası ve 203 dpi etiket yazıcısı için fazla ince. Kısa numara
 * çizgileri üç kat kalınlaştırıyor. Aramalar SKU'yu da tanımaya devam ediyor.
 */

/** 0–105 arası değerlerin çizgi/boşluk genişlikleri; 106 durdurma. */
const DESENLER = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];
const BASLA_B = 104;
const DUR = 106;

export function kodlanabilirMi(metin: string): boolean {
  return metin.length > 0 && [...metin].every((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126);
}

/** Etikete basılacak metin: "B" + bedenin barkod numarası. */
export function barkodMetni(barkodNo: number): string {
  return `B${barkodNo}`;
}

/** Okutulan metin bir barkod numarasıysa sayısı. */
export function barkodNoCoz(metin: string): number | undefined {
  const m = /^B(\d{1,9})$/i.exec(metin.trim());
  return m ? Number(m[1]) : undefined;
}

/** Değer dizisi: başlangıç, veri, sağlama, durdurma. */
export function code128Degerleri(metin: string): number[] {
  if (!kodlanabilirMi(metin)) throw new Error("Code 128 B yalnızca ASCII 32–126 kodlayabilir.");
  const veri = [...metin].map((c) => c.charCodeAt(0) - 32);
  const saglama = (BASLA_B + veri.reduce((t, d, i) => t + d * (i + 1), 0)) % 103;
  return [BASLA_B, ...veri, saglama, DUR];
}

/** Modül genişlikleri; tek sıradakiler çizgi, çift sıradakiler boşluk. */
export function code128Genislikleri(metin: string): number[] {
  return code128Degerleri(metin).flatMap((d) => [...DESENLER[d]].map(Number));
}

/**
 * SVG; genişlik modül cinsinden (`viewBox`), çizerken CSS ile ölçekleniyor.
 * Kenarlarda 10 modül sessiz alan var: okuyucu barkodun başını bulsun.
 */
export function code128Svg(metin: string, yukseklik = 40): string {
  const sessiz = 10;
  let x = sessiz;
  const cizgiler: string[] = [];
  code128Genislikleri(metin).forEach((g, i) => {
    if (i % 2 === 0) cizgiler.push(`<rect x="${x}" y="0" width="${g}" height="${yukseklik}"/>`);
    x += g;
  });
  const genislik = x + sessiz;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${genislik} ${yukseklik}" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="${metin.replace(/[<>&"]/g, "")}"><rect width="${genislik}" height="${yukseklik}" fill="#fff"/><g fill="#000">${cizgiler.join("")}</g></svg>`;
}
