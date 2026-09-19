/**
 * Katalog — ürünler, kategoriler, bedenler ve stok.
 *
 * Veritabanı (Neon) henüz kurulmadığı için veriler bu dosyadaki dizilerde
 * duruyor. Şeması `db/schema.prisma` içinde hazır; bağlandığında bu
 * fonksiyonların sadece içleri Prisma sorgusuna dönecek, imzaları
 * değişmeyecek. Sayfalar veriyi hiçbir zaman diziden değil hep bu
 * fonksiyonlardan okur, bu yüzden geçiş sırasında sayfalara dokunulmayacak.
 *
 * Para her yerde tam sayı kuruş (docs/02-mimari.md, 01. karar).
 */

export type GorselTipi = "zibin" | "tulum" | "battaniye" | "patik" | "sapka" | "onluk";
export type RenkAdi = "mint" | "krem" | "mercan" | "mavi" | "sari";
export type Beden = "0-3 ay" | "3-6 ay" | "6-9 ay" | "9-12 ay" | "12-18 ay" | "18-24 ay";
export type RozetTonu = "mint" | "mercan" | "sari" | "mavi";

export type Kategori = {
  slug: string;
  ad: string;
  aciklama: string;
  sira: number;
};

export type Varyant = {
  beden: Beden;
  renk: RenkAdi;
  stok: number;
};

export type Urun = {
  slug: string;
  ad: string;
  ozet: string;
  kategori: string;
  gorsel: GorselTipi;
  palet: RenkAdi;
  fiyatKurus: number;
  eskiFiyatKurus?: number;
  rozet?: { ton: RozetTonu; yazi: string };
  puan: number;
  yorumSayisi: number;
  renkler: RenkAdi[];
  varyantlar: Varyant[];
  kumasIcerigi: string;
  yikamaTalimati: string;
  ozellikler: string[];
};

export const KATEGORILER: Kategori[] = [
  { slug: "yenidogan", ad: "Yenidoğan", aciklama: "İlk aylar için en yumuşak kumaşlar", sira: 1 },
  { slug: "zibin-body", ad: "Zıbın & Body", aciklama: "Günlük kullanımın temel parçası", sira: 2 },
  { slug: "tulum", ad: "Tulum", aciklama: "Tek parça, kolay giydirilen kalıplar", sira: 3 },
  { slug: "uyku", ad: "Uyku", aciklama: "Uyku tulumu, battaniye ve örtüler", sira: 4 },
  { slug: "aksesuar", ad: "Aksesuar", aciklama: "Şapka, patik, önlük ve küçük tamamlayıcılar", sira: 5 },
];

export const BEDENLER: Beden[] = ["0-3 ay", "3-6 ay", "6-9 ay", "9-12 ay", "12-18 ay", "18-24 ay"];

export const RENK_ADLARI: Record<RenkAdi, string> = {
  mint: "Nane",
  krem: "Krem",
  mercan: "Mercan",
  mavi: "Mavi",
  sari: "Sarı",
};

/** Ürün görselleri henüz çizim; gerçek fotoğraflar çekildiğinde yerlerine oturacak. */
export const PALET: Record<RenkAdi, { zemin: string; c1: string; c2: string; c3: string }> = {
  mint: { zemin: "#E6F7EE", c1: "#8FD9B7", c2: "#B9E9D2", c3: "#3FA478" },
  krem: { zemin: "#FBF3E4", c1: "#EBD3A8", c2: "#F7E7C9", c3: "#B08A45" },
  mercan: { zemin: "#FDEBE9", c1: "#F5A79E", c2: "#FAC8C2", c3: "#C2433A" },
  mavi: { zemin: "#EAF3FA", c1: "#A9CCE6", c2: "#CBE2F2", c3: "#3F82B4" },
  sari: { zemin: "#FDF3DD", c1: "#F2CE85", c2: "#F9E6BC", c3: "#8F6410" },
};

function varyantlar(renkler: RenkAdi[], bedenler: Beden[], stoklar: number[]): Varyant[] {
  return renkler.flatMap((renk, ri) =>
    bedenler.map((beden, bi) => ({
      renk,
      beden,
      stok: stoklar[(ri * bedenler.length + bi) % stoklar.length],
    })),
  );
}

