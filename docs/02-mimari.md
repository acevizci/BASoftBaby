# Sistem mimarisi

*19 Eylül 2026*

Kod yazmadan önce neyin nereye oturacağının haritası. Sonradan değiştirmesi
pahalı olan şeyler burada karara bağlanıyor.

---

## 1. Sistem haritası

Tek bir uygulama var; vitrin, hesabım ve yönetim paneli aynı kod tabanında ayrı
rota grupları olarak duruyor. Dış servislerle konuşan tek taraf sunucu —
tarayıcı hiçbir zaman iyzico veya kargo API anahtarını görmüyor.

```
  Müşteri (tarayıcı)                                    Dış servisler
  Yönetici (/yonetim)                                   ─────────────
         │                                              PostgreSQL · Neon
         │ HTTPS                                        Cloudflare R2
         ▼                                              iyzico
  ┌────────────────────────────────┐   sunucudan        Kargo API
  │  Next.js · Vercel              │   sunucuya    ───► e-Arşiv
  │  ┌──────────┬───────────────┐  │   anahtarlarla     Resend
  │  │ Vitrin   │ Hesabım       │  │
  │  │ Yönetim  │ API/webhook   │  │
  │  └──────────┴───────────────┘  │
  │  Servis katmanı                │
  │  katalog · fiyatlama · sepet   │
  │  sipariş · ödeme · kargo       │
  └────────────────────────────────┘
```

| Servis | Görevi |
| --- | --- |
| PostgreSQL (Neon) | Ürün, stok, sipariş, müşteri |
| Cloudflare R2 | Ürün görselleri, kargo etiketi ve fatura PDF'leri |
| iyzico | Kart ödemesi, 3D Secure, iade |
| Kargo API | Gönderi açma, barkod, takip |
| e-Arşiv | Fatura kesme |
| Resend | Sipariş ve kargo e-postaları |

---

## 2. Klasör yapısı

Kural basit: sayfalar sadece görünüm, iş kuralları `server/` altında. Aynı
indirim hesabı hem sepette hem siparişte hem ödemede çağrıldığı için tek bir
yerde durması şart.

```
app/
  (vitrin)/               herkese açık sayfalar
    sayfa.tsx             ana sayfa
    [kategori]/           kategori listesi, filtreler
    urun/[slug]/          ürün detayı, varyant seçimi
    sepet/ odeme/         sepet ve ödeme adımı
  (hesap)/                oturum gerekli
    siparislerim/ adreslerim/ iade/
  (yonetim)/              rol = admin gerekli
    urunler/ siparisler/ kampanyalar/ stok/ raporlar/
  api/
    odeme/iyzico/         ödeme dönüş ve bildirim ucu
    kargo/durum/          taşıyıcı durum bildirimi
    cron/                 zamanlı işler

server/                   iş kuralları — tek kaynak
  katalog.ts fiyatlama.ts sepet.ts siparis.ts
  odeme.ts kargo.ts fatura.ts eposta.ts stok.ts

db/
  schema.prisma           veri modeli
  migrations/             şema değişiklik geçmişi

ui/                       ortak arayüz parçaları
marka/                    logo, renkler, yazı tipleri
```

---

## 3. Veri modeli

Kritik nokta varyant: satılan şey ürün değil, ürünün belirli bir beden ve renk
kombinasyonu. Stok, barkod ve fiyat varyantta tutuluyor — "Pamuklu Body" değil,
"Pamuklu Body / 6-9 ay / mint" satılıyor.

### Katalog

**Product** — `slug`, `ad`, `aciklama`, `kategoriId`, `durum` (taslak / yayında /
arşiv), `kdvOrani`, `etiketler`

**ProductVariant** — `beden`, `renk`, `sku`, `barkod`, `fiyatKurus`,
`indirimliFiyatKurus`, `stok`, `rezerveStok`, `agirlikGram`, `desi`

**ProductImage** — `productId`, `variantId?`, `url`, `sira`, `altMetin`
(renge özel görsel varyanta bağlanır)

**Category** — `slug`, `ad`, `parentId` (ağaç), `yasAraligi`

### Müşteri ve sipariş

**Customer** — `eposta`, `ad`, `telefon`, `parolaHash` (argon2),
`kvkkOnayTarihi`, `pazarlamaOnayi`, `rol`

**BabyProfile** — `customerId`, `ad`, `dogumTarihi` veya `beklenenTarih`
(bedene göre öneri ve yaş e-postaları için)

