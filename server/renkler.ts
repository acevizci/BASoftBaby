import "server-only";
import { db } from "@/server/veritabani";
import { ETIKETLER, paylasilanOnbellek } from "@/server/onbellek";
import type { Palet, RenkSecenegi } from "@/ui/katalog-bicim";

/**
 * Renkler.
 *
 * **Neden veritabanında.** Bedenler (K-56) ve yaş grupları (K-65) panele
 * taşınmıştı; renk kalan son sabit listeydi. Mağazayı işleten kişi "Pudra"
 * ekleyemiyor, "Nane"nin adını değiştiremiyordu — kod değişikliği ve yeniden
 * dağıtım gerekiyordu (K-66).
 *
 * **Palet de burada.** Renk yalnızca bir ad değil: fotoğrafı olmayan ürünün
 * çizimi bu dört renkle boyanıyor. Ad panelden değişip palet kodda kalsaydı
 * "Pudra" diye eklenen renk nane yeşili çizilirdi.
 *
 * **Varyantlar renge metinle bağlı**, yabancı anahtarla değil — bedendeki
 * gerekçenin aynısı: sipariş satırı satılan şeyin kaydını kopyalıyor ve
 * sonradan değişmemeli. Kod değiştirilince açık varyantlar, ürün fotoğrafları
 * ve ürünün çizim rengi aynı işlem içinde güncelleniyor.
 */

export type RenkKaydi = {
  id: string;
  kod: string;
  ad: string;
  sira: number;
  aktif: boolean;
  zemin: string;
  c1: string;
  c2: string;
  c3: string;
};

const SECIM = {
  id: true,
  kod: true,
  ad: true,
  sira: true,
  aktif: true,
  zemin: true,
  c1: true,
  c2: true,
  c3: true,
} as const;

/** Kapalılar dahil hepsi: panel listesi ve ad çözümlemesi bunu kullanıyor. */
export const tumRenkler = paylasilanOnbellek(
  async (): Promise<RenkKaydi[]> =>
    db.color.findMany({ select: SECIM, orderBy: { sira: "asc" } }),
  ["renkler-hepsi"],
  [ETIKETLER.renk],
);

export function paleti(r: RenkKaydi): Palet {
  return { zemin: r.zemin, c1: r.c1, c2: r.c2, c3: r.c3 };
}

function secenek(r: RenkKaydi): RenkSecenegi {
  return { kod: r.kod, ad: r.ad, palet: paleti(r) };
}

/**
 * Ekranlara geçen renk listesi: yalnızca açık renkler.
 *
 * Mağazadaki süzgeç, ürün formundaki açılır liste ve renk noktaları bunu
 * kullanıyor.
 */
export async function renkSecenekleri(): Promise<RenkSecenegi[]> {
  return (await tumRenkler()).filter((r) => r.aktif).map(secenek);
}

/**
 * Ad çözümlemesi için tüm renkler — kapalılar dahil.
 *
 * Kapalı bir renkte satılmış siparişler duruyor; fatura, irsaliye ve sipariş
 * ekranında adsız görünmemeleri gerekiyor.
 */
export async function tumRenkSecenekleri(): Promise<RenkSecenegi[]> {
  return (await tumRenkler()).map(secenek);
}

/** Geçerli kodlar; doğrulama bunu kullanıyor. */
export async function renkKodlari(): Promise<string[]> {
  return (await tumRenkler()).filter((r) => r.aktif).map((r) => r.kod);
}

/**
 * Kod → görünen ad eşlemi.
 *
 * Sipariş, sepet, rapor ve e-posta metinleri renk adını böyle yazıyor;
 * listede olmayan kod kendi hâliyle kalıyor (`renkYaz`).
 */
export async function renkAdlari(): Promise<Record<string, string>> {
  const kayit: Record<string, string> = {};
  for (const r of await tumRenkler()) kayit[r.kod] = r.ad;
  return kayit;
}
