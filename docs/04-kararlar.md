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

### K-11 · Ana sayfa banner'ı döner, geçiş JavaScript'siz
**20 Eylül 2026**

Ana sayfanın üstündeki büyük alan artık panelden yönetilen, birden çok
banner arasında kendiliğinden geçen bir alan. Tek banner varsa sabit durur,
hiç banner yoksa varsayılan tanıtım yazısı görünür — ana sayfa hiçbir
durumda başlıksız kalmaz.

**Geçiş tamamen CSS.** Slaytlar yan yana dizilen bir şeritte duruyor ve şerit
duraklı bir animasyonla kayıyor. Sayfada bunun için JavaScript yok; sitenin
geri kalanındaki "JavaScript kapalıyken de çalışır" kuralı banner'da da
geçerli. Kare listesi slayt sayısına bağlı olduğu için bileşende üretilip
sayfaya gömülüyor.

**Başa dönüş görünmüyor:** İlk slaytın bir kopyası sona ekleniyor ve şerit tam
o kopyanın üstündeyken başa sıçrıyor. Kullanıcı geriye sarma görmüyor.

**Noktalar tek kareyle çalışıyor:** Her nokta aynı animasyonu kendi payına
düşen negatif gecikmeyle oynatıyor, böylece sırayla yanıyorlar. Slayt sayısı
kadar ayrı kare yazmaya gerek kalmıyor.

**Hareketi azalt:** Cihazında bu ayar açık olan müşteride banner geçmiyor, ilk
banner sabit duruyor ve noktalar gizleniyor. Duyuru şeridindeki kuralın aynısı;
seçenek değil, erişilebilirlik gereği.

**Nerede:** [`../ui/hero-banner.tsx`](../ui/hero-banner.tsx),
[`../app/yonetim/banner`](../app/yonetim/banner)

---

### K-12 · Ürün fotoğrafları Vercel Blob'da, yüklerken küçültülüyor
**20 Eylül 2026**

Panelden ürün fotoğrafı yüklenebiliyor. Fotoğrafı olan ürün kartta, ürün
sayfasında ve sepette fotoğrafıyla görünüyor; olmayan ürün eskisi gibi çizimle
görünmeye devam ediyor. Yani geçiş ürün ürün yapılabiliyor, hepsini birden
çekmek gerekmiyor.

**Depo Cloudflare R2 değil, Vercel Blob.** İlk mimaride R2 yazıyordu. Vercel
Blob'a geçildi çünkü kurulumu Neon'la aynı: panelde bir depo oluşturuluyor,
jeton projeye kendiliğinden ekleniyor. R2 ayrı hesap, ayrı kova, ayrı anahtar ve
CORS ayarı demekti. Taşınması gerekirse yalnızca
[`../server/gorsel-depo.ts`](../server/gorsel-depo.ts) değişiyor, çağıran taraf
depoyu bilmiyor.

**Yerelde disk.** Jeton yokken dosyalar proje kökündeki `.yuklenen/` klasörüne
yazılıp bir route handler ile sunuluyor. `public/` kullanılamıyor: oranın içeriği
derleme anında sabitleniyor, sonradan yazılan dosya sunulmuyor.

**Vercel'de jeton yoksa açıkça hata veriliyor.** Sessizce yerel diske yazsaydı
fotoğraflar yüklenmiş görünür, ilk dağıtımda yok olurdu. Ölçüt `NODE_ENV` değil
`VERCEL` değişkeni, çünkü `next start` yerelde de üretim kipinde çalışıyor.

**Her fotoğraf yüklenirken küçültülüyor:** en fazla 1400 piksel genişlik, ayrıca
kartlar için 600 piksellik ikinci bir kopya, ikisi de webp. Telefondan gelen
2-3 MB'lık bir fotoğraf 200 KB'ın altına iniyor. Dosya biçimine tarayıcının
söylediğine değil, dosyanın kendisine bakılarak karar veriliyor.

**Next'in görsel iyileştiricisi kullanılmıyor**, çünkü dosyalar zaten
küçültülmüş durumda ve iyileştiricinin aylık sınırı var. Hangi kopyanın
indirileceğine tarayıcı `srcset` ile karar veriyor.

**Sıralama sürükle bırak değil, ok düğmeleri:** panelin geri kalanı gibi burası
da JavaScript kapalı tarayıcıda çalışıyor. İlk sıradaki fotoğraf kapak.

**Nerede:** [`../server/gorsel-depo.ts`](../server/gorsel-depo.ts),
[`../ui/fotograf-yonetimi.tsx`](../ui/fotograf-yonetimi.tsx),
[`../ui/urun-foto.tsx`](../ui/urun-foto.tsx)

---

### K-13 · Üyelik kendi oturumumuzla, hazır kütüphaneyle değil
**20 Eylül 2026**

Üyelik yapıldı: kayıt, giriş, çıkış, siparişlerim, adres defteri ve sipariş
verirken hesap açma. Üyelik zorunlu değil — üyeliksiz sipariş olduğu gibi duruyor
ve numara + e-postayla sorgulanmaya devam ediyor.

**Auth.js kullanılmadı.** İlk planda Auth.js yazıyordu. Auth.js'in asıl değeri
Google/Apple ile giriş ve e-postayla sihirli bağlantı; ikisi de şu an
kurulamıyor, çünkü alan adı ve e-posta servisi yok. Geriye kalan parça —
e-posta ve şifreyle giriş — kendi kodumuzda yaklaşık iki yüz satır ve projenin
geri kalanıyla aynı biçimde çalışıyor: düz form, server action, httpOnly çerez.
Sağlayıcılı giriş gerektiğinde Auth.js'e geçmek bu yüzeyi değiştirmiyor.

**Şifre scrypt ile özetleniyor**, argon2 ile değil: scrypt Node'un içinde geliyor,
derlenen bir bağımlılık eklemiyor. Parametreler (N=16384, r=8, p=1) özetin
içinde saklanıyor, ileride artırılabilsin.

**Oturum çerezi httpOnly**, tıpkı sepet çerezi gibi. Çerezdeki jetonun kendisi
veritabanında durmuyor, SHA-256 özeti duruyor: veritabanını görebilen biri
oturumları ele geçiremesin. Oturum 30 gün yaşıyor, kullanıldıkça uzuyor. Şifre
değişince o hesabın bütün oturumları kapanıyor ve yalnızca şifreyi değiştiren
tarayıcıya yenisi açılıyor.

**Yönetim paneli buna bağlanmadı.** Panel `YONETIM_SIFRE` ile korunmaya devam
ediyor. Müşteri hesabı ile mağaza sahibinin girişi ayrı şeyler; ikisini
birleştirmek panelin kapısını müşteri tarafına açmak olurdu. Yönetici rolü
ileride gerekirse eklenecek.

**Nerede:** [`../server/uyelik.ts`](../server/uyelik.ts),
[`../server/uyelik-islem.ts`](../server/uyelik-islem.ts),
[`../app/(hesap)`](../app/(hesap))

---

### K-14 · Doğrulanmamış e-posta hesabın kanıtı sayılmaz
**20 Eylül 2026**

Hesap açarken e-posta doğrulanmıyor, çünkü doğrulama e-postası gönderecek bir
servis yok. Bundan iki kural çıktı:

**Üyelikten önce verilmiş siparişler hesaba kendiliğinden bağlanmıyor.** Bağlasaydık,
başkasının e-posta adresiyle hesap açan biri onun siparişlerini, adresini ve
telefonunu görebilirdi. Eski siparişler eskisi gibi numara + e-postayla
görülüyor — numarayı bilmek gerekiyor, yani tek başına e-posta yetmiyor.
Doğrulama geldiğinde bağlama tek seferde yapılabilir.