**Address** — `customerId`, `baslik`, `il`, `ilce`, `acikAdres`, `postaKodu`,
`telefon`

**Cart / CartItem** — anonim sepet için `token`, `customerId` opsiyonel

**Order** — `siparisNo`, `durum` (ödemeBekliyor / ödendi / hazırlanıyor /
kargoda / teslim / iptal), `araToplam`, `indirim`, `kargoUcreti`, `kdv`,
`genelToplam` (hepsi kuruş), `teslimatAdresi`, `faturaAdresi` (kopya, bağlantı
değil)

**OrderItem** — `variantId` (referans), `urunAdi`, `beden`, `renk`, `sku`
(sipariş anındaki kopya), `birimFiyatKurus`, `adet`

### Para, kargo, kampanya

**Payment** — `orderId`, `saglayici`, `saglayiciRef` (iyzico ödeme kimliği),
`durum`, `tutarKurus`, `hamYanit`. Kart numarası hiçbir zaman burada değil.

**Shipment** — `orderId`, `tasiyici`, `takipNo`, `etiketUrl`, `durum`,
`gonderimTarihi`

**Invoice** — `orderId`, `faturaNo`, `pdfUrl`, `durum` (kuyrukta / kesildi / hata)

**Campaign** — `ad`, `tip`, `oncelik`, `kosullar`, `etki`, `baslangic`, `bitis`

**Coupon** — `kod`, `campaignId`, `kullanimLimiti`, `kullanimSayisi`,
`musteriBasinaLimit`

**Announcement** — duyuru şeridindeki tek bir mesaj: `metin`, `link`,
`sira`, `aktif`, `baslangic`, `bitis`. Tarihi geçen mesaj sorgudan kendiliğinden
düşer; yönetimden bir şey yapılmaz.

**StoreSetting** — sitenin tek satırlık ayar kaydı; duyuru şeridi için
`seritAcik`, `seritHiz` (yavaş / orta / hızlı), `seritRenk`, `seritDurdurHover`,
`seritMobilde`. Şeridin kendisi ile içindeki mesajlar ayrı durur: mesaj eklemek
ayarları, ayar değiştirmek mesajları bozmaz.

**Diğerleri** — `ReturnRequest` (iade talebi), `StockNotification` (gelince haber
ver), `Review` (puan, yorum, fotoğraf, onay), `GiftRegistry` (bebek hediye
listesi)

---

## 4. Baştan doğru kurulması gerekenler

Hepsi sonradan düzeltilebilir ama hepsi pahalıya patlar; ikisi doğrudan para
kaybı, biri güvenlik açığı.

### 01. Para kuruş olarak, tam sayı

149,90 TL veritabanında `14990` olarak durur. Ondalıklı sayıyla para tutmak,
indirim ve KDV hesabında bir kuruşluk kaymalar üretir; bin siparişte muhasebe
tutmaz.

### 02. Ödeme tutarını sunucu hesaplar

Tarayıcıdan gelen tutara asla güvenilmez. "Siparişi tamamla" denince sunucu
sepeti sıfırdan yeniden fiyatlar ve iyzico'ya kendi hesabını gönderir. Aksi
halde biri tarayıcıdan tutarı 1 TL yapıp ürünü alabilir.

### 03. Sipariş kalemleri o anki haliyle dondurulur

Ürün adı, beden, fiyat sipariş satırına kopyalanır. Üç ay sonra ürünün adı veya
fiyatı değiştiğinde eski faturalar ve siparişler bozulmaz.

### 04. Stok ödeme başlarken rezerve edilir

Son bir adet kalan bedeni iki müşteri aynı anda alamasın diye, ödeme ekranına
giren müşteri için stok 20 dakika bloke edilir. Ödeme gelmezse otomatik serbest
kalır. Bebek ürünlerinde tek adetlik bedenler sık, bu koruma gerçekten lazım.

### 05. Fiyat ve indirim hesabı tek fonksiyonda

Sepet ekranı, ödeme ekranı ve fatura aynı `fiyatlama` fonksiyonunu çağırır. İki
ayrı yerde hesaplanırsa er geç müşteriye gösterilen tutarla çekilen tutar
ayrışır.

### 06. Bildirimler tekrarlansa da bir kez işlenir

iyzico ve kargo firmaları aynı bildirimi birkaç kez gönderebilir. Her bildirimin
kimliği kaydedilir, ikincisi görmezden gelinir. Yoksa bir sipariş iki kez
"ödendi" işlenir, stok iki kez düşer.

### 07. Kart bilgisi hiçbir zaman bize gelmez

