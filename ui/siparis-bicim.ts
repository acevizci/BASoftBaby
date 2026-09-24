/**
 * Sipariş durumlarının ekranda görünen adları ve renkleri.
 * Prisma'ya bulaşmayan saf bir modül: istemci bileşenleri de kullanabilir.
 */

export const DURUMLAR = ["bekliyor", "hazirlaniyor", "kargoda", "teslim", "iptal"] as const;
export type Durum = (typeof DURUMLAR)[number];

export const DURUM_ADLARI: Record<Durum, string> = {
  bekliyor: "Ödeme bekliyor",
  hazirlaniyor: "Hazırlanıyor",
  kargoda: "Kargoda",
  teslim: "Teslim edildi",
  iptal: "İptal",
};

/**
 * Ödeme durumları.
 *
 * `iade-bekliyor` parası alınmış ama iptal/iade edilmiş siparişi işaretliyor:
 * **mağazanın müşteriye borcu var.** Eskiden böyle bir sipariş `bekliyor`a
 * düşüyordu, yani alınmış paranın kaydı siliniyordu ve kimse iade etmesi
 * gerektiğini bilmiyordu (K-57). `iade` ise para geri gönderildikten sonra.
 */
export const ODEME_DURUMLARI = ["bekliyor", "odendi", "iade-bekliyor", "iade"] as const;
export type OdemeDurumu = (typeof ODEME_DURUMLARI)[number];

export const ODEME_ADLARI: Record<OdemeDurumu, string> = {
  bekliyor: "Ödeme bekliyor",
  odendi: "Ödendi",
  "iade-bekliyor": "İade bekliyor",
  iade: "İade edildi",
};

/** "hediye-ceki": çekin tamamını karşıladığı sipariş (K-137). */
export const YONTEMLER = ["havale", "kart", "hediye-ceki"] as const;
export type Yontem = (typeof YONTEMLER)[number];

export const YONTEM_ADLARI: Record<Yontem, string> = {
  havale: "Havale / EFT",
  kart: "Kart",
  "hediye-ceki": "Hediye çeki",
};

export function yontemAdi(yontem: string): string {
  return YONTEM_ADLARI[yontem as Yontem] ?? yontem;
}

/**
 * Rozet rengi: bekleyen mercan, yolda sarı, biten nane, kapanan gri.
 *
 * `iade-bekliyor` mercan kalıyor — mağazanın yapacağı bir iş var. `iade`
 * ise gri: para gitti, dosya kapandı.
 */
export function durumRengi(durum: string): string {
  switch (durum) {
    case "teslim":
    case "odendi":
      return "bg-nane-soluk text-nane-koyu";
    case "kargoda":
    case "hazirlaniyor":
      return "bg-sari-soluk text-sari-koyu";
    case "iptal":
    case "iade":
      // `metin-3` bu zeminde 2,63:1 veriyordu — eşiğin çok altında.
      // `metin-2` 4,94 (K-62). Rozetin "sessiz" olması silik olması
      // demek değil; sessizliği renk değil dolgu taşıyor.
      return "bg-cizgi-soluk text-metin-2";
    default:
      return "bg-mercan-soluk text-mercan-koyu";
  }
}

export function durumAdi(durum: string): string {
  return DURUM_ADLARI[durum as Durum] ?? durum;
}

export function odemeAdi(durum: string): string {
  return ODEME_ADLARI[durum as OdemeDurumu] ?? durum;
}
