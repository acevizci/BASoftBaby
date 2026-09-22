/**
 * Fotoğraf yüklemenin sınırları: hem istemcideki küçültücü (`dosya-birak`)
 * hem sunucuda çizilen yardım metni aynı sayıları okusun diye düz modülde.
 * `"use client"` dosyasından dışa verilen sabit, sunucu bileşeninde sayı
 * değil istemci referansı olarak geliyor.
 */

/**
 * Vercel bir isteğin gövdesini 4,5 MB'ta kesiyor; `bodySizeLimit` ne derse
 * desin bunun üstü sunucuya hiç ulaşmıyor, tarayıcı da yalnızca "An unexpected
 * response was received from the server" diyor. Telefon fotoğrafı tek başına
 * 5-8 MB. Sınırın biraz altında kalıyoruz: formun öteki alanları da gövdede.
 */
export const GOVDE_SINIRI = 4 * 1024 * 1024;

/**
 * Sunucu fotoğrafı zaten 1400 piksele indiriyor (`server/gorsel-depo.ts`).
 * Tarayıcı 1600'e indiriyor: sunucunun işi için yeterince büyük, gövdeye
 * sığacak kadar küçük.
 */
export const EN_GENIS = 1600;

/**
 * Bir fotoğrafın gönderilirken olabileceği en büyük boyut. Kalite adım adım
 * düşürülerek buna indiriliyor; on fotoğraf birlikte gövdeye rahat sığıyor.
 */
export const HEDEF_BAYT = 350 * 1024;

export function boyutYaz(bayt: number): string {
  if (bayt < 1024 * 1024) return `${Math.max(1, Math.round(bayt / 1024))} KB`;
  return `${(bayt / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