**Sipariş sırasında hesap açarken e-posta kayıtlıysa işlem durduruluyor.**
Yoksa biri kayıtlı bir adrese sipariş verip o hesabın şifresini belirleyebilirdi.
Ekranda "bu e-posta ile hesap var, giriş yap" deniyor.

Aynı sebeple hesap ekranından e-posta değiştirilemiyor.

---

### K-15 · Yasal metinler veritabanında, panelden düzenleniyor
**20 Eylül 2026**

Mesafeli satış sözleşmesi, ön bilgilendirme formu, KVKK aydınlatma metni ve
çerez politikası artık `/yasal/<sayfa>` adreslerinde. Metinler koda gömülü
değil: veritabanında duruyor ve panelden (Yönetim → Yasal metinler)
düzenleniyor. Avukattan gelen metin böylece yayın beklemeden yapıştırılıyor —
yasal metin en çok değişen ama en az kod gerektiren içerik.

**Taslak işareti.** Her sayfa taslak olarak başlıyor: tepesinde "bu metin
taslaktır, hukuki incelemesi tamamlanmadı" uyarısı çıkıyor, sayfa arama
motorlarına kapalı kalıyor ve site haritasına girmiyor. Panelde "metin hazır"
işaretlenince üçü birden düzeliyor. Onaylanmamış bir sözleşmenin Google'da
geçerli metin gibi görünmesi, hiç olmamasından kötü.

**Metin HTML olarak yorumlanmıyor.** Düz yazı olarak saklanıp düz yazı olarak
basılıyor; yalnızca boş satır paragraf, `## ` başlık, `- ` madde ve `**kalın**`
olarak biçimleniyor. Markdown kütüphanesi eklenseydi içeriye HTML geçirme yolu
da açılırdı.

**Künye ayrı bir alan değil, ayarın parçası.** Unvan, adres, vergi dairesi ve
numarası, MERSİS ve ETBİS numarası, destek telefonu ve e-postası satış ayarında
duruyor; alt bilgide, yasal metinlerin altında ve ana sayfanın yapısal
verisinde aynı kaynaktan basılıyor. Boş alan hiç gösterilmiyor: yarım künye
yerine hiç künye daha dürüst.

**Sipariş verirken onay zorunlu.** Ödeme formunda ön bilgilendirme formu ile
sözleşmenin okunduğu kutusu işaretlenmeden sipariş oluşmuyor; kontrol sunucuda
yapılıyor, onay anı siparişe yazılıyor ve sipariş kartında görünüyor. Mevzuat
onayın kanıtlanabilmesini istiyor.

**Nerede:** [`../server/yasal.ts`](../server/yasal.ts),
[`../ui/yasal-metin.tsx`](../ui/yasal-metin.tsx),
[`../app/yasal/[slug]`](../app/yasal),
[`../app/yonetim/yasal`](../app/yonetim/yasal)

---

### K-16 · SEO kurulumu ve çerezsiz ölçümleme
**20 Eylül 2026**

**Site haritası ve robots.** `/sitemap.xml` ana sayfayı, kategorileri,
ürünleri, yardım sayfalarını ve yayımlanmış yasal metinleri listeliyor; saatte
bir yenileniyor, yani panelden eklenen ürün bir sonraki dağıtımı beklemiyor.
`/robots.txt` yönetim panelini, hesap sayfalarını, sepeti, ödemeyi ve sipariş
adreslerini dizine kapatıyor.

**Canonical adres.** Kategori sayfasında süzgeçler canonical adrese girmiyor:
aynı listenin onlarca kopyası dizine girip birbirinin sırasını yemesin.

**Yapısal veri.** Ürün sayfasında fiyat, para birimi ve stok durumu; ana
sayfada mağaza künyesi. Veri ekrandakiyle aynı kaynaktan geliyor, yani arama
sonucundaki fiyatla sitedeki fiyat ayrışmıyor. **Puan ve yorum sayısı bilerek
konulmadı:** şu anki değerler örnek veri, gerçek müşteri yorumu değil.

**Site adresi tek değişkende.** `SITE_URL` tanımlıysa o, değilse Vercel'in
verdiği üretim adresi, o da yoksa yerel adres kullanılıyor. Alan adı alınınca
tek değişkenle sitemap, canonical ve yapısal veri birlikte düzeliyor.

**Ölçümleme Vercel Analytics.** Çerez kullanmıyor, ziyaretçiyi tanımlamıyor ve
siteler arasında izlemiyor; hangi sayfanın kaç kez açıldığı görülüyor, kişi
görülmüyor. **Bu yüzden çerez onay bandı konulmadı:** sitedeki çerezlerin
tamamı (sepet, oturum, kupon, son sipariş) sitenin çalışması için zorunlu,
zorunlu çerezler için açık rıza gerekmiyor, bilgilendirme yetiyor — o da çerez
politikası sayfasında. Google Analytics seçilseydi banner zorunlu olurdu.

**Nerede:** [`../app/sitemap.ts`](../app/sitemap.ts),
[`../app/robots.ts`](../app/robots.ts),
[`../server/site.ts`](../server/site.ts),
[`../ui/yapisal-veri.tsx`](../ui/yapisal-veri.tsx)

---

### K-17 · Kartla ödeme iyzico'nun kendi ekranında
**20 Eylül 2026**

Kredi/banka kartıyla ödeme eklendi. Müşteri ödeme yöntemini seçiyor; kart
seçerse sipariş "ödeme bekliyor" durumunda açılıp iyzico'nun ödeme ekranına
yönlendiriliyor, dönüşte sonucu görüyor.

**Kart formu bizde değil, iyzico'da.** iyzico'nun barındırdığı ödeme formu
(Checkout Form) kullanılıyor. Kart numarası, CVC ve 3D Secure şifresi hiçbir
aşamada sunucumuzdan geçmiyor (K-07). Taksit seçeneklerini de o ekran
gösteriyor, çünkü hangi kartın kaç taksit yapabildiğini kartın BIN'i
belirliyor; kendi ekranımızda göstermek BIN sorgusu ve JavaScript isterdi,
üstelik kart numarasının bizden geçmesi gerekirdi.

**Dönen veriye güvenilmiyor.** iyzico dönüş çağrısında yalnızca bir jeton
taşıyor; ödemenin gerçekten alınıp alınmadığını ve tutarını iyzico'ya ayrıca
sorup cevabın imzasını kendi gizli anahtarımızla doğruluyoruz. İmza tutmazsa
ödeme başarılı sayılmıyor. Tutar siparişle bire bir tutmuyorsa da sayılmıyor:
eksik çekilmiş bir ödemeyle sipariş hazırlanmaya başlamamalı.

**Aynı dönüş iki kez işlenmiyor** (K-06). Girişim kaydı iyzico jetonuyla
tekil; işlenmiş bir kayıt ikinci çağrıda değiştirilmiyor, aynı cevap
dönüyor. Müşterinin "geri" tuşuna basması ya da iyzico'nun çağrıyı
tekrarlaması stoğu ikinci kez düşürmüyor.

**Stok ödeme boyunca rezerve.** Sipariş açılırken stok düşüyor; ödeme tutmazsa
aynı işlem içinde geri veriliyor ve sipariş iptal oluyor (mimarideki 04.
karar). Müşteri ödeme ekranını kapatıp giderse dönüş hiç gelmiyor; 30 dakikayı
geçmiş girişimler iki yerde temizleniyor: yeni bir sipariş açılmadan hemen
önce ve günde bir çalışan zamanlı işte. Zamanlı iş tek başına bırakılmadı,
çünkü Vercel'in Hobby planında zamanlı işler günde bir çalışabiliyor — son
adet bedenler bir günü bekleyemez. Sipariş anındaki temizlik zaten tam da
stoğun sorulduğu anda çalışıyor.

