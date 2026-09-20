/**
 * Hesap sayfalarının ortak görünüm parçaları. Prisma'ya bulaşmayan saf bir
 * modül: hem düzen hem sayfalar kullanıyor.
 */

export const HESAP_SAYFALARI = [
  { yol: "/hesabim", ad: "Siparişlerim" },
  { yol: "/hesabim/adresler", ad: "Adreslerim" },
  { yol: "/hesabim/bilgiler", ad: "Bilgilerim" },
] as const;

export const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2.5 text-sm text-metin outline-none focus:border-mercan";
export const ETIKET = "text-xs font-bold text-metin-2";
export const ANA_DUGME =
  "rounded-full bg-mercan px-6 py-2.5 font-bold text-white transition hover:brightness-95";
export const IKINCIL_DUGME =
  "rounded-full border border-cizgi bg-yuzey px-4 py-2 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin";
export const KART = "rounded-marka border border-cizgi bg-yuzey p-5";
export const HATA_KUTUSU =
  "mt-4 rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu";
export const IYI_KUTU =
  "mt-4 rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu";

/**
 * Hata metinleri koddan üretilir; adres satırından gelen yazı ekrana basılmaz.
 * Yoksa biri `/giris?hata=...` bağlantısı hazırlayıp sayfamızda istediği
 * yazıyı gösterebilirdi.
 */
export const HATALAR: Record<string, string> = {
  kimlik: "E-posta ya da şifre tutmuyor.",
  eksik: "Formda eksik ya da hatalı alan var.",
  kisa: "Şifre en az 8 karakter olmalı.",
  kayitli: "Bu e-posta ile bir hesap zaten var. Giriş yapabilirsin.",
  "sifre-yanlis": "Mevcut şifren tutmuyor.",
  giris: "Bu sayfa için giriş yapman gerekiyor.",
};

export const BILDIRIMLER: Record<string, string> = {
  bilgi: "Bilgilerin kaydedildi.",
  sifre: "Şifren değiştirildi. Diğer cihazlardaki oturumların kapatıldı.",
  adres: "Adres kaydedildi.",
  silindi: "Adres silindi.",
  varsayilan: "Varsayılan adres değişti.",
  dogrulandi: "E-posta adresin doğrulandı.",
  "dogrulama-gonderildi": "Doğrulama bağlantısı e-posta adresine gönderildi.",
};
