# BASoftBaby

Online bebek kıyafetleri ve aksesuarları mağazası.

> Yol haritasının **01. ve 02. adımları** yazıldı: proje iskeleti, marka
> sistemi, duyuru şeridi ve katalog (ana sayfa, kategori ve süzgeçler, ürün
> detayı, beden-renk seçimi). Katalog verisi veritabanı kurulana kadar kodda
> duruyor; yönetim paneli ve kalıcı sepet veritabanına bağlı.

## Çalıştırmak

Node.js 20 veya üstü gerekiyor.

```bash
npm install
npm run dev
```

Sonra tarayıcıda `http://localhost:3000`.

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu, kaydettiğin an ekranda |
| `npm run build` | Yayına çıkacak sürümü derler |
| `npm run kontrol` | Tip ve kod denetimi — göndermeden önce bunu çalıştır |

## Klasörler

| Klasör | İçinde ne var |
| --- | --- |
| `app/` | Sayfalar ve ortak çerçeve. `globals.css` marka renklerini tanımlar |
| `db/` | Prisma şeması — veritabanı kurulunca uygulanacak |
| `ui/` | Ortak arayüz parçaları: duyuru şeridi, üst çubuk, alt bilgi |
| `server/` | İş kuralları. Sayfalar veriyi hep buradan okur |
| `public/marka/` | Logo dosyaları (SVG ve PNG) |
| `docs/` | Plan, mimari, tasarım sistemi, kararlar |
| `tasarim/` | Gezilebilir tasarım mokapı |

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
- [ ] Vercel'e bağlanması
- [ ] Veritabanı (Neon) ve yönetim paneli
