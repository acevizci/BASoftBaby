/**
 * İptal, iade ve değişim taleplerinin ekranda görünen adları.
 * Prisma'ya bulaşmayan saf modül: istemci bileşenleri de kullanabilir.
 */

export const TALEP_TURLERI = ["iptal", "iade", "degisim"] as const;
export type TalepTuru = (typeof TALEP_TURLERI)[number];

export const TUR_ADLARI: Record<TalepTuru, string> = {
  iptal: "Sipariş iptali",
  iade: "İade",
  degisim: "Beden değişimi",
};

export const TUR_ACIKLAMALARI: Record<TalepTuru, string> = {
  iptal: "Sipariş henüz kargoya verilmedi; tamamen iptal edilip ödeme iade edilir.",
  iade: "Ürünü geri gönderip bedelini geri almak istiyorsun.",
  degisim: "Aynı ürünün başka bedeniyle değiştirmek istiyorsun.",
};

export const TALEP_DURUMLARI = ["yeni", "onaylandi", "reddedildi", "tamamlandi"] as const;
export type TalepDurumu = (typeof TALEP_DURUMLARI)[number];

export const TALEP_DURUM_ADLARI: Record<TalepDurumu, string> = {
  yeni: "Bakılıyor",
  onaylandi: "Onaylandı",
  reddedildi: "Kabul edilmedi",
  tamamlandi: "Tamamlandı",
};

/**
 * Sebep listesi.
 *
 * Cayma hakkında gerekçe göstermek **zorunlu değil** — kanun bunu açıkça
 * söylüyor. Liste yine de var, çünkü "beden tutmadı" mı "üründe hata vardı"
 * mı bilmek kalıpları düzeltmeye yarıyor. Bu yüzden listede "belirtmek
 * istemiyorum" da bir seçenek ve seçilmesi hiçbir şeyi değiştirmiyor.
 */
export const SEBEPLER = [
  { kod: "beden", ad: "Beden tutmadı", turler: ["iade", "degisim"] },
  { kod: "begenmedim", ad: "Beğenmedim, fikrim değişti", turler: ["iptal", "iade"] },
  { kod: "hatali", ad: "Üründe hata var", turler: ["iade", "degisim"] },
  { kod: "yanlis", ad: "Yanlış ürün geldi", turler: ["iade", "degisim"] },
  { kod: "gec", ad: "Çok geç geldi", turler: ["iptal", "iade"] },
  { kod: "yanlis-siparis", ad: "Yanlışlıkla sipariş verdim", turler: ["iptal"] },
  { kod: "belirtmiyorum", ad: "Belirtmek istemiyorum", turler: ["iptal", "iade", "degisim"] },
] as const satisfies readonly { kod: string; ad: string; turler: readonly TalepTuru[] }[];

export function sebepAdi(kod: string): string {
  return SEBEPLER.find((s) => s.kod === kod)?.ad ?? kod;
}

export function turAdi(tur: string): string {
  return TUR_ADLARI[tur as TalepTuru] ?? tur;
}

export function talepDurumAdi(durum: string): string {
  return TALEP_DURUM_ADLARI[durum as TalepDurumu] ?? durum;
}

/** Rozet rengi: bakılıyor sarı, onaylı ve tamamlanan nane, reddedilen gri. */
export function talepDurumRengi(durum: string): string {
  switch (durum) {
    case "onaylandi":
    case "tamamlandi":
      return "bg-nane-soluk text-nane-koyu";
    case "reddedildi":
      return "bg-cizgi-soluk text-metin-3";
    default:
      return "bg-sari-soluk text-sari-koyu";
  }
}
