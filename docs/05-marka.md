# Marka dosyaları

Site mağaza sahibinin verdiği **orijinal suluboya logoyu** kullanıyor (K-138).
Kaynak `assets/logo-kaynak.webp`; siyah arka planı temizlenip rozet ve amblem
olarak kesildi. Vektör yeniden çizim bırakıldı: suluboya çizim kodla birebir
yeniden üretilemiyordu.

## Hangi dosya nerede

Dosyalar `public/marka/` altında; site onları bu adresten doğrudan servis eder.

| Dosya | Nerede kullanılır |
| --- | --- |
| `basoftbaby-logo.png` | Rozet logonun tamamı, şeffaf zemin (539 px). Google'a bildirilen logo, baskı |
| `basoftbaby-logo-256.webp` / `.png` | Rozet, 256 px. Site üst çubuğu, panel giriş sayfaları |
| `basoftbaby-amblem.png` | Ay üstünde uyuyan ayıcık ve tavşan, beyaz daire içinde (512 px). Sosyal medya profili |
| `basoftbaby-logo-440.webp` | Rozet, 440 px. Ana sayfa banner'ı ("Logo" çizimi) |
| `basoftbaby-apple-touch-180.png` | iPhone ana ekran simgesi (`app/apple-icon.png` ile aynı) |
| `basoftbaby-favicon-64.png` / `-32.png` | Tarayıcı sekmesi simgesi (`app/icon.png` ile aynı) |

Kaynak 924×2000 piksellik bir görsel; rozet bunun içinde yaklaşık 540 piksel.
Web için yeterli. Büyük baskı (tabela, afiş) için daha yüksek çözünürlüklü
orijinal gerekir; gelirse aynı kesimle bütün dosyalar yeniden üretilir.

## Renkler

Aşağıdaki kodlar tahmin değil, logo görselinden piksel örneklemesiyle alındı.
Kullanım rolleri ve yazıda kullanılan koyu karşılıkları için
[`03-tasarim-sistemi.md`](03-tasarim-sistemi.md).

| Renk | Kod |
| --- | --- |
| Mavi · "BA" | `#7BADD6` |
| Nane · "soft" | `#77D9AB` |
| Mercan · "baby" | `#F36C62` |
| Bulut sarısı | `#F3C265` |
| Ayıcık | `#F2B76B` |
| Ayıcık konturu | `#B37A42` |
| Ay nane | `#A8DDC7` |
| Krem zemin | `#FCF5E7` |

Pastel tonlar metinde yeterli kontrast vermediği için yazıda aynı rengin koyu
karşılığı kullanılır: mavi `#2F6E9E`, nane `#277856`, mercan `#B33B33`.

Bu koyu karşılıklar logodan örneklenmiş değil, **okunurluk için türetilmiş**
değerler. İnceleme sırasında ölçülüp ayarlandılar (K-62): nane eski hâlinde
(`#2C8760`) kendi soluk zemininde 3,99:1, beyazda 4,43 veriyordu; mercan
(`#C2433A`) soluk zeminde 4,39. Yardımcı metnin tonu `--metin-3` de
`#9B9289` → `#787064` oldu (beyazda 3,06 → 4,88).

**Düğmeler koyu karşılığı kullanmıyor, kendi belirtecini kullanıyor**
(`--dugme` / `--dugme-yazi`). Sebebi koyu tema: `-koyu` tonları orada açık
renge dönüyor (koyu zeminde yazı olsunlar diye), yani düğme zemini olarak
kullanılamıyorlar. Düğme açık temada koyu zemin + beyaz yazı, koyu temada
açık zemin + koyu yazı.

## Yazı tipleri

- **Baloo 2** (600, 700) — başlıklar, fiyatlar, logo yazısı
- **Nunito Sans** (400, 600, 700) — gövde metni, düğmeler, tablolar, form

İkisi de Google Fonts'ta ve Türkçe karakterleri eksiksiz.

## Kullanım kuralları

- Logonun etrafında en az amblem yüksekliğinin dörtte biri kadar boşluk bırak.
- Logoyu yatay/dikey ayrı ayrı esnetme; oranı koru.
- Renkleri değiştirme. Tek renk gerekiyorsa amblemi ana metin rengiyle
  (`#332F2A`) kullan.
- Rozet kendi krem halkasıyla geldiği için açık ve koyu zeminde olduğu gibi
  kullanılır.

## Bilinen sınır

Logo raster (piksel) bir görsel; vektör sürüm yok. Suluboya bir çizimin iyi
vektörünü ancak bir illüstratör çizebilir, otomatik dönüştürme dokuyu bozar
(bkz. [`04-kararlar.md`](04-kararlar.md) A-04).

## Yatay logo (K-160)

`public/marka/basoftbaby-yatay.webp` / `.png`: amblem + "BAsoftbaby" yazısı ve
altında slogan yan yana (koyu tema için `basoftbaby-yatay-koyu.webp`, slogan açık
renkli), orijinal görselden kesilmiş (yeniden çizim değil). Başlıkta kullanılıyor.
Yatay alanın dar olduğu yerlerde (başlık, e-posta üstü) bu; kare alanlarda
(favicon, profil resmi, paylaşım görseli) yuvarlak rozet.