**Ödeme tutmazsa sepet geri dolduruluyor.** Sipariş açılırken sepet boşalıyor;
kart reddedilirse ya da ödeme hiç başlatılamazsa müşteri elinde boş sepetle
kalmasın diye ürünler sepete geri konuyor.

**Dönüş göreli adrese yapılıyor.** Mutlak adres kurulsaydı, istek hangi ana
makine adıyla geldiyse ona değil yapılandırmadaki adrese gidilirdi; çerezler
ana makineye bağlı olduğu için müşteri kendi sipariş onayını göremezdi. Bu
gerçekten yaşandı: denemede dönüş `127.0.0.1` yerine `localhost`'a gidince
sipariş çerezi gönderilmedi ve onay sayfası 404 verdi.

**Anahtar yoksa kart kapalı.** `IYZICO_API_ANAHTARI` ve `IYZICO_GIZLI_ANAHTAR`
tanımlı değilse kart seçeneği müşteriye hiç gösterilmiyor ve form kurcalansa
bile kartla sipariş açılmıyor; havale/EFT tek başına çalışmaya devam ediyor.
Böylece iyzico başvurusu (A-03) sonuçlanmadan da mağaza satış yapabiliyor.

**TC kimlik numarası toplanmıyor.** iyzico alıcı kaydında bu alan zorunlu; biz
toplamıyoruz, çünkü bebek kıyafeti satışı için gerekmiyor ve toplanmayan veri
sızdırılamıyor. Alan iyzico'nun kendi dokümanındaki yer tutucuyla gönderiliyor.

**Nerede:** [`../server/odeme.ts`](../server/odeme.ts),
[`../server/odeme-akis.ts`](../server/odeme-akis.ts),
[`../app/api/odeme/iyzico/donus`](../app/api/odeme/iyzico/donus),
[`../app/api/cron/odeme-temizlik`](../app/api/cron/odeme-temizlik)

---

### K-18 · E-posta Resend ile; doğrulama eski siparişleri bağlıyor
**20 Eylül 2026**

Sipariş onayı, ödeme onayı, şifre sıfırlama ve e-posta doğrulama e-postaları
eklendi. Gönderim Resend'in HTTP ucuna doğrudan yapılıyor; paket eklenmedi,
tek bir POST yetiyor.

**Anahtar yoksa gönderilmiyor, akış bozulmuyor.** `RESEND_ANAHTARI` tanımlı
değilse e-posta atlanıp günlüğe yazılıyor. Gönderim hata verse de sipariş,
kayıt ya da sıfırlama akışı olduğu gibi tamamlanıyor: e-posta gitmedi diye
alınmış bir sipariş kaybolmamalı.

**Kart siparişinde onay e-postası ödeme sonucundan sonra gidiyor.** Ödeme
belli olmadan "siparişin alındı" demek, tutmayan ödemede yanlış bilgi vermek
olurdu. Havalede sipariş anında gidiyor, çünkü orada beklenen şey zaten
müşterinin ödemesi. Aynı dönüş iki kez gelirse e-posta ikinci kez gitmiyor:
gönderim, kaydın "başarılı"ya geçtiği tek seferlik yolda.

**Doğrulama bağlantısı düğmeyle harcanıyor.** Kurumsal e-posta tarayıcıları
gelen bağlantıları kendiliğinden ziyaret ediyor; jeton sayfa açılır açılmaz
harcansaydı müşteri bağlantıya tıkladığında süresi dolmuş olurdu.

**Doğrulama, üyelikten önceki siparişleri hesaba bağlıyor.** K-14'te
bırakılan iş buydu: doğrulanmamış adres o kutunun sahibi olunduğunun kanıtı
değildi, artık kanıt var. Şifre sıfırlama da adresi doğrulanmış sayıyor —
bağlantı o kutuya gitti ve tıklandı.

**Jetonlar oturum gibi saklanıyor:** veritabanında jetonun kendisi değil
SHA-256 özeti duruyor, her jeton tek kullanımlık, sıfırlama 1 saat doğrulama
3 gün yaşıyor. Aynı türden yeni jeton üretilince eskisi siliniyor.

**Sıfırlama isteği hesap var mı söylemiyor:** adres kayıtlı olsa da olmasa da
aynı cevap veriliyor, yoksa hangi adreslerin kayıtlı olduğu tek tek denenerek
öğrenilebilirdi. Sıfırlama sonrası o hesabın bütün oturumları kapanıyor.

**Nerede:** [`../server/eposta.ts`](../server/eposta.ts),
[`../server/uyelik.ts`](../server/uyelik.ts),
[`../app/(hesap)/sifremi-unuttum`](../app/(hesap)/sifremi-unuttum),
[`../app/(hesap)/sifre-sifirla`](../app/(hesap)/sifre-sifirla),
[`../app/(hesap)/eposta-dogrula`](../app/(hesap)/eposta-dogrula)

---

### K-19 · Kargo toplayıcısız kuruldu, elle giriş tam çalışıyor
**20 Eylül 2026**

Kargo tarafı yapıldı: gönderi kaydı, barkodlu etiket, müşteri bildirimi, durum
akışı ve taşıyıcının kendi sorgulama sayfasına bağlantı.

**Toplayıcı (Geliver/Navlungo) bağlanmadı.** Hesap ve API anahtarı şirket
kaydına bağlı; dahası bu servislerin alan adlarını doğrulayamadan yazılacak
bir uyarlama, ilk gerçek denemede kırılırdı. Onun yerine sağlayıcıdan bağımsız
olan her şey yapıldı ve bugün kullanılabilir durumda: mağaza anlaşmalı
kargodan aldığı takip numarasını panele yazıyor, gerisi kendiliğinden
işliyor. Toplayıcı gelince değişecek tek yer gönderiyi açan çağrı olacak;
kayıt düzeni, etiket, bildirim ve durum akışı aynı kalacak.

**Takip numarası girilince sipariş kargoda oluyor ve e-posta gidiyor.** Aynı
numara tekrar kaydedilirse ikinci e-posta gitmiyor: panelde bir şeyi
düzeltmek müşteriye yeni bildirim göndermemeli.

**Etiketteki barkod kendi kodumuzda üretiliyor.** Code 128-B, SVG olarak.
Kütüphane eklenmedi: gereken tek şey desen tablosu ve otuz satırlık bir
döngü, üstelik SVG yazıcıda çözünürlükten bağımsız keskin çıkıyor. Tablo
bağımsız denetlendi: 107 desen, her biri 11 modül, benzersiz ve bilinen 'A',
'B', başlangıç ve bitiş desenleriyle birebir.

**Durum bildirimi ucu sırsız çalışmıyor.** `KARGO_BILDIRIM_SIRRI` tanımlı
değilse uç 404 veriyor. Herkese açık bir uçla siparişlerin durumu dışarıdan
değiştirilebilirdi. Aynı bildirim iki kez gelirse ikincisi hiçbir şey
yapmıyor (K-06); taşıyıcılar bildirimi tekrarlıyor.

**Nerede:** [`../server/kargo.ts`](../server/kargo.ts),
[`../server/kargo-islem.ts`](../server/kargo-islem.ts),
[`../ui/barkod.tsx`](../ui/barkod.tsx),
[`../app/yonetim/siparisler/[numara]/etiket`](../app/yonetim/siparisler),
[`../app/api/kargo/durum`](../app/api/kargo/durum)

