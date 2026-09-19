# BASoftBaby

Online bebek kıyafetleri ve aksesuarları mağazası.

> Bu depo şu an **planlama ve tasarım** aşamasında. Henüz uygulama kodu yok;
> buradaki dosyalar mağazanın ne olacağını, nasıl kurulacağını ve nasıl
> görüneceğini tarif ediyor. Kod yazımı, mimarinin onaylanmasının ardından
> `docs/01-kurulus-plani.md` içindeki yol haritasının 01. adımıyla başlayacak.

## Ne var bu depoda

| Dosya | Ne anlatıyor |
| --- | --- |
| [`docs/01-kurulus-plani.md`](docs/01-kurulus-plani.md) | Kapsam, teknoloji seçimi ve gerekçesi, Türkiye'ye özel yasal zorunluluklar, özellik önerileri, yol haritası |
| [`docs/02-mimari.md`](docs/02-mimari.md) | Sistem haritası, klasör yapısı, veri modeli, ödeme ve kargo akışları, baştan verilen sekiz teknik karar |
| [`docs/03-tasarim-sistemi.md`](docs/03-tasarim-sistemi.md) | Renk paleti, yazı tipleri, bileşenler, 27 ekranın listesi |
| [`docs/04-kararlar.md`](docs/04-kararlar.md) | Verilmiş kararlar ve hâlâ açık olan sorular |
| [`tasarim/mokap.html`](tasarim/mokap.html) | Gezilebilir tasarım mokapı — tarayıcıda açman yeterli, kurulum gerekmez |
| [`marka/`](marka/) | Logo dosyaları (SVG ve PNG) ve marka renkleri |

## Mokapı açmak

`tasarim/mokap.html` dosyasını tarayıcıda çift tıklayarak aç. Sunucu ya da
kurulum gerekmiyor. Üstten önce grup adına, sonra ekran adına basarak 27 ekranın
tamamında gezebilirsin.

## Özet

**Ne yapıyoruz:** Ürün ve görsel yönetimi, kampanya ve indirimler, online ödeme,
kargo etiketi basma ve fatura kesme yeteneği olan bir mağaza.

**Teknoloji:** Next.js + TypeScript + PostgreSQL. Vitrin ve yönetim paneli tek
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
- [x] 27 ekranlık tasarım mokapı
- [ ] Mimari onayı
- [ ] 01. adım: proje iskeleti
