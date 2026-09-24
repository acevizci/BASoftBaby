import "server-only";
import { db } from "@/server/veritabani";
import { ayarlariGetir } from "@/server/sepet";
import { kunyeGetir, yasalSayfalariGetir } from "@/server/yasal";
import { odemeAcikMi } from "@/server/odeme";
import { epostaAcikMi } from "@/server/eposta";
import { depoBagliMi } from "@/server/gorsel-depo";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { ORNEK_BANNER_BASLIKLARI, ORNEK_URUN_SLUGLARI } from "@/server/ornek-veri";
import { tamAdres } from "@/server/site";

/**
 * Satışa hazırlık denetimi.
 *
 * **Neden gerekti.** "Mağaza açılmaya hazır mı" sorusunun cevabı sekiz ayrı
 * ekrana dağılmıştı: havale bilgisi satış ayarlarında, yasal metinlerin
 * taslak olup olmadığı yasal metinlerde, kart ödemesinin açık olup olmadığı
 * hiçbir yerde. Bir eksiği fark etmenin tek yolu müşterinin şikâyet etmesiydi
 * (K-75).
 *
 * **Üç ağırlık var ve karışmıyorlar:**
 *
 * - `engel` — bu haliyle **satış yapılamaz ya da hukuka aykırı**. Havale
 *   bilgisi boşken müşteri parayı nereye yatıracağını göremiyor; yasal metin
 *   taslakken mesafeli satış sözleşmesi yok demek.
 * - `uyari` — satış olur ama bir şey eksik kalır. E-posta servisi yoksa
 *   sipariş onayı gitmiyor: müşteri parayı gönderiyor, karşılığında hiçbir
 *   şey almıyor.
 * - `bilgi` — bakılması iyi olan, engel olmayan şeyler.
 *
 * **Her satır nereden düzeltileceğini söylüyor.** "Eksik" demek yetmiyor;
 * panelde hangi ekrana gidileceği yazmazsa aranıyor.
 */

export type Agirlik = "engel" | "uyari" | "bilgi";

export type Kontrol = {
  ad: string;
  tamam: boolean;
  agirlik: Agirlik;
  /** Durumun tek cümlelik karşılığı; tamamken de yazıyor. */
  durum: string;
  /** Eksikse ne olacağı — neden önemli olduğu. */
  sonuc?: string;
  /** Düzeltmenin yapıldığı panel ekranı. */
  yol?: string;
  yolAdi?: string;
};

export type HazirlikBolumu = { baslik: string; kontroller: Kontrol[] };

export type HazirlikRaporu = {
  bolumler: HazirlikBolumu[];
  engel: number;
  uyari: number;
  tamamAdedi: number;
  toplam: number;
};