---

### K-20 · Fatura önce kendi belgemiz, sağlayıcı sonra
**20 Eylül 2026**

Fatura kaydı, KDV ayrıştırması, numara sayacı ve yazdırılabilir e-arşiv
belgesi yapıldı.

**Otomatik e-arşiv sağlayıcısı (Paraşüt, Bizim Hesap) bağlanmadı**, çünkü
hesap ve vergi kaydı şirket kuruluşuna bağlı. Mağaza bugün faturayı panelden
yazdırıp kesiyor; resmî fatura dışarıda kesildiyse numarası ve belgesinin
adresi kayda yazılabiliyor. Sağlayıcı gelince kaydı ona gönderen bir çağrı
ekleniyor, düzen değişmiyor.

**KDV toplamdan geriye ayrıştırılıyor**, çünkü fiyatlar KDV dahil giriliyor.
Kuruş tam sayı olduğu için KDV, toplamdan matrah çıkarılarak bulunuyor: iki
ayrı yuvarlama yapılsaydı matrah + KDV toplamı tutmayabilirdi. Oran satış
ayarlarından değiştirilebiliyor (bebek tekstilinde 10).

**Kesilmiş fatura sonradan değişmiyor.** Oran ve tutarlar faturaya
kopyalanıyor; panelden oran değiştirilse bile eski belge olduğu gibi kalıyor.
Denemede bu ayrıca doğrulandı.

**Fatura numarası sipariş numarası gibi tek işlem içinde artıyor**, yani aynı
anda iki fatura kesilse bile numaralar çakışmıyor. Aynı siparişe ikinci fatura
açılmıyor.

**Panele yapıştırılan belge adresi yalnızca http(s) olabiliyor:**
`javascript:` ile başlayan bir adres tıklandığında tarayıcıda çalışırdı.

**Nerede:** [`../server/fatura.ts`](../server/fatura.ts),
[`../app/yonetim/siparisler/[numara]/fatura`](../app/yonetim/siparisler)

---

### K-21 · Bekleme göstergesi JavaScript'e bağlı, sayfa değil
**20 Eylül 2026**

İki küçük ama görünür eksik kapandı.

**İmleç.** Tailwind'in kendi sıfırlaması düğmelere `cursor: default` veriyor;
"Sepete ekle" dahil bütün düğmelerin üstünde imleç ok olarak kalıyordu. Artık
düğme, seçim kutusu, radyo ve dosya alanlarında el işareti, kapalı düğmede
"yasak" işareti çıkıyor. Tek bir kuralla çözüldüğü için panel dahil her yerde
geçerli.

**Gezinti çizgisi.** Yeni sayfa hazırlanırken en üstte marka renklerinde ince
bir şerit akıyor; form gönderirken de düğme kapanıp "Ekleniyor…" yazıyor,
böylece çift basılmıyor.

**Next'in `loading.tsx`'i kullanılmadı.** Önce o denendi, sonra geri alındı:
`loading.tsx` sayfayı bir Suspense sınırına alıyor, sunucu önce iskeleti
gönderip asıl içeriği gizli bir kutuda yolluyor ve küçük bir betikle açıyor.
JavaScript kapalı tarayıcıda o betik çalışmadığı için **içerik hiç
görünmüyordu** — denemede ürün sayfasındaki "Sepete ekle" düğmesi 0×0 boyutta,
gizli bir kutunun içinde kaldı. Yani bekleme göstergesi uğruna sayfanın
kendisi kaybolacaktı.

Onun yerine çizgi tamamen tarayıcı tarafında çalışan küçük bir bileşen:
sunucudan giden HTML'e hiç karışmıyor, yalnızca bağlantıya tıklanınca beliriyor
ve adres değişince kayboluyor. JavaScript kapalıyken gezinme zaten tam sayfa
yüklemesiyle olduğu için tarayıcının kendi göstergesi iş görüyor; bir eksik
kalmıyor.

**Nerede:** [`../ui/yukleme.tsx`](../ui/yukleme.tsx),
[`../ui/gonder-dugmesi.tsx`](../ui/gonder-dugmesi.tsx),
[`../app/globals.css`](../app/globals.css)

---

### K-22 · Yavaş değişen veriler önbellekte, kişiye özel veriler asla
**20 Eylül 2026**

Site yavaştı. Ölçüm yapıldı: sorun kodun hızında değil, **sayfa başına
veritabanına kaç kez gidildiğinde**. Tek bir ürün sayfası 21 ayrı sorgu
atıyordu. Yerelde her sorgu 0,3 ms olduğu için bu hiç görünmüyor; veritabanı
uzaktayken (Neon) her gidiş-geliş 30-60 ms, yani 21 sorgu tek başına bir
saniye demek.

Sorguların çoğu **her sayfada tekrarlanan, haftada bir değişen** verilerdi:
kategoriler (üst çubuk), duyuru şeridi, yasal metinler ve künye (alt bilgi),
satış ayarları, kampanya listesi.

**İki katmanlı önbellek kuruldu** (bkz. server/onbellek.ts):

- **İstek önbelleği** — aynı istek içinde aynı sorgu iki kez çağrılırsa
  veritabanına bir kez gidiliyor. Bayatlama riski sıfır.
- **Paylaşılan önbellek** — istekler arasında da saklanıyor. Panelde bir şey
  kaydedilince `vitriniYenile()` bütün etiketleri düşürüyor, yani değişiklik
  bekletmiyor. Ölçüldü: panelden yapılan değişiklik ziyaretçiye ortalama
  **0,2 saniyede** yansıyor.

**Kişiye özel hiçbir veri önbelleğe girmiyor:** sepet, oturum, hesap ve
siparişler her istekte veritabanından okunuyor. İki ayrı tarayıcının birbirinin
sepetini ya da oturumunu görmediği ayrıca denendi — bu, önbellekte en sık
yapılan hata.

**Ürün listeleri 30 saniyelik önbellekte.** Listedeki stok bu kadar
bayatlayabilir. Bunu bilerek kabul ettik: satın alma yolundaki hiçbir adım
listeye güvenmiyor — ürün sayfası stoğu doğrudan okuyor, sipariş anında ise
stok tek bir veritabanı işlemi içinde yeniden kontrol edilip düşülüyor (03.
adımdan beri böyle). Yani en kötü ihtimalle müşteri listede yarım dakika önce
tükenmiş bir ürünü görür; yanlış bir satış olmaz.

**Sonuç (tek istekteki sorgu sayısı):**

| Sayfa | Önce | Sonra |
| --- | --- | --- |
| Ana sayfa | 21 | 1 |
| Kategori listesi | 11 | 2 |
| Ürün sayfası | 21 | 6 |
| Sepet | 5 | 1 |

Ürün sayfasındaki 6 sorgunun kalması Prisma'nın her ilişkiyi (varyantlar,
fotoğraflar, kategori) ayrı sorguyla getirmesinden. Tek sorguya birleştiren
`relationLoadStrategy` bu Prisma sürümünde yok; zorlanmadı.

**Nerede:** [`../server/onbellek.ts`](../server/onbellek.ts),
[`../server/katalog.ts`](../server/katalog.ts),
[`../server/yonetim.ts`](../server/yonetim.ts)

---

### K-23 · Yaş süzgeci bedenden ayrı; boy-kilo bedenin yanında
**20 Eylül 2026**

Plandaki "yaş ve beden filtresi" maddesi yapıldı.

