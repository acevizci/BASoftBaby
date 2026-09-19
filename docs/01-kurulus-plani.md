# Kuruluş planı

*19 Eylül 2026*

Bebek kıyafeti ve aksesuarı satacak mağazayı sıfırdan kuruyoruz: ürün ve görsel
yönetimi, kampanya ve indirimler, online ödeme, kargo etiketi. Bu belge kapsamı,
teknoloji seçimini, Türkiye'de zorunlu olan kısımları ve eklenmesi önerilen
özellikleri tarif ediyor.

---

## 1. Kapsam

Site iki taraftan oluşuyor: müşterinin gördüğü vitrin ve mağaza sahibinin
girdiği yönetim paneli. İkisi de aynı ürün ve stok verisini kullanıyor; panelde
bir beden tükendi olarak işaretlendiğinde vitrinde anında kapanıyor.

### Müşteri tarafı

- Kategori ve ürün sayfaları, çoklu görsel ve yakınlaştırma
- Beden, renk, yaş ve fiyata göre filtreleme
- Sepet, üyelik ve üye olmadan alışveriş
- Kartla online ödeme, 3D Secure ve taksit
- Sipariş takibi ve kargo durumu
- İade talebi açma ekranı
- Telefonda kusursuz çalışan tasarım

### Yönetim paneli

- Ürün ekleme, sürükle bırak görsel yükleme, sıralama
- Varyant yönetimi: her beden ve renk için ayrı stok
- Kampanya ve indirim kurma, tarih aralığı verme
- Kupon kodu üretme
- Sipariş listesi, durum değiştirme
- Barkodlu kargo etiketi yazdırma
- Satış ve stok raporu

---

## 2. Teknoloji

### Seçim

| Katman | Seçim |
| --- | --- |
| Site ve panel | Next.js + TypeScript + Tailwind CSS |
| Veritabanı | PostgreSQL (Neon), Prisma ile |
| Görseller | Cloudflare R2, otomatik boyutlandırma ve WebP |
| Üyelik | Auth.js — müşteri ve admin girişi |
| Ödeme | iyzico — 3D Secure, taksit, iade |
| Kargo | Geliver veya Navlungo — Yurtiçi, Aras, MNG, PTT tek API |
| E-posta | Resend — sipariş, kargo ve iade bildirimleri |
| Yayın | Vercel |

### Neden bu

Vitrin ve yönetim paneli tek dilde yazıldığı için iki ayrı proje bakılmıyor.
Ürün sayfaları sunucuda hazırlanıp gönderildiği için Google'da düzgün çıkıyor,
ki bebek ürünlerinde aramadan gelen müşteri ciddi paya sahip. Başlangıç maliyeti
alan adı ve iyzico komisyonu dışında neredeyse sıfır. iyzico ile kargo
toplayıcıları Türkiye'de yerleşik standart, dokümantasyonları ve destekleri iyi.

### Değerlendirilen alternatif

ikas ya da Shopify gibi hazır bir platformda aylık ücretle kod yazmadan da
açılabilirdi. Özel site tercih edildi çünkü hediye listesi ve bedene göre öneri
gibi aşağıdaki fikirlerin çoğu hazır platformlarda ya yok ya da ek eklenti
parası gerektiriyor.

---

## 3. Türkiye'de zorunlu olanlar

Bunlar teknik değil mevzuat konusu, ama olmadan sanal POS başvurusu onaylanmaz
veya ceza riski doğar.

| Konu | Gereken |
| --- | --- |
| **Şirket** | Sanal POS için şahıs şirketi yeterli, ama vergi levhası ve ticari banka hesabı şart. iyzico başvurusu bunlarla yapılıyor. |
| **ETBİS** | E-ticaret sitesi açan herkes ETBİS kaydı yaptırmak zorunda; kayıt numarası sitenin altında görünmeli. |
| **Sözleşmeler** | Mesafeli satış sözleşmesi, ön bilgilendirme formu, 14 gün cayma hakkı ve iade koşulları. Müşteri ödemeden önce onaylamalı, kopyası e-postayla gitmeli. |
| **KVKK** | Aydınlatma metni, açık rıza kutusu ve çerez politikası. Üyelik ve e-posta listesi için ayrı rıza gerekiyor. |
| **Fatura** | Her siparişe e-arşiv fatura. Paraşüt veya Bizim Hesap entegrasyonuyla otomatik kesilip müşteriye gidebilir. |
| **Ürün etiketi** | Bebek tekstilinde kumaş içeriği, yıkama talimatı, üretici ve ithalatçı bilgisi ürün sayfasında bulunmalı. Emzik, oyuncak, diş kaşıyıcı gibi ürünlerde CE işareti ve yaş uyarısı da gerekli. |

> Yasal metinlerin kendisi bir avukata hazırlatılmalı. Depodaki tasarım yalnızca
> bu metinlerin sitede nerede duracağını ve nasıl görüneceğini gösteriyor.

---

## 4. Önerilen özellikler

Hepsi ilk sürümde olmak zorunda değil. ⭐ işaretliler en çok geri dönüşü
olacağı düşünülenler.

