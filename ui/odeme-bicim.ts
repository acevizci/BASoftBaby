/**
 * Ödeme yöntemlerinin açık olup olmadığı.
 *
 * Kural tek yerde: ödeme sayfası formu çizip çizmeyeceğine, sipariş eylemi
 * de siparişi açıp açmayacağına buradan bakıyor. İki yerde ayrı ayrı
 * yazılsaydı biri gevşediğinde öteki fark etmezdi ve **ödenemeyecek bir
 * sipariş** açılırdı (K-76).
 *
 * Saf modül: veritabanına ya da ortam değişkenine kendisi bakmıyor, kararı
 * verenler okuyup geçiriyor. Böylece sınanabiliyor.
 */

export type OdemeDurumu = {
  kart: boolean;
  havale: boolean;
  /** İkisinden biri bile açıksa sipariş alınabiliyor. */
  alinabilir: boolean;
};

/**
 * @param kartAcik iyzico anahtarları tanımlı mı
 * @param havaleBilgisi satış ayarlarındaki banka/IBAN metni
 */
export function odemeDurumu(kartAcik: boolean, havaleBilgisi: string): OdemeDurumu {
  // Havale "açık" demek için bilgi girilmiş olmalı: boş bir kutuyla havale
  // seçeneği sunmak, müşteriye parayı nereye yatıracağını söyleyemeden
  // sipariş almak demek.
  const havale = havaleBilgisi.trim().length > 0;
  return { kart: kartAcik, havale, alinabilir: kartAcik || havale };
}
