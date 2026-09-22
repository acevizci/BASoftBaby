import "server-only";
import { db } from "@/server/veritabani";
import { ETIKETLER, paylasilanOnbellek } from "@/server/onbellek";

/**
 * Yaş grupları.
 *
 * **Neden veritabanında.** Bedenlerde olan şey burada da oldu (K-56): grup
 * listesi kodda sabit bir dizindi ve mağazayı işleten kişi "2-4 yaş"
 * ekleyemiyordu. Bedeni panelden ekleyip ona grup seçememek yarım bir
 * çözümdü — ekranda açılan liste hâlâ koddan geliyordu (K-65).
 *
 * **Grup ile beden arasındaki bağ metin.** Beden kaydı grubun kodunu
 * tutuyor (`Size.yasKodu`), yabancı anahtar yok. Sebebi bedenlerdekiyle
 * aynı değil — burada asıl sebep kodun adresin bir parçası olması:
 * `/urunler?yas=6-12` bağlantısı paylaşılıyor, yer imine ekleniyor, arama
 * motorunda duruyor. Kod değişince bağ da değişiyor; o yüzden kod
 * değiştiğinde bedenler aynı işlem içinde güncelleniyor.
 *
 * **Sıra listenin kendisinde.** Ana sayfadaki dört kutu ve süzgeçteki
 * etiketler bu sırayla diziliyor.
 */

export type YasGrubuKaydi = {
  id: string;
  kod: string;
  ad: string;
  aciklama: string;
  sira: number;
  aktif: boolean;
};

const SECIM = {
  id: true,
  kod: true,
  ad: true,
  aciklama: true,
  sira: true,
  aktif: true,
} as const;

/** Kapalılar dahil hepsi: panel listesi bunu kullanıyor. */
export const tumYasGruplari = paylasilanOnbellek(
  async (): Promise<YasGrubuKaydi[]> =>
    db.ageGroup.findMany({ select: SECIM, orderBy: { sira: "asc" } }),
  ["yas-gruplari-hepsi"],
  [ETIKETLER.yasGrubu],
);

/** Ana sayfada ve süzgeçte görünen gruplar. */
export async function yasGruplari(): Promise<YasGrubuKaydi[]> {
  return (await tumYasGruplari()).filter((y) => y.aktif);
}

/** Geçerli kodlar; doğrulama bunu kullanıyor. */
export async function yasKodlari(): Promise<string[]> {
  return (await tumYasGruplari()).map((y) => y.kod);
}

/**
 * Grubun ekranda görünen adı: "Bebek · 6-12 ay".
 *
 * Kapalı gruplar da bulunuyor: bir grup kapatılsa bile o gruba bağlı
 * bedenler duruyor ve panelde adsız görünmemeleri gerekiyor.
 */
export async function yasGrubuYaz(kod: string | null): Promise<string> {
  if (!kod) return "—";
  const y = (await tumYasGruplari()).find((g) => g.kod === kod);
  return y ? `${y.ad} · ${y.aciklama}` : kod;
}
