/**
 * Panel menüsünün yapısı ve "hangi madde açık" kuralı.
 *
 * Prisma'ya bulaşmayan saf modül: menü istemci bileşeni (K-51) ve
 * `server-only` işaretli `server/panel-menu.ts`'i içeri alamıyor. Sayaçları
 * hesaplayan sorgular orada kaldı; yapı burada, çünkü sekmeler ve hızlı
 * atlama da aynı ağacı kullanıyor (K-116).
 */

/**
 * Menü ikonlarının anahtarları.
 *
 * İkon kütüphanesi eklenmedi: birkaç ikon için bir paket kurmak, sayfaya
 * inen JavaScript'i artırmak ve tema uyumunu dışarı emanet etmek demekti.
 * Yollar `ui/panel-ikon.tsx` içinde, `currentColor` ile çizildikleri için
 * açık/koyu temada kendiliğinden doğru renkte duruyorlar (K-60).
 */
export type IkonAdi =
  | "ozet"
  | "siparis"
  | "urun"
  | "stok"
  | "musteri"
  | "vitrin"
  | "rapor"
  | "ayar"
  /** Hızlı atlama düğmesi (K-119); menü maddesi değil. */
  | "ara";

/**
 * Rozetin tonu. `bekleyen`: müşteri cevap bekliyor, geciktikçe zarar veriyor
 * — dikkat çeken renk. `hatirlatma`: mağazanın kendi işi, bugün yapılmazsa
 * kimse beklemiyor — sessiz renk. Hepsi kırmızı olsaydı hiçbiri kırmızı
 * olmazdı.
 */
export type RozetTonu = "bekleyen" | "hatirlatma";

/** Sayaçların adları; değerleri sunucuda hesaplanıyor (`server/panel-menu.ts`). */
export type SayacAdi =
  | "siparis"
  | "hazirlanacak"
  | "talep"
  | "iade"
  | "yorum"
  | "fotografsiz"
  | "sorunluStok"
  /** Çözülmemiş hata (K-121). */
  | "hata"
  /** Cevap bekleyen ürün sorusu (K-135). */
  | "soru";

export type Sayaclar = Record<SayacAdi, number>;

export type AltMadde = {
  yol: string;
  ad: string;
  /**
   * Hızlı atlamada (K-119) adın yanında aranan başka kelimeler: "masraf"
   * yazan kişi Giderler'i, "yorum" yazan Değerlendirmeler'i bulsun.
   */
  anahtar?: string;
  sayac?: SayacAdi;
  ton?: RozetTonu;
  /**
   * Yan menüde ve bölüm sekmelerinde görünmüyor; sayfanın kendi sekmesinden
   * ve hızlı atlamadan açılıyor (K-177). Stok menüsü 3 satıra indi; geçmiş,
   * satmayanlar ve sayımlar Stok sayfasının sekmeleri.
   */
  menudeGizli?: boolean;
};

export type Bolum = {
  /** Bölümün ana sayfası: adına tıklayınca gidilen yer. */
  yol: string;
  ad: string;
  ikon: IkonAdi;
  anahtar?: string;
  /** Bölümün kendi rozeti (ana sayfasının). */
  sayac?: SayacAdi;
  ton?: RozetTonu;
  /**
   * Bölüm kapalıyken başlıkta toplamı yazılan sayaçlar. Açıkken rakam alt
   * maddelerde duruyor, aynı sayı iki kez görünmüyor. Açıkça yazılıyor,
   * çünkü sayaçlar örtüşebiliyor: "Günün işi" siparişlerin bir alt kümesi,
   * toplansa iki kez sayılırdı.
   */
  ozetSayaclar?: SayacAdi[];
  alt: AltMadde[];
};

/**
 * Menü ağacı (K-116).
 *
 * Üst düzeyde yedi bölüm, en altta Ayarlar. Alt maddeler yalnızca bölüm
 * açıkken görünüyor (Shopify, Stripe, WooCommerce kalıbı): her gün
 * kullanılan şey tek tıkta, hiçbir sayfa menü dışında kalmıyor. Adresler
 * eskisiyle aynı; yalnızca yerleri değişti.
 */