**Yaş ve beden ayrı iki süzgeç.** Hediye alan müşteri bedeni değil bebeğin kaç
aylık olduğunu biliyor; kendi bebeğine alan anne bedeni biliyor. Yaş grubu
birden çok bedeni kapsıyor: "6-12 ay" hem 6-9 hem 9-12 bedenini getiriyor.
Ana sayfadaki yaş kutuları da artık gruba gidiyor — önceden tek bir bedene
bağlıydılar ve "6-12 ay" kutusu 9-12 bedenindeki ürünleri **gizliyordu.**

**Boy-kilo karşılığı bedenin yanında.** Bebek bedenlerinde ay aralığı yalnızca
bir işaret; aynı yaştaki iki bebeğin boyu arasında beş santim fark olabiliyor.
Bu yüzden ölçüler yalnızca beden rehberi sayfasında kalmadı: süzgeçte her
bedenin yanında boy aralığı yazıyor, ürün sayfasında seçili bedenin boy ve
kilo karşılığı görünüyor, iki yerde de rehbere bağlantı var. Bebek
kıyafetinde iadelerin çoğu yanlış bedenden; ölçüyü seçim anına taşımak bunun
en ucuz önlemi.

Ölçü tablosu tek kaynakta ([`../ui/katalog-bicim.ts`](../ui/katalog-bicim.ts)):
beden rehberi sayfası da oradan okuyor. İki kopya olsaydı er geç ayrışırdı.

**Süzgeç sorgusunda bir hata bulundu ve düzeltildi.** Beden, yaş ve renk ayrı
ayrı yazıldığında aynı nesneye iki kez `variants` anahtarı konuyordu; sonraki
öncekini siliyor, yani **renk seçilince beden süzgeci sessizce düşüyordu.**
Düşmeseydi bile "6-9 bedeni var" ile "mint rengi var" ayrı varyantlardan
karşılanabilirdi. Artık hepsi tek bir varyant koşuluna birleşiyor: müşterinin
sorduğu şey "bu bedende, bu renkte var mı", yani aynı varyant. Bu hata
yaş süzgecinden önce de vardı; deneme yazılırken ortaya çıktı.

**Nerede:** [`../ui/katalog-bicim.ts`](../ui/katalog-bicim.ts),
[`../server/katalog.ts`](../server/katalog.ts),
[`../app/(vitrin)/[kategori]`](../app/(vitrin)),
[`../ui/varyant-secici.tsx`](../ui/varyant-secici.tsx)

---

### K-24 · Kategori adresi bir kez üretilir, sonra değişmez
**20 Eylül 2026**

Kategoriler artık panelden yönetiliyor: yeni kategori açma, adını ve
açıklamasını değiştirme, vitrinde gösterme ya da kapatma, sıralama ve silme.
Önceden kategori eklemek tohum dosyasını düzenleyip yeniden dağıtım
gerektiriyordu; sezonluk bir kategori ("Hediye Seti", "Yazlık") açmak
programcı işi olmamalı.

**Adres addan bir kez üretilir ve bir daha değişmez.** Ad değiştirmek serbest,
`/zibin-body` sabit kalıyor. Adres ada bağlı kalsaydı her ad düzeltmesi
verilmiş bağlantıları, paylaşılmış linkleri ve arama motorundaki sırayı
kırardı; alternatif, eski adresten yenisine yönlendirme tablosu tutmak olurdu
ki bu mağazanın boyutunda taşınacak yük değil. Formda adres alanı kapalı
görünüyor ve neden değişmediği orada yazıyor — kullanıcı "değiştiremiyorum"
diye düşünmesin diye.

Aynı adla ikinci kategori açılırsa adresin sonuna `-2`, `-3` ekleniyor;
kayıt hiçbir zaman sessizce başka bir kategorinin üstüne yazmıyor.

**İçinde ürün olan kategori silinemiyor.** Ürün-kategori bağı zorunlu; silmeye
izin verilse ürünler birlikte giderdi. Düğme kapalı görünüyor ama asıl kontrol
sunucuda: kapalı düğme tarayıcıda açılıp gönderilse bile kayıt duruyor.
Ekranda ne yapılacağı yazıyor — ürünleri taşı ya da kategoriyi **kapat.**
Kapalı kategori vitrinde ve menüde görünmüyor, ürünleri kendi sayfalarından
erişilebilir kalıyor; sezon sonu için silmek değil kapatmak doğru olan.

**Sıralama ok düğmeleriyle.** Sürükle bırak JavaScript'siz çalışmaz; panelin
geri kalanı gibi burası da düz formla çalışıyor. Her taşımadan sonra sıra
numaraları baştan yazılıyor, elle girilmiş boşluklu numaralar da böylece
düzeliyor. Düzenleme de ayrı sayfa değil, `?duzenle=<id>` ile dolu açılan
aynı form.

Yirmi maddelik tarayıcı denemesi yazıldı (adres üretimi ve çakışma, ad
değişince adresin sabit kalması, açma-kapatma ve vitrin menüsü, sıralamanın
vitrine yansıması, silme kuralları — kapalı düğme zorlanarak, ürün formundaki
kategori listesi, JavaScript kapalı tarayıcıda kategori ekleme). Deneme
önbellek etiketlerinin yayılmasını bekliyor: yazma bittikten sonra vitrinin
yeni hâli birkaç yüz milisaniye sonra görünüyor (K-22).

**Nerede:** [`../app/yonetim/kategoriler/page.tsx`](../app/yonetim/kategoriler/page.tsx),
[`../server/yonetim.ts`](../server/yonetim.ts),
[`../server/katalog.ts`](../server/katalog.ts)

---

### K-25 · Bırakılmış göç kilidi temizleniyor
**20-21 Eylül 2026**

Dağıtım `prisma migrate deploy` adımında düştü:

```
Error: P1002 — Timed out trying to acquire a postgres advisory lock
```

`migrate deploy` işe başlarken veritabanında bir danışma kilidi alıyor: aynı
anda iki dağıtım aynı göçü uygulayıp veritabanını bozmasın diye. Kilidi
alamazsa on saniye sonra pes ediyor.

**Önce yanlış teşhis koydum.** Bir dala gönderip hemen `main`'e birleştirince
Vercel önizleme ve yayın yapılarını yan yana başlatıyor, ikisi de aynı Neon
veritabanına bakıyor; kilidi biri alınca öteki pes ediyor sandım ve "bekleyip
yeniden dene" koydum. Beş deneme de düştü — iki buçuk dakika boyunca kilit
hiç serbest kalmadı. Yani kilit kullanımda değildi, **bırakılmıştı.**

Bırakılmış kilit şöyle oluyor: dağıtım göç uygularken kesiliyor (Vercel yeni
bir gönderim gelince eski yapıyı iptal ediyor). Oturum kilidi tutarken ölüyor,
ama havuzdaki (PgBouncer) bağlantı ayakta kaldığı için kilit oturumla birlikte
düşmüyor. Kendiliğinden de düşmüyor: o oturum kapatılmadan **hiçbir dağıtım
geçemiyor.** Site kilitli kalıyor ve beklemek hiçbir şeyi çözmüyor.

Göç artık [`../db/goc.ts`](../db/goc.ts) üzerinden geçiyor. Kilit meşgulse
önce kimin tuttuğuna bakıyor:

- **Oturum çalışıyorsa** (`active`) gerçekten göç uygulanıyordur. Beklenir;
  bekleme her denemede ikiye katlanıyor (5, 10, 20, 40 sn).