export async function hazirlikRaporu(): Promise<HazirlikRaporu> {
  const [ayar, kunye, yasal, sayimlar, temizlik] = await Promise.all([
    ayarlariGetir(),
    kunyeGetir(),
    yasalSayfalariGetir(),
    katalogSayimlari(),
    temizlikTaramasi(),
  ]);

  const taslakMetinler = yasal.filter((y) => y.taslakMi);
  const havaleVar = ayar.havaleBilgisi.trim().length > 0;

  const bolumler: HazirlikBolumu[] = [
    {
      baslik: "Para akışı",
      kontroller: [
        {
          ad: "Havale bilgisi",
          tamam: havaleVar,
          agirlik: "engel",
          durum: havaleVar ? "Banka ve IBAN girilmiş." : "Banka, hesap sahibi ve IBAN boş.",
          sonuc:
            "Havaleyle sipariş veren müşteri parayı nereye yatıracağını göremiyor; sipariş ödenmeden kalıyor.",
          yol: "/yonetim/ayarlar",
          yolAdi: "Satış ayarları",
        },
        {
          ad: "Kartla ödeme",
          tamam: odemeAcikMi(),
          agirlik: "uyari",
          durum: odemeAcikMi()
            ? "iyzico anahtarları tanımlı, kart seçeneği müşteriye görünüyor."
            : "iyzico anahtarları yok; ödeme sayfasında yalnızca havale var.",
          sonuc:
            "Kartla ödemeyi tercih eden müşterilerin bir kısmı havale yapmak yerine vazgeçiyor.",
        },
        {
          ad: "Kargo ücreti",
          tamam: ayar.kargoKurus > 0 || ayar.bedavaKargoEsigi > 0,
          agirlik: "bilgi",
          durum:
            ayar.kargoKurus > 0
              ? `Kargo ${fiyatYaz(ayar.kargoKurus)}${
                  ayar.bedavaKargoEsigi > 0
                    ? `, ${fiyatYaz(ayar.bedavaKargoEsigi)} üzeri bedava.`
                    : ", bedava kargo eşiği yok."
                }`
              : "Kargo ücreti sıfır: her sipariş ücretsiz kargoyla çıkıyor.",
          sonuc: "Bilerek yapıldıysa sorun yok; unutulduysa her siparişte kargo bedeli mağazada kalıyor.",
          yol: "/yonetim/ayarlar",
          yolAdi: "Satış ayarları",
        },
      ],
    },
    {
      baslik: "Yasal",
      kontroller: [
        {
          ad: "Künye",
          tamam: !kunye.bosMu,
          agirlik: "engel",
          durum: kunye.bosMu
            ? "Unvan, adres, vergi bilgileri ve iletişim boş."
            : `${kunye.unvan || "Unvan girilmiş"} — künye dolduruldu.`,
          sonuc:
            "Mesafeli satışta satıcının kimliği ve iletişimi sitede bulunmak zorunda; boş künye hem yasal risk hem müşteride güvensizlik.",
          yol: "/yonetim/yasal",
          yolAdi: "Yasal metinler",
        },
        {
          ad: "Yasal metinler",
          tamam: yasal.length > 0 && taslakMetinler.length === 0,
          agirlik: "engel",
          durum:
            yasal.length === 0
              ? "Hiç yasal metin yok."
              : taslakMetinler.length === 0
                ? `${yasal.length} metnin hepsi yayında.`
                : `${taslakMetinler.length} metin hâlâ taslak: ${taslakMetinler
                    .map((y) => y.baslik)
                    .join(", ")}.`,
          sonuc:
            "Taslak metinler sitede uyarıyla görünüyor ve arama motorlarına kapalı. Mesafeli satış sözleşmesi, iade ve KVKK metinleri olmadan satış yapılmamalı.",
          yol: "/yonetim/yasal",
          yolAdi: "Yasal metinler",
        },
      ],
    },
    {
      baslik: "Katalog",
      kontroller: [
        {
          ad: "Yayında ürün",
          tamam: sayimlar.yayinda > 0,
          agirlik: "engel",
          durum:
            sayimlar.yayinda > 0
              ? `${sayimlar.yayinda} ürün yayında.`
              : "Yayında hiç ürün yok; mağaza boş görünüyor.",
          yol: "/yonetim/urunler",
          yolAdi: "Ürünler",
        },
        {
          ad: "Satın alınabilir ürün",
          tamam: sayimlar.varyantsiz === 0,
          agirlik: "engel",
          durum:
            sayimlar.varyantsiz === 0
              ? "Yayındaki her ürünün en az bir beden-renk birleşimi var."
              : `${sayimlar.varyantsiz} yayındaki ürünün hiç beden-renk birleşimi yok.`,
          sonuc:
            "Varyantı olmayan ürün mağazada görünüyor ama sepete eklenemiyor: müşteri ürüne giriyor, alamadan çıkıyor.",
          yol: "/yonetim/stok",
          yolAdi: "Stok",
        },
        {
          ad: "Stok",
          tamam: sayimlar.stoksuz === 0,
          agirlik: "uyari",
          durum:
            sayimlar.stoksuz === 0
              ? "Yayındaki ürünlerin hepsinde stok var."
              : `${sayimlar.stoksuz} yayındaki ürünün toplam stoğu sıfır.`,
          sonuc: "Tamamen tükenmiş ürün listede duruyor ama satın alınamıyor.",
          yol: "/yonetim/stok",
          yolAdi: "Stok",
        },
        {
          ad: "Fotoğraf",
          tamam: sayimlar.fotografsiz === 0,
          agirlik: "uyari",
          durum:
            sayimlar.fotografsiz === 0
              ? "Yayındaki her ürünün fotoğrafı var."
              : `${sayimlar.fotografsiz} yayındaki ürün fotoğrafsız; yerine çizim gösteriliyor.`,
          sonuc: "Çizim geçici bir çözüm; gerçek fotoğraf olmadan satış zor.",
          yol: "/yonetim/urunler?eksik=fotograf",
          yolAdi: "Fotoğrafsız ürünler",
        },
        {
          ad: "Boş kategori",
          tamam: sayimlar.bosKategori === 0,
          agirlik: "bilgi",
          durum:
            sayimlar.bosKategori === 0
              ? "Her kategoride yayında ürün var."
              : `${sayimlar.bosKategori} kategoride yayında ürün yok.`,
          sonuc: "Boş kategori mağaza menüsünde görünmüyor (K-73); ürün atayınca geliyor.",
          yol: "/yonetim/kategoriler",
          yolAdi: "Kategoriler",
        },
      ],
    },
    {
      // Kurulumun örnek verisi ve denemelerden kalan kayıtlar (K-97).
      baslik: "Temizlik",
      kontroller: [
        {
          ad: "Örnek ürünler",
          tamam: temizlik.ornekUrunler.length === 0,
          agirlik: "uyari",
          durum:
            temizlik.ornekUrunler.length === 0
              ? "Kurulumun örnek ürünlerinden yayında olan yok."
              : `Kurulumun ${temizlik.ornekUrunler.length} örnek ürünü yayında: ${adlariYaz(temizlik.ornekUrunler)}.`,
          sonuc:
            "Müşteri gerçek olmayan ürünleri görüyor ve sipariş verebiliyor. Pasife al ya da sil.",
          yol: "/yonetim/urunler",
          yolAdi: "Ürünler",
        },
        {
          ad: "Örnek banner'lar",
          tamam: temizlik.ornekBannerlar.length === 0,
          agirlik: "uyari",
          durum:
            temizlik.ornekBannerlar.length === 0
              ? "Kurulumun örnek banner'larından yayında olan yok."
              : `Kurulumun ${temizlik.ornekBannerlar.length} örnek banner'ı yayında: ${adlariYaz(temizlik.ornekBannerlar)}.`,
          sonuc: "Ana sayfanın en üstünde mağazanın kendi kampanyası yerine örnek yazı dönüyor.",
          yol: "/yonetim/banner",
          yolAdi: "Ana sayfa banner'ı",
        },
        {
          ad: "Deneme kayıtları",
          tamam: temizlik.denemeler.length === 0,
          agirlik: "bilgi",
          durum:
            temizlik.denemeler.length === 0
              ? "Adında \"deneme\" ya da \"test\" geçen yayında ürün, kategori ya da banner yok."
              : `Adında "deneme" ya da "test" geçen ${temizlik.denemeler.length} kayıt yayında: ${adlariYaz(temizlik.denemeler)}.`,
          sonuc: "Denerken açılıp unutulmuş olabilir; gerçekse bu satırı yok say.",
        },
      ],
    },
    {
      baslik: "Altyapı",
      kontroller: [
        {
          ad: "E-posta servisi",
          tamam: epostaAcikMi(),
          agirlik: "uyari",
          // "Gönderiliyor" demiyor: anahtar tanımlı olsa da alan adı
          // doğrulanmadan her gönderim reddediliyor (K-85).
          durum: epostaAcikMi()
            ? "Resend anahtarı tanımlı. Gerçekten gittiğini aşağıdaki deneme e-postasıyla doğrula."
            : "Resend anahtarı yok; hiçbir e-posta gönderilmiyor.",
          sonuc:
            "Sipariş onayı, ödeme onayı, kargo bildirimi, şifre sıfırlama ve iade bildirimi gitmiyor. Müşteri parayı gönderiyor, karşılığında hiçbir şey almıyor.",
        },
        {
          ad: "Fotoğraf deposu",
          tamam: depoBagliMi(),
          agirlik: "uyari",
          durum: depoBagliMi()
            ? "Vercel Blob bağlı; yüklenen fotoğraflar kalıcı."
            : "Depo bağlı değil; fotoğraflar yalnızca bu sunucuda duruyor.",
          sonuc: "Yeni dağıtımda yerel dosyalar kayboluyor.",
        },
        {
          // K-123. Beslemenin kendisi hep hazır; Merchant Center'a bir kez
          // tanıtılması mağaza sahibinin işi, burası adresi veriyor.
          ad: "Google Alışveriş beslemesi",
          tamam: sayimlar.fotografsiz === 0,
          agirlik: "bilgi",
          durum:
            `Adres: ${tamAdres("/google-urunler.xml")} — Merchant Center'da "zamanlanmış getirme" olarak eklenir.` +
            (sayimlar.fotografsiz > 0
              ? ` ${sayimlar.fotografsiz} ürün fotoğrafsız olduğu için beslemede yok.`
              : ""),
          sonuc: "Google fotoğrafsız ürünü kabul etmiyor; fotoğraf eklenince kendiliğinden beslemeye giriyor.",
          yol: "/yonetim/urunler?eksik=fotograf",
          yolAdi: "Fotoğrafsız ürünler",
        },
        {
          ad: "Alan adı",
          tamam: Boolean(process.env.SITE_URL?.trim()),
          agirlik: "bilgi",
          durum: process.env.SITE_URL?.trim()
            ? `Site adresi tanımlı: ${process.env.SITE_URL.trim()}`
            : "SITE_URL tanımlı değil; Vercel'in verdiği adres kullanılıyor.",
          sonuc:
            "Site haritası, canonical adresler ve paylaşım kartları geçici adresle üretiliyor.",
        },
      ],
    },
  ];

  const hepsi = bolumler.flatMap((b) => b.kontroller);
  return {
    bolumler,
    engel: hepsi.filter((k) => !k.tamam && k.agirlik === "engel").length,
    uyari: hepsi.filter((k) => !k.tamam && k.agirlik === "uyari").length,
    tamamAdedi: hepsi.filter((k) => k.tamam).length,
    toplam: hepsi.length,
  };
}

