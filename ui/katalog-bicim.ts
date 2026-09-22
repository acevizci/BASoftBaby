/**
 * Katalogun saf (veritabanısız) kısmı: türler, renk paleti, beden sırası ve
 * biçimlendirme yardımcıları.
 *
 * Ayrı dosyada duruyor çünkü tarayıcıda çalışan bileşenler de bunlara
 * ihtiyaç duyuyor; `server/katalog.ts` veritabanına bağlı olduğu için
 * tarayıcı tarafına alınamaz.
 */

export type GorselTipi = "zibin" | "tulum" | "battaniye" | "patik" | "sapka" | "onluk";
export type RenkAdi = "mint" | "krem" | "mercan" | "mavi" | "sari";
export type RozetTonu = "mint" | "mercan" | "sari" | "mavi";

export type Kategori = {
  slug: string;
  ad: string;
  aciklama: string;
  sira: number;
};

export type Varyant = {
  /** Sepete eklerken forma yazılan varyant kimliği */
  id: string;
  beden: string;
  renk: RenkAdi;
  stok: number;
};

/** Panelden yüklenmiş gerçek ürün fotoğrafı. */
export type Fotograf = {
  id: string;
  yol: string;
  kucukYol: string;
  altMetin: string;
  genislik: number;
  yukseklik: number;
  /** Gösterdiği renk; boşsa her renkte görünüyor (K-48). */
  renk?: RenkAdi;
};

/**
 * Bir rengin fotoğrafları.
 *
 * Renksiz kareler (kumaş yakın çekimi, etiket) hep listede: onlar ürünün
 * kendisini anlatıyor, rengini değil. Seçilen renge ait hiç fotoğraf yoksa
 * hepsi gösteriliyor — boş bir galeri hiç fotoğraf olmamasından kötü.
 */
export function renginFotograflari(fotograflar: Fotograf[], renk?: RenkAdi): Fotograf[] {
  if (!renk) return fotograflar;
  const ozel = fotograflar.filter((f) => f.renk === renk);
  if (ozel.length === 0) return fotograflar;
  return [...ozel, ...fotograflar.filter((f) => !f.renk)];
}

export type Urun = {
  /** Kampanya hesabı için; ekranda görünmez */
  id: string;
  categoryId: string;
  slug: string;
  ad: string;
  ozet: string;
  kategori: string;
  /** Fotoğraf yoksa gösterilen çizim ve renk paleti */
  gorsel: GorselTipi;
  palet: RenkAdi;
  /** Yüklenmiş fotoğraflar, sıralı. Boşsa çizim gösterilir. */
  fotograflar: Fotograf[];
  fiyatKurus: number;
  eskiFiyatKurus?: number;
  /** O an geçerli kampanyanın ürüne düşen hâli; yoksa indirim yok */
  kampanya?: { ad: string; indirimliFiyatKurus: number };
  rozet?: { ton: RozetTonu; yazi: string };
  puan: number;
  yorumSayisi: number;
  renkler: RenkAdi[];
  varyantlar: Varyant[];
  kumasIcerigi: string;
  yikamaTalimati: string;
  ozellikler: string[];
};

/** Bedenler sıralı sabit: veritabanında metin olarak duruyor, ekranda sırası bu. */
/**
 * Liste sıralaması.
 *
 * Varsayılan "önerilen": kataloğa giriş sırası, yani mağaza sahibinin
 * seçtiği düzen. Ötekiler müşterinin kendi ölçütü.
 */
export const SIRALAMALAR = ["onerilen", "ucuz", "pahali", "yeni", "puan"] as const;
export type Siralama = (typeof SIRALAMALAR)[number];

export const SIRALAMA_ADLARI: Record<Siralama, string> = {
  onerilen: "Önerilen",
  ucuz: "Önce ucuz",
  pahali: "Önce pahalı",
  yeni: "Yeniler",
  puan: "Puana göre",
};

/**
 * Yaş grupları artık kodda değil: `AgeGroup` tablosunda ve panelden
 * yönetiliyor (K-65). Okumak için `server/yas-gruplari.ts`.
 *
 * Grup ile beden arasındaki bağ beden kaydında (`Size.yasKodu`): gruplar
 * mağazanın vitrin dili — ana sayfadaki kutular ve süzgeçteki etiketler —
 * bedenler ise stok verisi.
 */

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

export const GORSEL_TIPLERI: GorselTipi[] = [
  "zibin",
  "tulum",
  "battaniye",
  "patik",
  "sapka",
  "onluk",
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

/**
 * Ürünün bedenleri, beden sırasına göre.
 *
 * Sıralama burada yapılmıyor: varyantlar `server/katalog.ts` içinde zaten
 * beden sırasına dizilmiş geliyor (sıra artık veritabanında, K-56). Burada
 * yalnızca tekrarlar ayıklanıyor — sıra korunuyor.
 */
export function urununBedenleri(urun: Urun): string[] {
  const gorulen = new Set<string>();
  const liste: string[] = [];
  for (const v of urun.varyantlar) {
    if (!gorulen.has(v.beden)) {
      gorulen.add(v.beden);
      liste.push(v.beden);
    }
  }
  return liste;
}