- **Oturum yirmi saniyeden uzun süredir boştaysa** kilidi bırakmıştır.
  Kapatılıyor, kilit onunla düşüyor, göç hemen geçiyor.

Ayırt etmek önemli: çalışan bir göçü öldürmek veritabanını yarım göçle
bırakırdı. Ölçüt "boşta mı" olduğu için gerçek bir göç hiçbir zaman
kesilmiyor — göç uygulayan oturum çalışır durumda olur.

İki yan düzeltme daha:

- **Göç havuzdan değil doğrudan bağlantıyla.** Oturuma bağlı danışma kilidi
  havuzdan geçen bağlantıda güvenilir değil; kilidin bırakılıp kalmasının asıl
  sebebi de bu. Neon'da havuzlu adresin sunucu adında `-pooler` geçiyor, o
  parça ve yalnızca havuza ait ayarlar (`pgbouncer`, `connection_limit`)
  düşürülüyor. Neon dışında bir sağlayıcıda adres olduğu gibi kalıyor. Ayrı
  bir adres verilmek istenirse `MIGRATE_DATABASE_URL` tanımlanıyor.
- **Önce veritabanı uyandırılıyor.** Neon kullanılmayan veritabanını uyutuyor;
  on saniyelik kilit süresi uyanmaya harcanmasın diye önce basit bir sorgu
  gidiyor.

Kilit yine de alınamazsa günlüğe elle çalıştırılacak sorgu yazılıyor, insan
hangi sorguyu arayacağını bilsin diye.

**Denendi.** İki durum da gerçek bir veritabanında kuruldu: (1) kilidi alıp
boşta bekleyen oturum — göç oturumu tanıdı, kapattı, geçti; (2) kilidi tutup
çalışan oturum — göç dokunmadı, bekledi, oturum işini bitirip kilidi
bırakınca geçti, oturum sağ kaldı. Adres dönüşümü dört durumda denendi
(havuzlu, havuzsuz, yerel, çözümlenemeyen).

**Nerede:** [`../db/goc.ts`](../db/goc.ts), `package.json` (`build`, `goc`)

---

### K-26 · Toplu yükleme önce gösteriyor, sonra yazıyor
**21 Eylül 2026**

Elle ürün girmek mağazanın en çok vakit alan işi: her ürün için form, her
beden-renk için ayrı varyant satırı. Tedarikçiden gelen liste zaten bir
tabloda duruyor. Panele Excel (.xlsx) ve CSV yükleme eklendi.

**Her satır bir varyant.** Aynı ürün adını taşıyan satırlar tek ürün olur,
her satır o ürünün bir beden-renk varyantı olur; ürün bilgileri satırlarda
tekrar eder. Ürün ve varyantı iki ayrı sayfaya bölmek veri modeline daha
uygun olurdu ama insanın Excel'de kurması zor; tek sayfa kazandı.

**Önce ne olacağı gösteriliyor.** Dosya okunuyor, "şu ürün yeni, şu
güncellenecek, şu kadar beden-renk" listeleniyor, onaylanınca yazılıyor.
Toplu yazma geri alınamaz; onaysız çalıştırmak, yanlış dosyayla bütün
fiyatları değiştirmeye tek tık kalması demekti.

Onay ekranı iki istek sürdüğü için çözülmüş satırlar arada bir yerde durmak
zorunda. JavaScript kapalı tarayıcıda da çalışsın diye tarayıcı belleği
değil, veritabanında bir kayıt (`ProductImport`) kullanıldı; günlük
temizlikte siliniyor. Yan faydası: ne zaman ne yüklendiği kayıtlı kalıyor.

**Ya hepsi ya hiçbiri.** Bir satırda hata varsa hiçbir şey yazılmıyor.
Yarısı yazılmış bir katalogda neyin girip neyin girmediğini anlamak zor;
dosyayı düzeltip yeniden yüklemek kolay. Hatalar satır numarası ve sütun
adıyla listeleniyor — "5. satır · Renk: "Turuncu" tanınmadı. Kabul
edilenler: …" gibi, insan neyi düzelteceğini bilsin diye.

**Hiçbir şey silinmiyor.** Dosyada olmayan ürün ve varyant olduğu gibi
kalıyor. Yükleme ekler ve günceller, temizlik yapmaz: yarım bir dosya bütün
kataloğu süpürmesin.

**Boş hücre "değiştirme" demek.** Var olan bir ürünü güncellerken boş
bıraktığınız hücre eski değeri silmiyor. Böylece aynı düzen yalnızca stok
güncellemek için de kullanılabiliyor: ürün adı, beden, renk, stok — gerisi
boş. Yeni üründe ise fiyat, kumaş içeriği ve yıkama talimatı zorunlu; bebek
tekstilinde ikincisi yasal zorunluluk.

**Türkçe Excel'in huyları karşılandı.** CSV'yi noktalı virgülle yazıyor
(ayraç ilk satıra bakılarak seçiliyor), UTF-8 BOM koyuyor, fiyatı
"1.249,90" diye yazıyor (virgül varsa nokta binlik ayracı sayılıyor).
Beden "0-3" ya da "0-3 ay", renk "mint" ya da "Nane" yazılabiliyor.

Sütun adlarını elle yazmak hata kaynağı olduğu için panelde boş şablon
indiriliyor: başlıklar, iki örnek satır (aynı ürünün iki bedeni, kural
örnekten anlaşılsın diye) ve bir yardım sayfası.

**Denendi** (33 madde, gerçek dosyalarla): geçerli xlsx yükleme ve vitrinde
görünme, aynı dosyanın ikinci kez yüklenmesinde çoğalmama, yalnızca stok
yazılı dosyanın öteki alanları silmemesi, yedi ayrı hata türünün satır
numarasıyla yakalanması ve hiçbir şey yazılmaması, noktalı virgüllü CSV,
şablon indirme, JavaScript kapalı tarayıcı.

Deneme bir hata buldu: `upsert` kullanılınca, kayıt güncellenecek olsa bile
create gövdesi kuruluyor ve yalnızca stok yazılı dosyada zorunlu alanlar boş
kaldığı için patlıyordu. Güncelleme ile yaratma açıkça ayrıldı.

**Nerede:** [`../server/toplu-urun.ts`](../server/toplu-urun.ts),
[`../server/toplu-urun-islem.ts`](../server/toplu-urun-islem.ts),
[`../app/yonetim/urunler/toplu`](../app/yonetim/urunler/toplu)

---

### K-27 · Sepet hatırlatması izinliye, bir kez, tek tıkla çıkışla
**21 Eylül 2026**

Sepete ürün koyup sipariş vermeden ayrılan müşteriye hatırlatma e-postası
eklendi. Mağazacılıkta karşılığı en yüksek e-postalardan biri; ama Türkiye'de
**ticari elektronik ileti** sayılıyor (6563 sayılı kanun) ve kuralları
koda gömüldü:

- **Yalnızca izin verene.** Kayıt formuna bir kutu eklendi ve **işaretsiz**
  geliyor. Önceden işaretli gelmesi onay sayılmıyor; kanun açık rıza istiyor.
  İznin ne zaman verildiği de kaydediliyor, çünkü onayın ispatı gönderene ait.
- **Yalnızca doğrulanmış adrese.** Doğrulanmamış adres o kutunun sahibi
  olunduğunun kanıtı değil; kayıt olurken başkasının adresini yazan biri
  ona e-posta gönderttirebilirdi (K-14 ile aynı gerekçe).