const URUNLER: Urun[] = [
  {
    slug: "ayiciklu-organik-body",
    ad: "Ayıcıklı organik body",
    ozet: "Kısa kollu, çıtçıtlı",
    kategori: "zibin-body",
    gorsel: "zibin",
    palet: "mercan",
    fiyatKurus: 24990,
    rozet: { ton: "mercan", yazi: "Çok satan" },
    puan: 4.8,
    yorumSayisi: 126,
    renkler: ["mercan", "krem", "mint", "mavi", "sari"],
    varyantlar: varyantlar(
      ["mercan", "krem", "mint", "mavi", "sari"],
      ["0-3 ay", "3-6 ay", "6-9 ay", "9-12 ay"],
      [12, 8, 0, 5, 3, 14, 7, 2],
    ),
    kumasIcerigi: "%100 organik pamuk",
    yikamaTalimati: "30°C hassas yıkama, çamaşır suyu kullanmayın",
    ozellikler: ["Dikişsiz omuz bandı", "Çıtçıtlı alt kapama", "OEKO-TEX sertifikalı"],
  },
  {
    slug: "fitilli-pamuk-tulum",
    ad: "Fitilli pamuk tulum",
    ozet: "Fermuarlı, ayaklı",
    kategori: "tulum",
    gorsel: "tulum",
    palet: "mint",
    fiyatKurus: 42990,
    eskiFiyatKurus: 49990,
    rozet: { ton: "mint", yazi: "İndirimde" },
    puan: 4.9,
    yorumSayisi: 84,
    renkler: ["mint", "krem", "mavi"],
    varyantlar: varyantlar(["mint", "krem", "mavi"], ["0-3 ay", "3-6 ay", "6-9 ay", "9-12 ay", "12-18 ay"], [6, 9, 4, 0, 11, 2]),
    kumasIcerigi: "%95 pamuk, %5 elastan",
    yikamaTalimati: "30°C hassas yıkama, düşük ısıda ütüleyin",
    ozellikler: ["Boydan fermuar", "Kapalı ayak", "Çenelik korumalı fermuar ucu"],
  },
  {
    slug: "muslin-battaniye-120x120",
    ad: "Müslin battaniye 120×120",
    ozet: "Çift kat, dört mevsim",
    kategori: "uyku",
    gorsel: "battaniye",
    palet: "mavi",
    fiyatKurus: 37990,
    puan: 4.7,
    yorumSayisi: 203,
    renkler: ["mavi", "mint", "krem", "sari"],
    varyantlar: ["mavi", "mint", "krem", "sari"].map((renk, i) => ({
      renk: renk as RenkAdi,
      beden: "0-3 ay" as Beden,
      stok: [18, 7, 0, 24][i],
    })),
    kumasIcerigi: "%100 pamuk müslin",
    yikamaTalimati: "40°C yıkama, her yıkamada yumuşar",
    ozellikler: ["Tek beden 120×120 cm", "Nefes alan dokuma", "Kundak olarak da kullanılır"],
  },
  {
    slug: "bambu-patik-2li",
    ad: "Bambu patik · 2'li",
    ozet: "Kaydırmaz tabanlı",
    kategori: "aksesuar",
    gorsel: "patik",
    palet: "sari",
    fiyatKurus: 15990,
    eskiFiyatKurus: 19990,
    rozet: { ton: "mercan", yazi: "%20" },
    puan: 4.6,
    yorumSayisi: 51,
    renkler: ["sari", "krem", "mercan"],
    varyantlar: varyantlar(["sari", "krem", "mercan"], ["0-3 ay", "3-6 ay", "6-9 ay"], [15, 0, 6, 9, 3]),
    kumasIcerigi: "%70 bambu, %30 pamuk",
    yikamaTalimati: "30°C yıkama, kurutma makinesine vermeyin",
    ozellikler: ["Kaydırmaz silikon taban", "Lastiği bacağı sıkmaz", "İkili paket"],
  },
  {
    slug: "kadife-sapka",
    ad: "Kadife şapka",
    ozet: "Kulak korumalı",
    kategori: "aksesuar",
    gorsel: "sapka",
    palet: "krem",
    fiyatKurus: 18990,
    rozet: { ton: "sari", yazi: "Son 3 adet" },
    puan: 4.9,
    yorumSayisi: 37,
    renkler: ["krem", "mint", "mavi", "sari"],
    varyantlar: varyantlar(["krem", "mint", "mavi", "sari"], ["0-3 ay", "3-6 ay", "6-9 ay"], [1, 2, 0, 3]),
    kumasIcerigi: "%100 pamuk kadife, astarlı",
    yikamaTalimati: "Elde yıkama, gölgede kurutun",
    ozellikler: ["Kulakları kapatan kesim", "Bağcıksız, boğmaz", "Astarlı iç yüzey"],
  },
  {
    slug: "organik-zibin-3lu-set",
    ad: "Organik zıbın · 3'lü set",
    ozet: "Uzun kollu, dikişsiz",
    kategori: "yenidogan",
    gorsel: "zibin",
    palet: "mint",
    fiyatKurus: 21990,
    eskiFiyatKurus: 28990,
    rozet: { ton: "mercan", yazi: "%24" },
    puan: 4.8,
    yorumSayisi: 168,
    renkler: ["mint", "krem", "mercan", "mavi", "sari"],
    varyantlar: varyantlar(
      ["mint", "krem", "mercan", "mavi", "sari"],
      ["0-3 ay", "3-6 ay", "6-9 ay"],
      [22, 14, 9, 0, 17, 6],
    ),
    kumasIcerigi: "%100 organik pamuk",
    yikamaTalimati: "30°C hassas yıkama, ilk yıkamayı giymeden yapın",
    ozellikler: ["Üç adet bir arada", "Dikişsiz yan bantlar", "Bebek eli kapatmalı kol ucu"],
  },
  {
    slug: "pamuklu-onluk-3lu",
    ad: "Pamuklu önlük · 3'lü",
    ozet: "Su geçirmez arkalı",
    kategori: "aksesuar",
    gorsel: "onluk",
    palet: "mercan",
    fiyatKurus: 13990,
    rozet: { ton: "mint", yazi: "Yeni" },
    puan: 4.5,
    yorumSayisi: 29,
    renkler: ["mercan", "sari", "mint"],
    varyantlar: ["mercan", "sari", "mint"].map((renk, i) => ({
      renk: renk as RenkAdi,
      beden: "0-3 ay" as Beden,
      stok: [31, 12, 8][i],
    })),
    kumasIcerigi: "%100 pamuk ön yüz, su geçirmez arka",
    yikamaTalimati: "40°C yıkama, sık yıkamaya dayanıklı",
    ozellikler: ["Çıtçıtlı boyun", "Üçlü paket", "Leke tutmayan yüzey"],
  },
  {
    slug: "uyku-tulumu-25-tog",
    ad: "Uyku tulumu · 2.5 TOG",
    ozet: "Kolsuz, fermuarlı",
    kategori: "uyku",
    gorsel: "tulum",
    palet: "mavi",
    fiyatKurus: 62990,
    eskiFiyatKurus: 74990,
    rozet: { ton: "mercan", yazi: "%16" },
    puan: 4.9,
    yorumSayisi: 92,
    renkler: ["mavi", "krem", "mint"],
    varyantlar: varyantlar(["mavi", "krem", "mint"], ["0-3 ay", "3-6 ay", "6-9 ay", "9-12 ay"], [4, 7, 0, 2, 9]),
    kumasIcerigi: "%100 pamuk dış, elyaf dolgu",
    yikamaTalimati: "30°C yıkama, dolgusu topaklanmaz",
    ozellikler: ["Kış kalınlığı 2.5 TOG", "Ters yönde fermuar", "Kolsuz kesim, terletmez"],
  },
];

