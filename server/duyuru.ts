/**
 * Duyuru şeridi — sitenin en üstündeki kayan yazı.
 *
 * Mesajlar ve şerit ayarları yönetim panelinden değiştirilir. Veritabanı 02.
 * adımda kurulacağı için şimdilik veriler bu dosyada duruyor; okuma
 * fonksiyonlarının imzası o zaman değişmeyecek, sadece içleri Prisma
 * sorgusuna dönecek. Bu yüzden sayfalar diziyi doğrudan değil hep bu
 * fonksiyonlar üzerinden okur.
 */

export type Duyuru = {
  id: string;
  metin: string;
  /** Tıklanınca gidilecek sayfa. Boşsa mesaj tıklanmaz. */
  link?: string;
  sira: number;
  aktif: boolean;
  /** ISO tarih. Boşsa sınır yok. */
  baslangic?: string;
  bitis?: string;
};

export type SeritHizi = "yavas" | "orta" | "hizli";
export type SeritRengi = "nane" | "mercan" | "sari" | "mavi";

export type SeritAyari = {
  acik: boolean;
  hiz: SeritHizi;
  renk: SeritRengi;
  /** Fare üzerine gelince akış dursun mu */
  durdurHover: boolean;
  mobildeGoster: boolean;
};

const AYAR: SeritAyari = {
  acik: true,
  hiz: "orta",
  renk: "nane",
  durdurHover: true,
  mobildeGoster: true,
};

const DUYURULAR: Duyuru[] = [
  { id: "d1", metin: "750 TL ve üzeri siparişlerde kargo bedava", sira: 1, aktif: true },
  {
    id: "d2",
    metin: "Aynı gün kargo · saat 16:00'a kadar verilen siparişler bugün çıkar",
    sira: 2,
    aktif: true,
  },
  { id: "d3", metin: "Hediye paketi ücretsiz", sira: 3, aktif: true },
];

/** Tarihi gelmemiş ya da geçmiş mesajlar kendiliğinden düşer. */
function yayindaMi(d: Duyuru, simdi: Date): boolean {
  if (!d.aktif) return false;
  if (d.baslangic && simdi < new Date(d.baslangic)) return false;
  if (d.bitis && simdi > new Date(d.bitis)) return false;
  return true;
}

export async function seritAyariGetir(): Promise<SeritAyari> {
  return AYAR;
}

export async function yayindakiDuyurular(simdi: Date = new Date()): Promise<Duyuru[]> {
  return DUYURULAR.filter((d) => yayindaMi(d, simdi)).sort((a, b) => a.sira - b.sira);
}