### Satışı artıranlar

- ⭐ **Sepette bırakılanlara hatırlatma e-postası.** Sepeti doldurup çıkan
  müşteriye birkaç saat sonra otomatik e-posta gider. Tek başına en çok satış
  geri kazandıran şey.
- **Ücretsiz kargo barajı.** "Kargo bedava olması için 150 TL kaldı" çubuğu
  sepet ortalamasını gözle görülür yükseltir.
- **Fotoğraflı müşteri yorumları.** Bebek kıyafetinde annelerin kendi bebeğiyle
  çektiği fotoğraf, her reklamdan çok satış yapıyor.
- **Stok bitince "gelince haber ver".** Tükenen bedene e-posta bırakan müşteri,
  ürün gelince otomatik haber alır.
- **Instagram ve Google Shopping ürün akışı.** Ürünler otomatik olarak
  Instagram mağazasına ve Google alışveriş sonuçlarına düşer.
- **İlk üyelik indirimi.** Yüzde 10 karşılığında e-posta adresi toplanır.

### Bebek kategorisine özel

- ⭐ **Bebek hediye listesi.** Anne adayı bir liste oluşturur, linkini
  yakınlarına yollar, onlar listeden alır. Doğum hediyesi alan insanlar ne
  alacağını bilmiyor; bu sorunu çözerken tek müşteriden birçok sipariş geliyor.
- **Yaş ve beden filtresi.** 0-3 ay, 3-6 ay, 6-9 ay diye filtrelenebilsin,
  yanında boy-kilo tablolu beden rehberi olsun. Bebek kıyafetinde iadelerin
  çoğu yanlış bedenden.
- **Hediye paketi ve hediye notu.** Ödeme sırasında kutu ve el yazısı not
  seçeneği, paketin içine fiyatsız fiş.
- **Bebeğin doğum tarihini kaydetme.** Müşteri bir kez girer, bebek büyüdükçe
  bir sonraki beden ve yaşına uygun ürünler otomatik önerilir. Aynı müşteriyi
  yıllarca elde tutar.
- **Ürün rozetleri.** %100 pamuk, OEKO-TEX, dikişsiz, çıtçıtlı gibi etiketler.

### İşi kolaylaştıranlar

- **Excel ile toplu ürün yükleme.** Yüz ürünü tek tek girmek yerine tablodan
  aktarma, fiyat güncellemesini de aynı şekilde yapma.
- ⭐ **Tek ekranda kargo akışı.** Siparişi seç, etiketi yazdır, takip numarası
  müşteriye otomatik e-posta ve SMS olarak gitsin.
- **Otomatik e-arşiv fatura.** Sipariş onaylanınca fatura kesilip müşteriye
  gider, ay sonu muhasebe derdi kalmaz.
- **İade yönetimi.** Müşteri siteden talep açar, onaylanır, iade kargo kodu
  otomatik oluşur.
- **WhatsApp destek butonu.** Türkiye'de müşteri soruyu WhatsApp'tan soruyor.
- **Kritik stok uyarısı.** Bir bedenin adedi eşiğin altına inince bildirim.
- **İleride pazaryeri.** Aynı stoktan Trendyol ve Hepsiburada'ya da satabilecek
  şekilde kurgulama.

---

## 5. Yol haritası

Bu bir sıra, çünkü her adım bir öncekinin üstüne biniyor: ödeme için sipariş,
sipariş için sepet, sepet için ürün gerekiyor.

| # | Adım | İçerik |
| --- | --- | --- |
| 01 | Marka ve iskelet ✅ | Renk ve yazı tipi sistemi, proje kurulumu, boş sitenin canlıya alınması |
| 02 | Katalog ve yönetim paneli ✅ | Ürün, kategori, beden-renk varyantları, stok |
| 03 | Sepet ve sipariş ✅ | Sepet, adres formu, sipariş oluşturma, havale ile ödeme, sipariş takibi |
| 04 | Ödeme | iyzico entegrasyonu, 3D Secure, taksit, sipariş onay e-postaları |
| 05 | Kargo ve fatura | Kargo entegrasyonu, barkodlu etiket, takip bildirimi, e-arşiv fatura |
| 06 | Kampanya ve indirim motoru | Kupon, kategori indirimi, ücretsiz kargo barajı, tarihli kampanyalar |
| 07 | Yasal metinler, SEO, açılış | Sözleşmeler, KVKK, ETBİS, ölçümleme, alan adı ve açılış |

02. adımın sonunda ürünler girilmeye başlanabilir.

03. adımda üyelik yapılmadı: şifre sıfırlama ve e-posta doğrulama için alan adı
ve e-posta servisi gerekiyor, ikisi de henüz yok. Yerine üyeliksiz sipariş
konuldu; müşteri siparişini numarası ve e-postasıyla görüyor. Üyelik, alan adı
alınınca 04. adımla birlikte gelecek. Görsel yükleme de (Cloudflare R2) gerçek
ürün fotoğrafları çekildiğinde yapılacak.
