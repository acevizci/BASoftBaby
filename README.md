# BASoftBaby

Online bebek kıyafetleri ve aksesuarları mağazası.

> Yol haritasının **01. ve 02. adımları** tamam: proje iskeleti, marka sistemi,
> duyuru şeridi, katalog vitrini ve yönetim paneli. Veriler Neon Postgres'te,
> panelden girilen her değişiklik anında mağazaya yansıyor. Sepet şimdilik
> yalnızca tarayıcıda; 03. adımda sunucuya taşınacak.

## Çalıştırmak

Node.js 20 veya üstü gerekiyor.

```bash
npm install
cp .env.example .env    # içini doldur
npm run tohum           # kategorileri ve örnek ürünleri yazar
npm run dev
```

Sonra tarayıcıda `http://localhost:3000`.

`.env` içinde iki değer var: `DATABASE_URL` (Postgres bağlantısı) ve
`YONETIM_SIFRE` (yönetim panelinin şifresi). İkisi de depoya girmez; yayında
Vercel'in proje ayarlarında durur.

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu, kaydettiğin an ekranda |
| `npm run build` | Yayına çıkacak sürümü derler |
| `npm run kontrol` | Tip ve kod denetimi — göndermeden önce bunu çalıştır |
| `npm run tohum` | Kategorileri, örnek ürünleri ve duyuruları veritabanına yazar |

Yayına ilk gönderimde bu veri kendiliğinden bir kez yazılıyor; sonraki
gönderimlerde yazılmıyor, yani sildiğin örnek ürünler geri gelmiyor.

## Klasörler

| Klasör | İçinde ne var |
| --- | --- |
| `app/` | Sayfalar ve ortak çerçeve. `globals.css` marka renklerini tanımlar |
| `db/` | Veritabanı şeması, göç dosyaları ve başlangıç verisi |
| `ui/` | Ortak arayüz parçaları: duyuru şeridi, üst çubuk, alt bilgi |
| `server/` | İş kuralları. Sayfalar veriyi hep buradan okur |
| `public/marka/` | Logo dosyaları (SVG ve PNG) |
| `docs/` | Plan, mimari, tasarım sistemi, kararlar |
| `tasarim/` | Gezilebilir tasarım mokapı |

## Yönetim paneli

`/yonetim` adresinde. Siparişler, ürün ekleme ve düzenleme, beden-renk stokları,
duyuru şeridi, kampanyalar ve satış ayarları (kargo ücreti, bedava kargo eşiği,
havale bilgisi). Açılabilmesi için `YONETIM_SIFRE` tanımlı olmalı; tanımlı değilse panel
kendini tamamen kapatır (404 verir), yani ayar unutulursa açıkta kalmaz.

## Sipariş akışı

Sepet veritabanında durur, tarayıcıda yalnızca sepetin kimliğini taşıyan
httpOnly bir çerez vardır. Müşteri üye olmadan sipariş verir; ödeme şimdilik
havale/EFT. Stok sipariş anında tek bir veritabanı işlemi içinde düşer, aynı
anda gelen iki sipariş son adedi birlikte alamaz. Müşteri siparişini numarası
ve e-postasıyla `/siparis-takip` adresinden görür. Bütün ekranlar düz HTML
formuyla çalışır, JavaScript kapalı tarayıcıda da sipariş verilebilir.

## Kampanyalar

Yüzde ya da sabit tutar indirimi; tüm ürünlere, bir kategoriye ya da tek ürüne
uygulanabilir. İsteğe bağlı kupon kodu, sepet alt sınırı ve tarih aralığı
verilebilir. **İndirimler üst üste binmez:** bir sepete birden çok kampanya
uyarsa yalnızca en çok indiren uygulanır, müşteri de hangisi olduğunu sepette
görür.

## Belgeler

| Dosya | Ne anlatıyor |
| --- | --- |
| [`docs/01-kurulus-plani.md`](docs/01-kurulus-plani.md) | Kapsam, teknoloji seçimi ve gerekçesi, Türkiye'ye özel yasal zorunluluklar, özellik önerileri, yol haritası |
| [`docs/02-mimari.md`](docs/02-mimari.md) | Sistem haritası, klasör yapısı, veri modeli, ödeme ve kargo akışları, baştan verilen sekiz teknik karar |
| [`docs/03-tasarim-sistemi.md`](docs/03-tasarim-sistemi.md) | Renk paleti, yazı tipleri, bileşenler, 28 ekranın listesi |
| [`docs/04-kararlar.md`](docs/04-kararlar.md) | Verilmiş kararlar ve hâlâ açık olan sorular |
| [`docs/05-marka.md`](docs/05-marka.md) | Logo dosyalarının hangisi nerede kullanılır, renk kodları, kullanım kuralları |
| [`tasarim/mokap.html`](tasarim/mokap.html) | 28 ekranlık tasarım mokapı — tarayıcıda açman yeterli, kurulum gerekmez |

## Özet

**Ne yapıyoruz:** Ürün ve görsel yönetimi, kampanya ve indirimler, online ödeme,
kargo etiketi basma ve fatura kesme yeteneği olan bir mağaza.

**Teknoloji:** Next.js + TypeScript + Tailwind CSS. Vitrin ve yönetim paneli tek
kod tabanında. Ödeme iyzico, kargo tek entegrasyonla Yurtiçi/Aras/MNG/PTT,
fatura e-arşiv, yayın Vercel üzerinde.

**Yol haritası:** 01 marka ve iskelet → 02 katalog ve yönetim paneli →
03 sepet, üyelik, sipariş → 04 ödeme → 05 kargo ve fatura →
06 kampanya ve indirim motoru → 07 yasal metinler, SEO ve açılış.

## Durum

- [x] Kuruluş planı
- [x] Sistem mimarisi
- [x] Marka ve tasarım sistemi
- [x] Logo (vektör olarak yeniden çizildi)
- [x] 28 ekranlık tasarım mokapı
- [x] 01. adım: proje iskeleti ve marka sistemi
- [x] 02. adım: katalog vitrini (ana sayfa, kategori, süzgeç, ürün detayı)
- [x] Veritabanı (Neon Postgres) ve yönetim paneli
- [x] Sepet, sipariş ve sipariş takibi (havale/EFT ile)
- [x] Kampanya ve kupon motoru
- [ ] Gerçek ürünlerin girilmesi
- [ ] Havale hesabının panele girilmesi
- [ ] Üyelik (alan adı ve e-posta servisi gelince)
- [ ] 04. adım: kredi kartıyla ödeme (iyzico)
