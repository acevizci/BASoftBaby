import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import Iyzipay from "iyzipay";
import type { Siparis } from "@/server/siparis";
import { tamAdres } from "@/server/site";

/**
 * Kartla ödeme — iyzico.
 *
 * **Kart bilgisi bize hiç gelmiyor.** iyzico'nun barındırdığı ödeme formu
 * kullanılıyor: sunucu formu başlatıyor, müşteri iyzico'nun sayfasında kartını
 * giriyor ve bankasının 3D Secure doğrulamasını orada geçiyor, sonra bize geri
 * dönülüyor. Kart numarası, CVC ve 3DS şifresi hiçbir aşamada sunucumuzdan
 * geçmiyor (K-07). Taksit seçeneklerini de o ekran gösteriyor, çünkü hangi
 * kartın kaç taksit yapabildiğini kartın BIN'i belirliyor.
 *
 * **Dönen veriye güvenilmiyor.** iyzico bizi geri çağırdığında yalnızca bir
 * jeton geliyor; ödemenin gerçekten başarılı olup olmadığını ve tutarını
 * iyzico'ya ayrıca sorup cevabın imzasını doğruluyoruz (bkz. odemeSorgula).
 *
 * **Anahtar yoksa kart kapalı.** `IYZICO_API_ANAHTARI` ve
 * `IYZICO_GIZLI_ANAHTAR` tanımlı değilse müşteriye kart seçeneği hiç
 * sunulmuyor; havale/EFT tek başına çalışmaya devam ediyor. Böylece anahtarlar
 * gelmeden de mağaza satış yapabiliyor.
 */

/** Ödeme formunda gösterilecek taksit seçenekleri. */
const TAKSITLER = [2, 3, 6, 9];

/**
 * iyzico alıcı kaydında TC kimlik numarası zorunlu bir alan. Biz TCKN
 * toplamıyoruz: bebek kıyafeti satışı için gerekmiyor ve toplanmayan veri
 * sızdırılamıyor. Alan boş bırakılamadığı için iyzico'nun kendi
 * dokümanındaki yer tutucu gönderiliyor.
 */
const TCKN_YER_TUTUCU = "11111111111";

export type OdemeBaslatma =
  | { tamam: true; jeton: string; adres: string }
  | { tamam: false; hata: string };

export type OdemeSonucu = {
  basarili: boolean;
  saglayiciRef?: string;
  odenenKurus: number;
  taksit: number;
  hata?: string;
  ham: string;
};

export function odemeAcikMi(): boolean {
  return Boolean(process.env.IYZICO_API_ANAHTARI && process.env.IYZICO_GIZLI_ANAHTAR);
}

function tabanAdres(): string {
  const elle = process.env.IYZICO_TABAN_ADRES?.trim();
  if (elle) return elle.replace(/\/$/, "");
  // Anahtar sandbox anahtarıysa sandbox'a gitmek gerekiyor; iyzico sandbox
  // anahtarlarını "sandbox-" ön ekiyle veriyor.
  return process.env.IYZICO_API_ANAHTARI?.startsWith("sandbox-")
    ? "https://sandbox-api.iyzipay.com"
    : "https://api.iyzipay.com";
}

function istemci(): Iyzipay {
  return new Iyzipay({
    apiKey: process.env.IYZICO_API_ANAHTARI ?? "",
    secretKey: process.env.IYZICO_GIZLI_ANAHTAR ?? "",
    uri: tabanAdres(),
  });
}

/** Kuruş → iyzico'nun beklediği ondalık metin: 4990 → "49.90" */
function tutarYaz(kurus: number): string {
  return (kurus / 100).toFixed(2);
}

function metin(deger: unknown): string {
  return typeof deger === "string" ? deger : "";
}

function cagir(
  calistir: (geriCagri: (hata: unknown, sonuc: Record<string, unknown>) => void) => void,
): Promise<Record<string, unknown>> {
  return new Promise((coz, at) => {
    calistir((hata, sonuc) => (hata ? at(hata) : coz(sonuc)));
  });
}

/**
 * Ödeme formunu başlatır ve müşterinin yönlendirileceği adresi döndürür.
 *
 * Sepet kalemleri siparişten okunuyor, yeniden hesaplanmıyor: müşteriye
 * gösterilen tutarla iyzico'ya giden tutar tek kaynaktan gelsin.
 */