- **Sepete bir kez.** İkinci e-posta hatırlatma olmaktan çıkıp ısrar olur.
- **Çıkmak tek tık.** Her e-postanın altında jetonlu bir bağlantı var; tıklayan
  giriş yapmadan listeden çıkıyor. "Çıkmak için giriş yap, ayarlara git,
  kutuyu kaldır" demek kanunun istediği kolaylığın tersi olurdu.

**Üyeliksiz sepetler hiç hatırlatılmıyor.** Sepet çerezle taşınıyor, sahibinin
adresi bilinmiyor. Sepeti üyeye bağlamak için `Cart.customerId` eklendi; giriş
yapılınca ve sepete ilk dokunuşta doluyor. Adresi ödeme formundan alıp
kullanmak da mümkündü ama o adres sipariş için verilmiş bir bilgi, tanıtım
için değil.

**Zamanlama bir günlük.** Sepet bırakıldıktan bir saat sonra göndermek daha
çok satış getirir; ama Vercel Hobby'de günde bir zamanlı iş var, o da sabah
üçte çalışıyor. Bir günün öteki ucu yedi gün: daha eski sepette fiyat da stok
da değişmiş olur, hatırlatmanın anlamı kalmaz.

Küçük ama önemli ayrıntı: hatırlatma işareti ham SQL ile yazılıyor. Prisma'nın
`update`'i `guncellendi` alanını `@updatedAt` yüzünden tazeler, sepet "az önce
dokunulmuş" görünür ve müşteri sepete hiç dokunmamışken pencere kayardı.

Jeton makinesi de değişti: şifre sıfırlama ve doğrulamada yalnızca en son
bağlantı çalışıyor (eskisi siliniyor), ama listeden çıkmada tersi gerekiyor —
insan hangi e-postayı açarsa açsın çıkabilmeli. Tür başına "tekil mi"
ayarlandı.

**Denendi** (26 madde, sahte bir Resend sunucusuyla): kutunun işaretsiz
gelmesi, izin ve tarihinin kaydı, sepetin üyeye bağlanması, üyeliksiz sepetin
bağsız kalması, taze sepete gönderilmemesi, doğrulanmamış adrese
gönderilmemesi, izinsiz üyeye gönderilmemesi, e-postanın içeriği, ikinci kez
gönderilmemesi, hatırlatmanın sepet tarihini kaydırmaması, çıkma bağlantısının
oturum olmadan çalışması ve ikinci kez geçmemesi, izin kapalıyken
gönderilmemesi, hesap ayarından yeniden açılması, otuz günlük ve boş sepetin
atlanması.

**Nerede:** [`../server/sepet-hatirlatma.ts`](../server/sepet-hatirlatma.ts),
[`../server/eposta.ts`](../server/eposta.ts),
[`../app/(hesap)/eposta-izni`](../app/(hesap)/eposta-izni)

---

### K-28 · Stok bildirimi izin istemiyor, çünkü isteyen müşterinin kendisi
**21 Eylül 2026**

Tükenmiş bir beden-renk seçildiğinde "gelince haber verelim mi?" formu
çıkıyor. O birleşim stoğa girdiğinde tek bir e-posta gidiyor.

**Pazarlama izni aranmıyor** — sepet hatırlatmasının (K-27) tersine. Fark şu:
sepet hatırlatmasını biz göndermeye karar veriyoruz, bu e-postayı müşteri
kendisi istiyor ve tek bir olay için istiyor. Ticari elektronik iletinin
"talep üzerine" ayrımı bu. Bu yüzden de listeden çıkma bağlantısı yok; çıkacak
bir liste yok, e-posta bir kez gidiyor.

**Haber verilince adres siliniyor.** Kaydın tek sebebi "kime haber verilecek"
sorusuydu; cevap verildikten sonra adresi tutmak gereksiz veri saklamak olur.
Gönderim başarısız olursa kayıt duruyor: stok bir daha değiştiğinde yeniden
deneniyor. Bir yıl boyunca stoğa girmemiş ürünün bekleyen kaydı da günlük
temizlikte siliniyor.

**Stoğun arttığı her yerden tetikleniyor.** Panelden stok girişi, varyant
ekleme, Excel'den toplu yükleme (K-26) ve iptal olan siparişin stoğu geri
vermesi — dördü de aynı işlevi çağırıyor. Tek kapı olması önemli: yarın beşinci
bir yol eklenirse orada da aynı satır yazılacak. Gönderim veritabanı işleminin
**dışında** yapılıyor; e-posta beklemek stok yazan işlemi uzatmamalı.

**Aynı adres aynı varyanta iki kez yazılmıyor.** İkinci istek sessizce geçiyor.
Stokta olan bir şey için de kayıt açılmıyor — form zaten görünmüyor, ama
sunucu da kabul etmiyor.

**Bilinen sınır:** beden seçici varsayılan olarak stokta olan bir varyantı
seçiyor, form ancak tükenmiş bir birleşim seçilince çıkıyor ve seçim
JavaScript ile yapılıyor. Yani JavaScript kapalı tarayıcıda form, ürünün
**bütün** varyantları tükenmişse görünüyor. Formun kendisi düz HTML; göründüğü
her durumda JavaScript'siz çalışıyor. Bunu düzeltmek beden seçiciyi baştan
bağlantı tabanlı yazmayı gerektirir; kazanç buna değmiyor.

**Denendi** (20 madde, sahte bir Resend sunucusuyla): formun yalnızca tükenmiş
seçimde çıkması, düğmenin "Tükendi" olup kapanması, isteğin kaydı, aynı adresin
çoğalmaması, geçersiz adresin sunucuda reddedilmesi, stok girilince e-postanın
gitmesi ve kaydın silinmesi, ikinci stok girişinde tekrar gönderilmemesi,
stokta olana kayıt açılmaması, iade edilen stoğun da bildirim tetiklemesi,
JavaScript kapalı tarayıcı.

**Nerede:** [`../server/stok-bildirimi.ts`](../server/stok-bildirimi.ts),
[`../ui/stok-bildirimi.tsx`](../ui/stok-bildirimi.tsx),
[`../ui/varyant-secici.tsx`](../ui/varyant-secici.tsx)

---

### K-29 · Bölge tahmin edilmiyor, panelde yazıyor
**21 Eylül 2026**

Yayındaki cevap başlığı `X-Vercel-Id: fra1::iad1::` diyordu: kenar
Frankfurt'ta, sunucu işlevi Washington'da. Veritabanı da Washington'daysa
sorun yok; Frankfurt'taysa her sorgu Atlantik'i iki kez geçiyor demek ve
sayfa başına birkaç sorgu, tek başına yüz milisaniyeler.

Bunu sormak yerine panele bir **Tanı** sayfası eklendi. Gösterdikleri:

- Sunucu işlevinin bölgesi ve şehri (`VERCEL_REGION`)
- Veritabanının bölgesi ve şehri — Neon'un sunucu adında zaten yazıyor
  (`ep-…**.eu-central-1**.aws.neon.tech`)
- Bağlantı havuzlu mu doğrudan mı
- Veritabanına gidiş-dönüş: beş `select 1`, ortancası. Bağlantı kurma
  maliyeti dışarıda; ölçülen saf ağ gecikmesi.
- İkisi ayrı bölgedeyse ne yapılacağı, `vercel.json`a yazılacak satırla
  birlikte

**Bağlantı adresi hiçbir yerde görünmüyor** — yalnızca sunucu adından okunan
bölge kodu. Sayfa panelin altında, yani şifreyle korunuyor; yine de ekrana
basılmayacak bir şeyi ekrana basmamak doğru olan.

