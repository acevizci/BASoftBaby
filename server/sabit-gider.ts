import "server-only";

/**
 * Sabit giderler ve ay sonu net kâr (K-115).
 *
 * Siparişin katkı payı (K-112) siparişe bağlı giderleri düşüyor; kira,
 * reklam, maaş gibi her ay olan giderler ayrı. Ay sonu net kâr = o ayın
 * ödemesi alınmış siparişlerinin katkı payı − o ayın sabit giderleri.
 *
 * Aylar Türkiye saatiyle (sabit UTC+3, K-101).
 */

import { db } from "@/server/veritabani";
import { stokKaybi, type StokKaybi } from "@/server/stok-kaybi";
import { karRaporu, type KarRaporu } from "@/server/kar-raporu";
export { tutarCoz } from "@/server/tutar";

export const GIDER_KATEGORILERI = {
  kira: "Kira",
  reklam: "Reklam",
  maas: "Maaş, SGK",
  yazilim: "Yazılım, abonelik",
  muhasebe: "Muhasebe",
  diger: "Diğer",
} as const;
export type GiderKategorisi = keyof typeof GIDER_KATEGORILERI;

const TR_FARK = 3 * 60 * 60 * 1000;
const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

/** "2026-09" biçiminde mi. */
export function ayGecerliMi(ham: unknown): ham is string {
  return typeof ham === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(ham);
}

export function buAy(simdi: Date = new Date()): string {
  const tr = new Date(simdi.getTime() + TR_FARK);
  return `${tr.getUTCFullYear()}-${String(tr.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function ayEkle(ay: string, n: number): string {
  const [y, m] = ay.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Ayın başı ve bir sonraki ayın başı (Türkiye saatiyle). */
export function ayAraligi(ay: string): { baslangic: Date; bitis: Date; ad: string } {
  const [y, m] = ay.split("-").map(Number);
  return {
    baslangic: new Date(Date.UTC(y, m - 1, 1) - TR_FARK),
    bitis: new Date(Date.UTC(y, m, 1) - TR_FARK),
    ad: ayAdi(ay),
  };
}

/** Ayın son günü "2026-09-30"; rapor bitiş tarihini dahil sayıyor. */
export function aySonGunu(ay: string): string {
  const [y, m] = ay.split("-").map(Number);
  return `${ay}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
}

export function ayAdi(ay: string): string {
  const [y, m] = ay.split("-").map(Number);
  return `${AY_ADLARI[m - 1]} ${y}`;
}

export type SabitGider = {
  id: string;
  ay: string;
  bitisAy: string | null;
  tekrarli: boolean;
  kategori: string;
  aciklama: string;
  tutarKurus: number;
  yapan: string;
};

/** Gider o ay geçerli mi: tek seferlik o ayda, tekrarlı başladığı aydan durdurulana kadar. */
export function aydaGecerliMi(g: Pick<SabitGider, "ay" | "bitisAy" | "tekrarli">, ay: string): boolean {
  if (!g.tekrarli) return g.ay === ay;
  return g.ay <= ay && (g.bitisAy === null || ay <= g.bitisAy);
}

export async function ayinGiderleri(ay: string): Promise<SabitGider[]> {
  const adaylar = await db.expense.findMany({
    where: { ay: { lte: ay } },
    orderBy: [{ kategori: "asc" }, { olusturuldu: "asc" }],
  });
  return adaylar.filter((g) => aydaGecerliMi(g, ay));
}

export type AylikKar = {
  ay: string;
  kar: KarRaporu;
  giderler: SabitGider[];
  sabitKurus: number;
  /** Hasar, kayıp, sayım eksiği ve numune (K-179). */
  kayip: StokKaybi;
  netKurus: number;
  /** Net satışa göre net kâr yüzdesi. */
  netMarjYuzde: number | null;
};

export async function aylikKar(ay: string, secenek: { onceki?: boolean } = {}): Promise<AylikKar> {
  const aralik = ayAraligi(ay);
  const [kar, giderler, kayip] = await Promise.all([
    karRaporu(aralik, secenek),
    ayinGiderleri(ay),
    stokKaybi(aralik.baslangic, aralik.bitis),
  ]);
  const sabitKurus = giderler.reduce((t, g) => t + g.tutarKurus, 0);
  const netKurus = kar.katkiKurus - sabitKurus - kayip.kayipKurus - kayip.numuneKurus;
  const gelir = kar.netSatisKurus + kar.vadeFarkiKurus;
  return {
    ay,
    kar,
    giderler,
    sabitKurus,
    kayip,
    netKurus,
    netMarjYuzde: gelir > 0 ? (netKurus / gelir) * 100 : null,
  };
}

/** Son `n` ayın özeti, en yenisi önce. Karşılaştırma dönemi hesaplanmıyor. */
export async function sonAylar(n: number, simdi: Date = new Date()) {
  const bugun = buAy(simdi);
  const aylar = Array.from({ length: n }, (_, i) => ayEkle(bugun, -i));
  const sonuclar = await Promise.all(aylar.map((ay) => aylikKar(ay, { onceki: false })));
  return sonuclar.map((s) => ({
    ay: s.ay,
    siparis: s.kar.siparis,
    netSatisKurus: s.kar.netSatisKurus,
    katkiKurus: s.kar.katkiKurus,
    sabitKurus: s.sabitKurus,
    kayipKurus: s.kayip.kayipKurus + s.kayip.numuneKurus,
    netKurus: s.netKurus,
    eksik: s.kar.eksikSiparis,
  }));
}