/** Kuruşu ekranda görünen fiyata çevirir: 24990 → "249,90 ₺" */
export function fiyatYaz(kurus: number): string {
  return (
    (kurus / 100).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " ₺"
  );
}

export function toplamStok(urun: Urun): number {
  return urun.varyantlar.reduce((t, v) => t + v.stok, 0);
}

export function urununBedenleri(urun: Urun): Beden[] {
  const set = new Set(urun.varyantlar.map((v) => v.beden));
  return BEDENLER.filter((b) => set.has(b));
}

export async function kategorileriGetir(): Promise<Kategori[]> {
  return [...KATEGORILER].sort((a, b) => a.sira - b.sira);
}

export async function kategoriGetir(slug: string): Promise<Kategori | undefined> {
  return KATEGORILER.find((k) => k.slug === slug);
}

export async function urunGetir(slug: string): Promise<Urun | undefined> {
  return URUNLER.find((u) => u.slug === slug);
}

export type UrunSuzgeci = {
  kategori?: string;
  beden?: string;
  renk?: string;
  /** Kuruş cinsinden üst sınır */
  enFazlaKurus?: number;
};

export async function urunleriGetir(suzgec: UrunSuzgeci = {}): Promise<Urun[]> {
  return URUNLER.filter((u) => {
    if (suzgec.kategori && u.kategori !== suzgec.kategori) return false;
    if (suzgec.beden && !u.varyantlar.some((v) => v.beden === suzgec.beden && v.stok > 0)) return false;
    if (suzgec.renk && !u.renkler.includes(suzgec.renk as RenkAdi)) return false;
    if (suzgec.enFazlaKurus && u.fiyatKurus > suzgec.enFazlaKurus) return false;
    return true;
  });
}

/** Ana sayfadaki "Bu haftanın favorileri" şeridi. */
export async function oneCikanUrunler(adet = 8): Promise<Urun[]> {
  return [...URUNLER].sort((a, b) => b.yorumSayisi - a.yorumSayisi).slice(0, adet);
}

export async function benzerUrunler(urun: Urun, adet = 4): Promise<Urun[]> {
  const ayniKategori = URUNLER.filter((u) => u.kategori === urun.kategori && u.slug !== urun.slug);
  const digerleri = URUNLER.filter((u) => u.kategori !== urun.kategori && u.slug !== urun.slug);
  return [...ayniKategori, ...digerleri].slice(0, adet);
}
