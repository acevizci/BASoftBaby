# Tasarım sistemi

*19 Eylül 2026*

> **Kontrast kuralı.** Pastel marka tonları (`--mavi`, `--nane`, `--mercan`,
> `--sari`) yazı rengi ya da beyaz yazı taşıyan düğme zemini olarak
> kullanılmıyor: hiçbiri WCAG AA eşiğini geçmiyor. Yazıda `-koyu`
> karşılıkları, birincil düğmede `--dugme`/`--dugme-yazi` belirteçleri var.
> `-koyu` tonları koyu temada **açık** renge dönüyor (koyu zeminde yazı
> olsunlar diye), bu yüzden düğme zemini olarak kullanılamıyorlar (K-62).

Renkler doğrudan logodan alındı — tahmin edilmedi, logo görselinden piksel
örneklemesiyle çıkarıldı. Gezilebilir hâli için [`../tasarim/mokap.html`](../tasarim/mokap.html).

---

## 1. Renkler

### Marka renkleri

Logodaki pastel tonlar; büyük yüzeylerde, çizimlerde ve rozet zeminlerinde
kullanılır.

| Renk | Kod | Nerede |
| --- | --- | --- |
| Mavi · "BA" | `#7BADD6` | Bilgi rozetleri, çizim detayları |
| Nane · "soft" | `#77D9AB` | Olumlu durum, ay çizimi |
| Mercan · "baby" | `#F36C62` | Satın alma düğmesi, indirim rozeti |
| Bulut sarısı | `#F3C265` | Dikkat rozetleri, bulut çizimi |
| Ayıcık | `#F2B76B` | Çizimler |
| Ayıcık konturu | `#B37A42` | Çizim çizgileri |
| Ay nane | `#A8DDC7` | Çizimler |
| Krem zemin | `#FCF5E7` | Amblem zemini, sıcak yüzeyler |

### Yazıda kullanılan koyu tonlar

Pastel tonlar metinde yeterli kontrast vermiyor; yazı ve düğmelerde aynı rengin
koyu karşılığı kullanılır.

| Renk | Kod | Nerede |
| --- | --- | --- |
| Mavi koyu | `#2F6E9E` | Bağlantılar |
| Nane koyu | `#2C8760` | Stokta, indirim tutarı, başarı |
| Mercan koyu | `#C2433A` | Fiyat, uyarı, kritik stok |
| Ana metin | `#332F2A` | Gövde yazısı |
| İkincil metin | `#6C655C` | Açıklamalar |
| Soluk metin | `#9B9289` | Etiketler, tarihler |

### Renk rolleri

Mercan tek bir işi yapar: satın almaya götüren düğme. Nane olumlu durum, sarı
dikkat, mavi bilgi. Böylece müşteri sayfada nereye basacağını düşünmez.

---

## 2. Yazı tipleri

| Yazı tipi | Nerede | Neden |
| --- | --- | --- |
| **Baloo 2** (600, 700) | Başlıklar, fiyatlar, logo yazısı | Yuvarlak hatları logonun yazısıyla aynı karakterde |
| **Nunito Sans** (400, 600, 700) | Gövde metni, düğmeler, tablolar, form | Türkçe karakterleri eksiksiz, küçük boyutta okunaklı |

İkisi de Google Fonts'ta. Rakamlar `font-variant-numeric: tabular-nums` ile
sabit genişlikte yazılır, böylece fiyatlar ve tablo sütunları alt alta hizalı
durur.

---

## 3. Bileşenler

- **Düğmeler** — dolu mercan (birincil eylem), çerçeveli (ikincil), dolu nane
  (yönetim paneli onay eylemleri). Hepsi tam yuvarlak uçlu.
- **Rozetler** — nane (stokta, yeni), mercan (indirim, çok satan), sarı (son N
  adet), mavi (sertifika, bilgi).
- **Ürün kartı** — görsel paneli (kesikli iç çerçeve, sol üstte rozet, sağ üstte
  favori kalbi), ad, kısa açıklama, renk noktaları, fiyat, puan ve değerlendirme
  sayısı, tam genişlikte "Sepete ekle".
- **Form alanları** — 10px yuvarlatma, 1.5px çerçeve, seçili hâlde mercan.
- **Radyo kartları** — seçenek başlığı, açıklaması ve varsa fiyatı bir arada.
- **Tablolar** — dar ekranda kendi kabında yatay kayar, sayfa kaymaz.
- **Duyuru şeridi** — sayfanın en üstünde soldan sola kayan tek satır. Mesajlar
  iki kez arka arkaya dizilir ve şerit tam bir mesaj dizisi kadar kaydırılır,
  böylece dönüş noktası görünmez, yazı zıplamaz. Fare üzerine gelince akış
  durur. Cihazında "hareketi azalt" açık olan müşteride hiç kaymaz, mesajlar
  ortada sabit durur.