/** Uzun listede ilk beşi ve "ve N tane daha". */
function adlariYaz(adlar: string[]): string {
  const ilk = adlar.slice(0, 5).join(", ");
  return adlar.length > 5 ? `${ilk} ve ${adlar.length - 5} tane daha` : ilk;
}

/**
 * Yayında kalmış örnek ve deneme kayıtları (K-97).
 *
 * Yalnızca **yayındakiler**: pasife alınmış örnek ürün müşteriye görünmüyor,
 * silinmesi şart değil. Deneme araması ad üzerinde, büyük-küçük harfe
 * duyarsız.
 */
async function temizlikTaramasi() {
  const deneme = (alan: string) => ({
    OR: [
      { [alan]: { contains: "deneme", mode: "insensitive" as const } },
      { [alan]: { contains: "test", mode: "insensitive" as const } },
    ],
  });
  const [ornekUrunler, ornekBannerlar, denemeUrun, denemeKategori, denemeBanner] =
    await Promise.all([
      db.product.findMany({
        where: { aktif: true, slug: { in: [...ORNEK_URUN_SLUGLARI] } },
        select: { ad: true },
      }),
      db.heroBanner.findMany({
        where: { aktif: true, baslik: { in: [...ORNEK_BANNER_BASLIKLARI] } },
        select: { baslik: true },
      }),
      db.product.findMany({ where: { aktif: true, ...deneme("ad") }, select: { ad: true } }),
      db.category.findMany({ where: { aktif: true, ...deneme("ad") }, select: { ad: true } }),
      db.heroBanner.findMany({ where: { aktif: true, ...deneme("baslik") }, select: { baslik: true } }),
    ]);
  return {
    ornekUrunler: ornekUrunler.map((u) => u.ad),
    ornekBannerlar: ornekBannerlar.map((b) => b.baslik),
    denemeler: [
      ...denemeUrun.map((u) => `${u.ad} (ürün)`),
      ...denemeKategori.map((k) => `${k.ad} (kategori)`),
      ...denemeBanner.map((b) => `${b.baslik} (banner)`),
    ],
  };
}

/**
 * Katalog sayımları.
 *
 * Hepsi **yayındaki** ürünler üzerinden: pasif bir üründe fotoğrafın ya da
 * stoğun eksik olması bugünün işi değil, o ürün zaten satışta değil.
 */
async function katalogSayimlari() {
  const [yayinda, varyantsiz, stoksuz, fotografsiz, bosKategori] = await Promise.all([
    db.product.count({ where: { aktif: true } }),
    db.product.count({ where: { aktif: true, variants: { none: {} } } }),
    db.product.count({ where: { aktif: true, variants: { some: {}, every: { stok: 0 } } } }),
    db.product.count({ where: { aktif: true, images: { none: {} } } }),
    db.category.count({ where: { aktif: true, products: { none: { aktif: true } } } }),
  ]);
  return { yayinda, varyantsiz, stoksuz, fotografsiz, bosKategori };
}
