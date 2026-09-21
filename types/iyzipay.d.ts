/**
 * iyzico'nun resmî Node paketi tip dosyasıyla gelmiyor; kullandığımız uçlar
 * için gereken en az tip burada. Paketin tamamı değil: ödeme formu başlatma,
 * sonucu sorgulama ve iade (K-58).
 */
declare module "iyzipay" {
  type Sonuc = Record<string, unknown> & {
    status?: string;
    errorMessage?: string;
    errorCode?: string;
  };

  type GeriCagri = (hata: unknown, sonuc: Sonuc) => void;

  class Iyzipay {
    constructor(secenek: { apiKey: string; secretKey: string; uri: string });

    static LOCALE: { TR: string; EN: string };
    static CURRENCY: { TRY: string };
    static PAYMENT_GROUP: { PRODUCT: string; LISTING: string; SUBSCRIPTION: string };
    static BASKET_ITEM_TYPE: { PHYSICAL: string; VIRTUAL: string };

    checkoutFormInitialize: {
      create(istek: Record<string, unknown>, geriCagri: GeriCagri): void;
    };
    checkoutForm: {
      retrieve(istek: Record<string, unknown>, geriCagri: GeriCagri): void;
    };
    /** Aynı gün, tam tutar: mahsuplaşma öncesi iptal. */
    cancel: {
      create(istek: Record<string, unknown>, geriCagri: GeriCagri): void;
    };
    /** Sonraki günler, kısmi tutar olabilir; `paymentId` ile çalışıyor. */
    refundV2: {
      create(istek: Record<string, unknown>, geriCagri: GeriCagri): void;
    };
  }

  export = Iyzipay;
}
