/**
 * Panelin ortak görünüm parçaları ve ekran metinleri.
 *
 * Prisma'ya bulaşmayan saf modül: hem giriş sayfası hem panel içi sayfalar
 * kullanıyor.
 */

export const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2.5 text-sm text-metin outline-none focus:border-mercan";
export const ETIKET = "text-xs font-bold text-metin-2";
export const ANA_DUGME =
  "rounded-full bg-dugme px-6 py-2.5 font-bold text-dugme-yazi transition hover:brightness-95";
export const IKINCIL_DUGME =
  "rounded-full border border-cizgi bg-yuzey px-4 py-2 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin";
export const KART = "rounded-marka border border-cizgi bg-yuzey p-5";
export const HATA_KUTUSU =
  "rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu";
export const IYI_KUTU =
  "rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu";

/**
 * Hata metinleri koddan üretiliyor; adres satırından gelen yazı ekrana
 * basılmıyor. Yoksa biri `/yonetim/giris?hata=...` bağlantısı hazırlayıp
 * sayfamızda istediği yazıyı gösterebilirdi.
 */
export const GIRIS_HATALARI: Record<string, string> = {
  yanlis: "E-posta ya da şifre tutmuyor.",
  "sifre-degisti": "Şifren değiştirildi. Yeni şifrenle giriş yapabilirsin.",
  eksik: "E-posta ve şifre gerekli.",
  "gecersiz-eposta": "Geçerli bir e-posta adresi yaz.",
  "kisa-sifre": "Şifre en az 8 karakter olmalı.",
  "kurulum-sifresi": "Kurulum şifresi tutmuyor.",
  "zaten-var": "İlk kullanıcı zaten oluşturulmuş. Giriş yapabilirsin.",
  // Kilitteki dakika adres satırından sayı olarak geliyor; metin değil sayı
  // taşındığı için cümle sayfada tamamlanıyor.
  kilit: "Çok fazla hatalı deneme yapıldı.",
};

export const SIFIRLAMA_HATALARI: Record<string, string> = {
  "gecersiz-eposta": "Geçerli bir e-posta adresi yaz.",
  "kisa-sifre": "Şifre en az 8 karakter olmalı.",
  "eposta-kapali": "E-posta servisi bağlı olmadığı için bağlantı gönderilemiyor.",
  "gecersiz-jeton":
    "Bağlantı geçersiz, süresi dolmuş ya da zaten kullanılmış. Yeni bir bağlantı iste.",
  kilit: "Çok fazla deneme yapıldı.",
};

export const KULLANICI_HATALARI: Record<string, string> = {
  "gecersiz-eposta": "Geçerli bir e-posta adresi yaz.",
  eksik: "Ad soyad boş bırakılamaz.",
  "kisa-sifre": "Şifre en az 8 karakter olmalı.",
  "eposta-kullanimda": "Bu e-posta ile bir kullanıcı zaten var.",
  bulunamadi: "Kullanıcı bulunamadı.",
  "kendini-kapatamaz": "Kendi hesabını kapatamazsın.",
  "kendini-silemez": "Kendi hesabını silemezsin.",
  "son-sahip": "Son sahip kalmadan panel yönetilemez hale gelir.",
  "eski-sifre": "Mevcut şifren tutmuyor.",
};

export const KULLANICI_BILDIRIMLERI: Record<string, string> = {
  ilk: "İlk kullanıcı oluşturuldu ve giriş yapıldı. Bundan sonra panele bu e-posta ve şifreyle giriliyor.",
  eklendi: "Kullanıcı eklendi.",
  kapatildi: "Kullanıcı kapatıldı ve açık oturumları sonlandırıldı.",
  acildi: "Kullanıcı yeniden açıldı.",
  silindi: "Kullanıcı silindi.",
  rol: "Rol değiştirildi.",
  sifre: "Şifre değiştirildi ve o kullanıcının açık oturumları sonlandırıldı.",
};

/**
 * Kilit mesajını tamamlar.
 *
 * Dakika adres satırından geliyor; sayı olduğu doğrulanmadan cümleye
 * girmiyor ve makul bir aralığın dışındaysa hiç yazılmıyor.
 */
export function kilitMetni(temel: string, dk: string | string[] | undefined): string {
  const kalan = Number(typeof dk === "string" ? dk : "");
  return Number.isInteger(kalan) && kalan > 0 && kalan <= 60
    ? `${temel} ${kalan} dakika sonra yeniden deneyebilirsin.`
    : temel;
}