Kutu genişliği her yerde `border-box` hesaplanır; genişliği %100 olan bir düğme
ya da form alanı iç boşluğu yüzünden kabından taşmaz.

---

## 4. Koyu tema

Tüm ekranlar koyu temada da çalışır. Renkler token olarak tanımlanır ve üç durum
için ayrı ayrı çözülür: kullanıcı açık seçmiş, koyu seçmiş, ya da hiçbir şey
seçmemiş (işletim sistemi tercihi). Ürün görseli panelleri koyu temada da açık
pastel kalır — gerçek ürün fotoğrafları da beyaz zeminde duracağı için.

---

## 5. Ekranlar

28 ekran, altı grup. Mokapta üstten grup, sonra ekran seçilerek gezilir.

### Vitrin
| Ekran | İçerik |
| --- | --- |
| Ana sayfa | Üç afişli kayan banner, yaş kutuları, yaş filtresi, ürün ızgarası, güven şeridi |
| Kategori | Süzgeçler: masaüstünde sol sütun, telefonda kapalı açılır panel + açık süzgeç rozetleri; ürün ızgarası |
| Ürün detayı | Galeri, beden ve renk seçimi, stok uyarısı, sepete ekle, hediye paketi, bilgi akordeonu |
| Arama sonuçları | Arama kutusu, kategori daraltma, sonuç ızgarası |
| Beden rehberi | Boy-kilo-göğüs tablosu, nasıl ölçülür, kumaş payı |
| Yorumlar | Puan dağılımı, fotoğraflı yorumlar, yorum yazma formu |

### Satın alma
| Ekran | İçerik |
| --- | --- |
| Sepet | Ücretsiz kargo çubuğu, adet değiştirme, kupon, özet |
| Ödeme adımı | Adım göstergesi, adres, kargo seçimi, hediye notu, kart, sözleşme onayı, sabit sipariş özeti |
| Sipariş onayı | Sipariş numarası, sonraki adımlar, özet, fatura bilgisi |
| Boş durumlar | Boş sepet, sonuç bulunamadı, beden tükendi, sipariş yok |

### Hesap
| Ekran | İçerik |
| --- | --- |
| Giriş / üyelik | Giriş formu, üye olmadan devam, KVKK bilgisi |
| Siparişlerim | Durum filtreleri, sipariş kartları |
| Sipariş detayı | Durum zaman çizelgesi, ürünler, adres, ödeme, fatura, iade başlatma |
| Adres defteri | Kayıtlı adresler, yeni adres formu |
| İade talebi | Ürün seçimi, sebep, süreç açıklaması, iade tutarı |

### Hediye listesi
| Ekran | İçerik |
| --- | --- |
| Liste oluştur | Bebek bilgisi, gizlilik seçimi, paylaşım linki, listedeki ürünler |
| Paylaşılan liste | Yakınlarının gördüğü hâli, alınan ürünler işaretli |

### Yönetim
| Ekran | İçerik |
| --- | --- |
| Siparişler | Özet kartları, sipariş tablosu, toplu kargo etiketi, varyant bazlı stok |
| Ürün formu | Temel bilgiler, görsel yükleme, varyant tablosu, yasal ürün etiketi, Google önizlemesi |
| Kampanya kur | Koşul ve etki seçimi, tarih aralığı, canlı indirim önizlemesi, çakışma kuralı |
| Kuponlar | Kupon tablosu, yeni kupon formu |
| Duyuru şeridi | Canlı önizleme, mesaj tablosu, hız ve renk ayarı, yeni mesaj formu |
| İade yönetimi | İade istatistikleri, talep tablosu, onaylama |
| Bedenler | Beden listesi ve ölçüleri, yaş grupları, sıralama ok düğmeleriyle |
| Renkler | Renk listesi, çizim paleti ve canlı çizim önizlemesi |
| Müşteriler | Müşteri listesi ve kartı: siparişler, adresler, KVKK veri indirme ve silme |
| Satışa hazırlık | Dört bölümde on üç kontrol; engel / eksik / bakılabilir ayrımı |

### Diğer
| Ekran | İçerik |
| --- | --- |
| Yasal sayfa | Mesafeli satış sözleşmesi şablonu (KVKK, çerez, iade için de aynı şablon) |
| SSS | Kategorili sık sorulan sorular |
| 404 | Şaşırmış ayıcık |
| E-posta şablonları | Sipariş onayı, kargoya verildi, sepet hatırlatma |
| Renk ve yazı | Bu belgenin görsel karşılığı |

---

## 6. Henüz geçici olanlar

- **Ürün görselleri** çizim olarak duruyor; gerçek fotoğraflar çekildiğinde
  yerlerine oturacak.
- **Ürün adları ve fiyatlar** örnek.
- **Yasal metinler** tasarım şablonu, hukuki metin değil — avukata
  hazırlatılmalı.
