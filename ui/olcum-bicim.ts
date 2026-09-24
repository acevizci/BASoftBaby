/**
 * Reklam ölçümü ve çerez onayı — kurallar (K-124).
 *
 * Saf modül: hem panel formu (sunucu) hem onay bandı (tarayıcı) kullanıyor.
 */

/** Onayın saklandığı çerez. Değerin sonundaki sürüm, araç listesi değişince yeniden sormak için. */
export const IZIN_CEREZI = "cerez_izni";
export const IZIN_SURUMU = "1";

export type Izin = "evet" | "hayir";

/** Çerez değerinden onay; sürümü eski ya da bozuk değer "sorulmadı" sayılıyor. */
export function izinCoz(deger: string | undefined): Izin | undefined {
  if (!deger) return undefined;
  const [karar, surum] = deger.split(".");
  if (surum !== IZIN_SURUMU) return undefined;
  return karar === "evet" || karar === "hayir" ? karar : undefined;
}

export function izinDegeri(karar: Izin): string {
  return `${karar}.${IZIN_SURUMU}`;
}

/** Tarayıcının `document.cookie` metninden bir çerez. */
export function cerezOku(metin: string, ad: string): string | undefined {
  for (const parca of metin.split(";")) {
    const [a, ...d] = parca.trim().split("=");
    if (a === ad) return decodeURIComponent(d.join("="));
  }
  return undefined;
}

/** Meta Pixel kimliği: yalnızca rakam, 10-20 hane. */
export function metaKimligiCoz(ham: string): string | null {
  const k = ham.trim();
  if (k === "") return "";
  return /^\d{10,20}$/.test(k) ? k : null;
}

/** Google etiketi: GA4 ("G-…") ya da Google Ads ("AW-…"). */
export function googleKimligiCoz(ham: string): string | null {
  const k = ham.trim().toUpperCase();
  if (k === "") return "";
  return /^(G|AW)-[A-Z0-9]{4,20}$/.test(k) ? k : null;
}

/**
 * Mağazanın ölçtüğü olaylar ve iki aracın kendi adları. Adlar araçların
 * standart olayları: Meta ve Google raporları onları tanıyor, reklam
 * optimizasyonu bunlarla çalışıyor.
 */
export const OLAYLAR = {
  "urun-goruntuleme": { meta: "ViewContent", google: "view_item" },
  "sepete-ekleme": { meta: "AddToCart", google: "add_to_cart" },
  "odeme-baslangici": { meta: "InitiateCheckout", google: "begin_checkout" },
  satis: { meta: "Purchase", google: "purchase" },
} as const;

export type OlayAdi = keyof typeof OLAYLAR;

export type OlayVerisi = {
  /** Kuruş; araçlara TL olarak gidiyor. */
  tutarKurus?: number;
  urunIdleri?: string[];
  /** Kimlikler ürün grubunun (beslemedeki `item_group_id`), varyantın değil. */
  grup?: boolean;
  urunAdi?: string;
  adet?: number;
  siparisNo?: string;
};

/** İki aracın beklediği biçimde olay parametreleri. */
export function olayParametreleri(v: OlayVerisi): {
  meta: Record<string, unknown>;
  google: Record<string, unknown>;
} {
  const deger = v.tutarKurus !== undefined ? Math.round(v.tutarKurus) / 100 : undefined;
  const idler = v.urunIdleri ?? [];
  return {
    meta: {
      ...(deger !== undefined ? { value: deger, currency: "TRY" } : {}),
      ...(idler.length ? { content_ids: idler, content_type: v.grup ? "product_group" : "product" } : {}),
      ...(v.urunAdi ? { content_name: v.urunAdi } : {}),
      ...(v.adet ? { num_items: v.adet } : {}),
    },
    google: {
      ...(deger !== undefined ? { value: deger, currency: "TRY" } : {}),
      ...(v.siparisNo ? { transaction_id: v.siparisNo } : {}),
      ...(idler.length
        ? { items: idler.map((id) => ({ item_id: id, ...(v.urunAdi ? { item_name: v.urunAdi } : {}) })) }
        : {}),
    },
  };
}