**Neden işlevi taşımak, veritabanını değil.** İkisini aynı şehre getirmenin
iki yolu var. Neon'da bölge değiştirmek yeni bir veritabanı açıp veriyi
taşımak demek; `vercel.json`a `"regions": ["fra1"]` yazmak tek satır ve geri
alınabilir. Tek satır kazanıyor.

Bölge okuma ölçümden ayrı bir işlev (`bolgeleriCoz`): hem denenebiliyor hem
de veritabanına ulaşılamasa bile bölgeler ekranda görünüyor — asıl merak
edilen zaten o.

**Denendi** (21 madde): sahte Neon adresleriyle bölge okuma, şehir eşlemesi,
havuzlu/doğrudan ayrımı, aynı ve ayrı bölge kararı, önerilen Vercel
bölgesi; eksik, yerel ve çözümlenemeyen adreslerde patlamaması; çözülmüş
bilgide adresin ve şifrenin bulunmaması; sayfanın tarayıcıda açılması,
ölçümün görünmesi ve sayfa kaynağında bağlantı adresinin geçmemesi.

**Nerede:** [`../server/tani.ts`](../server/tani.ts),
[`../app/yonetim/tani/page.tsx`](../app/yonetim/tani/page.tsx)

---

## Açık sorular

### A-02 · Alan adı
Araştırılıyor. Açılış için gerekli. Alındığında Vercel'e bağlanıp `SITE_URL`
ortam değişkeni tanımlanacak: sitemap, canonical adresler ve yapısal veri
tek değişkenle birlikte düzeliyor (K-16).

### A-03 · Şirket ve vergi levhası
Hazırlıklara başlandı. iyzico sanal POS başvurusu bununla yapılıyor. Ödeme
kodu hazır ve denendi; başvuru sonuçlanıp anahtarlar Vercel'e girilene kadar
kart seçeneği müşteriye gösterilmiyor (K-17). Künye de buna bağlı (K-15).

### A-04 · Logonun orijinal dosyası
Mevcut değil. Vektör yeniden çizim şimdilik resmî kaynak.

### A-05 · Yasal metinlerin hukuki onayı
Dört metnin taslağı yazıldı ve panelden düzenlenebilir hâlde sitede duruyor
(K-15), ama hiçbiri avukat onayından geçmedi: hepsi taslak işaretli, yani
sayfada uyarı çıkıyor ve arama motorlarına kapalılar. Avukattan gelen metin
panele yapıştırılıp "metin hazır" işaretlendiğinde yayımlanmış olacaklar.
Şirket kurulmadan (A-03) künye de doldurulamıyor.

### A-06 · Yönetim paneli şifresi
**19 Eylül 2026'da kapandı.** Aykut Vercel'de `YONETIM_SIFRE` ortam değişkenini
tanımladı ve panele girdi. Şifre koda ya da depoya hiçbir zaman yazılmıyor.

### A-07 · Havale hesabı
Yönetim panelindeki **Satış ayarları** ekranında banka adı, hesap sahibi ve IBAN
alanı boş. Doldurulana kadar sipariş veren müşteri parayı nereye yatıracağını
göremiyor. Şirket kurulunca (A-03) hesap açılıp buraya yazılacak.

### A-08 · Fotoğraf deposunun açılması
**20 Eylül 2026'da kapandı.** Aykut Vercel panelinde **Storage → Create
Database → Blob** ile depoyu oluşturup projeye bağladı; yayındaki panelden
fotoğraf yükleniyor. Depo yeni biçimde, yani OIDC ile bağlandığı için kodda
bir düzeltme gerekti (aşağısı).

**Depo bağlı olduğu hâlde "bağlı değil" uyarısı çıkıyorsa** dört sebebi
olabiliyor, dördü de 20 Eylül 2026'da ele alındı:

1. **Değişken eklendi ama yeniden dağıtım yapılmadı.** Vercel ortam
   değişkenlerini dağıtım anında yazıyor; çalışan dağıtım sonradan eklenen
   değişkeni görmüyor. Deployments listesinden **Redeploy** gerekiyor.
2. **Depo bağlanırken ön ek verildi.** O zaman jetonun adı
   `BLOB_READ_WRITE_TOKEN` değil, örneğin `FOTOGRAF_READ_WRITE_TOKEN` oluyor ve
   kütüphane kendi başına bakmıyordu. Artık `_READ_WRITE_TOKEN` ile biten ve
   değeri `vercel_blob_rw_` ile başlayan değişken de bulunuyor, bulunan jeton
   çağrılara açıkça veriliyor.
3. **Jeton yalnızca bir ortamda işaretli.** Production'da tanımlı olup Preview
   dağıtımı denenirse (ya da tersi) yine bulunamıyor.
4. **Depo OIDC ile bağlanmış.** Asıl sebep buydu. Vercel yeni bağlantılarda
   okuma-yazma jetonu üretmiyor; projeye `BLOB_STORE_ID` koyup yetkiyi her
   isteğe verdiği kısa ömürlü OIDC jetonundan alıyor. O jeton ortam değişkeni
   olarak durmadığı için "jeton var mı" ölçütü yanlış cevap veriyordu: depo
   bağlıyken bile "bağlı değil" deniyordu. Artık ölçüt jeton değil, deponun
   bağlı olması (`BLOB_STORE_ID` ya da bir okuma-yazma jetonu); yetkilenmeyi
   `@vercel/blob` kendisi yapıyor, jeton bulunduğunda ise açıkça veriliyor.

Uyarı metni de ayrıntılandı: depoya benzeyen bir değişken varsa adı ekrana
yazılıyor (değeri asla yazılmıyor), hiç yoksa yeniden dağıtım ve ortam
işaretleri hatırlatılıyor. Depo bağlıyken yazma başarısız olursa kütüphanenin
hatası da panelde görünüyor, günlüklerde kalmıyor.

### A-09 · E-posta servisi
**20 Eylül 2026'da kodu bitti (K-18), anahtarı bekliyor.** Şifre sıfırlama,
e-posta doğrulaması, sipariş ve ödeme onayı yazıldı ve denendi. Çalışması için
Resend'de hesap açılıp `RESEND_ANAHTARI` Vercel'e girilmeli; gönderen adresin
alan adının Resend'de doğrulanması gerektiği için alan adına (A-02) bağlı.
Anahtar tanımlanana kadar e-postalar gönderilmiyor, akışlar çalışmaya devam
ediyor.

### A-12 · İşlev ve veritabanı bölgesi
Yayında sunucu işlevi Washington'da (`iad1`) çalışıyor. Veritabanının bölgesi
panelin **Tanı** sayfasında yazıyor (K-29). İkisi ayrıysa `vercel.json`a
`"regions": ["<bölge>"]` eklenip yeniden dağıtılacak; sayfa hangi bölgeyi
yazacağını da gösteriyor.

### A-10 · Giriş denemesi sınırı
Şu an yanlış şifre denemesi sayılmıyor. scrypt her denemeyi kendiliğinden
yavaşlatıyor, ama sürekli deneyen birine karşı hesap ya da IP başına bir sınır
gerekiyor. Ödeme adımıyla birlikte ele alınacak.

### A-11 · Kargo toplayıcısı ve fatura sağlayıcısı
Kargo (Geliver/Navlungo) ve e-arşiv fatura (Paraşüt/Bizim Hesap) hesapları
şirket kuruluşuna bağlı (A-03). Kod ikisi olmadan da çalışıyor: takip numarası
panelden giriliyor, fatura panelden yazdırılıyor (K-19, K-20). Hesaplar
açılınca entegrasyonlar tek modülde yazılacak; o zaman API dokümanlarına
bakılıp alan adları doğrulanmalı.
