/**
 * Code 128-B barkodu — SVG olarak.
 *
 * Kargo etiketindeki barkod bu. Hazır bir kütüphane eklenmedi: tek ihtiyacımız
 * olan kodlama bu tablo ve otuz satırlık bir döngü; üstelik SVG olarak
 * ürettiğimiz için yazıcıda çözünürlükten bağımsız keskin çıkıyor.
 *
 * Kodlama: başlangıç (104) + karakterler + sağlama + bitiş. Her desen 11
 * modül; sayılar sırayla çubuk ve boşluk genişlikleri.
 */

/** Code 128 desen tablosu: 0-102 karakterler, 103-105 başlangıçlar, 106 bitiş. */
const DESENLER = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
  "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
  "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
  "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
  "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
  "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
  "211214", "211232", "2331112",
];

const BASLANGIC_B = 104;
const BITIS = 106;

/** Code 128-B yalnızca 32-126 arasını kodluyor; dışındakiler atılıyor. */
function temizle(metin: string): string {
  return [...metin].filter((h) => h.charCodeAt(0) >= 32 && h.charCodeAt(0) <= 126).join("");
}

/** Barkodun çubuk-boşluk genişlikleri; ilk sayı çubuk, sonra sırayla. */
export function code128Genislikleri(metin: string): number[] {
  const temiz = temizle(metin);
  const degerler = [...temiz].map((h) => h.charCodeAt(0) - 32);

  // Sağlama: başlangıç + her değerin sırasıyla çarpımı, 103'e göre mod.
  let toplam = BASLANGIC_B;
  degerler.forEach((deger, sira) => {
    toplam += deger * (sira + 1);
  });
  const saglama = toplam % 103;

  const sira = [BASLANGIC_B, ...degerler, saglama, BITIS];
  return sira.flatMap((deger) => [...DESENLER[deger]].map(Number));
}

export default function Barkod({
  deger,
  yukseklik = 70,
  modulGenisligi = 2,
}: {
  deger: string;
  yukseklik?: number;
  modulGenisligi?: number;
}) {
  const genislikler = code128Genislikleri(deger);
  const toplamModul = genislikler.reduce((t, g) => t + g, 0);

  let x = 0;
  const cubuklar: { x: number; genislik: number }[] = [];
  genislikler.forEach((genislik, sira) => {
    // Çift sıradakiler çubuk, tekler boşluk.
    if (sira % 2 === 0) cubuklar.push({ x, genislik });
    x += genislik;
  });

  return (
    <svg
      role="img"
      aria-label={`Barkod: ${deger}`}
      width={toplamModul * modulGenisligi}
      height={yukseklik}
      viewBox={`0 0 ${toplamModul} ${yukseklik}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
    >
      <rect width={toplamModul} height={yukseklik} fill="#fff" />
      {cubuklar.map((c, i) => (
        <rect key={i} x={c.x} y={0} width={c.genislik} height={yukseklik} fill="#000" />
      ))}
    </svg>
  );
}