export const BOLUMLER: Bolum[] = [
  { yol: "/yonetim", ad: "Ana sayfa", ikon: "ozet", anahtar: "ozet panel", alt: [] },
  {
    yol: "/yonetim/siparisler",
    ad: "Siparişler",
    ikon: "siparis",
    sayac: "siparis",
    ton: "bekleyen",
    ozetSayaclar: ["siparis", "talep", "iade"],
    alt: [
      { yol: "/yonetim/gunluk", ad: "Günün işi", anahtar: "hazirla paketle kargo", sayac: "hazirlanacak", ton: "bekleyen" },
      { yol: "/yonetim/talepler", ad: "Talepler", anahtar: "degisim iptal", sayac: "talep", ton: "bekleyen" },
      { yol: "/yonetim/iadeler", ad: "İadeler", anahtar: "geri odeme", sayac: "iade", ton: "bekleyen" },
    ],
  },
  {
    yol: "/yonetim/urunler",
    ad: "Ürünler",
    ikon: "urun",
    sayac: "fotografsiz",
    ton: "hatirlatma",
    ozetSayaclar: ["fotografsiz"],
    alt: [
      { yol: "/yonetim/kategoriler", ad: "Kategoriler", anahtar: "reyon" },
      { yol: "/yonetim/bedenler", ad: "Bedenler", anahtar: "yas ay" },
      { yol: "/yonetim/renkler", ad: "Renkler" },
      { yol: "/yonetim/urunler/toplu", ad: "Toplu yükleme", anahtar: "excel csv ice aktar" },
    ],
  },
  {
    yol: "/yonetim/stok",
    ad: "Stok",
    ikon: "stok",
    sayac: "sorunluStok",
    ton: "hatirlatma",
    ozetSayaclar: ["sorunluStok"],
    alt: [
      {
        yol: "/yonetim/stok/depo",
        ad: "Depo",
        anahtar: "mal kabul gelen barkod okut telefon cikar hasar kayip sayim",
      },
      {
        yol: "/yonetim/stok/siparis-listesi",
        ad: "Sipariş ver",
        anahtar: "siparis listesi tedarikci eksik alinacak whatsapp",
      },
      { yol: "/yonetim/stok/hareketler", ad: "Hareketler", anahtar: "stok gecmisi", menudeGizli: true },
      { yol: "/yonetim/stok/satmayanlar", ad: "Satmayanlar", anahtar: "olu stok", menudeGizli: true },
      { yol: "/yonetim/stok/sayim", ad: "Sayımlar", anahtar: "envanter sayim", menudeGizli: true },
    ],
  },
  {
    yol: "/yonetim/musteriler",
    ad: "Müşteriler",
    ikon: "musteri",
    ozetSayaclar: ["yorum", "soru"],
    alt: [
      { yol: "/yonetim/yorumlar", ad: "Değerlendirmeler", anahtar: "yorum puan", sayac: "yorum", ton: "hatirlatma" },
      {
        yol: "/yonetim/sorular",
        ad: "Ürün soruları",
        anahtar: "soru cevap musteri",
        sayac: "soru",
        ton: "bekleyen",
      },
      { yol: "/yonetim/bulten", ad: "E-bülten", anahtar: "bulten kampanya duyuru eposta iys izin" },
      { yol: "/yonetim/dogum-listeleri", ad: "Doğum listeleri", anahtar: "hediye listesi bebek" },
    ],
  },
  {
    yol: "/yonetim/kampanyalar",
    ad: "Vitrin",
    ikon: "vitrin",
    alt: [
      { yol: "/yonetim/kampanyalar", ad: "Kampanyalar", anahtar: "indirim kupon kod" },
      { yol: "/yonetim/banner", ad: "Ana sayfa banner", anahtar: "afis slider gorsel" },
      { yol: "/yonetim/duyuru", ad: "Duyuru şeridi", anahtar: "bildirim ust serit" },
      { yol: "/yonetim/rehber", ad: "Rehber yazıları", anahtar: "blog yazi makale icerik seo" },
      { yol: "/yonetim/hediye-cekleri", ad: "Hediye çekleri", anahtar: "hediye ceki kod bakiye kart" },
    ],
  },
  {
    yol: "/yonetim/rapor",
    ad: "Raporlar",
    ikon: "rapor",
    alt: [
      { yol: "/yonetim/rapor", ad: "Satış raporu", anahtar: "ciro" },
      { yol: "/yonetim/kar", ad: "Aylık kâr", anahtar: "kar zarar net" },
    ],
  },
];

/**
 * Ayarlar: ana listede değil, menünün altında tek giriş (K-116). Alt
 * maddeleri Ayarlar ekranlarının üstünde sekme olarak da duruyor.
 */
