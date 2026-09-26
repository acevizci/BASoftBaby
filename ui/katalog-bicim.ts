/**
 * Katalogun saf (veritabanısız) kısmı: türler, renk paleti, beden sırası ve
 * biçimlendirme yardımcıları.
 *
 * Ayrı dosyada duruyor çünkü tarayıcıda çalışan bileşenler de bunlara
 * ihtiyaç duyuyor; `server/katalog.ts` veritabanına bağlı olduğu için
 * tarayıcı tarafına alınamaz.
 */

export type GorselTipi = "zibin" | "tulum" | "battaniye" | "patik" | "sapka" | "onluk";
/**
 * Renk kodu. Eskiden beş değerlik bir birleşim tipiydi; renkler panelden
 * yönetildiği için (K-66) derleme zamanında bilinmiyor.
 */
export type RenkAdi = string;
export type RozetTonu = "mint" | "mercan" | "sari" | "mavi";

export type Kategori = {
  slug: string;
  ad: string;
  aciklama: string;
  sira: number;
  /** Sayfanın altındaki rehber yazısı (K-130); yalnızca kategori sayfasında dolu. */
  rehberMetni?: string;
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
  /** Fotoğraf yoksa gösterilen çizim */
  gorsel: GorselTipi;
  /** Çizimin renk kodu; formda seçili duran değer */
  palet: RenkAdi;
  /** Çizimin çözülmüş paleti: bileşenler renk listesini sorgulamasın diye burada */
  paletRenkleri: Palet;
  /** Yüklenmiş fotoğraflar, sıralı. Boşsa çizim gösterilir. */
  fotograflar: Fotograf[];
  fiyatKurus: number;
  eskiFiyatKurus?: number;
  /** O an geçerli kampanyanın ürüne düşen hâli; yoksa indirim yok */
  kampanya?: { ad: string; indirimliFiyatKurus: number; bitis?: string };
  rozet?: { ton: RozetTonu; yazi: string };
  puan: number;
  yorumSayisi: number;
  renkler: RenkSecenegi[];
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
export const SIRALAMALAR = ["onerilen", "ucuz", "pahali", "yeni", "puan", "indirim"] as const;
export type Siralama = (typeof SIRALAMALAR)[number];

export const SIRALAMA_ADLARI: Record<Siralama, string> = {
  onerilen: "Önerilen",
  ucuz: "Önce ucuz",
  pahali: "Önce pahalı",
  yeni: "Yeniler",
  puan: "Puana göre",
  indirim: "En çok indirim",
};

/**
 * Yaş grupları artık kodda değil: `AgeGroup` tablosunda ve panelden
 * yönetiliyor (K-65). Okumak için `server/yas-gruplari.ts`.
 *
 * Grup ile beden arasındaki bağ beden kaydında (`Size.yasKodu`): gruplar
 * mağazanın vitrin dili — ana sayfadaki kutular ve süzgeçteki etiketler —
 * bedenler ise stok verisi.
 */

/**
 * Renkler artık kodda değil: `Color` tablosunda ve panelden yönetiliyor
 * (K-66). Okumak için `server/renkler.ts`.
 *
 * Burada yalnızca **biçim** kalıyor: rengin neye benzediği (palet) ve
 * listeden nasıl bulunduğu. Tarayıcıda çalışan bileşenler renk listesini
 * özellik olarak alıyor, sorgulamıyor.
 */

/** Fotoğraf yokken çizilen ürün görselinin renkleri: c1 vurgu, c2 gövde, c3 çizgi. */
export type Palet = { zemin: string; c1: string; c2: string; c3: string };

/** Ekranlara geçen renk: kodu, görünen adı ve paleti. */
export type RenkSecenegi = { kod: string; ad: string; palet: Palet };

/**
 * Listede olmayan renk için palet.
 *
 * Bir renk silinirse o renkteki eski sipariş satırları ve varyantlar
 * duruyor; çizim renksiz kalmasın diye nötr bir kum tonu kullanılıyor.
 * Marka renklerinden biri seçilseydi yanlış bir ürün rengi gösterirdi.
 */
export const VARSAYILAN_PALET: Palet = {
  zemin: "#F4EFE6",
  c1: "#D9CFC0",
  c2: "#EAE3D6",
  c3: "#8C8378",
};

export function renkBul(
  renkler: readonly RenkSecenegi[],
  kod: string | null | undefined,
): RenkSecenegi | undefined {
  if (!kod) return undefined;
  return renkler.find((r) => r.kod === kod);
}

/** Rengin paleti; bilinmeyen kodda nötr palet. */
export function paletCoz(renkler: readonly RenkSecenegi[], kod: string | null | undefined): Palet {
  return renkBul(renkler, kod)?.palet ?? VARSAYILAN_PALET;
}

/** Rengin görünen adı; bilinmeyen kodda kodun kendisi — boş yazı hiç yazmıyor. */
export function renkYaz(renkler: readonly RenkSecenegi[], kod: string): string {
  return renkBul(renkler, kod)?.ad ?? kod;
}

export const GORSEL_TIPLERI: GorselTipi[] = [
  "zibin",
  "tulum",
  "battaniye",
  "patik",
  "sapka",
  "onluk",
];

/**
 * Çizimlerin ekranda görünen adları.
 *
 * Açılır listede ham anahtarlar yazıyordu: "zibin", "sapka", "onluk".
 * Türkçesi bile değildi ve kategori listesine benziyordu — oysa bu bir
 * kategori değil, **fotoğrafı olmayan ürün için çizilen yedek resim**
 * (K-71).
 *
 * **Bu liste panelden uzatılamıyor.** Bedenler, renkler ve yaş grupları
 * tabloya taşındı; çizimler taşınamaz, çünkü her biri elle çizilmiş bir SVG
 * (`ui/urun-gorseli.tsx`). Yeni bir tip eklemek kod değil çizim işi. Ürünün
 * fotoğrafı varsa çizim zaten hiç görünmüyor, yani doğru çözüm fotoğraf
 * yüklemek.
 */
export const GORSEL_ADLARI: Record<GorselTipi, string> = {
  zibin: "Zıbın",
  tulum: "Tulum",
  battaniye: "Battaniye",
  patik: "Patik",
  sapka: "Şapka",
  onluk: "Önlük",
};


/** Kuruşu ekranda görünen fiyata çevirir: 24990 → "249,90 ₺" */
export function fiyatYaz(kurus: number): string {
  return (
    (kurus / 100).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " ₺"
  );
}

/**
 * Müşterinin gördüğü fiyat ve üstü çizili fiyat (K-164).
 *
 * Kampanya varsa satış fiyatı kampanyalı fiyat, üstü çizili de liste
 * fiyatı; yoksa ürüne elle girilmiş eski fiyat. Eski fiyat satış fiyatından
 * büyük değilse üstü çizili yok: "%0 indirim" yazılmasın.
 *
 * Yüzde **aşağı yuvarlanıyor**: %29,6 "%29" yazılıyor, "%30" değil. İndirimi
 * olduğundan büyük göstermek yanıltıcı reklam; birkaç kuruşluk farkta
 * yüzde sıfır çıkıyor ve rozet görünmüyor.
 */
export function urunFiyati(urun: Pick<Urun, "fiyatKurus" | "eskiFiyatKurus" | "kampanya">): {
  satisKurus: number;
  ustuCiziliKurus?: number;
  yuzde: number;
} {
  const satisKurus = urun.kampanya ? urun.kampanya.indirimliFiyatKurus : urun.fiyatKurus;
  const ustu = urun.kampanya ? urun.fiyatKurus : urun.eskiFiyatKurus;
  if (!ustu || ustu <= satisKurus) return { satisKurus, yuzde: 0 };
  return {
    satisKurus,
    ustuCiziliKurus: ustu,
    yuzde: Math.floor(((ustu - satisKurus) * 100) / ustu),
  };
}

/** Stokta ve indirimde mi: "İndirimdekiler" listesinin ölçütü (K-164). */
export function indirimdeMi(urun: Urun): boolean {
  return urunFiyati(urun).ustuCiziliKurus !== undefined && toplamStok(urun) > 0;
}

const GUN = 24 * 60 * 60 * 1000;

/** İstanbul saatiyle takvim günü: gün sınırı gece yarısı, UTC'nin 03:00'ü değil. */
function istanbulGunu(t: Date): number {
  const [y, a, g] = t
    .toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" })
    .split("-")
    .map(Number);
  return Date.UTC(y, a - 1, g) / GUN;
}

/**
 * Kampanyanın bitişine kalan gün notu: "Son gün", "Son 3 gün" (K-164).
 * Bitişe bir haftadan fazla varsa ya da bitiş yoksa boş: uzak bir tarih
 * aciliyet değil, gürültü.
 */
export function kampanyaBitisNotu(bitis: string | undefined, simdi = new Date()): string | undefined {
  if (!bitis) return undefined;
  const son = new Date(bitis);
  if (Number.isNaN(son.getTime()) || son < simdi) return undefined;
  const kalan = istanbulGunu(son) - istanbulGunu(simdi) + 1;
  if (kalan > 7) return undefined;
  return kalan <= 1 ? "Son gün" : `Son ${kalan} gün`;
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

/**
 * Yaş grubu süzgecinin etiketleri.
 *
 * Etikette yalnızca açıklama yazıyordu ("0-3 ay"). Panelden iki gruba aynı
 * açıklama verilince — ki "2-14 Yaş"ı iki ayrı gruba bölmek olağan bir şey —
 * süzgeçte **birbirinin aynı iki düğme** çıkıyor, hangisinin ne getirdiği
 * anlaşılmıyordu (K-72).
 *
 * Kural: açıklama o listede tekse olduğu gibi kalıyor (kısa etiket iyi
 * etiket); çakışıyorsa grubun adı önüne geliyor ("Çocuk · 2-14 Yaş").
 * Açıklama hiç yoksa ad kullanılıyor.
 */
export function yasEtiketleri(
  gruplar: readonly { kod: string; ad: string; aciklama: string }[],
): Map<string, string> {
  const sayim = new Map<string, number>();
  for (const g of gruplar) {
    const a = g.aciklama.trim();
    if (a) sayim.set(a, (sayim.get(a) ?? 0) + 1);
  }

  const etiketler = new Map<string, string>();
  for (const g of gruplar) {
    const a = g.aciklama.trim();
    const ad = g.ad.trim();
    if (!a) etiketler.set(g.kod, ad || g.kod);
    else if ((sayim.get(a) ?? 0) > 1 && ad) etiketler.set(g.kod, `${ad} · ${a}`);
    else etiketler.set(g.kod, a);
  }
  return etiketler;
}

/**
 * Bir listede gerçekten karşılığı olan süzgeç değerleri.
 *
 * Kategori sayfası eskiden bütün bedenleri, renkleri ve yaş gruplarını
 * gösteriyordu: "Aksesuar"da 0-3 ay bedeni, "Uyku"da hiç üretilmemiş bir
 * renk çıkıyor, seçen müşteri boş bir listeye düşüyordu (K-78). Seçenekler
 * artık o kategorinin yayındaki ürünlerinden çıkarılıyor.
 *
 * Kurallar süzgecin kendisiyle aynı (`server/katalog.ts` varyantKosulu):
 * beden ve yaş stokta olan varyanta bakıyor, renk stoğa bakmıyor. Fiyat
 * süzgeci liste fiyatına bakıyor, o yüzden en düşük liste fiyatı dönüyor.
 */
export function suzgecKapsami(
  urunler: readonly Pick<Urun, "fiyatKurus" | "eskiFiyatKurus" | "kampanya" | "varyantlar">[],
): { bedenler: Set<string>; renkler: Set<string>; enDusukKurus: number | undefined } {
  const bedenler = new Set<string>();
  const renkler = new Set<string>();
  let enDusukKurus: number | undefined;
  for (const u of urunler) {
    // Fiyat süzgeci müşterinin gördüğü fiyata bakıyor (K-164).
    const fiyat = urunFiyati(u).satisKurus;
    if (enDusukKurus === undefined || fiyat < enDusukKurus) enDusukKurus = fiyat;
    for (const v of u.varyantlar) {
      renkler.add(v.renk);
      if (v.stok > 0) bedenler.add(v.beden);
    }
  }
  return { bedenler, renkler, enDusukKurus };
}
