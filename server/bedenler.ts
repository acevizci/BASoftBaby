import "server-only";
import { db } from "@/server/veritabani";
import { ETIKETLER, paylasilanOnbellek } from "@/server/onbellek";

/**
 * Bedenler.
 *
 * **Neden veritabanında.** Beden listesi kodda sabit bir dizindi
 * (`BEDENLER`) ve beden adı TypeScript tipiydi. Derleme zamanı güvenliği
 * hoştu ama mağazayı işleten kişi yeni bir beden ekleyemiyordu: "24-36 ay"
 * için kod değişikliği, yeniden dağıtım ve benim burada olmam gerekiyordu.
 * Kategoriler, kampanyalar ve renkler gibi beden de katalog verisi; panelden
 * yönetilmesi gerekiyor (K-56).
 *
 * **Sıra listenin kendisinde.** Beden alfabetik değil: "12-18 ay", "3-6
 * ay"dan sonra gelmeli. Eskiden sıra dizinin yazılış sırasıydı; artık
 * `sira` sütunu. Ürün sayfasında, stok ekranında, süzgeçte ve beden
 * tablosunda hep bu sıra kullanılıyor.
 *
 * **Varyantlar bedene metinle bağlı**, yabancı anahtarla değil. Sipariş
 * satırları bedenin adını kopyalıyor (hukuki sebep: satılan şeyin kaydı
 * değişmemeli). Beden adı değiştirilince açık varyantlar aynı işlem içinde
 * güncelleniyor; sipariş geçmişi olduğu gibi kalıyor.
 */

export type BedenKaydi = {
  id: string;
  ad: string;
  boy: string;
  kilo: string;
  sira: number;
  aktif: boolean;
  /** Ana sayfadaki ve süzgeçteki yaş grubu; boşsa yaş süzgecinde çıkmaz. */
  yasKodu: string | null;
};

const SECIM = {
  id: true,
  ad: true,
  boy: true,
  kilo: true,
  sira: true,
  aktif: true,
  yasKodu: true,
} as const;

/** Kapalılar dahil hepsi: panel listesi bunu kullanıyor. */
export const tumBedenler = paylasilanOnbellek(
  async (): Promise<BedenKaydi[]> =>
    db.size.findMany({ select: SECIM, orderBy: { sira: "asc" } }),
  ["bedenler-hepsi"],
  [ETIKETLER.beden],
);

/** Mağazada ve yeni varyant eklerken görünen bedenler. */
export async function bedenler(): Promise<BedenKaydi[]> {
  return (await tumBedenler()).filter((b) => b.aktif);
}

/** Yalnızca adlar, sırasıyla. */
export async function bedenAdlari(): Promise<string[]> {
  return (await bedenler()).map((b) => b.ad);
}

/**
 * Sıralama için ad → sıra eşlemi.
 *
 * Kapalı bedenler de içinde: bir beden kapatılsa bile o bedende satılmış
 * varyantlar duruyor ve stok ekranında doğru yerde görünmeleri gerekiyor.
 * Listede hiç olmayan bir beden (elle girilmiş eski bir kayıt) sona düşüyor.
 */
export async function bedenSirasi(): Promise<Map<string, number>> {
  const hepsi = await tumBedenler();
  return new Map(hepsi.map((b, i) => [b.ad, i]));
}

/** Sırada olmayan beden sona düşsün diye kullanılan sıra numarası. */
export function sonSira(sira: Map<string, number>, beden: string): number {
  return sira.get(beden) ?? sira.size;
}

/** Yaş grubunun kapsadığı bedenler; bilinmeyen kodda boş dizi. */
export async function yasGrubununBedenleri(kod: string): Promise<string[]> {
  if (!kod) return [];
  return (await bedenler()).filter((b) => b.yasKodu === kod).map((b) => b.ad);
}

/** Beden adı → boy/kilo; istemci bileşenlerine bu biçimde geçiyor. */
export async function bedenOlculeri(): Promise<Record<string, { boy: string; kilo: string }>> {
  const kayit: Record<string, { boy: string; kilo: string }> = {};
  for (const b of await tumBedenler()) kayit[b.ad] = { boy: b.boy, kilo: b.kilo };
  return kayit;
}