Kart numarası iyzico'nun kendi ekranında girilir, bizim sunucumuza uğramaz. Bu
hem PCI yükümlülüğünü tamamen iyzico'ya bırakır hem de sızıntı riskini ortadan
kaldırır.

### 08. Görsel bir kez yüklenir, boyutlar otomatik üretilir

Telefondan çekilen 4 MB'lık fotoğraf yüklenir; sistem listeleme, detay ve telefon
boyutlarını kendi üretir. Yoksa ana sayfa 20 MB olur ve mobilde kimse beklemez.

---

## 5. Ödeme akışı

1. Müşteri sepette **Siparişi tamamla** der.
2. Sunucu sepeti yeniden fiyatlar, stokları kontrol eder, siparişi **ödeme
   bekliyor** durumunda açar ve stoğu rezerve eder.
3. iyzico ödeme formu başlatılır; sipariş numarası referans olarak gider.
4. Müşteri kartını iyzico ekranında girer, bankasının **3D Secure**
   doğrulamasını geçer.
5. iyzico bizi geri çağırır. **Gelen veriye güvenilmez** — sunucu iyzico'ya "bu
   ödeme gerçekten başarılı mı, tutarı ne?" diye ayrıca sorar ve cevabı
   doğrular.
6. Başarılıysa: sipariş **ödendi** olur, rezerve stok kesin düşer, fatura
   kuyruğa girer, onay e-postası gider, panelde yeni sipariş görünür.
7. Başarısızsa: sipariş iptal edilir, rezerve stok anında serbest bırakılır,
   müşteriye sebebi gösterilir.

---

## 6. Kargo etiketi akışı

1. Panelde sipariş seçilip **Kargo etiketi oluştur** denir.
2. Sunucu taşıyıcıya gönderiyi açar; desi ve ağırlık sipariş kalemlerindeki
   varyantlardan toplanır, elle girilmez.
3. Dönen barkodlu etiket PDF olarak saklanır ve panelden doğrudan yazdırılır.
4. Takip numarası müşteriye e-posta ve SMS ile otomatik gider.
5. Taşıyıcının durum bildirimleriyle sipariş **kargoda** ve **teslim edildi**
   olarak kendi kendine ilerler.

---

## 7. Kampanya motoru

Her kampanya bir **koşul** ve bir **etki**den oluşuyor. Panelden kural kurulur,
kod değişmez.

| | |
| --- | --- |
| **Koşul** | Sepet tutarı ≥ X · Şu kategoriden N adet · Kupon kodu girildi · İlk sipariş · Belirli ürünler |
| **Etki** | Yüzde indirim · Tutar indirimi · Ücretsiz kargo · Hediye ürün |
| **Zaman** | Başlangıç ve bitiş tarihi; süresi dolan kampanya kendiliğinden kapanır |
| **Çakışma** | Aynı sepete birden çok kampanya uyarsa **yalnızca en çok indiren** uygulanır |

### Çakışma kuralı (karara bağlandı, 19 Eylül 2026)

İki kampanya aynı sepete birden uyarsa **indirimler üst üste binmez**, müşteriye
en çok kazandıran tek kampanya uygulanır. Kupon kodları da bu kurala tabi.

Örnek: "zıbınlarda %20" ve "500 TL üzeri 100 TL" kampanyaları açıkken 600 TL'lik
sepette %20 daha yüksek indirim verdiği için **480 TL** ödenir, 380 TL değil.

Fiyat ekranında hangi kampanyanın uygulandığı müşteriye yazılır ki "diğeri neden
işlemedi" sorusu gelmesin.

---

## 8. Ortamlar, anahtarlar ve zamanlı işler

| | |
| --- | --- |
| **Geliştirme** | Sahte ürünlerle ve iyzico'nun test kartlarıyla |
| **Önizleme** | Her değişiklik için ayrı geçici adres |
| **Canlı** | Kendi alan adı, gerçek ödeme ve kargo |
| **Anahtarlar** | iyzico, kargo ve fatura şifreleri Vercel'in kasasında; **koda veya GitHub'a hiçbir zaman yazılmaz** |
| **Yedek** | Veritabanı günlük otomatik yedeklenir, geriye dönük 7 gün |

Arka planda kendiliğinden dönen işler: süresi dolan stok rezervasyonlarını
serbest bırakma, sepette ürün bırakanlara hatırlatma e-postası, stoğa giren ürün
için "gelince haber ver" bildirimleri, kritik stok uyarısı ve günlük satış özeti.
