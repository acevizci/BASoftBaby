# Kararlar ve açık sorular

Verilmiş kararların kaydı. Bir karar değişirse burası ve ilgili belge birlikte
güncellenir.

---

## Verilmiş kararlar

### K-01 · Özel site, hazır platform değil
**19 Eylül 2026**

Mağaza Next.js ile sıfırdan yazılacak; ikas / Shopify gibi hazır bir platform
kullanılmayacak.

**Neden:** Bebek hediye listesi, bedene göre otomatik öneri ve kampanya
kurallarının tam kontrolü hazır platformlarda ya yok ya da ek eklenti parası
gerektiriyor. Aylık platform komisyonu da ödenmeyecek.

**Nerede:** [`01-kurulus-plani.md` § 2](01-kurulus-plani.md#2-teknoloji)

---

### K-02 · Kampanya çakışmasında en çok indiren uygulanır
**19 Eylül 2026 · Aykut**

Aynı sepete birden çok kampanya uyarsa **indirimler üst üste binmez**; müşteriye
en çok kazandıran tek kampanya uygulanır. Kupon kodları da bu kurala tabi.

Değerlendirilen diğer seçenekler: indirimlerin üst üste binmesi, ve her
kampanyaya öncelik sırası verilmesi.

**Neden:** Müşteri şikâyeti üretmiyor, marjı öngörülebilir tutuyor ve panelde
her kampanya için ek ayar gerektirmiyor.

**Örnek:** "Zıbınlarda %20" ve "500 TL üzeri 100 TL" açıkken 600 TL'lik sepette
%20 daha yüksek indirim verdiği için 480 TL ödenir, 380 TL değil.

**Nerede:** [`02-mimari.md` § 7](02-mimari.md#7-kampanya-motoru)

---

### K-03 · Logo vektör olarak yeniden çizildi
**19 Eylül 2026**

Logonun orijinal dosyası mevcut olmadığı için, eldeki ekran görüntüsünden
vektör olarak yeniden çizildi. Yazılar eğriye çevrildi; dosyalar font
gerektirmiyor ve her boyutta net çıkıyor.

**Bilinen sınır:** Orijinal suluboya tarzında, vektör sürümde fırça dokusu yok.
Karakter ve renkler korundu. Orijinal dosya bulunursa o kullanılabilir.

**Nerede:** [`../marka/`](../marka/)

---

### K-04 · Tüm ekranlar koda başlamadan tasarlanacak
**19 Eylül 2026 · Aykut**

Kod yazımına geçmeden önce 27 ekranın tamamı tasarlandı.

Alternatif olarak sadece ödeme ekranının tasarlanıp gerisinin kodlama sırasında
yapılması önerilmişti; Aykut tamamının önceden tasarlanmasını tercih etti.

**Nerede:** [`../tasarim/mokap.html`](../tasarim/mokap.html)

### K-05 · Duyuru şeridi kayan yazı, yönetimden kontrol edilir
**19 Eylül 2026 · Aykut**

Sitenin en üstündeki duyuru şeridi sabit yazı değil, soldan sola kayan yazı.
İçindeki mesajlar, şeridin açık/kapalı olması, kayma hızı ve rengi yönetim
panelinden değiştirilir; koda dokunulmaz.

Her mesaja tarih aralığı verilebiliyor, böylece kampanya duyurusu kendiliğinden
başlayıp bitiyor.

**Erişilebilirlik:** Cihazında "hareketi azalt" ayarı açık olan müşteride şerit
kaymaz, mesajlar sabit durur. Bu tercih edilebilir bir seçenek değil, zorunlu.

**Nerede:** [`02-mimari.md` § 3](02-mimari.md#3-veri-modeli) (`Announcement`,
`StoreSetting`), [`../tasarim/mokap.html`](../tasarim/mokap.html) → Yönetim →
Duyuru şeridi

---

### K-06 · Mimari onaylandı, koda geçildi
**19 Eylül 2026 · Aykut**

[`02-mimari.md`](02-mimari.md) içindeki yapı ve sekiz teknik karar onaylandı;
yol haritasının 01. adımı (proje iskeleti, marka sistemi) yazıldı.

**Nerede:** depo kökü — `app/`, `ui/`, `server/`

---

### K-07 · Katalog verisi geçici olarak kodda, sepet geçici olarak tarayıcıda
**19 Eylül 2026 — aynı gün kapandı: katalog K-08, sepet K-09 ile**

02. adımda veritabanı henüz kurulmamıştı; katalog verisi `server/katalog.ts`
içinde, sepet ise yalnızca tarayıcıda (localStorage) tutuluyordu. Katalog artık
veritabanından okunuyor (K-08), sepet de sunucuya taşındı (K-09). Bu maddenin
tarif ettiği geçici durum artık yok.

Sayfalar veriyi hiçbir zaman diziden değil hep `server/` altındaki
fonksiyonlardan okuyor; veritabanı bağlandığında yalnızca o fonksiyonların
içi değişecek, sayfalara dokunulmayacak. Şema `db/schema.prisma` içinde hazır.

**Bunun sonucu:** Yönetim paneli veritabanı gelmeden yazılamamıştı.

**Nerede:** [`../server/katalog.ts`](../server/katalog.ts),
[`../db/schema.prisma`](../db/schema.prisma)

---

### K-08 · Veritabanı bağlandı, yönetim paneli şifreyle korunuyor
**19 Eylül 2026 · Aykut**

Neon Postgres, Vercel üzerinden Frankfurt bölgesinde kuruldu ve Prisma ile
bağlandı. Katalog, kategoriler ve duyuru şeridi artık veritabanından okunuyor;
yönetim panelinden girilen her değişiklik anında mağazaya yansıyor.

**Şema ve göçler:** `db/schema.prisma` ve `db/migrations/`. Yayına her
gönderimde `prisma migrate deploy` çalışıyor, şema kendiliğinden güncelleniyor.

**Başlangıç verisi:** `db/tohum.ts` — kategoriler, örnek ürünler ve duyurular.
Tekrar tekrar çalıştırılabilir; eldeki stoğu ve sonradan girilmiş ürünleri
ezmez. Örnek ürünler gerçek ürünler girilince panelden silinebilir.

Yayın adımı bu dosyayı `--bir-kez` bayrağıyla çağırıyor: mağaza ayarındaki
`tohumAtildi` işareti konulduktan sonra bir daha hiçbir şey yazmıyor. Böylece
mağaza ilk yayında boş görünmüyor, ama silinen örnek ürünler sonraki yayında
geri gelmiyor. Elle çalıştırmak gerekirse `npm run tohum` işareti dinlemiyor.

**Panelin korunması:** `/yonetim` altındaki her sayfa `YONETIM_SIFRE` ortam
değişkenindeki şifreyi soruyor (tarayıcının kendi şifre kutusu). Değişken
tanımlı değilse panel 404 veriyor — yani ayar unutulursa panel açıkta kalmıyor.
Üyelik sistemi (Auth.js) 03. adımda gelince yerini ona bırakacak.

**Neden Frankfurt:** Müşteriler Türkiye'de; veritabanı Amerika'da olsaydı her
sayfa açılışı Atlantik'i geçerdi. Neon bölgesi sonradan değiştirilemiyor.

**Nerede:** [`../db/schema.prisma`](../db/schema.prisma),
[`../server/veritabani.ts`](../server/veritabani.ts),
[`../middleware.ts`](../middleware.ts), [`../app/yonetim/`](../app/yonetim/)

---

---

### K-09 · Sepet sunucuda, sipariş havale ile alınıyor
**19 Eylül 2026**

Sepet artık tarayıcıda değil veritabanında. Tarayıcıda yalnızca sepetin
kimliğini taşıyan `sepet` çerezi var ve bu çerez httpOnly: içeriğini sadece
sunucu değiştirebiliyor, müşteri fiyatı ya da adedi kurcalayamıyor.

**Fiyat sepette tutulmuyor.** Her görüntülemede üründen okunuyor, böylece
panelden yapılan fiyat değişikliği bekleyen sepetlere de yansıyor. Fiyat ancak
sipariş verildiği anda sipariş satırına kopyalanıp donuyor; sonradan fiyat
değişse bile verilmiş sipariş değişmiyor.

**Stok siparişte, tek işlemde düşüyor.** Aynı anda iki müşteri son adedi almaya
kalkarsa ikincisinin işlemi tümüyle geri alınıyor; yarım sipariş ya da eksiye
düşmüş stok oluşmuyor. Müşteriye "sen formu doldururken tükendi" deniyor.

**Ödeme şimdilik yalnızca havale/EFT.** Kredi kartı (iyzico) şirket ve vergi
levhası olmadan açılamıyor (A-03), o yüzden 04. adıma kaldı. Sipariş "ödeme
bekliyor" durumunda açılıyor; para geldiğinde panelden "Ödendi" işaretleniyor.

**Üyelik bu adıma girmedi.** Şifre sıfırlama ve e-posta doğrulama için alan adı
ve e-posta servisi gerekiyor (A-02), ikisi de henüz yok. Onun yerine üyeliksiz
sipariş var: müşteri sipariş numarası ve e-postasıyla siparişini
`/siparis-takip` adresinden görüyor. Numara tek başına yetmiyor, yoksa numara
deneyerek başkasının adresi görülebilirdi.

**Sayfalar artık istek anında üretiliyor.** Üst çubuktaki sepet rozeti çereze
baktığı için ana sayfa da dahil her sayfa dinamik. Bir mağaza için doğrusu bu:
fiyat, stok ve duyuru her zaman o anki hâliyle görünüyor.

**Nerede:** [`../server/sepet.ts`](../server/sepet.ts),
[`../server/siparis.ts`](../server/siparis.ts),
[`../app/sepet`](../app/sepet), [`../app/odeme`](../app/odeme),
[`../app/siparis-takip`](../app/siparis-takip)

---

### K-10 · Kampanya motoru: en çok indiren kazanır
**19 Eylül 2026**

K-02'de verilen karar koda döküldü. Bir sepete birden çok kampanya uyuyorsa
yalnızca **en çok indiren** uygulanıyor; kupon kodları da bu kurala tabi.
Müşteri sepette hangi kampanyanın uygulandığını adıyla görüyor. Geçerli bir
kupon daha az indiriyorsa uygulanmıyor ve müşteriye nedeni yazıyor.

**Kampanya türleri:** yüzde ya da sabit tutar; kapsam tüm ürünler, tek kategori
ya da tek ürün olabilir. İsteğe bağlı kupon kodu, sepet alt sınırı ve tarih
aralığı var. Kuponu olmayan kampanyalar koşul tuttuğu anda kendiliğinden
devreye giriyor.

**Ürün fiyatına yansıma:** Yalnızca kuponsuz ve sepet alt sınırı olmayan
kampanyalar ürün kartında ve ürün sayfasında indirimli fiyat olarak görünüyor.
"500 TL üzerine %10" gibi bir kampanyayı tek ürünün fiyatında göstermek
müşteriyi yanıltırdı; o indirim sepette çıkıyor.

**Sepet eksiye düşmez:** Sabit tutar indirimi kapsamına giren satırların
toplamını aşamıyor. Sepetin tamamı indirimle karşılansa bile kargo ücreti
duruyor — ürün bedava olabilir, taşıma bedava olmuyor. Bedava kargo eşiği
indirimden sonraki tutara bakıyor.

**Kupon bir siparişlik:** Sipariş verilince kupon çerezi siliniyor, müşteri
farkında olmadan tekrar kullanamıyor. Uygulanan kampanyanın adı ve indirim
tutarı siparişe kopyalanıyor; kampanya sonradan silinse de sipariş bozulmuyor.

**Türkçe yerel tuzağı:** Kupon kodu ve e-posta birer kimlik, Türkçe metin
değil. `toLocaleUpperCase("tr")` "i" harfini "İ" yaptığı için "hosgeldin" yazan
müşteri HOSGELDIN kuponunu tutturamıyordu; aynı şekilde "I" harfi "ı" olduğu
için büyük harfle yazılmış e-postayla sipariş sorgulanamıyordu. İkisi de yerelden
bağımsız `toUpperCase()` / `toLowerCase()` ile düzeltildi.

**Nerede:** [`../server/kampanya.ts`](../server/kampanya.ts),
[`../app/yonetim/kampanyalar`](../app/yonetim/kampanyalar)

---

## Açık sorular

### A-02 · Alan adı
Araştırılıyor. 07. adımda (açılış) gerekli.

### A-03 · Şirket ve vergi levhası
Hazırlıklara başlandı. 04. adımda (ödeme) iyzico sanal POS başvurusu için
gerekli olacak.

### A-04 · Logonun orijinal dosyası
Mevcut değil. Vektör yeniden çizim şimdilik resmî kaynak.

### A-05 · Yasal metinler
Mesafeli satış sözleşmesi, KVKK aydınlatma metni, çerez politikası ve iade
koşullarının gerçek metinleri bir avukata hazırlatılmalı. Depodaki tasarım
yalnızca bu metinlerin nerede duracağını gösteriyor.

### A-06 · Yönetim paneli şifresi
**19 Eylül 2026'da kapandı.** Aykut Vercel'de `YONETIM_SIFRE` ortam değişkenini
tanımladı ve panele girdi. Şifre koda ya da depoya hiçbir zaman yazılmıyor.

### A-07 · Havale hesabı
Yönetim panelindeki **Satış ayarları** ekranında banka adı, hesap sahibi ve IBAN
alanı boş. Doldurulana kadar sipariş veren müşteri parayı nereye yatıracağını
göremiyor. Şirket kurulunca (A-03) hesap açılıp buraya yazılacak.
