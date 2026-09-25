/**
 * Büyüme hatırlatması hesabı (K-147). Saf modül; testler doğrudan çağırıyor.
 */

import { ayAraligi } from "@/ui/beden-onerici-bicim";

const AY_MS = 30.4375 * 24 * 60 * 60 * 1000;

/** Doğum tarihinden bugüne kesirli ay; doğmamışsa `undefined`. */
export function aylik(dogum: Date, simdi: Date): number | undefined {
  const fark = simdi.getTime() - dogum.getTime();
  return fark < 0 ? undefined : fark / AY_MS;
}

/**
 * Bebek birazdan hangi bedene geçiyor: alt sınırı önümüzdeki `pencere` ay
 * içinde olan en küçük beden ("6-9 ay" için 6. ay). Yaş aralığı adından
 * okunamayan bedenler ("Standart") yok sayılıyor. 36 aydan büyüğe bakılmıyor.
 */
export function siradakiBeden(
  bedenAdlari: string[],
  ay: number,
  pencere = 0.5,
): { beden: string; ay: number } | undefined {
  if (ay > 36) return undefined;
  const adaylar = bedenAdlari
    .map((beden) => ({ beden, aralik: ayAraligi(beden) }))
    .filter((x): x is { beden: string; aralik: [number, number] } => x.aralik !== null)
    .filter((x) => x.aralik[0] > ay && x.aralik[0] <= ay + pencere)
    .sort((a, b) => a.aralik[0] - b.aralik[0]);
  const ilk = adaylar[0];
  return ilk ? { beden: ilk.beden, ay: ilk.aralik[0] } : undefined;
}
