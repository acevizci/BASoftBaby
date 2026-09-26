/**
 * Depo ekranının saf parçaları (K-176): tarayıcı ve sunucu ortak.
 */

export type DepoModu = "gelen" | "cikar" | "say";

export const MOD_ADLARI: Record<DepoModu, string> = {
  gelen: "Mal geldi",
  cikar: "Çıkar",
  say: "Say",
};

/** "Çıkar"ın sebepleri; stok hareketine bu kodla yazılıyor. */
export const CIKIS_SEBEPLERI = {
  hasar: "Hasarlı / fire",
  kayip: "Kayıp",
  numune: "Numune, hediye, kendi kullanım",
} as const;
export type CikisSebebi = keyof typeof CIKIS_SEBEPLERI;

/** Okutulan ya da okunan beden; kartta ve listede gösterilen. */
export type DepoBedeni = {
  variantId: string;
  productId: string;
  slug: string;
  urunAd: string;
  beden: string;
  renk: string;
  renkAdi: string;
  sku: string;
  stok: number;
  /** Bir okutma kaç adet (paket barkodu); elle eklenende 1. */
  carpan: number;
  /** Kargolanmamış siparişlerde ayrılan (rafta ama satılmış). */
  ayrilan: number;
  /** "~9 gün", "az veri" gibi. */
  sure: string;
  /** Ürünün alış fiyatı (kuruş, KDV hariç); mal gelirken güncellenebiliyor (K-179). */
  alisKurus: number | null;
};

export type CozSonucu =
  | { tur: "tek"; kod: string; beden: DepoBedeni }
  | { tur: "coklu"; kod: string; bedenler: DepoBedeni[] }
  | { tur: "yok"; kod: string };

export type DepoSatiri = {
  variantId: string;
  /** Eski taslaklarda yok (K-179 öncesi). */
  productId?: string;
  alisKurus?: number | null;
  urunAd: string;
  beden: string;
  renkAdi: string;
  stok: number;
  adet: number;
};

export type DepoSonucu = {
  tur: "gelen" | "cikar";
  kalem: number;
  adet: number;
  /** Çıkar'da stoğu yetmeyen satırlar; kaydedilmedi. */
  yetmeyen: { variantId: string; urunAd: string; istenen: number; stok: number }[];
  /** Aynı anahtar ikinci kez geldi; stok yeniden yazılmadı. */
  tekrar?: boolean;
  /** Mal geldi'de "gelince haber ver" e-postası giden müşteri sayısı. */
  bildirim?: number;
  /** Üretici barkodu öğretilmemiş gelen bedenler: etiket basılabilir. */
  etiketsiz?: { slug: string; urunAd: string }[];
};

/** Bir kayıtta en çok bu kadar satır. */
export const EN_COK_SATIR = 500;
/** Bir satırda en çok bu kadar adet: "12" yerine "1200000" yazım hatası. */
export const EN_COK_ADET = 100_000;

/**
 * Okutulan metni temizler: baştaki ve sondaki boşluklar, içerideki boşluk
 * ve görünmez karakterler (bazı el okuyucular ekliyor). En çok 64 karakter;
 * boşsa `""`.
 */
/** Boşluklar, denetim karakterleri ve sıfır genişlikli karakterler. */
const GORUNMEZ = new RegExp("[\\s\\u0000-\\u001f\\u007f\\u200b-\\u200d\\ufeff]", "g");

export function kodTemizle(ham: string): string {
  return ham.replace(GORUNMEZ, "").slice(0, 64);
}

/** Tarayıcının ürettiği bir kerelik anahtar. */
export function anahtarGecerli(anahtar: string): boolean {
  return /^[A-Za-z0-9_-]{8,64}$/.test(anahtar);
}

/**
 * Aynı bedenin satırlarını birleştirir, geçersiz adetleri atar. Sıra ilk
 * görünüşe göre korunuyor.
 */
export function satirlariBirlestir(
  satirlar: { variantId: string; adet: number }[],
): { variantId: string; adet: number }[] {
  const toplam = new Map<string, number>();
  for (const s of satirlar) {
    if (typeof s.variantId !== "string" || !s.variantId) continue;
    if (!Number.isInteger(s.adet) || s.adet <= 0) continue;
    toplam.set(s.variantId, Math.min(EN_COK_ADET, (toplam.get(s.variantId) ?? 0) + s.adet));
  }
  return [...toplam].map(([variantId, adet]) => ({ variantId, adet }));
}

/** Listeye bir okutma ekler: varsa adedi artar, yoksa başa eklenir. */
export function listeyeEkle(liste: DepoSatiri[], b: DepoBedeni, adet: number): DepoSatiri[] {
  const var_ = liste.find((s) => s.variantId === b.variantId);
  if (var_) {
    return [
      {
        ...var_,
        productId: b.productId,
        alisKurus: b.alisKurus,
        stok: b.stok,
        adet: Math.min(EN_COK_ADET, var_.adet + adet),
      },
      ...liste.filter((s) => s !== var_),
    ];
  }
  return [
    {
      variantId: b.variantId,
      productId: b.productId,
      alisKurus: b.alisKurus,
      urunAd: b.urunAd,
      beden: b.beden,
      renkAdi: b.renkAdi,
      stok: b.stok,
      adet,
    },
    ...liste,
  ];
}
