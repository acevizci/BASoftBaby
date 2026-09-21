# Marka dosyaları

Logonun orijinal dosyası bulunmadığı için eldeki görselden vektör olarak yeniden
çizildi. Yazılar eğriye çevrildi: dosyalar font gerektirmiyor, her boyutta net
çıkıyor.

## Hangi dosya nerede

Dosyalar `public/marka/` altında; site onları bu adresten doğrudan servis eder.

| Dosya | Nerede kullanılır |
| --- | --- |
| `basoftbaby-logo.svg` | Ana logo (amblem üstte, yazı altta). Baskı, tanıtım, geniş alan |
| `basoftbaby-logo-yatay.svg` | Yatay logo (amblem solda, yazı sağda). Site üst çubuğu, e-posta başlığı |
| `basoftbaby-amblem.svg` | Yalnız amblem (ayıcık, tavşan, bulut, ay). Sosyal medya profili, uygulama simgesi |
| `basoftbaby-logo-1200.png` | Ana logonun 1200 px PNG hâli — SVG desteklemeyen yerler için |
| `basoftbaby-logo-yatay-1200.png` | Yatay logonun 1200 px PNG hâli |
| `basoftbaby-amblem-1024.png` | Amblemin 1024 px PNG hâli |
| `basoftbaby-apple-touch-180.png` | iPhone ana ekran simgesi (`apple-touch-icon`) |
| `basoftbaby-favicon-64.png` | Tarayıcı sekmesi simgesi |
| `basoftbaby-favicon-32.png` | Tarayıcı sekmesi simgesi, küçük boy |

Tercih sırası her zaman SVG. PNG'ler yalnızca SVG kabul etmeyen yerler
(bazı e-posta istemcileri, sosyal medya profil görselleri) içindir.

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
- Koyu zeminde krem (`#FCF5E7`) zeminli amblem sürümünü kullan.

## Bilinen sınır

Orijinal logo suluboya tarzında; vektör sürümde fırça dokusu yok. Karakterler ve
renkler korundu. Orijinal dosya bulunursa onun kullanılması tercih edilir
(bkz. [`04-kararlar.md`](04-kararlar.md) K-03, A-04).