export const AYARLAR: Bolum = {
  yol: "/yonetim/ayarlar",
  ad: "Ayarlar",
  ikon: "ayar",
  ozetSayaclar: ["hata"],
  alt: [
    { yol: "/yonetim/ayarlar", ad: "Satış ayarları", anahtar: "kargo ucreti taksit" },
    { yol: "/yonetim/ayarlar/giderler", ad: "Giderler", anahtar: "masraf kira maliyet komisyon" },
    {
      yol: "/yonetim/ayarlar/olcum",
      ad: "Reklam ölçümü",
      anahtar: "pixel piksel meta facebook instagram google analytics ads cerez",
    },
    { yol: "/yonetim/yasal", ad: "Yasal metinler", anahtar: "kvkk sozlesme" },
    {
      yol: "/yonetim/ayarlar/arama-motorlari",
      ad: "Arama motorları",
      anahtar: "seo google search console bing yandex site haritasi indexnow",
    },
    { yol: "/yonetim/kullanicilar", ad: "Kullanıcılar", anahtar: "yonetici personel" },
    { yol: "/yonetim/hazirlik", ad: "Satışa hazırlık", anahtar: "kontrol listesi" },
    { yol: "/yonetim/tani", ad: "Tanı", anahtar: "saglik yavas bolge" },
    {
      yol: "/yonetim/hatalar",
      ad: "Hata kaydı",
      anahtar: "error hata kodu",
      sayac: "hata",
      ton: "hatirlatma",
    },
  ],
};

export const TUM_BOLUMLER: Bolum[] = [...BOLUMLER, AYARLAR];

/** Bir yol bir menü adresine karşılık geliyor mu (kendisi ya da alt sayfası)? */
export function eslesir(yol: string, adres: string): boolean {
  if (adres === "/yonetim") return yol === "/yonetim";
  return yol === adres || yol.startsWith(`${adres}/`);
}

/**
 * Açık sayfanın menüdeki karşılığı: eşleşen adreslerin en uzunu.
 *
 * `/yonetim/stok/sayim/abc` hem "Stok"a hem "Sayım"a uyuyor; işaretlenen
 * Sayım. Alt madde bölümle aynı adresteyse ("Vitrin" ve "Kampanyalar")
 * alt madde işaretleniyor: bölüm başlığı zaten açık.
 */
export function etkinAdres(yol: string, bolumler: Bolum[] = TUM_BOLUMLER): string | undefined {
  let enIyi: string | undefined;
  for (const b of bolumler) {
    for (const adres of [b.yol, ...b.alt.map((a) => a.yol)]) {
      if (eslesir(yol, adres) && (!enIyi || adres.length > enIyi.length)) enIyi = adres;
    }
  }
  return enIyi;
}

/** Açık sayfanın bölümü; alt maddesi eşleşen bölüm kendi adresinden önce geliyor. */
export function etkinBolum(yol: string, bolumler: Bolum[] = TUM_BOLUMLER): Bolum | undefined {
  const adres = etkinAdres(yol, bolumler);
  if (!adres) return undefined;
  return (
    bolumler.find((b) => b.alt.some((a) => a.yol === adres)) ?? bolumler.find((b) => b.yol === adres)
  );
}

/**
 * Bölümün satırı mı işaretli (alt maddesi değil)? Bölüm adresi en iyi
 * eşleşmeyse ve aynı adreste bir alt madde yoksa.
 */
export function bolumSatiriEtkinMi(yol: string, b: Bolum): boolean {
  const adres = etkinAdres(yol);
  return adres === b.yol && !b.alt.some((a) => a.yol === b.yol);
}

/** Kapalı bölümün başlığındaki toplam ve tonu. */
export function bolumOzeti(b: Bolum, s: Sayaclar): { sayi: number; ton: RozetTonu } {
  const sayi = (b.ozetSayaclar ?? []).reduce((t, ad) => t + (s[ad] ?? 0), 0);
  const tonlar = [
    ...(b.sayac && b.ton && s[b.sayac] > 0 ? [b.ton] : []),
    ...b.alt.filter((a) => a.sayac && a.ton && s[a.sayac] > 0).map((a) => a.ton!),
  ];
  return { sayi, ton: tonlar.includes("bekleyen") ? "bekleyen" : "hatirlatma" };
}

/** Müşterinin beklediği işlerin toplamı; telefondaki kapalı menü başlığında. */
export function bekleyenToplami(s: Sayaclar): number {
  return s.siparis + s.talep + s.iade + s.soru;
}

/** Açık sayfanın adı: "Stok › Sayım" gibi. */
export function sayfaAdi(yol: string): string {
  const b = etkinBolum(yol);
  if (!b) return "Yönetim";
  const adres = etkinAdres(yol);
  const alt = b.alt.find((a) => a.yol === adres);
  return alt && alt.ad !== b.ad ? `${b.ad} › ${alt.ad}` : b.ad;
}

/** Elle açılmış bölümlerin çerezi (K-116); `server/panel-gorunum.ts` okuyor. */
export const BOLUM_CEREZI = "panel_bolumler";

/** Yan menüde ve bölüm sekmelerinde görünen alt maddeler (K-177). */
export function gorunenAlt(b: Bolum): AltMadde[] {
  return b.alt.filter((a) => !a.menudeGizli);
}
