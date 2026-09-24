/**
 * Beden önerici — hesap (K-136). Saf modül.
 *
 * Kaynak mağazanın kendi beden tablosu (panelden, K-56): her bedenin boy ve
 * kilo aralığı. Öncelik boy (bebek bedenlerinde asıl ölçü), sonra kilo, en
 * son yaş (bedenin adındaki ay/yaş aralığı). İki bedenin sınırında olan
 * bebeğe büyük olan öneriliyor: bebek büyüyor, küçük gelen giyilemiyor.
 */

export type Olculer = Record<string, { boy: string; kilo: string }>;

export type BebekOlcusu = { boyCm?: number; kiloKg?: number; dogum?: string };

export type Oneri = {
  beden: string;
  neyeGore: "boy" | "kilo" | "yaş";
  /** Bedenin üst sınırına yakın: bir üst beden daha uzun giyilir. */
  sinirda: boolean;
};

/** "56 - 62 cm", "92-98", "11 - 12,5 kg" → [56, 62]. */
export function aralikCoz(metin: string): [number, number] | null {
  const m = /(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)/.exec(metin ?? "");
  if (!m) return null;
  const a = Number(m[1].replace(",", "."));
  const b = Number(m[2].replace(",", "."));
  return Number.isFinite(a) && Number.isFinite(b) && b > a ? [a, b] : null;
}

/** Bedenin adından ay aralığı: "0-3 ay" → [0, 3], "2-3 yaş" → [24, 36]. */
export function ayAraligi(ad: string): [number, number] | null {
  const m = /(\d+)\s*[-–]\s*(\d+)\s*(ay|yaş|yas)/i.exec(ad);
  if (!m) return null;
  const carpan = /ay/i.test(m[3]) ? 1 : 12;
  return [Number(m[1]) * carpan, Number(m[2]) * carpan];
}

/** Doğum tarihinden bugüne kaç ay (kesirli). */
export function kacAylik(dogum: string, bugun = new Date()): number | undefined {
  const d = new Date(`${dogum}T00:00:00`);
  if (Number.isNaN(d.getTime()) || d > bugun) return undefined;
  return (bugun.getTime() - d.getTime()) / (30.4375 * 24 * 60 * 60 * 1000);
}

/** Sınır payı: aralığın son %15'i "sınırda" sayılıyor. */
const SINIR_PAYI = 0.15;

function aralikla(
  sirali: string[],
  aralik: (beden: string) => [number, number] | null,
  deger: number,
): { beden: string; sinirda: boolean } | null {
  const olanlar = sirali.map((b) => [b, aralik(b)] as const).filter((x): x is readonly [string, [number, number]] => x[1] !== null);
  if (olanlar.length === 0) return null;
  // Sınırdaki bebek için büyük olan: aralığı içeren **son** beden.
  let bulunan: readonly [string, [number, number]] | undefined;
  for (const o of olanlar) if (deger >= o[1][0] && deger <= o[1][1]) bulunan = o;
  if (!bulunan) {
    // Tablonun dışında: en küçüğün altındaysa en küçük, en büyüğün üstündeyse en büyük.
    bulunan = deger < olanlar[0][1][0] ? olanlar[0] : olanlar[olanlar.length - 1];
    return { beden: bulunan[0], sinirda: false };
  }
  const [alt, ust] = bulunan[1];
  return { beden: bulunan[0], sinirda: deger >= ust - (ust - alt) * SINIR_PAYI };
}

/**
 * Mağazanın bütün bedenleri (tablo sırasıyla) içinden öneri. Ölçü yoksa
 * ya da hiçbir aralık okunamıyorsa `null`.
 */
export function bedenOner(olculer: Olculer, girdi: BebekOlcusu, bugun = new Date()): Oneri | null {
  const sirali = Object.keys(olculer);
  if (girdi.boyCm && girdi.boyCm > 30 && girdi.boyCm < 140) {
    const s = aralikla(sirali, (b) => aralikCoz(olculer[b].boy), girdi.boyCm);
    if (s) return { ...s, neyeGore: "boy" };
  }
  if (girdi.kiloKg && girdi.kiloKg > 1 && girdi.kiloKg < 40) {
    const s = aralikla(sirali, (b) => aralikCoz(olculer[b].kilo), girdi.kiloKg);
    if (s) return { ...s, neyeGore: "kilo" };
  }
  const ay = girdi.dogum ? kacAylik(girdi.dogum, bugun) : undefined;
  if (ay !== undefined) {
    const s = aralikla(sirali, ayAraligi, ay);
    if (s) return { ...s, neyeGore: "yaş" };
  }
  return null;
}

/**
 * Önerilen beden bu üründe yoksa üründeki en yakın beden (tablo sırasında
 * önce büyük olan). `sonraki`: sınırdaysa bir üst beden, üründe varsa.
 */
export function urundeKarsilik(
  olculer: Olculer,
  urunBedenleri: string[],
  oneri: Oneri,
): { beden: string; tam: boolean; sonraki?: string } | null {
  const sirali = Object.keys(olculer);
  const i = sirali.indexOf(oneri.beden);
  const sonrakiAd = i >= 0 ? sirali[i + 1] : undefined;
  const sonraki = oneri.sinirda && sonrakiAd && urunBedenleri.includes(sonrakiAd) ? sonrakiAd : undefined;
  if (urunBedenleri.includes(oneri.beden)) return { beden: oneri.beden, tam: true, sonraki };
  if (i < 0) return null;
  for (let fark = 1; fark < sirali.length; fark++) {
    for (const j of [i + fark, i - fark]) {
      const aday = sirali[j];
      if (aday && urunBedenleri.includes(aday)) return { beden: aday, tam: false };
    }
  }
  return null;
}