export async function odemeBaslat(
  siparis: Siparis,
  istek: { ip: string },
): Promise<OdemeBaslatma> {
  if (!odemeAcikMi()) return { tamam: false, hata: "Kartla ödeme şu an kapalı." };

  const kalemler = siparis.satirlar.map((s, sira) => ({
    id: `${siparis.numara}-${sira + 1}`,
    name: `${s.urunAd} · ${s.beden} · ${s.renkAdi}`.slice(0, 100),
    category1: "Bebek",
    itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
    price: tutarYaz(s.araToplamKurus),
  }));

  const [ad, ...soyadParcalari] = siparis.adSoyad.split(" ");
  const adres = {
    contactName: siparis.adSoyad,
    city: siparis.il,
    country: "Türkiye",
    address: `${siparis.adres} ${siparis.ilce}`.trim(),
    zipCode: siparis.postaKodu || undefined,
  };

  const istekGovdesi = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: siparis.numara,
    // price: sepetin kendi toplamı, paidPrice: kargo ve indirimden sonra
    // karttan çekilecek tutar. iyzico ikisini ayrı istiyor.
    price: tutarYaz(siparis.araToplamKurus),
    paidPrice: tutarYaz(siparis.toplamKurus),
    currency: Iyzipay.CURRENCY.TRY,
    basketId: siparis.numara,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl: tamAdres("/api/odeme/iyzico/donus"),
    enabledInstallments: TAKSITLER,
    buyer: {
      id: siparis.numara,
      name: ad || siparis.adSoyad,
      surname: soyadParcalari.join(" ") || ad || siparis.adSoyad,
      gsmNumber: siparis.telefon,
      email: siparis.eposta,
      identityNumber: TCKN_YER_TUTUCU,
      registrationAddress: `${siparis.adres} ${siparis.ilce}`.trim(),
      ip: istek.ip,
      city: siparis.il,
      country: "Türkiye",
      zipCode: siparis.postaKodu || undefined,
    },
    shippingAddress: adres,
    billingAddress: adres,
    basketItems: kalemler,
  };

  try {
    const sonuc = await cagir((geriCagri) =>
      istemci().checkoutFormInitialize.create(istekGovdesi, geriCagri),
    );

    if (sonuc.status !== "success") {
      console.error("iyzico ödeme formu başlatılamadı:", sonuc.errorCode, sonuc.errorMessage);
      return { tamam: false, hata: metin(sonuc.errorMessage) || "Ödeme başlatılamadı." };
    }

    const jeton = metin(sonuc.token);
    const adresAlani = metin(sonuc.paymentPageUrl);
    if (!jeton || !adresAlani) {
      return { tamam: false, hata: "Ödeme sağlayıcısından beklenen cevap gelmedi." };
    }

    return { tamam: true, jeton, adres: adresAlani };
  } catch (hata) {
    console.error("iyzico çağrısı başarısız:", hata);
    return { tamam: false, hata: "Ödeme sağlayıcısına ulaşılamadı." };
  }
}

/**
 * Ödemenin gerçekten alınıp alınmadığını iyzico'ya sorar.
 *
 * Dönüş çağrısındaki veriye güvenilmiyor: tutar da durum da buradan, yani
 * iyzico'nun kendi cevabından okunuyor. Cevabın imzası da doğrulanıyor, yani
 * araya giren biri "ödendi" diyen bir cevap uyduramıyor.
 */
export async function odemeSorgula(jeton: string): Promise<OdemeSonucu> {
  const bos: OdemeSonucu = { basarili: false, odenenKurus: 0, taksit: 1, ham: "" };
  if (!odemeAcikMi()) return { ...bos, hata: "Kartla ödeme kapalı." };

  try {
    const sonuc = await cagir((geriCagri) =>
      istemci().checkoutForm.retrieve(
        { locale: Iyzipay.LOCALE.TR, token: jeton },
        geriCagri,
      ),
    );

    const ham = JSON.stringify(sonuc).slice(0, 8000);

    if (sonuc.status !== "success") {
      return {
        ...bos,
        ham,
        hata: metin(sonuc.errorMessage) || "Ödeme tamamlanamadı.",
      };
    }

    if (!imzaTutuyorMu(sonuc)) {
      console.error("iyzico cevabının imzası tutmadı:", jeton);
      return { ...bos, ham, hata: "Ödeme doğrulanamadı." };
    }

    const odendi = sonuc.paymentStatus === "SUCCESS";
    const odenen = Number(sonuc.paidPrice ?? 0);

    return {
      basarili: odendi,
      saglayiciRef: metin(sonuc.paymentId) || undefined,
      odenenKurus: Number.isFinite(odenen) ? Math.round(odenen * 100) : 0,
      taksit: Number(sonuc.installment ?? 1) || 1,
      hata: odendi ? undefined : metin(sonuc.errorMessage) || "Ödeme onaylanmadı.",
      ham,
    };
  } catch (hata) {
    console.error("iyzico sorgusu başarısız:", hata);
    return { ...bos, hata: "Ödeme sağlayıcısına ulaşılamadı." };
  }
}

/**
 * iyzico cevaplarını kendi gizli anahtarımızla imzalıyor; imza cevaptaki
 * alanların sırayla birleştirilmiş hâlinin HMAC-SHA256'sı.
 *
 * İmza alanı gelmezse doğrulama yapılamıyor demektir; o durumda cevabı
 * reddediyoruz — doğrulanamayan bir "ödendi" cevabına güvenmektense ödemeyi
 * elle kontrol etmek yeğdir.
 */
function imzaTutuyorMu(sonuc: Record<string, unknown>): boolean {
  const imza = metin(sonuc.signature);
  const gizli = process.env.IYZICO_GIZLI_ANAHTAR ?? "";
  if (!imza || !gizli) return false;

  const alanlar = [
    metin(sonuc.paymentStatus),
    metin(sonuc.paymentId),
    metin(sonuc.currency),
    metin(sonuc.basketId),
    metin(sonuc.conversationId),
    metin(sonuc.paidPrice),
    metin(sonuc.price),
    metin(sonuc.token),
  ];

  // Hesap iyzico'nun kendi dokümanındaki sırayla yapılıyor.
  const beklenen = createHmac("sha256", gizli).update(alanlar.join(":")).digest("hex");

  const a = Buffer.from(imza);
  const b = Buffer.from(beklenen);
  return a.length === b.length && timingSafeEqual(a, b);
}
