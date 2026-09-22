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

**Nerede:** [`../public/marka/`](../public/marka/)

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

**Panelin korunması (o günkü hâli; K-45'te değişti):** `/yonetim` altındaki her sayfa `YONETIM_SIFRE` ortam
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
[`../app/(magaza)/sepet`](../app/(magaza)/sepet), [`../app/(magaza)/odeme`](../app/(magaza)/odeme),
[`../app/(magaza)/siparis-takip`](../app/(magaza)/siparis-takip)

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

**Yönetim paneli buna bağlanmadı.** (O gün) panel `YONETIM_SIFRE` ile korunmaya devam
ediyor. Müşteri hesabı ile mağaza sahibinin girişi ayrı şeyler; ikisini
birleştirmek panelin kapısını müşteri tarafına açmak olurdu. Yönetici rolü
ileride gerekirse eklenecek.

**Nerede:** [`../server/uyelik.ts`](../server/uyelik.ts),
[`../server/uyelik-islem.ts`](../server/uyelik-islem.ts),
[`../app/(magaza)/(hesap)`](../app/(magaza)/(hesap))

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
[`../app/(magaza)/yasal/[slug]`](../app/(magaza)/yasal),
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
[`../app/(magaza)/(hesap)/sifremi-unuttum`](../app/(magaza)/(hesap)/sifremi-unuttum),
[`../app/(magaza)/(hesap)/sifre-sifirla`](../app/(magaza)/(hesap)/sifre-sifirla),
[`../app/(magaza)/(hesap)/eposta-dogrula`](../app/(magaza)/(hesap)/eposta-dogrula)

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
[`../app/(magaza)/(vitrin)/[kategori]`](../app/(magaza)/(vitrin)),
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
[`../app/(magaza)/(hesap)/eposta-izni`](../app/(magaza)/(hesap)/eposta-izni)

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

### K-30 · Yavaşlığın kaynağı bölge değil, uyku
**21 Eylül 2026**

Tanı sayfası (K-29) soruyu kapattı: **işlev de veritabanı da Frankfurt'ta.**

Önceki teşhis yanlıştı. Cevap başlığındaki `X-Vercel-Id: fra1::iad1::`
satırını "kenar Frankfurt'ta, işlev Washington'da" diye okumuştum; `iad1`
oradaki yapının çalıştığı yer, işlevin değil. Ölçmek yerine başlıktan çıkarım
yapmanın bedeli buydu — bölge hizalaması diye bir iş hiç yokmuş.

Ölçümler asıl kaynağı gösterdi:

```
Gidiş-dönüş : 40.4 · 9.6 · 3.2 · 27.5 · 11.8 ms
```

Aynı şehirde taban 3 ms. Sıçramalar ağ değil; ilk sorgular hâlâ ısınma
maliyeti taşıyor. Tanıya iki ölçüm daha eklendi ve resim netleşti:

- **Bağlantı kurma** ayrı ölçülüyor. Sorgu gecikmesiyle karışınca hangisinin
  pahalı olduğu anlaşılmıyordu. Bu maliyet işlev örneği başına bir kez
  ödeniyor.
- **İşlev örneğinin yaşı.** Sıfıra yakınsa istek soğuk bir örneğe düşmüş
  demek. Az ziyaretçili bir mağazada bu istisna değil, kural.

Yerelde ölçülen fark çıplak: uyanık tutma ucuna ilk çağrı **84 ms**, hemen
ardından ikincisi **1 ms**. Yayında Neon uykudan kalktığı için aradaki fark
saniyelere çıkıyor; daha önce ölçülen 1,26 saniyelik ilk açılışın kaynağı bu.

**Çözüm uyandırmak, taşımak değil.** İki şey uyuyor: Vercel'in sunucu işlevi
ve Neon'un veritabanı. `/api/canli` ucu ikisine birden dokunuyor — `select 1`,
başka hiçbir şey. Dışarıdan bir izleme servisiyle (UptimeRobot, cron-job.org)
beş dakikada bir çağrıldığında soğuk açılış bedeli ortadan kalkıyor.

Neden Vercel'in kendi zamanlı işi değil: Hobby paketinde günde bir çalışıyor,
oysa gereken beş dakikada bir. Ucun herkese açık olması sorun değil, yaptığı iş
bir satırlık; sır ya da veri döndürmüyor. Veritabanına ulaşamazsa da hata
vermiyor — izleme servisi siteyi "çökmüş" saymasın diye durum cevabın içinde
yazıyor.

**Denendi** (10 madde): ucun cevabı ve başlıkları, veritabanına gerçekten
dokunması, yalnızca durum döndürmesi, sıcak çağrının hızlı olması, tanı
sayfasındaki iki yeni ölçümün görünmesi, bağlantı adresinin ne ekranda ne
sayfa kaynağında bulunması.

**Nerede:** [`../app/api/canli/route.ts`](../app/api/canli/route.ts),
[`../server/tani.ts`](../server/tani.ts)

---

### K-31 · Sipariş listesi aranıyor, süzülüyor ve sayfalanıyor
**21 Eylül 2026**

Sipariş listesi bugüne kadar son 100 siparişi gösteriyor, fazlasını
**sessizce** kesiyordu. 101. sipariş girdiğinde eski siparişlere ulaşma yolu
kalmıyordu ve mağaza sahibi bir şeyin eksik olduğunu görmüyordu bile —
listenin sonunda "devamı var" diyen hiçbir işaret yoktu. Arama eklenirken
asıl düzeltilen bu oldu: liste artık sayfalanıyor ve kaç kayıt olduğu yazıyor.

**Tek arama kutusu.** Sipariş numarası, ad soyad, e-posta, telefon ve kargo
takip numarası aynı kutudan aranıyor. Beş ayrı alan sormak, mağaza sahibinin
elindeki bilginin hangi alana ait olduğunu düşünmesini gerektirirdi; telefonu
çalan müşteri "Ayşe ben" diyor, numarayı bilmiyor.

**Telefon biçimden bağımsız aranıyor.** Numaralar girildiği gibi duruyor:
`0555 123 45 67`, `05551234567`, `+90 555 123 45 67` — hepsi aynı numara.
Düz metin araması bunları birbirine bağlayamıyor, o yüzden karşılaştırma iki
tarafta da rakam dışı her şey atılarak yapılıyor. Prisma'nın süzgeçleri bunu
yapamadığı için bu tek koşul ham SQL; sonucu asıl sorguya kimlik listesi
olarak giriyor.

Burada bir tuzak çıktı ve deneme yakaladı: desen önce `'\D'` yazılmıştı.
Şablon dizgisinde ters bölüyü JavaScript yutuyor, desen sessizce "D harfini
sil"e dönüşüyor ve sorgu **hata vermeden** hep boş dönüyor. Deseni `'[^0-9]'`
yazmak hem doğru hem de bu tuzağa hiç girmiyor.

**Süzgeçler:** durum, ödeme durumu, ödeme yöntemi, tarih aralığı. Hepsi
birlikte çalışıyor (VE) ve aramayla birleşiyor. Tanınmayan bir değer adres
satırına elle yazılırsa yok sayılıyor, hata vermiyor.

**Her şey adres satırında.** Form düz GET: JavaScript kapalı tarayıcıda
çalışıyor, sonuç sayfası yer imine eklenebiliyor, "şu aramayı bir de sen aç"
diye paylaşılabiliyor. Durum rozetleri bağlantı olduğu için seçili arama
onlara da taşınıyor — yoksa duruma tıklayınca arama düşerdi.

**Listenin üstünde sayı ve tutar var.** Süzgece uyan sipariş adedi ve tutar
toplamı. "Bu ay kaç sipariş, ne kadar tuttu" sorusunun cevabı böylece ayrı
bir rapor ekranı gerektirmiyor.

**Denendi** (33 madde, 137 deneme siparişiyle): sayfalama ve sınırları,
olmayan ve bozuk sayfa numaraları; numara, ad, e-posta, kargo takip numarası
ve üç ayrı biçimde yazılmış telefonla arama; dört süzgeç tek tek ve birlikte;
tarih aralığının bitiş gününü içermesi; arama ile süzgecin birbirini
düşürmemesi; tutar toplamının doğruluğu; JavaScript kapalı tarayıcı.

**Nerede:** [`../server/siparis-arama.ts`](../server/siparis-arama.ts),
[`../app/yonetim/siparisler/page.tsx`](../app/yonetim/siparisler/page.tsx)

---

### K-32 · Özet ekranı sayı değil, yapılacak iş gösteriyor
**21 Eylül 2026**

Panelin özet ekranı beş kutuda beş sayı gösteriyordu: yayında ürün, kapalı
ürün, yayında duyuru… Bunlar doğru sayılardı ama **hiçbiri bir işe
dönüşmüyordu.** Mağaza sahibinin sabah sorduğu soru "kaç ürünüm var" değil,
"bugün ne yapmam gerekiyor".

Ekran o soruya göre yeniden yazıldı.

**Yapılacaklar.** Dört satır, her biri bir işe karşılık geliyor ve **kendi
süzülmüş listesine** gidiyor:

| İş | Nereye gidiyor |
| --- | --- |
| Havale onayı bekliyor | Bekleyen + havale siparişleri |
| Hazırlanacak | Ödemesi alınmış, kargoya verilmemiş |
| Kargoda 7 günden uzun | Teslim görünmeyenler |
| Tükenen beden | Stok ekranı |

Sayının yanında ne yapılacağı da yazıyor ("Hesaba geçti mi diye bakılıp ödendi
işaretlenecek"). Sıfır olan iş soluk duruyor, bekleyen iş renkleniyor: göz
önce yapılacak olana gidiyor. Bu, K-31'deki süzgeçlerin karşılığını almak
demek — özet ile liste aynı sayıyı veriyor, biri ötekine götürüyor.

**Bugün.** Sipariş adedi ve tutarı, dünle karşılaştırmalı; bu ayın toplamı.
**İptal edilen sipariş ciroya girmiyor** — girseydi iptallerle dolu bir gün
iyi geçmiş görünürdü.

**Stoka girmesi beklenenler.** "Gelince haber ver" diyen müşteriler (K-28),
bedene göre gruplanıp çok bekleyenden aza sıralanıyor. Neyin önce sipariş
edileceği sorusunun en doğrudan cevabı bu: tahmin değil, isim isim talep.
Bekleyen yoksa bölüm hiç çıkmıyor.

**Tamamlanmamış ayarlar.** En üstte, sarı bir kutuda: havale bilgisi boşsa
(o zaman havale müşteriye hiç sunulmuyor), künye eksikse, yasal metinler
taslaksa, e-posta anahtarı yoksa. Bunlar mağazanın çalışmasını engelleyen ya
da yasal olarak gereken şeylerdi ama panelin hiçbir yerinde görünmüyordu —
bilen biri hatırlatmadıkça fark edilmiyordu. Hepsi tamamsa kutu hiç çıkmıyor.

Veri toplama ayrı bir modülde ([`../server/panel-ozet.ts`](../server/panel-ozet.ts)),
ekran yalnızca gösteriyor. Sorgu sayısı yüksek ama hepsi tek bir `Promise.all`
turunda: birbirlerini beklemiyorlar ve ekranı yalnızca mağaza sahibi açıyor.

**Denendi** (23 madde): bugünün sayı ve tutarının doğruluğu ve iptallerin
dışarıda kalması, dört iş sayısının veritabanıyla birebir tutması, kartların
doğru süzgece gitmesi ve süzülmüş listenin aynı sayıyı vermesi, bekleyen
listesinin sıralaması ve boşken hiç çıkmaması, ayar uyarılarının panelden
ayar değişince düşmesi ve geri gelmesi, JavaScript kapalı tarayıcı.

Deneme iki kez tökezledi, ikisi de denemenin kendi kusuruydu ve ikisi de
öğreticiydi: ayarı SQL'le değiştirmek önbelleği düşürmüyor (gerçek kullanımda
kimse veritabanına elle yazmıyor, panelden yazıyor), ve yazma bittikten sonra
etiketin yayılması birkaç yüz milisaniye sürüyor (K-22).

**Nerede:** [`../server/panel-ozet.ts`](../server/panel-ozet.ts),
[`../app/yonetim/page.tsx`](../app/yonetim/page.tsx)

---

### K-33 · İptal ve iade talebi: kurallar koda gömülü
**21 Eylül 2026**

Yasal metinler cayma hakkını zaten söz veriyordu — teslimden itibaren 14 gün,
gerekçe göstermeden — ama tek yolu telefon ya da e-postaydı. Artık müşteri
sipariş takip sayfasından kendisi talep açıyor, durumunu aynı yerden izliyor;
mağaza sahibi panelden cevaplıyor.

**Kurallar mağaza sahibinin insafına bırakılmadı.** Hangi siparişe ne
açılabileceğine sunucu karar veriyor:

| Sipariş durumu | Açılabilen |
| --- | --- |
| Ödeme bekliyor, hazırlanıyor | Sipariş iptali |
| Kargoda | İade |
| Teslim (14 gün içinde) | İade, beden değişimi |
| Teslim (14 gün geçmiş), iptal | Yok, sebebi yazılı |

Kargodaki siparişe de iade açılıyor: cayma hakkı sözleşme kurulduğu anda
başlıyor, teslimatı beklemek gerekmiyor. Süre **teslim tarihinden** sayılıyor,
sipariş tarihinden değil — bunun için `Order.teslimTarihi` eklendi.
`guncellendi` kullanılamazdı, o her panel dokunuşunda değişiyor ve müşterinin
süresini sessizce uzatır ya da kısaltırdı.

Süre dolduğunda ekran kapanmıyor, **sebebini yazıyor** ve ayıplı mal
haklarının bu süreden bağımsız olduğunu hatırlatıyor. "Hakkın yok" demek
yanlış olurdu; olan şey cayma hakkının süresinin dolması.

**Gerekçe zorunlu değil.** Kanun bunu açıkça söylüyor. Sebep listesi yine de
var çünkü "beden tutmadı" mı "üründe hata vardı" mı bilmek kalıpları
düzeltmeye yarıyor — ama listede "belirtmek istemiyorum" da bir seçenek ve
seçilmesi hiçbir şeyi değiştirmiyor.

**Kısmi iade var.** Üç ürünün birini iade etmek bebek kıyafetinde sık: beden
biri tutmaz, ötekiler tutar. Tamamı ya da hiçbiri olsaydı müşteri yine telefona
mecbur kalırdı. Reddedilen bir talebin satırları yeniden talep edilebiliyor:
eksik bilgiyle reddedilen müşterinin ikinci kez deneme hakkı var.

**Onaylanan iptal siparişi gerçekten iptal ediyor** ve stoğu geri veriyor
(mevcut `siparisiIptalEtVeStoguIadeEt`). Bu adımı elle bırakmak, "onaylandı"
yazan ama iptal edilmemiş siparişler demekti. İade ve değişimde ürünün
fiziksel olarak geri gelmesi gerektiği için sipariş kendiliğinden değişmiyor;
mağaza sahibi ürün eline geçince tamamlıyor.

**Kimlik:** talep açmak siparişi görmekle aynı yetki — numara **ve** e-posta
eşleşmesi. Numara tek başına yetmiyor, yoksa numara deneyerek başkasının
siparişine dokunulabilirdi. Bulunamadı ile eşleşmedi aynı cevabı veriyor.

Her aşamada e-posta: talep alındığında müşteriye ve (künyede destek adresi
tanımlıysa) mağaza sahibine, sonuçlandığında müşteriye. Gönderim akışı
bozmuyor; anahtar yoksa talep yine açılıyor.

**Denendi** (33 madde, sahte Resend sunucusuyla, beş ayrı durumdaki siparişle):
her durumda hangi seçeneklerin çıktığı, cayma son gününün yazılması, süresi
dolanın sebebi, yanlış e-postayla siparişin görünmemesi, kısmi iadenin doğru
adetle kaydı, açık talep varken ikincisinin engellenmesi, panelden cevabın
müşteriye e-postayla gitmesi ve sayfasında görünmesi, onaylanan iptalin
siparişi iptal edip stoğu geri vermesi, JavaScript kapalı tarayıcı, özet
ekranındaki sayı.

Deneme iki metin kusuru buldu: kargodaki siparişte iptal seçeneği yokken
"sipariş iptalinde…" diye bir not yazılıyordu, ve o notun koşullu hâli hiçbir
zaman görünemeyecek ölü bir daldı (iptal hiçbir zaman başka bir türle birlikte
sunulmuyor). İkisi de temizlendi.

**Nerede:** [`../server/talep.ts`](../server/talep.ts),
[`../ui/talep-formu.tsx`](../ui/talep-formu.tsx),
[`../app/yonetim/talepler/page.tsx`](../app/yonetim/talepler/page.tsx)

---

### K-34 · Değerlendirmeler: uydurma puan kaldırıldı, olumsuz yorum gizlenmiyor
**21 Eylül 2026**

Şemada `puan` ve `yorumSayisi` alanları baştan beri vardı ama hiç
kullanılmıyordu — **tohum dosyası onlara uydurma değerler yazıyordu.** Yayında
duran sitede "4,8 · 126 değerlendirme" yazıyordu; ortada tek bir değerlendirme
yoktu. Bu hem müşteriyi yanıltıyordu hem de e-ticaret mevzuatına aykırıydı:
gerçek alışverişe dayanmayan puan yayımlanamaz.

Göçün içinde bütün ürünlerin puanı sıfırlandı ve tohum dosyasından o alanlar
çıkarıldı. Puan artık yalnızca gerçek değerlendirmelerden hesaplanıyor; hiç
yorum yoksa **boş kalıyor** ve ürün kartında da ürün sayfasında da yıldız
satırı hiç görünmüyor. "0,0 puan" yazmak, olmayan bir bilgiyi varmış gibi
göstermek olurdu.

**Yalnızca satın alıp teslim alan yazabiliyor.** Her değerlendirme bir sipariş
satırına bağlı ve satır tekil: hem alışverişin kanıtı hem de aynı satır için
ikinci yorumun önüne geçiyor. Aynı ürünü iki kez alan iki kez yazabiliyor — o
iki ayrı alışveriş. Sipariş teslim edilmeden form çıkmıyor: ürünü eline
almadan değerlendirmek anlamsız.

**Yorum kendiliğinden yayımlanıyor, onay kuyruğu yok.** Sebebi ilke: satıcı
değerlendirmeleri olumlu olumsuz ayrımı yapmadan yayımlamak zorunda. "Önce ben
bakayım" düzeni, olumsuz yorumu süzmenin kibar hâli olurdu. Doğrulanmış
alışveriş şartı zaten spam riskini bitiriyor.

**Gizleme yalnızca içerik kuralı için** — hakaret, kişisel veri, ürünle
alakasız metin — ve **sebep yazılmadan gizlenemiyor.** Gizlenen yorum panelde
durmaya devam ediyor, sebebiyle birlikte; sonradan bakıldığında "beğenilmediği
için gizlenmiş" mi değil mi belli oluyor. Panelin üstünde bu kural yazılı ve
memnuniyetsiz yoruma yapılacak doğru şeyin yanıtlamak olduğu söyleniyor.
Özet ekranında "Yanıtsız 3 yıldız ve altı" diye bir iş var — gizlenecek değil,
yanıtlanacak bir liste.

**Ad kısaltılıyor:** "Ayşe Yılmaz" → "Ayşe Y." Tam soyadı yayımlamak yorumun
kime ait olduğunu belli etmeye yetmiyor ama kişiyi aramaya yetiyor.

**Puan iki yerde duruyor** — yorumlarda ve ürünün üstünde. İkincisi liste
sorguları her ürün için yorum tablosuna gitmesin diye; yorum eklenince,
gizlenince ya da açılınca yeniden hesaplanıyor.

Ürün sayfasında ortalamanın yanında **dağılım çubukları** var: "4,2" tek
başına beşte üç mü hep dört mü belli etmiyor.

Yıldız seçimi radyo düğmelerinden kuruluyor — JavaScript kapalı tarayıcıda
çalışıyor, klavyeyle geziliyor, ekran okuyucu "5 üzerinden 4 — Memnunum"
diye okuyor.

**Denendi** (32 madde): uydurma puanların kalmaması ve puansız üründe yıldız
satırının hiç çıkmaması, kargodaki siparişte form olmaması, teslim edilende
olması, yazılan yorumun ürün sayfasında doğrulanmış rozetiyle görünmesi,
ortalamanın hesaplanması, değerlendirilen ürünün listeden düşmesi, kısa
yorumun sunucuda reddedilmesi, olumsuz yorumun da yayımlanması ve ortalamayı
düşürmesi, sebepsiz gizlemenin reddedilmesi, sebepli gizlemenin vitrinden
düşürüp paneli bırakması ve puanı yeniden hesaplaması, yanıtın ürün sayfasında
görünmesi, özet kartı, JavaScript kapalı tarayıcı.

**Nerede:** [`../server/yorum.ts`](../server/yorum.ts),
[`../ui/yorum-listesi.tsx`](../ui/yorum-listesi.tsx),
[`../app/yonetim/yorumlar/page.tsx`](../app/yonetim/yorumlar/page.tsx)

---

### K-35 · Arama: Türkçe klavyeye takılmıyor, JavaScript'e bağlı değil
**21 Eylül 2026**

Sitede ürün araması hiç yoktu; müşteri aradığını ancak kategorilerde
gezinerek bulabiliyordu.

**Asıl zorluk klavye.** Müşteri "zibin" yazıyor, ürünün adı "Zıbın".
Postgres'in `ilike`'ı bunları eşleştiremiyor çünkü `ı` ile `i` ayrı harf.
Çözüm iki tarafı da aynı biçime indirmek: Türkçe harfler ASCII karşılığına,
küçük harfe, harf ve rakam dışı her şey boşluğa. Denemede beş yazım
("zıbın", "zibin", "ZIBIN", "Zıbın", "ZİBİN") aynı sonucu veriyor.

Normalleştirilmiş hâl ürünün üstünde `aramaMetni` alanında duruyor ve her
ürün yazmasından sonra tazeleniyor. Sorgu anında hesaplamak da mümkündü ama
o zaman dizin kullanılamıyor ve her arama bütün katalogu tarıyor. Var olan
ürünler göçün içinde dolduruldu; SQL'deki normalleştirme koddakiyle birebir
aynı.

Aranan alanlar: ad, özet, açıklama, özellikler, kumaş içeriği. **Kategori adı
kasten dışarıda** — kategori adı değişince bütün ürünlerinin metnini
tazelemek gerekirdi ve bayatlarsa kimse fark etmezdi; kategoriye göre
daraltma zaten sonuç sayfasında var.

**Her kelime ayrı aranıyor ve hepsi bulunmak zorunda.** "mavi tulum" yazan
kişi mavi **ve** tulum arıyor, mavi ya da tulum değil. Tek harflik parçalar
atılıyor, neredeyse her ürüne uyuyorlar.

**Öneriler kolaylık, akışın şartı değil.** Kutu temelde düz bir GET formu:
JavaScript kapalıyken yazıp Enter'a basınca `/arama` sayfasına gidiyor.
Açıkken altında öneriler beliriyor — yazmaya ara verilene kadar beklenip tek
istek atılıyor, önceki istek iptal ediliyor. Ok tuşlarıyla geziliyor, Enter
seçiyor, Esc kapatıyor.

Öneriler **gerçek bağlantı** olarak duruyor, ARIA combobox olarak değil. Tam
combobox deseninde seçenekler `role="option"` olmak zorunda ve o zaman yeni
sekmede açılamıyorlar; bir mağazada ürünü yeni sekmede açmak sık yapılan bir
şey. Onun yerine sonuç sayısı `aria-live` ile okunuyor — eksik olanı
söylemeyi, olmayan bir deseni varmış gibi ilan etmeye tercih ettik.

**Sonuç sayfası dizine girmiyor.** Her sorgu ayrı bir sayfa gibi görünüp
sitenin kendi sayfalarının sırasını yemesin diye.

Sonuç bulunamadığında ekran boş kalmıyor: daha kısa kelime önerisi ve
kategori bağlantıları veriyor.

Yan temizlik: toplu yükleme kendi `anahtar()` işlevini taşıyordu, aynı
normalleştirmenin ikinci kopyasıydı. Ortak işleve bağlandı; iki kopya er geç
ayrışırdı.

**Denendi** (28 madde): beş ayrı yazımın aynı sonucu vermesi, kumaş ve özellik
alanlarından bulunması, iki kelimenin daraltması, uymayan kelimenin sonucu
sıfırlaması, bulunamadı ekranı, kategori daraltması, öneri ucunun yalnızca
vitrin bilgisi döndürmesi ve tek harfte susması, üst çubuktaki kutunun
önerileri açması, ok tuşu + Enter, JavaScript kapalı tarayıcıda aramanın
çalışması, panelden kaydedince arama metninin yeniden üretilmesi.

**Nerede:** [`../server/arama-metin.ts`](../server/arama-metin.ts),
[`../ui/arama-kutusu.tsx`](../ui/arama-kutusu.tsx),
[`../app/(magaza)/(vitrin)/arama/page.tsx`](../app/(magaza)/(vitrin)/arama)

---

### K-36 · Üye kendi siparişini hesabında görüyor
**21 Eylül 2026**

`/hesabim` siparişleri listeliyordu ama ayrıntı için sipariş takip sayfasına
gönderiyordu; üye orada **numarasını ve e-postasını yeniden yazmak** zorunda
kalıyordu. Zaten giriş yapmış birinden kimliğini tekrar istemek gereksiz.

Daha kötüsü: iptal, iade ve değerlendirme formları (K-33, K-34) yalnızca
takip sayfasındaydı. Yani üye hesabından sipariş iptal edemiyor, ürün
değerlendiremiyordu. Özellikleri yaparken müşteri yolunun bu ucu
tamamlanmamıştı.

`/hesabim/siparis/[numara]` eklendi: sipariş kartı, değerlendirme formu ve
talep formu bir arada.

**Kimlik oturumdan ve iki koşullu.** Sipariş bu hesaba **bağlı** olmalı ve
e-posta tutmalı. Yalnızca e-postaya bakmak yetmezdi: aynı adresle üyeliksiz
verilmiş ve henüz hesaba bağlanmamış siparişler var, onlar hesapta değil
takip sayfasında görünüyor — bağlama ancak e-posta doğrulandıktan sonra
oluyor (K-14). Başkasının siparişi sayfa yokmuş gibi davranıyor.

Formlar artık **geldikleri sayfaya** dönüyor. Dönüş yolu gizli bir alanda
taşınıyor ve yalnızca kendi sitemizin düz bir yolu kabul ediliyor:
`//baska-site` gibi bir değer verilseydi müşteri formu doldurduktan sonra
başka bir siteye atılabilirdi.

**Denendi** (19 madde): hesaptan ayrıntıya geçiş, kimliğin yeniden
sorulmaması, iki formun da burada olması, formların aynı sayfaya dönmesi ve
kaydın yazılması, başkasının siparişinin 404 vermesi, hesaba bağlanmamış
siparişin hesapta görünmeyip takipte görünmesi, giriş yapmamış ziyaretçinin
yönlendirilmesi, takip sayfasının bozulmamış olması, JavaScript kapalı
tarayıcı.

**Nerede:** [`../app/(magaza)/(hesap)/hesabim/siparis`](../app/(magaza)/(hesap)/hesabim/siparis),
[`../server/uyelik.ts`](../server/uyelik.ts)

---

### K-37 · Denetimler gönderimde çalışıyor
**21 Eylül 2026**

Depoda hiçbir otomatik denetim yoktu. Doğrudan `main`'e dağıtım yapıldığı
için bir tip hatası ancak Vercel'in yapısı düştüğünde ortaya çıkıyordu — ve o
noktada zaten dağıtım denenmiş, kilit alınmış, zaman harcanmış oluyordu.

`.github/workflows/kontrol.yml`: her gönderimde `npm run kontrol` (tip ve kod
denetimi) ve `npm run build`. Postgres bir servis olarak kalkıyor çünkü
derleme Prisma istemcisini yüklüyor ve göçleri uyguluyor.

Yapı iki ortam değişkeniyle yetiniyor: veritabanı adresi ve panel şifresi.
Şifre tanımlı olmazsa panel kendini tamamen kapatıyor (404) ve sayfalar
üretilemiyor; oraya konan değer gerçek şifre değil, yalnızca derleme için.

**Denendi:** iş akışının adımları boş bir veritabanında birebir çalıştırıldı —
göçler uygulandı, denetim ve derleme sıfır koduyla bitti.

**Nerede:** [`../.github/workflows/kontrol.yml`](../.github/workflows/kontrol.yml)

---

### K-38 · Giriş denemesi sınırı: iki sayaç, hesabı ele vermeden
**21 Eylül 2026**

Açık sorulardan A-10 kapandı. scrypt her denemeyi yavaşlatıyordu (16 MB
bellek maliyeti) ama **sınır koymuyordu:** bir hesaba saatlerce şifre
denenebilirdi.

**İki ayrı sayaç, iki ayrı saldırı biçimi için:**

- **E-posta başına** (5 hata / 15 dakika) — belirli bir hesaba şifre deneyen
  saldırı.
- **IP başına** (20 hata / 15 dakika) — tek bir yerden çok sayıda hesaba tek
  tek şifre deneyen saldırı. E-posta sayacı bunu yakalayamaz, çünkü her
  hesaba bir deneme düşüyor. Sınırın yüksek olmasının sebebi aynı evden ya da
  iş yerinden birden çok kişinin girmeye çalışabilmesi.

**Kilit hesabın varlığını ele vermiyor.** Sayacın anahtarı hesabın kimliği
değil, e-postanın özeti. Hesap var da olsa yok da olsa aynı davranıyor:
denemede olmayan bir adres de tam beşinci denemede kilitleniyor. Böylece
"kilitlendi" mesajı hangi adreslerin kayıtlı olduğunu söylemiyor.

**Kilit açıkça söyleniyor.** "Yanlış şifre" demeye devam etmek, doğru
şifresini yazan gerçek müşteriyi sebebini bilmeden çaresiz bırakırdı. Kaç
dakika kaldığı da yazıyor ve şifre sıfırlamaya yönlendiriliyor.

Kilit **beşinci hatalı denemenin cevabında** söyleniyor, altıncıda değil:
sayaç dolduğunda kullanıcıya hemen bildiriliyor. Bunun için sayaç işlevi
sonucunu döndürüyor.

Sınır şifre denenmeden **önce** kontrol ediliyor: kilitliyken scrypt'i
çalıştırmanın anlamı yok, üstelik cevabın süresi denemenin yapılıp
yapılmadığını ele verirdi.

IP'nin kendisi değil özeti saklanıyor; sayaç için gereken şey adresin kendisi
değil, aynı yerden gelip gelmediği. Kayıtlar günlük temizlikte siliniyor.

**Denendi** (20 madde): ilk denemelerin geçmesi, beşincide kilit, kalan
dakikanın bildirilmesi, kilitliyken doğru şifrenin de geçmemesi, olmayan
hesabın aynı davranması, özetin ham e-posta içermemesi, doğru şifrenin sayacı
sıfırlaması, IP sayacının ayrı birikmesi, altı farklı hesap denemesinin
kilitlememesi, temizlik işi, JavaScript kapalı tarayıcı.

**Nerede:** [`../server/giris-sinir.ts`](../server/giris-sinir.ts)

---

### K-39 · KVKK: veri indirme ve hesap silme, "her şey silindi" demeden
**21 Eylül 2026**

Gizlilik metni verilere erişme ve silinmesini isteme haklarını sayıyordu ama
tek yolu "künyedeki kanallardan bize yaz"dı. İkisi de artık üyenin kendi
yapabileceği bir şey.

**Veri indirme** JSON dosyası olarak. JSON seçildi çünkü eksiksiz: PDF'te
tablolar kırpılır, CSV'de siparişin satırları gibi iç içe yapılar düzleşir.
Hesap bilgileri, adres defteri, siparişler ve satırları, talepler,
değerlendirmeler ve oturum sayısı giriyor.

**Şifre özeti ve oturum jetonları dosyaya yazılmıyor.** İkisi de kimlik
doğrulama sırrı; kişinin kendi verisi olsa bile indirilen dosya e-postayla
paylaşılıyor, bulutta duruyor.

**Silme, her şeyi silmek değil — ve ekran bunu söylüyor.** Sipariş ve fatura
kayıtları vergi mevzuatının öngördüğü süre boyunca saklanmak zorunda. Silinen
şey hesap: oturumlar, jetonlar, adres defteri, pazarlama izni, bekleyen stok
bildirimleri ve hesabın kendisi. Siparişler hesapla bağını kaybediyor,
içlerindeki ad ve adres yasal süre boyunca duruyor. "Her şeyi sildik" demek
kolay olurdu ama doğru olmazdı; ekranda silinenler ve silinmeyenler ayrı ayrı
yazılı.

Değerlendirmeler kalıyor ama ad "Müşteri"ye dönüyor: yorumun kendisi başka
müşteriler için bilgi, adı ise kişisel veri.

Silmek için **şifre yeniden isteniyor ve kutuya SİL yazılıyor.** Geri
alınamaz bir işlem, açık kalmış bir tarayıcıda başkasının tek tıkla
yapabileceği bir şey olmamalı.

**Denendi** (30 madde): dosyanın inmesi ve içeriğinin eksiksizliği, şifre
özetinin ve oturum jetonunun dosyada bulunmaması, giriş yapmamışın
indirememesi, yanlış şifrenin ve yanlış onay kelimesinin reddedilmesi,
silmeden sonra hesabın-adreslerin-oturumların gitmesi, siparişin durup hesap
bağının kopması, değerlendirmenin durup adının anonimleşmesi, JavaScript
kapalı tarayıcı.

**Nerede:** [`../server/kisisel-veri.ts`](../server/kisisel-veri.ts),
[`../app/(magaza)/(hesap)/hesabim/verilerim`](../app/(magaza)/(hesap)/hesabim/verilerim)

---

### K-40 · Sıralama ve mobil menü: ikisi de JavaScript'siz
**21 Eylül 2026**

**Sıralama.** Listelerde beden, yaş, renk ve fiyat süzgeçleri vardı ama
sıralama yoktu. Beş seçenek eklendi: önerilen (kataloğa giriş sırası, yani
mağaza sahibinin düzeni), önce ucuz, önce pahalı, yeniler, puana göre. Hem
kategori sayfasında hem aramada.

Sıralama **sorguda değil, kampanyalar uygulandıktan sonra** yapılıyor. Fiyata
göre sıralarken müşterinin gördüğü fiyat geçerli olmalı; indirimli bir ürün
liste fiyatına göre sıralanırsa "önce ucuz" listesinde yanlış yerde çıkar.

Puana göre sıralamada hiç değerlendirmesi olmayan ürün **sona** gidiyor:
puanı yok, sıfır değil (K-34).

Sıralama bağlantılarla yapılıyor, süzgeçlerle aynı düzende — açılır kutu
seçtiği anda gitsin isteseydik JavaScript gerekirdi.

**Mobil menü.** Kategoriler üst çubukta düz bir satır hâlinde sarıyordu;
arama kutusu da eklenince telefonda iyice doluyordu. Küçük ekranda artık
açılır menü var.

`<details>` kullanıldı: tarayıcının kendi açılır öğesi. JavaScript kapalıyken
çalışıyor, klavyeyle açılıp kapanıyor, ekran okuyucu "genişlet" diye okuyor.
Bir düğme ve durum değişkeniyle yapmak JavaScript'e bağımlılık getirirdi —
sitenin geri kalanı buna bağlı değil.

Kategori bağlantıları iki kez yazılıyor (açılır menüde ve geniş ekran
şeridinde). `<details>` kapalıyken içeriğini tarayıcı gizlediği için geniş
ekranda "hep açık" hâle getirmenin temiz bir yolu yok; beş-on bağlantının iki
kez yazılması bu kırılganlığa değmiyor.

**Denendi** (21 madde): sıralamanın fiyatları gerçekten sıralaması, iki yönün
birbirinin tersi olması, süzgeçle birlikte çalışması, puansız ürünün sona
gitmesi, aramada sorgunun korunması; mobil menünün kapalı başlaması, açılması,
geniş ekranda gizlenmesi; JavaScript kapalı tarayıcıda ikisinin de çalışması.

**Nerede:** [`../ui/ust-cubuk.tsx`](../ui/ust-cubuk.tsx),
[`../server/katalog.ts`](../server/katalog.ts)

---

### K-41 · Fotoğraf akışı bitirilebilir hâle geldi
**21 Eylül 2026**

Fotoğraf yükleme zaten vardı: çoklu dosya, otomatik küçültme, webp'ye çevirme,
sıralama, kapak seçimi. Eksik olan **hangi ürünün fotoğrafı olmadığını
görmekti.** Excel'den elli ürün yüklendiğinde (K-26) hangilerinin fotoğrafı
eksik kaldığını anlamanın yolu yoktu; ürün ürün açıp bakmak gerekiyordu.

Üç yerden görünüyor artık:

- **Ürün listesinde fotoğraf sütunu.** Fotoğrafı olanda küçük görsel ve adet,
  olmayanda tıklanabilir bir "Fotoğraf yok" rozeti — doğrudan o ürünün
  fotoğraf bölümüne gidiyor.
- **"Fotoğrafsız" süzgeci**, sayısıyla birlikte.
- **Özet ekranında iş kartı** (K-32'deki yapılacaklar listesinde).

**Yükleme sonrası sıradaki ürün.** Çekimden dönen kişi otuz fotoğrafı tek tek
doğru ürüne koyacak. Yükleme bitince "Sıradaki fotoğrafsız ürün: X (12 kaldı)"
bağlantısı çıkıyor. Listeye dönüp yerini bulmak yerine tek tık: iş bir kuyruk
hâline geliyor ve bitiyor.

**Sürükle bırak** eklendi ama içindeki şey hâlâ düz bir `<input type="file">`:
JavaScript kapalıyken kutu olduğu gibi çalışıyor. Eklenen tek şey dosyaları
alanın üzerine bırakabilmek ve **kaç dosya seçildiğini görmek** — telefon
galerisinden sekiz fotoğraf seçtikten sonra "gerçekten seçildi mi" sorusu
kalmasın diye.

Yükle düğmesi artık bekleme durumunu gösteriyor: sekiz büyük fotoğraf
yüklenirken form sessizce bekliyordu.

**Nerede:** [`../ui/dosya-birak.tsx`](../ui/dosya-birak.tsx),
[`../ui/fotograf-yonetimi.tsx`](../ui/fotograf-yonetimi.tsx),
[`../app/yonetim/urunler/page.tsx`](../app/yonetim/urunler/page.tsx)

---

### K-42 · Satış raporu: tek renk, sunucuda çizilen grafik
**21 Eylül 2026**

Özet ekranı bugünü gösteriyor (K-32); rapor bir dönemi gösteriyor. Hazır
dönemler (bu ay, geçen ay, son 30 gün, son 12 ay) ya da elle tarih aralığı.

**İptaller hiçbir toplama girmiyor** ama iptal **oranı** ayrıca gösteriliyor:
iptal edilmiş sipariş ciro değil, ama yükselen bir iptal oranı başlı başına
bir haber. **Her dönem bir öncekiyle karşılaştırılıyor** — tek başına "42
sipariş" bir şey söylemiyor; geçen ay 60'sa başka, 20'yse başka.

**Grafik tek renkli.** Çizilen tek bir ölçü var (ciro) ve büyüklüğü sütunun
boyu taşıyor; renk hiçbir şey kodlamıyor. Markanın üç "koyu" tonu kategorik
palet olarak denendi ve **doğrulayıcıdan geçemedi** — mavi ile yeşil normal
görüşte bile ayırt edilemeyecek kadar yakın (ΔE 14,2; eşik 15). Tek renge
geçmek bu sorunu tamamen ortadan kaldırıyor, üstelik doğru olan da bu:
büyüklük karşılaştırması sıralı bir ölçü, kimlik değil.

Renk için ayrı bir belirteç eklendi (`--grafik`). Metin tonları okunurluk
için seçiliyor, dolgu tonları yüzeye karşı kontrast **ve açıklık bandı** için;
ikisi aynı değer olmak zorunda değil. Açık temada `#c2433a`, koyu temada
`#d9564c` — ikisi de kendi yüzeyine karşı ayrı ayrı doğrulandı. Koyu temanın
rengi açık temanınkinin çevrilmişi değil, kendi bandında seçilmiş bir değer.

**Kırılımlar pasta değil sıralı çubuk.** Pastada dilim büyüklüğünü
karşılaştırmak açı karşılaştırmak demek ve insan bunu iyi yapamıyor; yan yana
uzunluk karşılaştırmak kolay. Üstelik sıralı liste hem oranı hem sırayı aynı
anda söylüyor.

**Grafik sunucuda çiziliyor.** İstemcide grafik kütüphanesi yok: sayfa
JavaScript kapalıyken de grafiği gösteriyor. İpucu için her sütunun içinde
`<title>` var — tarayıcının kendi ipucu balonu, JavaScript gerektirmiyor.

Biçim ayrıntıları rehberden: sütun en fazla 24 piksel, veri ucu 4 piksel
yuvarlak ve taban köşeli, komşular arasında boşluk, ızgara saç teli
inceliğinde ve kesiksiz, sayı yalnızca en yüksek sütunun üstünde. O etiket
eksendeki kısaltmayı tekrarlamıyor, **kesin değeri** yazıyor; kenardaki
sütunda hizalaması değişiyor ki çizim alanının dışına taşıp kırpılmasın.

Altmış günden uzun dönem güne değil **aya** bölünüyor: bir yılı 365 sütunda
göstermek grafik değil duvar olurdu.

Yan düzeltme: büyük tek başına sayılarda eşit genişlikli rakam (tabular-nums)
kullanılmıyordu artık — "121" gibi bir sayı o boyutta gereksiz gevşek
görünüyor. Eşit genişlik tabloda ve eksende işe yarıyor, orada kalıyor. Aynı
düzeltme özet ekranına da uygulandı.

**CSV** her sipariş kalemini ayrı satır olarak veriyor: muhasebeye giderken
toplamlar değil kalemler gerekiyor. Noktalı virgül ve BOM, Türkçe Excel'in
dosyayı çift tıklayınca doğru açması için (K-26'da okurken de aynı gerçekle
karşılaşmıştık).

**Denendi** (39 madde, 25 günlük üretilmiş satış verisiyle): fotoğrafsız
ürünlerin üç yerden görünmesi, yüklemeden sonra sıradaki ürüne geçiş, listede
küçük görselin çıkması; rapor sayılarının veritabanıyla birebir tutması,
iptallerin ciroya girmemesi, SVG'nin çizilmesi ve ipucu başlıklarının olması,
uzun dönemin aya bölünmesi, kırılım yüzdelerinin toplamının yüze çıkması,
CSV'nin satır sayısı ve biçimi, JavaScript kapalı tarayıcıda grafiğin ve
süzgeçlerin çalışması. Grafik iki temada da ekran görüntüsüyle gözden
geçirildi.

**Nerede:** [`../server/rapor.ts`](../server/rapor.ts),
[`../ui/sutun-grafik.tsx`](../ui/sutun-grafik.tsx),
[`../app/yonetim/rapor`](../app/yonetim/rapor)

---

### K-43 · Panel kendi çerçevesine taşındı
**21 Eylül 2026**

Panelin menüsü on dört bağlantılık düz bir listeydi, hangi sayfada olunduğunu
göstermiyordu ve telefonda içerikten önce ekranın yarısını kaplıyordu. Dört
şey birden değişti.

**Menü gruplandı.** Satış (Siparişler, Talepler, Değerlendirmeler, Satış
raporu), Katalog (Ürünler, Kategoriler, Stok), Vitrin (Kampanyalar, Ana sayfa
banner, Duyuru şeridi), Ayarlar (Satış ayarları, Yasal metinler, Tanı). Özet
grupların dışında, en üstte: panelin ana sayfası, bir kategorinin üyesi değil.
Gruplar **açılır kapanır değil, sadece başlıklı** — her gün kullanılan bir
panelde bir şeyi görmek için önce açmak gerekmesin.

**Açık sayfa işaretli.** Alt sayfalar da üst maddeyi işaretliyor:
`/yonetim/urunler/zibin` açıkken "Ürünler" işaretli kalıyor. `aria-current`
ile, yani renkten başka bir şey de söylüyor. Yolu middleware ekliyor
(`x-yonetim-yol`): sunucu bileşeninde adres satırına ulaşmanın başka yolu yok
ve menüyü yalnızca bunun için istemci bileşenine çevirmek gereksiz bir
JavaScript yükü olurdu.

**Bekleyen iş sayıları menüde.** "Bakılacak bir şey var mı" sorusunun cevabı
özet ekranına gitmeden görünüyor. Sayı yalnızca sıfırdan büyükken çıkıyor;
her maddenin yanında sürekli duran bir rakam kısa sürede görünmez oluyor.
**Rozetin iki tonu var**: müşterinin beklediği işler (bekleyen sipariş, yeni
talep) dolu mercan, mağazanın kendi işleri (fotoğrafsız ürün, biten stok)
sessiz çerçeveli. Hepsi kırmızı olsaydı hiçbiri kırmızı olmazdı. Ekran
okuyucuda rakamın yanında "bekleyen" okunuyor — "Siparişler 4" tek başına bir
şey söylemiyor.

**Telefonda menü açılır.** `<details>` ile, yani JavaScript kapalıyken de
çalışıyor (K-40'taki mağaza menüsüyle aynı yol). Kapalı başlıkta açık sayfanın
adı ve müşteri bekleyen işlerin toplamı yazıyor: menü kapalıyken de "bugün iş
var mı" cevaplanıyor. Geniş ekranda hep açık — tarayıcının kapalı `<details>`
içeriğini gizleyen kuralı `.open-yok` sınıfıyla 64rem üstünde etkisiz
kılınıyor.

**Asıl sorun bunların hiçbiri değildi.** Telefon görüntüsüne bakınca panelin
üstünde **mağazanın başlığı** duruyordu: duyuru şeridi, logo, kategori
bağlantıları, ürün arama kutusu, sepet sayacı ve altta mağaza alt bilgisi.
Sipariş yönetirken hiçbirinin işi yok. Kök düzen bunları her sayfaya basıyordu.

Mağaza sayfaları `app/(magaza)` grubuna alındı ve çerçeve oraya taşındı; kök
düzende yalnızca `<html>`, yazı tipleri, yükleme çizgisi ve ölçümleme kaldı.
**Grup adı adrese girmiyor**: bütün sayfaların adresi harfi harfine aynı kaldı
(derleme çıktısındaki yol listesiyle ve tarayıcıda tek tek doğrulandı). Panel
artık kendi çerçevesinde: telefonda içerik ilk ekranda başlıyor.

**Denendi** (33 madde): panelde mağaza logosu/arama kutusu/alt bilgi yok ve
`<main>` bölgesi var; mağaza adreslerinin hepsi eski hâliyle açılıyor ve üst
çubuğu yerinde (`/`, `/sepet`, `/siparis-takip`, `/giris`, `/hesabim`,
`/arama`, kategori, ürün); Özet yalnızca `/yonetim`'de, alt sayfa üst maddeyi
işaretliyor; sipariş rozeti dolu, stok rozeti sessiz, sayı sıfırsa rozet yok;
telefonda menü kapalı başlıyor, kapalı başlıkta açık sayfa ve bekleyen toplamı
yazıyor; JavaScript kapalı tarayıcıda menü açılıyor.

**Nerede:** [`../server/panel-menu.ts`](../server/panel-menu.ts),
[`../app/yonetim/layout.tsx`](../app/yonetim/layout.tsx),
[`../app/(magaza)/layout.tsx`](../app/(magaza)/layout.tsx),
[`../middleware.ts`](../middleware.ts)

---

### K-44 · Uzun panel sayfaları: süzgeç, katlama ve kısa liste
**21 Eylül 2026**

Paneldeki sayfaların boyu ölçüldü (900 piksellik ekranda, sekiz ürünlük
küçük veriyle): stok 2,6 / **6,0** ekran (masaüstü / telefon), banner
2,1 / 3,0, yasal 1,9 / 2,4, özet 1,6 / 2,4, duyuru 1,4 / 2,2; kalan on
sayfa tek ekran.

**Akordiyon her uzun sayfanın ilacı değil.** Üç ayrı sorun çıktı, üçünün
çözümü ayrı.

**1. Stok ekranı — akordiyon bunu kurtarmazdı.** Sayfa bütün ürünlerin bütün
bedenlerini tek forma basıyordu: sekiz üründe doksan beden girdisi, telefonda
altı ekran. İki yüz ürünle ürün başına ~680 piksel, yani yüz elli ekran ve
tek gönderimde iki binden fazla alan. Ürünleri açılır kapanır satırlara
çevirmek iki yüz kapalı satır demekti — aradığını yine bulamazdın, üstelik
tarayıcının kendi sayfa içi araması (Ctrl+F) kapalı `<details>` içindekini
bulamıyor.

Doğrusu kapsamı daraltmak: **ürün araması** (Türkçe harf katlamasıyla, K-35),
**üç süzgeç** — Sorunlular (varsayılan: biten + üç adet ve altına düşen),
Bitenler, Hepsi — ve **sayfalama** (yirmi ürün). Günlük iş biten bedeni
düzeltmek; tam listeye ayda bir bakılıyor. Süzgeçli görünümde ürün kartı
**yalnızca sorunlu bedenleri** açık gösteriyor, stoğu yerinde olanlar
"Stoğu yerinde 8 beden" başlığı altında katlanmış duruyor — katlanmış da
olsalar formun içindeler, yani kaydet hepsini gönderiyor.

Sonuç: 2,6 → 1,9 ekran masaüstünde, **6,0 → 3,0** telefonda.

**Kaydettikten sonra aynı süzgeç ve sayfa.** Eskiden `?kayit=1`'e dönülüyordu;
bir bedeni düzeltip kaydedince listenin başına atılıyordun. Süzgeç değerleri
forma gizli alan olarak konuyor ama yine de çözümleyiciden geçiyor: adres elle
kuruluyor, forma ne gelirse gelsin yalnızca bilinen değerler adrese yazılıyor.

**Rozet ve liste aynı sayıyı söylüyor.** Menüdeki stok rozeti tükenen
**beden** sayısını gösteriyordu (13), tıklayınca açılan listede yedi satır
vardı. Rozet de artık ürün sayıyor. Aynı eşik iki ekranda ayrı tanımlanmasın
diye özet ekranının `KRITIK_STOK` sabiti stok ekranının `AZALAN_ESIK`'inden
geliyor.

**2. Banner, duyuru ve künye — akordiyon tam buraya uyuyor.** Bu sayfalar
"önizleme + ayarlar + liste + yeni kayıt formu" kalıbında ve hepsi baştan sona
açıktı. Ayda bir dokunulan ayarların ve uzun "yeni kayıt" formlarının sürekli
açık durmasının bir sebebi yok. Ortak bir `<ui/katlanir.tsx>` parçası yapıldı;
`<details>` ile, yani JavaScript kapalıyken çalışıyor, klavyeyle açılıp
kapanıyor, ekran okuyucu "genişlet/daralt" diye okuyor (K-40, K-43'teki
yolun aynısı).

Üç kural, bir kere kararlaştırıldı:

1. **Başlık açmadan karar verdirmeli.** Özet sağda duruyor: "Geçiş hızı ·
   her banner 6 saniye", "Şerit ayarları · açık · orta · nane", "Künye ve
   ETBİS · eksik satır var". "Şerit ayarları ▾" tek başına açmayı denemekten
   başka seçenek bırakmıyor.
2. **Kaydettikten sonra açık kalmalı.** İşlem `?kayit=1&ac=<kimlik>` ile
   dönüyor, sayfa o bölümü açıyor. Yoksa bir ayarı değiştirip kaydediyorsun
   ve bölüm kapanıyor; sonucu görmek için yeniden açman gerekiyor. `ac`
   değeri de doğrudan adrese yazılmıyor, deseni doğrulanıyor.
3. **Hata kapalı bölümün içinde saklanmaz.** Künye eksikse kendini açıyor —
   mesafeli satışta satıcının unvanı, adresi, bir iletişim yolu ve ETBİS
   numarası sitede bulunmak zorunda; kapalı bir bölümün içinde saklanan
   eksik, olmayan eksikle aynı şey.

**Katlanan şey liste değil form.** Ctrl+F kapalı `<details>` içindekini
bulamadığı için aranacak içerik — mesaj listesi, banner listesi — açık
kalıyor; başlığına kaç kayıt olduğu yazıldı.

Sonuç: banner 2,1 → 1,4 ve 3,0 → 2,0; duyuru 1,4 → 1,0 ve 2,2 → 1,4;
yasal 1,9 → 1,3 ve 2,4 → 1,6.

**Not:** `<details name="...">` ile tarayıcının kendi "aynı anda tek açık"
akordiyonu kurulabiliyor ve burada kullanılmadı. Bu sayfalardaki bölümler
birbirinin alternatifi değil (ayarlar ile yeni kayıt formu ayrı işler);
birini açınca ötekinin kapanması kazanç değil kayıp olurdu.

**3. Özet ekranı — uzun ama doğru uzun.** Listeleri beş satıra indirildi.
Asıl düzeltme boy değil: listeler zaten on ve sekizde **sessizce** kesiliyordu,
kaç tane olduğunu söylemiyorlardı. Artık altında "40 bedenin en aza düşen
5 tanesi" yazıyor ve tam listeye bağlantı veriyor. (Aynı hata sipariş
listesinde de vardı, K-31'de düzeltilmişti.)

**Denendi** (49 madde): süzgeç sayılarının listeyle ve menü rozetiyle
tutması, sağlam bedenlerin katlanması ve "hepsi" görünümünde katlanmaması,
Türkçe harf katlamalı arama, boş sonucun ne aradığını söylemesi, kaydettikten
sonra süzgecin/aramanın/değerin korunması, katlanır bölümlerin kapalı
başlaması ve adresle açılabilmesi, kaydettikten sonra açık kalıp özetinin
tazelenmesi, eksik künyenin kendini açması, özet listelerinin beş satırı
geçmemesi ve JavaScript kapalı tarayıcıda hem süzgecin hem katlamanın
çalışması.

**Nerede:** [`../server/stok-ekrani.ts`](../server/stok-ekrani.ts),
[`../app/yonetim/stok`](../app/yonetim/stok),
[`../ui/katlanir.tsx`](../ui/katlanir.tsx),
[`../server/panel-ozet.ts`](../server/panel-ozet.ts)

---

### K-45 · Panelin kendi giriş ekranı ve kullanıcıları
**21 Eylül 2026**

Panel bugüne kadar HTTP Basic ile korunuyordu: tek bir şifre, `YONETIM_SIFRE`
ortam değişkeninde. Üç sorunu vardı.

**Ekran biçimlendirilemiyordu.** Tarayıcının kendi şifre kutusu işletim
sisteminin kutusu; markadan, yazı tipinden, renkten hiçbir iz taşımıyor,
Türkçe bile değil. Mağazanın geri kalanına harf harf emek verilmişken paneli
açan ilk ekranın bu olması tuhaftı.

**Çıkış yapmanın yolu yoktu.** Basic kimlik tarayıcı kapanana kadar
gönderiliyor; ortak kullanılan bir bilgisayarda panel açık kalıyordu ve
kapatmanın yolu "bütün tarayıcıyı kapat"tı.

**Tek şifre vardı.** Kimin ne yaptığı bilinmiyordu, bir kişi ayrılınca şifreyi
herkes için değiştirmek gerekiyordu, ve o şifre ortam değişkeninde ortak
duruyordu.

**Çözüm ikisi birden.** Giriş ekranı sitenin teması ve kişiye ait hesaplar
aynı değişikliğin iki yüzü: tek bir ortak şifreyle temalı bir giriş ekranı
yapmak, üç ay sonra hepsini yeniden yazmak demekti.

**Müşteriden tamamen ayrı.** Ayrı tablo (`AdminUser`), ayrı çerez
(`yonetim_oturum`), ayrı oturum tablosu. Müşteri oturumu hiçbir koşulda panele
geçiş vermiyor; iki sistemin tek ortak yanı şifre özetleme işlevleri
(`server/uyelik.ts`) ve giriş denemesi sayacı (K-38) — ikisi de kendi başına
duran, kimlikten bağımsız parçalar. Çerezin yolu `/yonetim`: mağaza
sayfalarına giden her isteğin üstünde panel jetonu taşınmasının gereği yok.

**Oturum 12 saat**, müşterininki gibi 30 gün değil. Panelde stok, sipariş ve
müşteri bilgisi var; ortak bir bilgisayarda açık kalmış bir panel, açık kalmış
bir müşteri hesabından pahalı.

**İki rol, üç değil.** `sahip` kullanıcı ekleyip çıkarabiliyor, `yonetici`
paneldeki her şeyi yapabiliyor ama kullanıcılara dokunamıyor. Bir kişilik bir
mağazada rol ağacı kurmanın kimseye faydası olmazdı; ama "kullanıcıyı
silebilen kim" sorusunun cevapsız kalmasının zararı olurdu. *(K-79 ile
kaldırıldı: artık rol yok, her panel kullanıcısı her şeyi yapabiliyor.)*

**Kendini kilitleme koruması kodda, uyarı metninde değil.** Kendini
kapatmak, kendini silmek, kendi rolünü düşürmek ve son aktif sahibi
düşürmek engelli. Bunların tek çaresi veritabanına elle müdahale olurdu.
Düğmeler de çıkmıyor ama asıl kural sunucuda: görünmeyen düğme koruma
değildir.

**Kapatmak silmekten önce geliyor.** Ayrılan biri için hesap kapatılıyor:
açık oturumları anında düşüyor, kaydı ise duruyor — "kim ne zaman girmişti"
sorusu silinmiş bir satırla cevaplanamıyor. Silme, yanlışlıkla açılmış bir
hesap için var.

**`YONETIM_SIFRE` kalıcı bir arka kapı değil.** Yalnızca **hiç kullanıcı
yokken** ilk sahibi oluşturmanın anahtarı; hesap açıldıktan sonra o şifreyle
kimse giriş yapamıyor. Ortam değişkeninde duran ortak bir şifrenin sonsuza
kadar geçerli kalması, az önce çözülen sorunu geri getirirdi. Değişken hiç
tanımlı değilse ve kullanıcı da yoksa giriş sayfası 404 veriyor — eski
davranışın korunan yanı: ayar unutulursa panel açıkta kalmıyor.

**Kimlik middleware'de doğrulanmıyor.** Middleware Edge çalışma ortamında
çalışıyor; orada veritabanı yok, yani oturumun geçerliliği bilinemiyor.
Middleware yalnızca çerez **hiç yoksa** giriş sayfasına yolluyor — bu bir
güvenlik önlemi değil, boşuna sayfa yüklemeyi önleyen bir kestirme. Asıl
kontrol üç yerde, hepsi veritabanına bakarak:

1. `(panel)/layout.tsx` — `/yonetim` altındaki bütün **sayfaları** sarıyor.
2. Her `route.ts` — route handler'lar düzenden geçmiyor. Olmasaydı rapor
   CSV'si ve yükleme şablonu panele girmeden indirilebilirdi.
3. Her server action — eylemler de düzenden geçmiyor ve kimliği bilinen bir
   adresle çağrılabiliyor. `server/yonetim.ts`'teki otuz eylemin, talep,
   yorum ve toplu yükleme eylemlerinin hepsi `yoneticiGerekli()` ile
   başlıyor.

Sahte bir çerez middleware'den geçiyor, üçünde de reddediliyor; tarayıcı
denemesi bunu ayrıca doğruluyor.

**Adres yapısı.** Giriş sayfası `/yonetim` altında ama kendini koruyan bir
düzenin içinde olamaz — sonsuz yönlendirme olurdu. Panel sayfaları
`app/yonetim/(panel)/` grubuna alındı; grup adı adrese girmediği için bütün
adresler aynı kaldı (K-43'teki `(magaza)` ile aynı yol).

**Denendi** (38 madde): çerezsiz isteğin giriş sayfasına gitmesi ve geldiği
sayfaya geri dönmesi, kurulum ekranının yalnızca bir kez açılması, yanlış
kurulum şifresinin reddi, yanlış şifrenin söylenmesi, çıkışın çalışması,
kullanıcı ekleme ve aynı e-postanın reddi, yöneticinin kullanıcılar sayfasını
açamaması ama panelin geri kalanını kullanabilmesi, kapatılan kullanıcının
oturumunun anında düşmesi ve giriş yapamaması, kendi satırında kapat/sil
düğmesinin hiç çıkmaması, şifre değişince eski şifrenin geçmemesi, müşteri
çerezinin panele geçmemesi, JavaScript kapalı tarayıcıda giriş ve çıkışın
çalışması. Sahte çerezle sayfa, route handler ve CSV ucu ayrıca denendi.
Giriş ekranı açık ve koyu temada ekran görüntüsüyle gözden geçirildi.

**Sırada:** şifre sıfırlama e-postası. Şu an şifresini unutan bir kullanıcıya
sahip yeni bir şifre atıyor; e-posta servisi bağlanınca (A-09) kendi
sıfırlaması eklenecek.

**Nerede:** [`../server/yonetim-kimlik.ts`](../server/yonetim-kimlik.ts),
[`../server/yonetim-kimlik-islem.ts`](../server/yonetim-kimlik-islem.ts),
[`../app/yonetim/giris`](../app/yonetim/giris),
[`../app/yonetim/(panel)/kullanicilar`](../app/yonetim/(panel)/kullanicilar),
[`../middleware.ts`](../middleware.ts)

---

### K-46 · Kurtarma yolu: son açık sahip her zaman kalıyor
**21 Eylül 2026**

`YONETIM_SIFRE` Vercel'den siliniyor. Bu doğru karar — K-45'ten sonra o
değişken çalışan sitede hiçbir işe yaramıyor, yalnızca "hiç kullanıcı yok"
durumunda kurulum ekranını açıyor. Ama silinince **kurtarma yolu da
kalmıyor**: panele girmenin tek yolu bir hesapla giriş yapmak, kurulum ekranı
ise hem hiç kullanıcı kalmasını hem değişkenin tanımlı olmasını istiyor.

Yani artık tek bir değişmez var, ve o tutmazsa panel kalıcı olarak kapanıyor:
**her zaman en az bir açık sahip olmalı.**

K-45'teki kontroller bunu söylüyordu ama **garanti etmiyordu.** Önce
`sonSahipMi()` okunuyor, sonra yazılıyordu. İki sahip aynı anda birbirini
silerse ikisi de "öteki duruyor" görüyor, ikisi de yazıyor ve ortada sahip
kalmıyordu. Uzak ihtimal, ama kurtarma yolu yokken bir kerelik bir çakışmanın
bedeli veritabanına elle müdahale.

**Değişiklik ve sayım tek işlemde.** Silme, kapatma ve rol düşürme artık
`sahipKalsinDiye()` içinden geçiyor: değişiklik uygulanıyor, sonra aynı
işlemin içinde açık sahip sayılıyor, sıfırsa işlem geri alınıyor. Yalıtım
düzeyi `Serializable` — çakışan iki işlemden birini veritabanı kendisi geri
çeviriyor. Okuma-sonra-yazma kalıbı bu garantiyi veremiyordu, çünkü iki işlem
birbirinin henüz yazılmamış değişikliğini göremiyor.

`sonSahipMi()` duruyor ama işi değişti: artık **düğmenin çıkıp çıkmayacağına
ve hata metnine** karar veriyor, güvenliğe değil. Garanti işlemde.

**Tek sahip olduğun ekranda yazıyor.** Kullanıcılar sayfasının başında sarı
bir kutu: "Açık tek sahip sensin… şifreni unutursan panele girilemez —
**ikinci bir sahip hesabı açmanı öneririm.**" Kod zaten koruyor ama kişinin
bunu bilmesi gerekiyor; iki sahip olunca biri ötekinin şifresini
yenileyebiliyor, yani gerçek kurtarma yolu bu. Rol rozetinin yanında da
"· tek" yazıyor.

**Denendi** (28 madde). Kilitlenme yollarının hepsi tek tek denendi: kendi
satırında kapat/sil/rol düğmelerinin hiç çıkmaması, kendi kimliğinin hiçbir
gizli alanda bulunmaması, ikinci sahip varken silmenin ve kapatmanın geçmesi,
kapalı bir sahibin silinebilmesi, silinen kullanıcının oturumunun düşmesi,
düşürülen kullanıcının sayfayı açamaması. Düğme olmadığında da reddedildiğini
görmek için **gerçek form kopyalanıp kimliği değiştirilerek** gönderildi
(Next'in eylem kimliği de kopyalandığı için sunucuya gerçek bir eylem isteği
gidiyor): silme, kapatma ve rol düşürme üçü de reddedildi. Son olarak iki
sahip, iki ayrı tarayıcı oturumundan **aynı anda** birbirini sildi — biri
geçti, öteki geri çevrildi, kalan sahip giriş yapabildi. Üç turda da aynı
sonuç.

**Yan not:** CI iş akışındaki `YONETIM_SIFRE: derleme` satırı kaldırıldı;
derleme artık o değişkene ihtiyaç duymuyor (denendi).

**Nerede:** [`../server/yonetim-kimlik.ts`](../server/yonetim-kimlik.ts),
[`../server/yonetim-kimlik-islem.ts`](../server/yonetim-kimlik-islem.ts),
[`../app/yonetim/(panel)/kullanicilar`](../app/yonetim/(panel)/kullanicilar)

---

### K-47 · Panelde şifremi unuttum
**21 Eylül 2026**

K-45'te panele kişisel hesaplar geldi ama şifre sıfırlama yoktu: şifresini
unutan biri başka bir sahibin ona yeni şifre atamasını bekliyordu, tek
sahipse hiç yolu yoktu. K-46'da o boşluk "en az bir açık sahip kalsın"
kuralıyla **kapatılmaya çalışıldı** — oysa asıl eksik olan sıfırlamaydı.
Bu karar onu ekliyor.

**Müşteri sıfırlamasıyla aynı mekanizma** (K-13, K-18): jetonun kendisi
değil SHA-256 özeti saklanıyor, bir saat yaşıyor, bir kez kullanılabiliyor
ve yeni bağlantı istenince eskisi siliniyor — eski bir e-postadaki bağlantı
aylarca açık kalmasın. Ayrı tablo (`AdminToken`) çünkü panel kimliği
müşteriden tamamen ayrı.

**Adresin kayıtlı olup olmadığı söylenmiyor.** Kayıtlı da olsa olmasa da
aynı ekran çıkıyor: "bu adrese ait bir panel hesabı varsa bağlantı
gönderildi". Yoksa bu form, panelde kimlerin hesabı olduğunu öğrenmenin
yolu olurdu. Deneme sayacı da aynı sebeple adresin özetine bakıyor (K-38),
ve sayaç anahtarı girişinkinden ayrı: sıfırlama denemeleri kimsenin
girişini kilitlemiyor.

**Jeton sayfa açılınca değil, form gönderilince harcanıyor.** E-posta
istemcilerinin bağlantıları önizlemek için açması jetonu tüketirdi ve
kullanıcı kendi bağlantısını hiç kullanamazdı.

**Sıfırlama bütün oturumları düşürüyor.** Sıfırlamanın sebebi çoğu zaman
"biri girmiş olabilir"; açık sekmelerin çalışmaya devam etmesi bunun
anlamını yok ederdi. Sonunda panele doğrudan alınmıyor, giriş ekranına
dönülüyor: yeni şifreyi bir kez yazmak hem gerçekten hatırlandığını
gösteriyor hem tarayıcının şifreyi kaydetmesine fırsat veriyor.

**E-posta servisi bağlı değilken sayfa yalan söylemiyor.** `RESEND_ANAHTARI`
tanımlı değilse (bugünkü durum, A-09) "gönderdik" denmiyor: sarı bir kutuda
servisin bağlı olmadığı, bu arada başka bir sahipten şifre atamasının
istenebileceği ve anahtar tanımlanınca sayfanın çalışmaya başlayacağı
yazıyor. Düğme de kapalı. Gitmeyecek bir bağlantıyı beklettirmek, hiç
sıfırlama olmamasından kötü.

**Middleware'de bulunan hata.** Tarayıcı denemesi `/yonetim/sifremi-unuttum`
adresinin giriş sayfasına yönlendirildiğini gösterdi: middleware yalnızca
`/yonetim/giris`'i korumanın dışında tutuyordu. Şifre sıfırlama tanımı
gereği giriş yapamayan biri için; üç sayfa da artık açık yollar listesinde.
Bu sayfalar zaten oturum açmış birini panele geri yolluyor.

**Denendi** (26 madde, sahte bir Resend sunucusu ile gerçek uçtan uca):
kayıtsız adres için de aynı ekranın çıkması ve posta gitmemesi, kayıtlı
adrese (büyük harfle yazılsa da) bağlantının gitmesi, bağlantı sayfasının
açılmasının jetonu harcamaması, kısa şifrenin reddedilip jetonun yanmaması,
eski şifrenin geçmeyip yenisinin çalışması, kullanılmış bağlantının
reddedilmesi, yeni istek gelince eski bağlantının geçersizleşmesi,
sıfırlamanın açık oturumu düşürmesi, uydurma ve eksik jetonun reddedilmesi,
giriş yapmışken sayfaların panele yollaması, JavaScript kapalı tarayıcıda
akışın tamamının çalışması. E-posta kapalıyken çıkan ekran ayrıca gözden
geçirildi.

**Nerede:** [`../server/yonetim-kimlik.ts`](../server/yonetim-kimlik.ts),
[`../app/yonetim/sifremi-unuttum`](../app/yonetim/sifremi-unuttum),
[`../app/yonetim/sifre-sifirla`](../app/yonetim/sifre-sifirla),
[`../middleware.ts`](../middleware.ts)

---

### K-48 · Dört eksik: 404, galeri, renk fotoğrafı, toplu sipariş işlemi
**21 Eylül 2026**

Kodda gezilip bulunan eksikler. İkisi hata, ikisi geliştirme.

**404 ve hata sayfaları yoktu.** `/olmayan-sayfa` açınca markanın üst
çubuğunun altında Next.js'in varsayılan ekranı çıkıyordu: "404 — This page
could not be found." Türkçe değil, çıkış yolu yok. Yanlış yazılmış bir
adres, kaldırılmış bir ürün ve süresi dolmuş bir kampanya bağlantısı hep
buraya düşüyor. Artık Türkçe, arama kutusu ve kategori bağlantıları var.
`error.tsx` de eklendi: beklenmedik hatada "siparişin kaybolmadı" yazıyor ve
sipariş takibine bağlanıyor — hatanın kendi metni yazılmıyor, teknik ayrıntı
içerebilir; yalnızca destek konuşmasında işe yarayan hata kimliği var.

Panelin kendi 404'ü ayrı ve menüsünün içinde: silinmiş bir kaydın adresine
tıklayan mağaza sahibi çerçeveden çıkmıyor.

**İki kopya, tek gövde.** `app/not-found.tsx` mağaza çerçevesini elle
çiziyor (grubun dışında), `app/(magaza)/not-found.tsx` çizmiyor (grubun
düzeni zaten çiziyor). Tek kopyayla başlanmıştı ve tarayıcı denemesi **üst
çubuğun iki kez basıldığını** gösterdi: `/olmayan-sayfa` aslında
`[kategori]` yoluna uyuyor, oradan çağrılan `notFound()` kök kopyayı grubun
düzeninin **içinde** çiziyordu.

**Panel oturumları birikiyordu.** Günlük temizlik ödemeleri, yükleme
kayıtlarını ve giriş sayaçlarını süpürüyordu ama süresi geçmiş
`AdminSession` ve harcanmış `AdminToken` satırlarına kimse dokunmuyordu
(K-45 ve K-47'de eklenmişlerdi). Aynı işe bağlandı.

**Ürün fotoğrafı büyümüyordu**, üstelik küçük görsellere basılamıyordu bile:
büyük kare hep ilk fotoğraf kalıyordu. Kıyafet alırken kumaşın dokusuna
yakından bakmak satın alma kararının kendisi. İkisi de `:target` ile
çözüldü — küçük görsel bir `#kare-...` bağlantısı, büyüteç `#buyuk-...`.
**JavaScript yok**: tarayıcının kendi işi, geri tuşu çalışıyor, bağlantı
paylaşılabiliyor. Hangi karenin görüneceğine CSS `:has()` karar veriyor:
hiçbiri hedef değilse ilk kare.

Denemede bulunan ayrıntı: **büyütülmüş resme basınca kapanmıyordu.**
Yalnızca kenardaki zemin kapatıyordu; telefonda kare ekranı kaplayınca
basacak yer kalmıyordu. Resim de kapatma bağlantısının içine alındı.

**Renk seçilince fotoğraf değişmiyordu.** `ProductImage` ürüne bağlıydı,
varyanta değil: müşteri "Mavi" seçiyor, ekranda krem fotoğraf duruyordu.
Fotoğrafa `renk` alanı eklendi; boş bırakılan kareler (kumaş yakın çekimi,
etiket, ölçü kartı) her renkte görünmeye devam ediyor — onlar ürünün
kendisini anlatıyor, rengini değil. Seçilen renge ait hiç fotoğraf yoksa
hepsi gösteriliyor: boş bir galeri hiç fotoğraf olmamasından kötü.

**Renk artık adres satırında.** Eskiden istemci durumundaydı; galeri sunucuda
çizildiği için oradan haberi olamazdı. Şimdi `?renk=mavi`: seçim
JavaScript kapalıyken de çalışıyor (önceden çalışmıyordu) ve "mavisi" diye
bağlantı paylaşılabiliyor. Beden istemci durumunda kaldı — fotoğrafı
değiştirmiyor. Adresten gelen değer ürünün kendi renkleriyle doğrulanıyor.

**Sipariş listesinde toplu işlem yoktu.** Yirmi siparişi kargoya verirken her
birine tek tek girmek gerekiyordu. Onay kutuları ve tek düğme geldi:
"Hazırlanıyor / Kargoda / Teslim edildi yap" ve "Etiketleri yazdır". Hepsi
düz HTML — yazdırma düğmesi `formMethod="get"` ile ayrı sayfaya gidiyor ve
seçilenleri adres satırında taşıyor, yani JavaScript gerekmiyor.

**Ödeme durumu ve iptal toplu yapılmıyor.** Havale onayı siparişe bakmayı
gerektiren bir karar; iptal ayrıca stoğu geri veriyor. Toplu işlemde
"yanlışlıkla hepsini seçtim" hatası bunlarda pahalı.

Kargo etiketi ortak bir parçaya çıkarıldı (`ui/kargo-etiketi.tsx`): tek
etiket sayfası da toplu yazdırma da aynı düzeni kullanıyor, iki yerde iki
ayrı etiket bakımı imkânsız hale getirirdi. Toplu sayfada her etiket kendi
kâğıdına basılıyor, tek seferde en fazla elli tane.

**Denendi** (44 madde): 404'ün Türkçe olması, tek çerçeve basması ve
arama kutusunun gerçekten arama yapması; panel 404'ünün menü içinde
çıkması; galeride küçük görselin büyük kareyi değiştirmesi, büyütecin
açılıp kapanması ve büyük resmin gerçekten büyük olması; renk seçiminin
adrese yazılması ve uydurma rengin sayfayı bozmaması; panelde renk
atandıktan sonra vitrinde doğru karelerin süzülmesi ve fotoğrafsız renkte
hepsinin gösterilmesi; toplu işlemin seçimsizken uyarması, siparişlerin
durumunu gerçekten değiştirmesi ve süzgeci koruması; toplu etiketin seçilen
kadar etiket ve barkod basması. Galeri ve renk seçimi JavaScript kapalı
tarayıcıda ayrıca denendi.

**Nerede:** [`../app/not-found.tsx`](../app/not-found.tsx),
[`../app/error.tsx`](../app/error.tsx),
[`../ui/urun-galerisi.tsx`](../ui/urun-galerisi.tsx),
[`../ui/kargo-etiketi.tsx`](../ui/kargo-etiketi.tsx),
[`../app/yonetim/(panel)/siparisler/etiketler`](../app/yonetim/(panel)/siparisler/etiketler)

---

### K-49 · Tükenmiş seçenekler: üstü çizili, ama doğru olanı
**21 Eylül 2026**

Ürün sayfasında tükenmiş bedenin üstü zaten çiziliydi — ama **yanlış bilgi
veriyordu.** Çizgi bütün renklere bakarak hesaplanıyordu: "Mavi" seçiliyken
yalnızca kremde kalan bir beden açık görünüyor, basınca "bu seçim tükendi"
diyordu. Yanlış bilgi veren bir işaret, hiç işaret olmamasından kötü. Artık
**seçili renge** göre hesaplanıyor.

Seçili bedenin kendisi tükendiyse o da çizili: eskiden seçili olan madde
mercan rengine geçtiği için çizgiyi kaybediyordu, yani tam bakılan yerde
işaret kayboluyordu.

**Renk seçeneklerinde sadece soluklaştırma vardı** ve belirsizdi: soluk
olması "seçili değil" mi demek "yok" mu? Yuvarlak bir renk örneğine üstü
çizili yapılamıyor; karşılığı çapraz çizgi. Çizgi iki katmanlı — altta
beyaz, üstte koyu — çünkü hem krem hem lacivert örneğin üstünde görünmesi
gerekiyor.

**Renk ve çizgi tek başına yetmiyor.** Her iki işaret de ekran okuyucuya
ayrıca söyleniyor ("— tükendi") ve fare üstüne gelince hangi beden/renkte
tükendiği yazıyor. Renkle ya da biçimle verilen bilgi, metinle de
verilmeliydi.

**Listede kart.** Tükenmiş ürün yalnızca en alttaki kapalı düğmeden
anlaşılıyordu; ızgarada göz önce fotoğrafa gidiyor. Fotoğrafın sağ üstüne
"Tükendi" rozeti kondu ve fotoğraf soluklaştı. Rozet tek başına küçük
ekranda gözden kaçıyordu.

**Fiyatın üstü çizilmedi.** Üstü çizili fiyat e-ticarette "indirimden önceki
fiyat" demek; stok bilgisi için kullanmak, kampanya sanılmasına yol açardı.
Zaten kampanyalı üründe gerçek bir üstü çizili fiyat var, ikisi aynı kartta
çakışırdı.

**Tükenmiş seçenek tıklanabilir kalıyor.** Kapatmak kolay olurdu ama
"stoka girince haber ver" formu oradan açılıyor (K-28): müşteri tükenmiş
bedeni seçebilmeli ki adresini bırakabilsin.

**Denendi** (11 madde): kremde hiçbir bedenin çizili olmaması, mavide
yalnızca tükenmiş iki bedenin çizili olması, seçili tükenmiş bedenin de
çizili kalması, tükenmiş rengin çapraz çizgi alması ve ekran okuyucuya
söylemesi, çizginin gerçekten çizilmesi (hesaplanmış stille), kartta
"Tükendi" rozetinin çıkması.

**Nerede:** [`../ui/varyant-secici.tsx`](../ui/varyant-secici.tsx),
[`../ui/urun-karti.tsx`](../ui/urun-karti.tsx),
[`../app/globals.css`](../app/globals.css)

---

### K-50 · Panel menüsünde grup başlıkları ve açık sayfa işareti
**21 Eylül 2026**

Menü gruplandırılmıştı (K-43) ama başlıklar görevlerini yapmıyordu: maddelerin
arasında kaybolan soluk bir satırdılar ve gruplar birbirinden ayrılmıyordu.
Açık sayfanın soluk mercan dolgusu da silikti.

**Başlık rengi WCAG eşiğinin altındaydı.** `metin-3` (`#9b9289`) açık temada
zemine karşı **2,99:1** veriyordu; eşik 4,5. Küçük punto ve büyük harf bunu
daha da zorlaştırıyordu. `metin-2`'ye çıkarıldı: **5,62:1** (koyu temada
4,71 → 8,38).

**Renk farkı tek başına "yeni grup başlıyor" demiyor.** Her grubun üstüne
ayırıcı çizgi kondu ve araları açıldı. Ölçüldüğünde görülen şey şuydu: göz
listeyi tararken başlığı bir madde sanıyordu, çünkü aralarındaki tek fark
bir ton farkıydı.

**Açık sayfa artık sol kenarı düz, kalın mercan çubuklu bir sekme.** İlk
denemede çubuk yuvarlak kenarlı hapın soluna kondu ve **hilale dönüştü** —
çubuk olduğu anlaşılmıyordu; sol kenar düzleştirildi.

**Açık sayfanın yazısı koyu, mercan değil.** Mercan yazı (`#c2433a`) soluk
mercan dolgunun üstünde **4,39:1** veriyordu — eşiğin binde birkaç altında.
Kimliği zaten çubuk ve dolgu taşıyor; yazının okunur olması daha önemli.
Koyu yazı **11,54:1** (koyu temada 12,98).

"Mağazayı gör" de kendi ayırıcı çizgisini aldı: mağazaya çıkmak bir ayar
maddesi değil, ama çizgisiz hâlde "Ayarlar"ın son maddesi gibi duruyordu.

**Denendi** (20 madde, iki temada da): dört grup başlığının çıkması,
başlık kontrastının 4,5'i geçmesi (hesaplanmış renklerden ölçülerek),
grupların ayırıcı çizgisinin gerçekten çizilmesi, açık sayfanın tek olması,
sol çubuğun 3 piksel ve mercan olması, yazının kalın olması ve
kontrastının eşiği geçmesi, pasif maddede çubuk olmaması. Telefonda
açılır menüde de başlıklar ve işaret duruyor.

**Nerede:** [`../app/yonetim/(panel)/layout.tsx`](../app/yonetim/(panel)/layout.tsx)

---

### K-51 · Düzen istemci gezinmesinde çizilmiyor: iki sonucu vardı
**21 Eylül 2026**

Panelde bir menü maddesine tıklayınca **başka bir madde** işaretli
kalıyordu. Sebebi tek bir gerçek: **Next.js istemci tarafı gezinmede
düzeni yeniden çizmiyor.** Düzenin varlık sebebi zaten bu — sayfalar
arasında korunan çerçeve. Ama iki şey bu yanılgının üstüne kurulmuştu.

**Birincisi, açık sayfa işareti.** Yol middleware'in eklediği
`x-yonetim-yol` başlığından okunuyordu (K-43). Düzen ilk açılışta bir kez
çizildiği için işaret ilk girilen sayfada donuyordu; ancak sayfa
yenilenince düzeliyordu. Ölçülen hâli:

```
tam yükleme /yonetim/urunler   -> işaretli: Ürünler
tıklayıp    /yonetim/stok      -> işaretli: Ürünler   ← yanlış
tıklayıp    /yonetim/talepler  -> işaretli: Ürünler   ← yanlış
yenileyince                    -> işaretli: Talepler
```

Menü istemci bileşenine alındı ve `usePathname()` kullanıyor: router
durumuna abone, her gezinmede yeniden çalışıyor. Sunucuda çizilirken de o
anki yolu veriyor, yani ilk boyamada işaret doğru ve JavaScript kapalı
tarayıcıda da doğru (orada her tıklama zaten tam sayfa yüklemesi).
Middleware'in başlığı kaldırıldı. Menü yapısı ve sayaçlar sunucuda
hesaplanıp aşağı veriliyor — veritabanına bakan hiçbir şey tarayıcıya
inmiyor.

**İkincisi, ve asıl ciddi olanı: oturum kontrolü.** Aynı sebeple
`yoneticiGerekli()` de yalnızca ilk istekte çalışıyordu. Oturumu düşen
biri — süresi dolmuş ya da hesabı kapatılmış — **menüden tıklayarak
sayfaları görmeye devam ediyordu.** Yazma işlemleri engelleniyordu (her
server action ayrıca kontrol ediyor, K-45) ama okuma sızıyordu: siparişler,
müşteri adresleri, satış raporu.

Denenerek doğrulandı: oturum veritabanından silindikten sonra menüden
tıklayınca sayfa açılmaya devam etti. Kapatmanın "açık oturumları anında
düşürdüğü" iddiası (K-45) tam sayfa yüklemesi için doğruydu, istemci
gezinmesi için değildi.

**Kontrol her sayfaya kondu.** `/yonetim` altındaki yirmi üç sayfanın
hepsi `yoneticiGerekli()` ile başlıyor; route handler'lar zaten
çağırıyordu (K-45), server action'lar da. `yoneticiGetir` istek
önbelleğine alındı: düzen de sayfa da çağırdığı hâlde veritabanına bir kez
gidiliyor.

**Unutulmasına karşı tarama.** "Her sayfada olsun" bir kural değil, bir
umut — yeni sayfa eklerken atlanır. Deneme panelin bütün adreslerini tek
tek geziyor ve oturumsuz hiçbirinin açılmadığını doğruluyor; yeni bir
sayfa eklenip kontrolü unutulursa deneme düşüyor.

**Denendi** (14 madde): tam yüklemede işaretin doğru olması, menüden beş
ayrı sayfaya tıklandığında her adımda işaretin yeni sayfaya geçmesi,
telefonda kapalı menü başlığının da güncellenmesi, alt sayfanın üst
maddeyi işaretlemesi, geri tuşundan sonra doğru kalması, JavaScript kapalı
tarayıcıda doğru olması; oturum düşürüldükten sonra istemci gezinmesinin
giriş sayfasına atması ve panelin yirmi bir adresinin artı parametreli iki
adresin hiçbirinin açılmaması.

**Nerede:** [`../ui/panel-menu.tsx`](../ui/panel-menu.tsx),
[`../ui/panel-menu-bicim.ts`](../ui/panel-menu-bicim.ts),
[`../app/yonetim/(panel)/layout.tsx`](../app/yonetim/(panel)/layout.tsx),
[`../server/yonetim-kimlik.ts`](../server/yonetim-kimlik.ts),
[`../middleware.ts`](../middleware.ts)

---

### K-52 · Ürün silme, kategori silme ve "ekleme nerede"
**21 Eylül 2026**

Panelde üç şeyin eksik olduğu söylendi. Bakınca üçü de ayrı çıktı: biri
gerçekten yoktu, ikisi vardı ama **ekranda yokmuş gibi duruyordu.** Bir
özelliğin bulunamaması, olmamasıyla aynı şey.

**Ürün silme gerçekten yoktu.** Ürün pasif yapılabiliyordu ama silinemiyordu.
Eklendi ve iki soru cevaplandı:

*Sipariş geçmişi ne oluyor?* Hiçbir şey. Sipariş satırı ürünün adını,
adresini, bedenini ve rengini **kendi içinde kopya tutuyor**; varyant
bağlantısı `SetNull` ile kopuyor. Beş yıl önce satılmış bir ürün silinse
bile eski sipariş aynı görünüyor — muhasebe ve cayma hakkı kayıtları için
gereken bu.

*Peki ne kayboluyor?* Değerlendirmeler, fotoğraflar (dosyaları da depodan
siliniyor, yoksa öksüz kalırlardı) ve siparişten ürün sayfasına giden
bağlantı. Bu yüzden **satılmış bir ürünü silmek için kutuya SİL yazmak
gerekiyor**; hiç satılmamış ürün doğrudan siliniyor. Kutunun başlığında
hangisi olduğu açmadan yazıyor: "5 siparişte geçti — silmek yerine pasif
yapabilirsin".

**Kategori silme vardı ama düğmesi hep kapalıydı.** İçinde ürün olan
kategori silinemiyordu ve bütün kategorilerde ürün vardı, yani düğme hiçbir
zaman açılmıyordu. Kapalı bir düğme "yapamazsın" diyor ama "ne yapmalısın"ı
söylemiyor; açıklama sayfanın tepesinde, düğmeden uzaktaydı.

Artık dolu bir kategorinin "Sil"i açılıyor ve **ürünlerin nereye taşınacağını
soruyor**. Taşıma ve silme tek veritabanı işleminde: yarısı olup yarısı
olmasın, ürün kategorisiz kalmasın. Boş kategoride eskisi gibi düz bir
"Sil" düğmesi var.

**Banner ve duyuru eklemesi katlanmıştı.** K-44'te uzun sayfaları kısaltmak
için "Yeni banner" formu `<details>` içine alınmıştı — doğru karardı ama
başlığı bir **bölüm adı** gibi duruyordu, eylem gibi değil. Üç şey değişti:
başlığın soluna mercan artı işareti kondu, adı "Yeni banner **ekle**" oldu,
ve listenin başlığına "+ Yeni banner" bağlantısı eklendi. Ayrıca **hiç kayıt
yokken bölüm açık geliyor**: boş bir listeyle karşılaşan kişinin yapacağı
tek şey zaten eklemek.

**Denendi** (28 madde): banner ekleme bağlantısının bölümü açması, banner'ın
gerçekten eklenip listede görünmesi ve silinmesi; satılmamış ürünün onay
istemeden silinmesi, satılmış ürünün uyarı ve onay kutusu göstermesi, yanlış
onayla silinmemesi; boş kategoride düz silme, dolu kategoride hedef
seçicinin çıkması, hedefsiz gönderimin reddedilmesi, taşı-ve-sil sonrası
ürün sayısının değişmemesi ve hiçbir ürünün kategorisiz kalmaması.

Denemede iki seçici tuzağı çıktı, ikisi de not edildi: her satırdaki taşıma
listesi **bütün kategori adlarını** içerdiği için satırı adından seçmek
neredeyse her satıra uyuyor (slug'dan seçiliyor), ve Playwright'ın
`has-text`'i alt dizge aradığı için "Taşı ve sil" düğmesi "Sil" aramasına
uyuyor (tam eşleşme kullanılıyor).

**Nerede:** [`../server/yonetim.ts`](../server/yonetim.ts),
[`../ui/urun-silme.tsx`](../ui/urun-silme.tsx),
[`../app/yonetim/(panel)/kategoriler`](../app/yonetim/(panel)/kategoriler),
[`../ui/katlanir.tsx`](../ui/katlanir.tsx)

---

### K-53 · Ürün listesinde toplu işlem, silme bölümü en altta
**21 Eylül 2026**

**"Ürünü sil" fotoğrafların üstündeydi.** Sayfada yukarıdan aşağı doğru
sıra şuydu: ürün bilgileri → bedenler ve stok → **silme** → fotoğraflar.
Geri alınamayan bir işlem, günlük olarak kullanılan bir bölümün üstünde
duruyordu. En alta alındı; sayfayı aşağı kaydırırken silme düğmesine
rastlamak yerine, oraya gitmek için kasten inmek gerekiyor.

**Listede toplu işlem yoktu.** Sekiz ürünü pasife almak sekiz sayfa
açmaktı. Onay kutuları ve tek satırlık bir çubuk geldi: **Pasife al**,
**Yayına al**, **Sil**. Sipariş listesindekiyle aynı kalıp (K-48), düz
HTML, JavaScript gerekmiyor. Süzgeç korunuyor: "Fotoğrafsız" listesinden
yapılan işlem aynı süzgece dönüyor.

**Toplu silme satılmış ürünü silmiyor, atlıyor.** Tek tek silerken kutuya
SİL yazmak gerekiyor (K-52) — toplu işlemde böyle bir onay yok ve on ürün
seçip yanlışlıkla basmak kolay. O yüzden siparişte geçmiş ürünler
silinmiyor. Ama **sessizce değil sayılarak**: "2 ürün silindi. 1 ürün
siparişte geçtiği için atlandı — onları ürün sayfasından tek tek
silebilirsin." Kaç tanesinin atlandığını söylemeyen bir işlem, kullanıcıyı
"acaba oldu mu" diye listede aramaya bırakırdı.

Aynı sebeple **ödeme ve iptal gibi kararlar toplu işlemde yok** (K-48'deki
sipariş listesiyle aynı çizgi): toplu işlem, tek tek yapıldığında zaten
onay gerektirmeyen şeyler için.

**Denendi** (22 madde): silme bölümünün sayfadaki son öğe olması ve
fotoğraflardan sonra gelmesi; seçimsiz işlemin uyarması; toplu pasife alma
ve yayına almanın veritabanına gerçekten yazması; iki satılmamış ve bir
satılmış ürün seçildiğinde ikisinin silinip birinin atlanması, atlananın
bildirimde yazması ve satılmış ürünün yerinde durması; süzgecin
korunması; JavaScript kapalı tarayıcıda toplu işlemin çalışması.

**Nerede:** [`../server/yonetim.ts`](../server/yonetim.ts),
[`../app/yonetim/(panel)/urunler/page.tsx`](../app/yonetim/(panel)/urunler/page.tsx),
[`../app/yonetim/(panel)/urunler/[slug]/page.tsx`](../app/yonetim/(panel)/urunler)

---

### K-54 · Ödemesi tamamlanmamış siparişe belge basılmıyor

Panelde her siparişin yanında "Etiketi yazdır", "Fatura oluştur" ve
"Faturayı yazdır" duruyordu — ödemesinin gelip gelmediğine bakılmaksızın.
İkisi de farklı sebeple ciddi:

- **Kargo etiketi basmak "bunu gönderiyorum" demek.** Havalesi gelmemiş bir
  siparişi kargoya vermek, parayı hiç almamak demek. Mağazanın yapabileceği
  en pahalı hata ve yapması tek tıklama kadar kolaydı.
- **Fatura satışın belgesi.** Ödenmemiş siparişe kesilen fatura, olmamış bir
  satışı belgeliyor; muhasebede düzeltmesi zahmetli.

İptal edilmiş siparişte de ikisi geçerli: orada zaten satış yok.

**Kural tek yerde:** [`../server/siparis-belge.ts`](../server/siparis-belge.ts)
içindeki `belgeBasilabilirMi()`. Dört yer de buraya soruyor — sipariş
ayrıntısı (bağlantılar ve "Fatura oluştur" düğmesi), tek etiket sayfası,
fatura sayfası, toplu etiket sayfası — ve `faturaHazirla` server action'ı.
Kuralı sayfa başına kopyalamak, sonradan eklenen beşinci bir yerin onu
atlaması demekti.

**Görünmeyen bağlantı koruma değildir.** Düğmenin çıkmaması kullanıcı
arayüzü; adres çubuğuna elle yazılabiliyor, yer imine alınabiliyor, eski bir
sekmede açık kalabiliyor. Üç belge sayfası da kendisi kontrol ediyor ve
reddederken sebebini yazıyor
([`../ui/belge-engeli.tsx`](../ui/belge-engeli.tsx)). Aynı sebeple
`faturaHazirla` formu dışarıdan gönderilse de fatura kesilmiyor.

**Toplu etikette sessizce düşürmek yok.** Elli sipariş işaretleyip
yazdırırken ödemesi gelmemiş bir tanesinin araya karışması en olası yer.
O etiketler basılmıyor, ama kaç tanesinin ve hangi numaraların atlandığı
sayfanın başında yazıyor — sessizce eksik basmak, kişinin elinde eksik bir
deste olduğunu fark etmemesi demekti.

Reddetme metni ne yapılacağını da söylüyor: "Havale geldiyse sipariş
ekranından ödeme durumunu Ödendi yap."

**Denenen:** ödenmemiş siparişte bağlantıların çıkmaması; etiket, fatura ve
toplu etiket sayfalarının adres elle yazıldığında reddetmesi; iptal
siparişin reddedilmesi; ödenmiş siparişte hepsinin çalışması; karışık toplu
seçimde yalnızca ödenmişlerin basılıp atlananların numarasının yazılması;
JavaScript kapalı tarayıcıda da reddedilmesi.

**Nerede:** [`../server/siparis-belge.ts`](../server/siparis-belge.ts),
[`../ui/belge-engeli.tsx`](../ui/belge-engeli.tsx),
[`../app/yonetim/(panel)/siparisler`](../app/yonetim/(panel)/siparisler),
[`../server/yonetim.ts`](../server/yonetim.ts)

---

### K-55 · Toplu işlem çubuğu, beden tablosu, fotoğraf dönüşü

Üç küçük düzeltme; üçü de "işin yapıldığı yerde kal" ile ilgili.

**1. Toplu işlem çubuğu yalnızca seçim varken.** "Seçilenleri: pasife al /
sil / etiketleri yazdır" çubuğu hiçbir şey seçili değilken de duruyordu.
Basıldığında "önce listeden ürün seç" diyen bir düğme dizisi, sürekli
görünen bir hata mesajı gibiydi; üstelik "sil" düğmesi hep gözün önündeydi.
Çubuk artık formda işaretli bir kutu varken çıkıyor.

Kural CSS'te, `:has()` ile — JavaScript yok:

```css
@supports selector(form:has(input:checked)) {
  form:has(input[name="secili"]) .toplu-cubuk { display: none; }
  form:has(input[name="secili"]:checked) .toplu-cubuk { display: flex; }
}
```

`@supports` sarmalı şart. Gizlemeyi varsayılan yapıp göstermeyi `:has()`e
bırakmak, `:has()` desteklemeyen eski bir tarayıcıda çubuğu tamamen
erişilemez kılardı. Böyle yazılınca o tarayıcılarda hiçbir kural uygulanmıyor
ve çubuk eskisi gibi hep görünüyor: kötüleşen tek şey görünüm.

**2. Beden tablosu panelde.** "18-24 ay kaç kilo?" telefonla gelen soru; cevap
için mağazanın beden rehberi sayfasını ayrı bir sekmede açmak gerekiyordu.
Tablo artık ürün düzenlemedeki "Bedenler ve stok" bölümünde ve stok
ekranında da var, katlı `<details>` içinde — her gün değil, sorulunca
bakılıyor. Rakamlar tek kaynaktan (`BEDEN_OLCULERI`) geliyor: panelde yazan
ölçüyle müşterinin gördüğü ölçü ayrışamıyor. Mağazadaki rehber sayfası da
aynı bileşeni kullanıyor artık
([`../ui/beden-tablosu.tsx`](../ui/beden-tablosu.tsx)).

**3. Fotoğraf işlemleri `#fotograflar`'a dönüyor.** Fotoğraf silme, taşıma ve
ad kaydetme düğmeleri ürün sayfasının en altındaki fotoğraf bölümünde; işlem
bitince tarayıcı sayfanın en başına gidiyordu. Ürün sayfası uzun (bölüm
sayfa başından ~2400 px aşağıda), yani üç fotoğrafı silmek üç kez aşağı
kaydırmak demekti. Yönlendirmelere `#fotograflar` eklendi; bölümün `id`'si
zaten vardı.

**Denenen:** çubuğun seçim olmadan gizli, seçilince görünür olması (ürünler
ve siparişler, JavaScript açık ve kapalı); beden tablosunun iki panel
ekranında açılması ve ölçülerin görünmesi; fotoğraf işlemi sonrası adresin
`#fotograflar` ile dönmesi ve sayfanın fotoğraf bölümünde kalması
(scrollY 2342, bölüm başı 2448).

**Nerede:** [`../app/globals.css`](../app/globals.css),
[`../ui/beden-tablosu.tsx`](../ui/beden-tablosu.tsx),
[`../ui/urun-formu.tsx`](../ui/urun-formu.tsx),
[`../app/yonetim/(panel)/stok/page.tsx`](../app/yonetim/(panel)/stok/page.tsx),
[`../server/yonetim.ts`](../server/yonetim.ts)

---

### K-56 · Bedenler koddan veritabanına

Beden listesi kodda sabit bir dizindi ve beden adı bir TypeScript tipiydi:

```ts
export const BEDENLER = ["0-3 ay", …, "18-24 ay"] as const;
export type Beden = (typeof BEDENLER)[number];
```

Derleme zamanı güvenliği hoştu: yanlış yazılmış bir beden adı derlenmiyordu.
Ama mağazayı işleten kişi "24-36 ay" ekleyemiyordu — kod değişikliği, yeniden
dağıtım ve benim burada olmam gerekiyordu. Ölçüleri kendi kalıplarına göre
düzeltmek de aynı şekilde. Kategoriler, kampanyalar, banner ve yasal metinler
gibi **beden de katalog verisi**; panelden yönetilmesi gerekiyor.

Artık `Size` tablosunda: ad, boy, kilo, sıra, açık/kapalı ve yaş grubu.
Göç, kodda duran altı bedeni aynı ölçülerle tabloya taşıyor — yani göçten
sonra mağaza ve panel hiçbir fark görmüyor, sadece artık düzenlenebiliyorlar.

**Varyantlar bedene metinle bağlı, yabancı anahtarla değil.** `ProductVariant`
ve `OrderItem` bedenin adını metin olarak tutmaya devam ediyor. Sebebi
sipariş geçmişi: satılan şeyin kaydı sonradan değişmemeli (K-19'daki
gerekçenin aynısı). Beden adı değiştirilince **açık varyantlar aynı işlem
içinde** güncelleniyor, sipariş satırları güncellenmiyor. İkisi ayrı
yapılsaydı arada düşen bir istek ürünleri artık var olmayan bir beden adında
bırakırdı.

**Sıra listenin kendisinde.** Beden alfabetik değil: "12-18 ay", "3-6 ay"dan
sonra gelmeli. Eskiden sıra dizinin yazılış sırasıydı; artık `sira` sütunu ve
ok düğmeleriyle değiştiriliyor. Sıra ürün sayfasında, stok ekranında,
süzgeçte ve beden tablosunda tek yerden geliyor.

**Sıralama işlevleri senkron kaldı.** `urunYap()` gibi saf dönüştürücüler
veritabanına bakmıyor; beden sırasını `Map<string, number>` olarak çağırandan
alıyorlar. Her birini async yapmak katalog kodunun yarısını bulaştırırdı.
Listede olmayan bir beden (elle girilmiş eski bir kayıt) sona düşüyor,
kaybolmuyor.

**Kullanılan beden silinmiyor, kapatılıyor.** Silmek o bedendeki varyantları
sahipsiz bırakırdı. Kapatmak mağazada görünmez yapıyor, stoka dokunmuyor ve
geri alınabiliyor. Ekran bunu düğmeyi gizleyerek değil **sebebini yazarak**
söylüyor: "Üründe kullanılıyor — silmek yerine kapat." Her bedenin yanında
kaç varyantta geçtiği ve toplam stoğu yazıyor; silinebilir mi sorusunun
cevabı orada.

**Son açık beden kapatılamıyor**: bedeni olmayan mağazada hiçbir ürün
satılamaz.

**Yaş grupları kodda kaldı, üyelik bedene taşındı.** `YAS_GRUPLARI`
(Yenidoğan, Bebek, Yürüyen) ana sayfadaki kutular ve süzgeç etiketleri —
vitrin dili. Hangi bedenin hangi gruba girdiği ise beden kaydında
(`Size.yasKodu`). Bedenler listesi grup tanımında kalsaydı panelden eklenen
bir beden hiçbir gruba giremezdi. Grubu boş bırakılan beden yaş süzgecinde
çıkmıyor ama her yerde normal çalışıyor; panel bunu yazıyor.

Bedenler `ETIKETLER.beden` ile paylaşılan önbellekte; panelden bir değişiklik
yapılınca etiket düşüyor ve mağaza beklemeden görüyor.

**Denenen:** menüden ulaşım; listede kullanım sayısı ve stok; ekleme; aynı
adın reddedilmesi; yeni bedenin beden rehberinde, katalog süzgecinde, ürün
formunun beden listesinde ve panel beden tablosunda görünmesi; ok düğmeleriyle
sıra değiştirme; ad değiştirme; kullanılmayan bedenin silinmesi; kullanılan
bedende silme yerine uyarı çıkması; kapatılan bedenin mağazadan düşüp stoğun
durması; JavaScript kapalı tarayıcıda ekleme ve silme. Ayrıca **kullanımdaki
bir bedenin adı değiştirildiğinde** 30 varyantın yeni ada taşınması ve 5
sipariş satırının olduğu gibi kalması veritabanından doğrulandı.

**Nerede:** [`../db/schema.prisma`](../db/schema.prisma),
[`../server/bedenler.ts`](../server/bedenler.ts),
[`../server/yonetim-beden.ts`](../server/yonetim-beden.ts),
[`../app/yonetim/(panel)/bedenler/page.tsx`](../app/yonetim/(panel)/bedenler/page.tsx),
[`../ui/beden-tablosu.tsx`](../ui/beden-tablosu.tsx),
[`../ui/katalog-bicim.ts`](../ui/katalog-bicim.ts),
[`../server/katalog.ts`](../server/katalog.ts)

---

### K-57 · Ödenmiş siparişin iptali, sessiz işlemler ve yapışkan kaydet

Üç ayrı iş; ortak yanları panelde çalışan kişinin ne olduğunu bilmesi.

#### 1. Ödenmiş sipariş iptal edilince para kaydı siliniyordu

`siparisiIptalEtVeStoguIadeEt()` siparişi iptal ederken ödeme durumunu
koşulsuz `bekliyor` yapıyordu. İşlev iki yerden çağrılıyor ve ikisi aynı şey
değil:

- **Kart ödemesi tutmadığında** — para hiç alınmadı, `bekliyor` doğru.
- **Müşterinin iptal talebi onaylandığında** — sipariş `odendi` olabiliyor,
  havalesi gelmiş olabiliyor.

İkincisinde alınmış paranın kaydı siliniyordu: ekranda "ödeme bekliyor"
yazıyordu, kimse müşteriye iade etmesi gerektiğini bilmiyordu. Sessiz bir
veri kaybı, üstelik parayla ilgili olanı.

Yeni bir ödeme durumu eklendi: **`iade-bekliyor`** — *parası alındı, sipariş
iptal/iade edildi, mağazanın müşteriye borcu var.* Ödenmemiş siparişin iptali
eskisi gibi `bekliyor`a düşüyor. Ödeme durumu iptalden **önce** okunuyor;
sonrası çok geç.

Rozet renkleri de buna göre: `iade-bekliyor` mercan (yapılacak iş var),
`iade` gri (para gitti, dosya kapandı). Eskiden `iade` de mercandı, yani
biten iş bekleyen iş gibi duruyordu.

#### 2. Sessiz işlemler

Panelde bir sürü işlem hiçbir şey söylemeden bitiyordu — ne yönlendirme, ne
mesaj: kampanya silme, banner silme, duyuru silme, hepsinin aç/kapat
karşılığı, kategori ve fotoğraf sıra değiştirme. Kampanyayı siliyordun,
ekranda hiçbir şey olmuyordu; sildiğini anlamanın tek yolu listeye dikkatle
bakmaktı. Yanlış satıra bastıysan hiç anlamıyordun.

Üç kural kondu:

1. **Her işlem sonucunu söylüyor.** Aç/kapat, sil, sırala — hepsi ne olduğunu
   yazan bir bildirimle dönüyor.
2. **Metin koddan geliyor, adres satırından değil.** Adres yalnızca bir kod
   taşıyor (`?kayit=silindi`); cümle sayfadaki haritadan seçiliyor. Yoksa biri
   `?kayit=<istediği yazı>` bağlantısı hazırlayıp panelde istediğini
   gösterebilirdi — aynı gerekçe giriş ekranında da yazılıydı (K-45). Sayı
   taşımak serbest: "kaç ürün taşındı" cümlesi sayfada tamamlanıyor.
3. **Bulunamayan kayıt sessizce dönmüyor.** `if (!id) return;` kalıbı her
   yerdeydi: bozuk ya da yarışmış bir istek hiçbir şey yapmadan bitiyordu.
   Artık "kayıt bulunamadı — başka biri silmiş olabilir" diyor.

Ortak bir bildirim bileşeni çıktı
([`../ui/panel-bildirim.tsx`](../ui/panel-bildirim.tsx)); sekiz sayfada aynı
JSX tekrarlanıyordu.

**Yıkıcı işlemler artık onay istiyor.** Kampanya, banner, duyuru, beden ve
varyant silme tek tıkla ve geri dönüşsüzdü; "Sil" düğmesi "Kapat"ın hemen
yanındaydı. Onay `<details>` ile
([`../ui/silme-onayi.tsx`](../ui/silme-onayi.tsx)): JavaScript gerekmiyor,
klavyeyle açılıyor, sitenin geri kalanıyla aynı dilde — `confirm()` kutusu
değil. Açılan kutuda **ne olacağı** yazıyor ("stoğu da siliniyor",
"sepetlerde uygulanmayacak") ve kapatılabilir şeylerde ikinci çıkış yolu
gösteriliyor: çoğu zaman istenen şey silmek değil, yayından kaldırmak.

Fotoğraf yükleme hatasının ayrıntılı metni adres satırında taşınmaya devam
ediyor. Kuralın istisnası: o metinler teşhis için yazılmıştı (Vercel depo
bağlantısı hatası bütün bir hata ayıklamayı kurtarmıştı) ve sayfa kimlik
doğrulamasının arkasında. Kodla değiştirmek teşhis değerini yok ederdi.

#### 3. Ürün formunda yapışkan kaydet

Ürün formu uzun; en üstteki bir alanı düzeltip kaydetmek için sayfanın dibine
inmek gerekiyordu. Stok ekranındaki kaydet düğmesi zaten `sticky` idi, ikisi
aynı oldu. Kategori ve beden formlarına gerek yok: ikisi de katlanır bölüm
içinde ve kısa.

Ayrıca stok ekranındaki beden-boy-kilo tablosu kaldırıldı (K-55'te
eklenmişti); ürün düzenlemedeki kaldı — stok ekranında karar verirken değil,
ürünü tanımlarken lazım oluyor.

**Denenen:** ödenmiş siparişin iptal talebi onaylanınca durumun
`iptal|iade-bekliyor` olması ve stoğun geri verilmesi (veritabanından
doğrulandı); ekranda "İade bekliyor" yazması; stok ekranında tablonun
olmaması, ürün düzenlemede olması; kaydet düğmesinin `position: sticky`
olması ve kaydırıldığında görünür kalması; kampanyada tek tıkla silme
kalmaması, onay kutusunun sonucu yazması, silince bildirim çıkması; duyuru
aç/kapat ve kategori sıralamasının bildirim vermesi; fotoğraf silme ve sıra
bildirimlerinin görünmesi; JavaScript kapalı tarayıcıda onay kutusunun
açılması.

**Nerede:** [`../server/odeme-akis.ts`](../server/odeme-akis.ts),
[`../ui/siparis-bicim.ts`](../ui/siparis-bicim.ts),
[`../ui/panel-bildirim.tsx`](../ui/panel-bildirim.tsx),
[`../ui/silme-onayi.tsx`](../ui/silme-onayi.tsx),
[`../server/yonetim.ts`](../server/yonetim.ts),
[`../ui/urun-formu.tsx`](../ui/urun-formu.tsx)

---

### K-58 · İade süreci: para, stok ve değişim

K-33 talep akışını kurmuştu: müşteri iptal/iade/değişim talebi açıyor, panel
cevaplıyor. Eksik olan **sonrası**ydı — para ve mal.

- Onaylanan iade "tamamlandı" yapıldığında hiçbir şey olmuyordu: stok geri
  girmiyor, iade edilecek tutar hesaplanmıyor, hiçbir yere yazılmıyordu.
- Değişimde yerine gönderilen ürünün stoğu düşmüyordu.
- İade borcu hiçbir ekranda görünmüyordu (K-57'deki hatanın devamı).

#### Kayıt ve gönderim ayrı

İki iş var ve karıştırılmamalı:

- **Kayıt** — mağazanın müşteriye ne kadar borcu var, ödendi mi. `Refund`
  tablosu. Her zaman çalışıyor; havalede tek yol da bu.
- **Gönderim** — paranın gerçekten geri gitmesi. Kartta iyzico'ya, havalede
  mağaza sahibinin bankasından.

**Kayıt önce açılıyor, gönderim sonra deneniyor.** Tersi olsaydı gönderim
başarılı olup kayıt düşerse borç iki kez ödenirdi. Aynı sebeple sağlayıcı
reddederse **kayıt duruyor**, sebebi yazılıyor ve elle tamamlanabiliyor:
sağlayıcıya ulaşılamadı diye müşterinin alacağının kaydını düşürmek en kötü
sonuç olurdu.

Bir siparişin birden çok iadesi olabiliyor — üç üründen biri bugün, biri
haftaya. Sipariş ancak **bekleyen başka iade kalmadığında** `iade` oluyor;
iki parçalı bir iadenin ilki ödendiğinde borç bitmiş görünmemeli.

#### Tutar satır satır hesaplanıyor

1. Satır tutarı = birim fiyat × iade edilen adet.
2. **Kampanya indiriminin o satıra düşen payı çıkarılıyor.** İndirim bütün
   sepete uygulanmıştı; iade edilen kısım da payını taşımalı, yoksa
   indirimli alınan ürün tam fiyatından iade edilirdi.
3. **Kargo yalnızca siparişin tamamı iade ediliyorsa** ekleniyor. Cayma
   hâlinde teslim masrafı da iade ediliyor; ama üründen birini iade edende
   gönderi yine yapılmış oluyor.

Üçüncü kuralın ilk hâli yanlıştı ve **denemede çıktı:** "tamamı" yalnızca o
anki talebe bakıyordu. Müşteri iki üründen birini bugün, ötekini haftaya
iade ederse hiçbir talep tek başına "tamamı" olmuyor ve kargo bedelini hiç
alamıyordu. Artık birikimli sayılıyor: o siparişte tamamlanmış bütün
iadelerin adedi toplanıyor, sipariş tamamlandığında kargo o iadede
ekleniyor. Eşitlik bir kez yakalandığı için kargo da bir kez ekleniyor —
denemede iki iadenin toplamı siparişin toplamına kuruşu kuruşuna eşit çıktı.

#### Üç tür, üç farklı fiziksel gerçek

- **İptal onaylanınca** sipariş iptal, stok geri, parası alınmışsa iade
  kaydı. Ürün hiç çıkmadı.
- **İade tamamlanınca** — ürün fiilen elimize geçince — adetler stoğa
  giriyor ve tutar kadar iade kaydı açılıyor. "Onaylandı" bunu yapmıyor:
  onay "gönderebilirsin" demek; ürün gelmeden ne stok ne para hareket
  etmeli.
- **Değişim tamamlanınca** eski ürün stoğa giriyor, yerine gönderilen
  varyantın stoğu düşüyor, para hareketi yok. Panel "yerine ne gönderildi"
  diye soruyor; sorulmasaydı stok sessizce yanlışa kayardı.

Hepsi tek işlem içinde: yarıda kalan bir sonuçlandırma, stoğu artmış ama
parası kaydedilmemiş bir sipariş bırakırdı. Aynı sonucu iki kez uygulamak da
engelli — stoğu iki kez artırırdı.

#### iyzico tarafı yazıldı ama denenmedi

`server/odeme-iade.ts` duruyor ve anahtarlar geldiğinde çalışacak; o gün
sandbox'ta denenmeli. Denenmemiş olması bir şeyi bozmuyor: `odemeAcikMi()`
false olduğu sürece hiç çağrılmıyor, düğme ekranda çıkmıyor ve sebebi
yazıyor.

iyzico'da iki ayrı işlem var: **iptal** (`cancel`) aynı gün ve tam tutar —
mahsuplaşma öncesi, komisyon da geri alınıyor; **iade** (`refundV2`)
sonraki günlerde ve kısmi olabiliyor, `paymentId` ile çalışıyor. Hangisinin
seçileceğine ödemenin tarihi ve tutar karar veriyor.

**Denenen:** iptalin iade kaydı açması ve tutarın siparişin tamamı olması;
listede görünmesi ve menü rozetinin artması; işaretlenince hem kaydın hem
siparişin kapanması; sipariş ekranında görünmesi; kısmi iadede indirim
payının düşülmesi ve kargonun eklenmemesi; ikinci kısmi iadede kargonun
eklenmesi ve toplamın siparişin toplamına eşit çıkması; iadede stoğun geri
girmesi; değişimde eski varyantın girip yenisinin düşmesi ve iade kaydı
açılmaması; elle iade kaydında olmayan sipariş, fazla tutar ve ödenmemiş
sipariş denetimleri; kart kapalıyken düğmenin çıkmaması ve sebebinin
yazması; JavaScript kapalı tarayıcıda iade işaretleme.

**Nerede:** [`../server/iade.ts`](../server/iade.ts),
[`../server/iade-islem.ts`](../server/iade-islem.ts),
[`../server/odeme-iade.ts`](../server/odeme-iade.ts),
[`../server/talep.ts`](../server/talep.ts),
[`../app/yonetim/(panel)/iadeler/page.tsx`](../app/yonetim/(panel)/iadeler/page.tsx),
[`../db/schema.prisma`](../db/schema.prisma)

---

### K-59 · Günün işi, sevk irsaliyesi ve kargoda bekleyenler

Üçü de aynı soruya bakıyor: bugün ne yapacağım, malın yanına ne koyacağım,
neyi unuttum.

#### Kargoda bekleyenler — otomatik teslim **yapılmadı**

Gönderi durumunu taşıyıcıdan alan uç hazır (`/api/kargo/durum`): bildirim
geldiğinde sipariş kendiliğinden "teslim edildi" oluyor ve `teslimTarihi`
yazılıyor. Ama toplayıcı hesabı şirket kuruluşuna bağlı (A-11), yani bugün o
ucu çağıran kimse yok.

**Süreye bakıp kendiliğinden teslim işaretlemek seçilmedi.** Teslim tarihi
14 günlük cayma hakkının başladığı an; tahmine dayalı bir tarih gerçek
teslimden erkense müşterinin yasal süresini kısaltıyor. Mağazanın kendi
kolaylığı için müşterinin hakkını kısaltmak doğru değil.

Onun yerine görünürlük: kargoya verilişinin üstünden 4 günden fazla geçen
sipariş listede sarı, 7 günden fazla geçen mercan rozet alıyor ve listenin
başında kaç tane olduğu yazıyor. Teslim işaretleme zaten var olan toplu
işlemle tek tıkla yapılıyor. Karar insanda kalıyor ama unutulmuyor.

"Kaç gündür yolda" `Shipment.olusturuldu`'dan sayılıyor — takip numarasının
girildiği, yani malın taşıyıcıya verildiği an. `Order.guncellendi`
kullanılamıyor: her panel dokunuşunda değişiyor.

#### Günün işi

Panelde her parça ayrı ayrı vardı — sipariş listesi, süzgeçler, toplu etiket
— ama "bugün ne hazırlayacağım" sorusunun tek bir cevabı yoktu. Mağaza
sahibi listeyi süzüyor, siparişleri tek tek açıyor, hangi üründen kaç adet
toplayacağını kâğıda yazıyordu.

`/yonetim/gunluk` iki şeyi yan yana koyuyor:

1. **Hazırlanacak siparişler** — ödemesi tamamlanmış ve henüz kargoya
   verilmemiş olanlar. Ölçüt `belgeBasilabilirMi` ile aynı: ödemesi
   gelmemiş sipariş için raftan ürün ayırmak, parayı almadan malı bağlamak
   olurdu (K-54). Kuralı ikinci kez yazmak yerine aynı işleve soruluyor.
2. **Toplama listesi** — bütün siparişlerin ürünleri **birleştirilmiş**
   hâli. Beş siparişte geçen aynı bedeni beş kez rafa gitmek yerine bir kez
   alıyorsun.

Gün sınırı sipariş tarihine göre çizilmiyor: havalesi dün gelen siparişin
parası bugün onaylanmış olabiliyor. Ölçüt "bugün sipariş verildi" değil,
"şu an ödenmiş ve henüz çıkmamış" — yapılacak iş bu.

Sayfa yazdırılabiliyor: elinde kâğıtla rafa gidilen bir iş.

#### Sevk irsaliyesi

Fatura satışın belgesi, muhasebeye gider; **irsaliye malın belgesi**, kutunun
yanında gider. İkisi ayrı belge, ayrı seri numarası (`BA-I-2026-0001`,
faturanınki `BA-F-`).

**Fiyat taşımıyor.** Zorunlu olmadığı gibi taşımaması daha doğru: kutuyu açan
kargo görevlisinin ya da hediye alıcısının tutarı görmesi gerekmiyor. Bebek
kıyafetinde hediye siparişi az değil.

Üstünde olması gerekenler kayıtta: iki tarafın künyesi, seri-sıra numarası,
**düzenleme tarih-saati** ve **fiili sevk tarih-saati**. Son ikisi farklı
olabiliyor — paket akşam hazırlanır, sabah kargoya verilir. O yüzden sevk anı
irsaliye kesilirken boş kalabiliyor ve kargo kaydedildiğinde doluyor; ama
**bir kez**: ikinci bir kargo kaydı kesilmiş belgeyi geriye dönük
değiştirmemeli.

Ödemesi tamamlanmamış siparişe irsaliye de basılmıyor — malın çıkmaması
gereken siparişin sevk belgesi olmaz (K-54).

**Denenen:** 9 gündür yolda olan siparişin rozetle işaretlenmesi, baştaki
toplam uyarısı, otomatik teslim yapılmadığının doğrulanması ve toplu işlemle
teslim işaretlendiğinde `teslimTarihi`nin yazılması; günün işi listesinde
ödemesi gelenin olup gelmeyenin olmaması, toplama listesinin sipariş
sayısından bağımsız birleşmesi, menü maddesi ve toplu etiket düğmesi;
irsaliyenin `BA-I` serisinde numara alması, fiyat içermemesi, malın cinsi ve
miktarını, düzenleme ve fiili sevk alanlarını, imza alanlarını ve "fatura
yerine geçmez" ibaresini taşıması; kargo kaydedilince fiili sevkin dolması;
ödenmemiş siparişte reddedilmesi; JavaScript kapalı tarayıcıda günün işinin
açılması ve irsaliyenin oluşturulabilmesi.

**Nerede:** [`../server/kargo-bekleme.ts`](../server/kargo-bekleme.ts),
[`../server/gunluk.ts`](../server/gunluk.ts),
[`../app/yonetim/(panel)/gunluk/page.tsx`](../app/yonetim/(panel)/gunluk/page.tsx),
[`../server/irsaliye.ts`](../server/irsaliye.ts),
[`../app/yonetim/(panel)/siparisler/[numara]/irsaliye`](../app/yonetim/(panel)/siparisler),
[`../db/schema.prisma`](../db/schema.prisma)

---

### K-60 · Ana sayfa kategorileri ve panel menüsü

#### Kategoriler marka paletine geçti

Ana sayfadaki kategori ve "yaşa göre" kutuları düz beyaz kartlardı: ince bir
çerçeve, siyah başlık, gri açıklama. Sayfanın en renksiz yeri — üstelik hemen
üstündeki ürün kartlarında marka paleti dolu dolu kullanılıyordu.

Kartlar marka tonlarının soluk zeminlerini aldı ve her birinin üstünde tonun
dolu renginde küçük bir işaret var (imleç üstüne gelince uzuyor).

**Ton neye göre seçiliyor?** Önce `slug`dan bir karma denendi ve **kötü
çıktı**: beş kategorinin üçü aynı rengi aldı, nane hiç görünmedi. Sebebi
klasik bir hata — `31^k mod 4 = 0` olduğu için yalnızca son harfler etkiliydi.
FNV-1a ile de düzelmedi: **küçük kümede hiçbir karma iyi dağılmıyor**,
dağılım rastgeleliğin garantisi değil.

Doğru çözüm karma değil **atama**: ton kategorinin sıra numarasından geliyor,
dört tonu sırayla veriyor. Beş kategoride dört renk de mutlaka çıkıyor. Sıra
panelde 1'den başlayarak yeniden numaralandığı için bir kategori
**kapatılınca ötekilerin rengi kaymıyor**; yalnızca bilerek sıralama
değiştirilirse renkler de kayıyor, o da nadir ve kasıtlı bir işlem.

**Yazı rengi tona bağlanmadı.** Soluk zemin üzerinde marka tonunun koyu
karşılığı 4,5:1 eşiğini her renkte geçmiyor (mercan 4,39 idi, K-50). Yazı
metin tonlarında kaldı; kimliği zemin ve işaret taşıyor. Ölçüldü: en düşük
kontrast **4,99:1**.

#### Panel menüsü

Menü işlevseldi ama düz bir metin listesiydi: ikon yok, geniş ekranda
daraltılamıyor, kullanıcı kutusu sade.

- **İkonlar eklendi**, kütüphane olmadan. Altı-yedi ikon için bir paket
  kurmak sayfaya inen JavaScript'i artırır ve tema uyumunu dışarı emanet
  ederdi. Hepsi tek çizgi kalınlığında ve `currentColor` ile — açık ve koyu
  temada kendiliğinden doğru renkte.
- **Geniş ekranda daraltılabiliyor** (210px ↔ 56px). Dar hâlde yalnızca
  ikonlar; ad `sr-only` olarak DOM'da kalıyor ve `title` ipucu veriyor.
- **Rozet dar menüde noktaya dönüşüyor.** Sayı 56 piksele sığmıyor ama
  "bekleyen iş var" bilgisi kaybolmamalı; sayı ekran okuyucuda okunmaya
  devam ediyor.
- **Grup başlıkları dar menüde kalkıyor**, ayırıcı çizgi duruyor: gruplama
  kaybolmuyor.
- Kullanıcı kutusunda baş harfler var; dar menüde ad sığmıyor ama "kim
  girmiş" bilgisi tamamen kaybolmuyor.

**Daraltma tercihi çerezde**, istemci durumunda değil. `useState` ile
tutulsaydı her gezinmede sıfırlanır, onay kutusu + CSS ile tutulsaydı her
sayfa yüklemesinde açılırdı. Çerez sunucuda okunuyor: ilk boyamada doğru
genişlik çiziliyor, sıçrama olmuyor ve JavaScript kapalı tarayıcıda da
çalışıyor — daraltma düğmesi bir form. Çerezde kişisel bir şey yok, yalnızca
"dar mı geniş mi".

**Denenen:** beş kategori kartının dört ayrı tonda olması, hiçbirinin düz
beyaz olmaması, yazı kontrastının 4,5:1 eşiğini geçmesi (ölçülen en düşük
4,99), yaş kutularının da tonlu olması; menüde 18 ikon bulunması, 210px →
56px daralması, dar menüde ikonların durması ve adın görsel olarak 1 piksel
kalıp DOM'da kalması, tercihin sayfalar arasında korunması, dar menüde açık
sayfa işaretinin doğru olması, geri genişletilebilmesi, istemci
gezinmesinde işaretin doğru kalması (K-51 gerilemesi yok), JavaScript
kapalı tarayıcıda daraltıp genişletebilmek, telefonda menünün kapalı
başlayıp açılması.

**Nerede:** [`../ui/kategori-tonu.ts`](../ui/kategori-tonu.ts),
[`../app/(magaza)/page.tsx`](../app/(magaza)/page.tsx),
[`../ui/panel-menu.tsx`](../ui/panel-menu.tsx),
[`../ui/panel-ikon.tsx`](../ui/panel-ikon.tsx),
[`../server/panel-gorunum.ts`](../server/panel-gorunum.ts)

---

### K-61 · Tam denetim: kaydet düğmesi, kalan onaylar, sessiz kalan kodlar

Geri bildirim iki noktaya değindi ve ikisi de haklıydı: ürün formundaki
kaydet düğmesi hâlâ yanlış yerdeydi, ürün ve kategori silmede onay yoktu.
İkisini düzeltmek yerine **bütün silme ve kaydetme işlemleri** baştan
tarandı.

#### Kaydet düğmesi sayfanın sonuna taşındı

K-57'de düğme `sticky` yapılmıştı ama sorun çözülmemişti: `sticky` yalnızca
**kendi kapsayıcısı ekrandayken** çalışıyor. Ürün formu sayfanın ortasında
bitiyor; altında "Bedenler ve stok", "Fotoğraflar" ve "Ürünü sil" bölümleri
var. Aşağı inince düğme kayboluyordu.

Çözüm HTML'in kendi aracı: düğme formun **dışında**, sayfanın sonunda, `form`
niteliğiyle yukarıdaki forma bağlı. JavaScript gerekmiyor. Yapışkanlık da
kaldı, ama artık sayfanın tamamı boyunca görünüyor. Yanında ne kaydedildiğini
yazan bir satır var — beden, stok ve fotoğraf işlemleri kendi bölümlerinde
anında kaydediliyor, o düğmeyi beklemiyorlar.

Yeni üründe düğme formun içinde kalıyor: orada altında başka bölüm yok.

#### Kalan onaylar

K-57 kampanya, banner, duyuru, beden ve varyant silmeye onay eklemişti.
Tarama beş yerin daha açıkta kaldığını gösterdi:

| Yer | Durum |
|---|---|
| Ürün silme (satılmamış) | Tek tık. Satılmışta kutuya SİL yazılıyordu, satılmamışta hiçbir şey yoktu |
| Kategori silme (boş) | Tek tık. Dolu kategoride "ürünler nereye" soruluyordu |
| **Toplu ürün silme** | Tek tık — onlarca ürünü birden götürebiliyordu |
| Kullanıcı silme | Tek tık; panele giriş hakkı gidiyor |
| Fotoğraf silme | Tek tık; dosya depodan da kalkıyor |
| Adres silme (müşteri) | Tek tık |

Hepsi iki adımlı onaya geçti ve her onay **ne kaybolacağını** yazıyor.
Kapatılabilir şeylerde ikinci çıkış yolu gösteriliyor: kullanıcıda "Kapat",
üründe "yayından kaldır", toplu silmede "Pasife al". Çoğu zaman istenen şey
silmek değil.

Sepetten satır çıkarma ve kupon kaldırma **kasten onaysız**: geri alması
kolay, sonucu anında görünüyor ve her seferinde onay sormak sepeti
kullanılmaz hâle getirirdi.

#### Gönderilen ama okunmayan kodlar

Panelde bir eylem `?kayit=silindi` ile dönüyor ama hedef sayfa o parametreyi
hiç okumuyorsa işlem yine sessiz kalıyor. Bunu göz kararı aramak yerine bütün
`redirect` çağrılarındaki kodlar çıkarıldı ve her birinin hedef sayfada
karşılığı olup olmadığı tarandı.

İlk tarama "sıfır bulgu" dedi — **denetleyicinin kendisi bozuktu**: sayfa
yolunu çözerken yanlış dilim alıyor ve hiçbir sayfayı bulamıyordu, yani
kontrol boşa çalışmıştı. Düzeltilince üç gerçek bulgu çıktı:

1. **Tek ürün silme** `/yonetim/urunler?kayit=silindi` ile dönüyordu; o sayfa
   `kayit`i hiç okumuyordu. Ürün siliniyor, ekranda hiçbir şey yazmıyordu —
   düzeltilmeye çalışılan hatanın tam kendisi.
2. **Hesap silme** müşteriyi `/?hesap=silindi` ile ana sayfaya atıyordu; ana
   sayfa `searchParams` okumuyor. Şifresini girip "SİL" yazan kişi sıradan
   bir ana sayfa görüyordu: geri alınamayan bir işlemin hiçbir onayı yoktu.
   Ana sayfaya parametre eklemek onu her ziyarette dinamik yapardı, o yüzden
   yönlendirme giriş sayfasına alındı — zaten dinamik ve silinen hesabın
   sahibinin gideceği yer de orası.
3. **`yetki=yok`**: sahibe özel bir sayfaya giren yönetici sessizce özete
   atılıyordu, bağlantı bozukmuş gibi. Artık sebebi yazıyor.

Geri kalan 24 "bulgu" yanlış alarmdı: metin haritaları paylaşılan
`*-bicim.ts` dosyalarında olduğu için kaba metin eşlemesi göremiyordu.

**Denenen:** kaydet düğmesinin tek olması, `form` niteliğiyle bağlı olması,
fotoğraf bölümünden sonra ve silme bölümünden önce gelmesi, sayfanın en
altında görünür kalması ve formun dışındayken gerçekten kaydetmesi; ürün,
fotoğraf, kullanıcı ve toplu silmede tek tıkla silme kalmaması, onay
kutularının ne kaybolacağını ve alternatifini yazması, onaydan sonra silip
bildirim vermesi; JavaScript kapalı tarayıcıda onay kutusunun açılması ve
kaydet düğmesinin forma bağlı kalması.

**Nerede:** [`../ui/urun-formu.tsx`](../ui/urun-formu.tsx),
[`../ui/urun-silme.tsx`](../ui/urun-silme.tsx),
[`../ui/silme-onayi.tsx`](../ui/silme-onayi.tsx),
[`../ui/fotograf-yonetimi.tsx`](../ui/fotograf-yonetimi.tsx),
[`../app/yonetim/(panel)`](../app/yonetim),
[`../server/uyelik-islem.ts`](../server/uyelik-islem.ts)

---

### K-62 · Tam site incelemesi

Dokuz maddelik iş bittikten sonra site baştan sona tarandı: yetkilendirme,
para ve stok bütünlüğü, bildirim kodları, JavaScript'siz akış, erişilebilirlik
ve yeni eklenenlerin eski kodla tutarlılığı. Temiz çıkanlar da yazılı, çünkü
"bakıldı ve sorun yok" bilgisi de bir sonraki incelemede işe yarıyor.

#### Temiz çıkanlar

- **Yetkilendirme.** Panelin bütün sayfa, route handler ve server action'ları
  yetki kontrolü yapıyor; kontrolsüz olanlar yalnızca giriş, çıkış, şifre
  sıfırlama ve ilk kurulum — dördü de tanımı gereği açık, ilk kurulum ayrıca
  "hiç kullanıcı yoksa" koşuluna bağlı. Sipariş onay sayfası çereze, takip
  sayfası numara+e-postaya, üye sipariş sayfası hesap bağına, veri indirme
  ucu oturuma bakıyor. Sipariş numarasını tahmin ederek başkasının adresini
  görmek mümkün değil.
- **Para ve stok.** Sipariş tutarı istemciden gelmiyor, veritabanındaki
  fiyatlardan sunucuda hesaplanıyor. Stok düşümü koşullu (`stok >= adet`) ve
  tek işlem içinde, yani iki müşteri son adedi aynı anda alamıyor.
- **Kırık bağlantı yok.** 90 sayfa gezildi, toplanan 120 iç bağlantı ayrıca
  denendi. Tek 404 `/_vercel/insights/script.js` — yayında Vercel sunuyor,
  yerelde yok.
- **JavaScript kapalı satın alma.** Katalog → ürün → sepete ekle → ödeme →
  sipariş oluştu → onay sayfası; hepsi JavaScript kapalı tarayıcıda çalıştı.
- **N+1 sorgu yok.** Döngü içinde sorgu yapan yerlerin hepsi ya sipariş
  satırı kadar sınırlı ya da arka plan işi.

#### Bulunanlar ve düzeltilenler

**1. Müşteriye yalan söyleyen sipariş sayfası.** Parası alınıp iptal edilmiş
bir siparişte `/siparis/[numara]` ölçütü yalnızca `odendi` idi. Kartlı
siparişte **"Ödeme tamamlanamadı · Kartından bir tahsilat yapılmadı"**
yazıyordu — para alınmıştı ve iade bekliyordu. Havalede daha kötüsü:
müşteriden parayı **tekrar yatırması** isteniyordu. Yeni ödeme durumunu
(K-57) eklerken bu sayfa denetlenmemişti. Artık iade durumları ayrı ele
alınıyor ve "tekrar ödeme yapmana gerek yok" diyor.

**2. Rapor iadeleri görmüyordu.** İptaller ciro dışındaydı ama **iade
edilmiş** bir satış tam ciro sayılmaya devam ediyordu. İadeyi ciroya
mahsup etmek de yanlış olurdu: iade genelde satıştan sonraki bir dönemde
oluyor ve o dönemin cirosunu eksiye çekebiliyor. Üç rakam birden veriliyor:
ciro, iade ve net. İade dönemi **tamamlandığı güne** göre sayılıyor — para
o gün çıkıyor.

**3. İade tamamlanınca müşteriye haber gitmiyordu.** Talep alındığında ve
sonuçlandığında e-posta vardı; **paranın gerçekten gönderildiği an**
sessizdi, oysa beklenen haber o. Gönderim başarısızlığı iadeyi geri almıyor:
e-posta servisi çalışmıyor diye paranın gönderildiği kaydı düşürmek yanlış
olurdu.

**4. İşlem içinden işlem dışı sorgu.** `iadeTutari` bir `$transaction`
içinden çağrılıyor ama kendi sorgularını havuzdan ayrı bir bağlantıyla
yapıyordu. Yanlış sonuç vermiyordu — okuduğu alanların hiçbirini o işlem
değiştirmiyor — ama yük altında havuzu tüketebilirdi: işlem bir bağlantıyı
tutarken ikincisini istiyor. İşlem istemcisi artık parametre olarak
geçiyor.

**5. İki yerde yazılan iki sabit.** Cayma süresi (14 gün) hem kural
motorunda hem üç bilgi sayfasında ayrı ayrı yazılıydı; süre uzatılsa
sayfalar eski sözü vermeye devam ederdi. Kargo gecikme eşiği (7 gün) de
panel özetinde ve sipariş listesinde ayrı ayrı. İkisi de tek kaynağa
bağlandı.

#### Erişilebilirlik: ölçünce çıkan zincir

Kontrast göz kararı değil, tarayıcıda hesaplanmış renklerden ölçüldü — her
görünür yazı, zeminiyle, iki temada, WCAG'nin büyük/normal yazı ayrımıyla.
Bir bulgu ötekini açtı:

| Bulgu | Ölçülen | Sonrası |
|---|---|---|
| Silme onayı uyarı yazısı | 4,39:1 | K-50'de ölçülüp reddedilen çifti kendi yeni bileşenimde tekrar kullanmışım — üstelik "neyi kalıcı sileceğini" anlatan yazıda |
| Panelin **bütün** hata kutuları | 4,39:1 | `panel-bicim.ts`'teki ortak `HATA_KUTUSU` aynı çifti kullanıyor |
| İptal/iade rozeti | 2,63:1 | `metin-3` gri zeminde |
| **Bütün birincil düğmeler** | 2,94:1 | Beyaz yazı pastel mercan üzerinde, 53 yerde |
| `metin-3` belirtecinin kendisi | 2,99:1 | Sitedeki bütün yardımcı metinler |
| Nane `-koyu` tonu | 3,99:1 | "Yayında", "Açık", "Ödendi" rozetleri; beyazda bile 4,43 |
| SSS akordeon `+`/`−` | 2,94:1 | Pastel mercan yazı olarak |

Düğme düzeltmesinin ilk hâli **yanlıştı ve ölçüm yakaladı:** `bg-mercan-koyu`
yapmak açık temada çözüyor ama koyu temada bozuyor (2,24:1), çünkü `-koyu`
tonları koyu temada **açık** renge dönüyor — koyu zeminde yazı olsunlar diye.
Düğme artık kendi belirtecini kullanıyor (`--dugme`, `--dugme-yazi`) ve iki
temada ayrı çözülüyor: açık temada koyu zemin + beyaz yazı (5,85), koyu
temada açık zemin + koyu yazı (7,65).

Renk kararlarının çoğu marka belgesinin **kendi kuralına dönüş**: "Pastel
tonlar metinde yeterli kontrast vermediği için her rengin bir de koyu
karşılığı var: yazı ve düğmelerde o kullanılır." Kod bu kuraldan sapmıştı.
`--grafik` ayrı belirteç olarak kaldı, dokunulmadı (K-42).

Son durum: mağaza ve panel, açık ve koyu temada, eşiğin altında tek yazı yok.

**Denenen:** 90 sayfalık tarama ve 120 bağlantı kontrolü; JavaScript kapalı
tam satın alma akışı; iade durumlarında müşteri sayfasının dört hâli; bütün
önceki grupların işlevleri (menü ikonları ve daraltma, günün işi, iadeler,
bedenler, toplu çubuk ve silme onayı, sayfa sonundaki kaydet düğmesi, rapor
iade kutusu, tonlu kategoriler, veritabanından beden rehberi) — gerileme yok;
iki temada kontrast ölçümü.

**Nerede:** [`../app/globals.css`](../app/globals.css),
[`../app/(magaza)/siparis/[numara]/page.tsx`](../app/(magaza)/siparis),
[`../server/rapor.ts`](../server/rapor.ts),
[`../server/eposta.ts`](../server/eposta.ts),
[`../server/iade.ts`](../server/iade.ts),
[`../ui/talep-bicim.ts`](../ui/talep-bicim.ts)

---

### K-63 · Kaydet düğmesi ve silme denetimi: üçüncü deneme

Aynı iki şey için üçüncü kez geri bildirim geldi. İkisinde de kod "çalışıyordu"
ve denemelerim geçiyordu; yanlış olan **ekranda ne göründüğüydü**. Ders şu:
işlevsel deneme "düğme var ve çalışıyor" der, kullanıcının gördüğü şeyi
söylemez. Ekran görüntüsüne bakınca ikisi de bir dakikada anlaşıldı.

#### Kaydet düğmesi: yapışkanlık sorunun kendisiydi

- **İlk hâl:** düğme formun içindeydi. Form sayfanın ortasında bitiyor
  (altında "Bedenler ve stok", "Fotoğraflar", "Ürünü sil" var), düğme de
  ortada kalıyordu.
- **İkinci hâl (K-57):** `sticky` yapıldı. *Daha kötü oldu.* Düğme yüzen bir
  çubuğa dönüşüp o an bakılan formun üstüne bindi, alttaki alanı kapattı.
  Ekran görüntüsünde açıkça görülüyor: "Özellikler" girdisi çubuğun altında
  kalmış. Kullanıcının "sayfanın ortasında görünüyor" dediği tam olarak buydu
  — düğme artık *her zaman* ortadaydı.
- **Üçüncü hâl:** ne yapışkan ne formun içinde. Sayfanın sonunda, kendi
  yerinde duruyor; `form` niteliğiyle yukarıdaki forma bağlı olduğu için hâlâ
  onu gönderiyor ve JavaScript gerekmiyor.

İstenen şey baştan beri basitti: aşağı inince karşına çıkan bir kaydet
düğmesi. "Stoktaki gibi olsun" sözünü yapışkanlık olarak okumak hataydı —
stok ekranında form **bütün sayfayı** sardığı için orada yapışkanlık işe
yarıyor; ürün sayfasında sarmıyor.

#### Silme denetimi: vardı ama silme gibi durmuyordu

K-61 onayları eklemişti ve denemeler geçiyordu. Ekrana bakınca iki ayrı sorun
çıktı:

1. **Ürünü olan kategoriler onay almamıştı.** K-61 yalnızca *boş* kategoriye
   onay eklemişti; doluların hepsi eski satır içi dalda kalmıştı. Mağazadaki
   bütün kategorilerin ürünü olduğu için **kullanıcı hiçbirinde onay
   görmedi** — haklıydı. Üstelik o dal kategorinin kalıcı olarak sileceğini
   hiç söylemiyor, yalnızca "ürünler nereye taşınsın?" diye soruyordu.
2. **Onay düğmesi silme gibi durmuyordu.** Nötr gri bir kutu olarak
   "Kapat"ın yanında kayboluyordu; biçimsiz bir bağlantı gibi. Artık mercan
   çerçeveli ve mercan yazılı (beyaz üzerinde 5,85:1), yani ilk bakışta
   yıkıcı bir eylem olduğu belli.

Ürünü olan kategori artık aynı onay kutusunu kullanıyor: kırmızı uyarıda
kategorinin kalıcı olarak gideceği, **ürünlerin silinmeyip taşınacağı** ve
"yalnızca vitrinden kaldırmak istiyorsan Kapat yeter" yazıyor; hedef kategori
seçimi de kutunun içinde.

**Denenen:** düğmenin `static` olması, sayfa başındayken görüş alanında
olmaması (yüzmemesi), sonunda görünmesi, fotoğraflardan sonra silmeden önce
gelmesi ve gerçekten kaydetmesi; kategoride tek tıkla silme kalmaması,
düğmenin kırmızı çerçeveli olması, uyarının "kalıcı olarak siliniyor",
"taşınıyor" ve "Kapat" üçünü birden söylemesi, hedef kategorinin hâlâ
sorulması; satılmamış üründe onay ve bildirim; fotoğraf ve toplu silmede tek
tık kalmaması; JavaScript kapalı tarayıcıda onayın açılması ve düğmenin
forma bağlı kalması. Ayrıca ekran görüntüleriyle göz kontrolü — bu turda
asıl işi o yaptı.

**Nerede:** [`../ui/urun-formu.tsx`](../ui/urun-formu.tsx),
[`../ui/silme-onayi.tsx`](../ui/silme-onayi.tsx),
[`../app/yonetim/(panel)/kategoriler/page.tsx`](../app/yonetim/(panel)/kategoriler/page.tsx)

---

### K-64 · Bekleyen siparişin stoğu tutması ve halka açık formlarda sınır

İkisi de aynı boşluğun iki yüzü: **kimlik istemeyen bir işlem, sınırsız
tekrarlandığında stoğu kilitliyor.**

#### Havale siparişi stoğu süresiz tutuyordu

Sipariş açılırken stok hemen düşülüyor — doğrusu bu, yoksa son adedi iki kişi
alır. Bekleyen siparişleri temizleyen iş ise onları **`Payment` kaydı
üzerinden** buluyordu:

```ts
const girisimler = await db.payment.findMany({ where: { durum: "baslatildi", … } });
```

`Payment` kaydı yalnızca **kart** akışında oluşuyor. Veritabanından
doğrulandı: beş havale siparişinin sıfır ödeme kaydı var. Yani havale
siparişleri temizliğe hiç girmiyordu. Biri havaleyle sipariş verip parayı hiç
göndermezse o stok, mağaza sahibi fark edip elle iptal edene kadar kilitli
kalıyordu — ve havale şu an **tek** ödeme yöntemi olduğu için bu istisna
değil, varsayılan durumdu.

Artık ödeme süresi panelden ayarlanıyor (varsayılan 72 saat: hafta sonuna
denk gelen bir siparişin parası pazartesi yatabiliyor). Süre dolunca sipariş
kendiliğinden iptal oluyor ve stok geri veriliyor. Bitmesine 24 saat kala
müşteriye bir hatırlatma gidiyor — bir kez, `hatirlatildi` damgasıyla; ikinci
e-posta ısrar olurdu (aynı kural bırakılan sepette de var, K-27). Sıfır
yazılırsa otomatik iptal kapanıyor: mağaza sahibi elle yönetmek isteyebilir.

Panelde sipariş listesinde "37 saat kaldı" rozeti var, son 12 saatte mercan
oluyor.

**İkinci katman: temizlik günde bir kez çalışıyordu.** Vercel Hobby paketinde
ikinci bir zamanlı iş yok (K-27), yani karttaki "30 dakika" politikası
pratikte 24 saate kadar çıkabiliyordu. Çözüm sıklığı artırmak değil —
**fırsatçı temizlik**: sipariş verilmeden hemen önce süresi dolanlar
kapatılıyor. Ucuz bir sorgu ve tam da stoğun önemli olduğu anda çalışıyor. Bu
çağrı zaten vardı ama yalnızca kart siparişlerini kapsayan işlevi
çağırıyordu; ikisini de kapsayanla değiştirildi.

Temizlik başarısız olursa sipariş yine de alınıyor: stok serbest
bırakılamaması müşteriyi satın almaktan alıkoymamalı.

#### Halka açık formlarda hız sınırı yoktu

Giriş denemelerinin sınırı vardı (K-38) ama kimlik istemeyen dört işlemin
hiçbirinde yoktu: **sipariş oluşturma**, değerlendirme, iade talebi ve
"gelince haber ver". En ağırı sipariş, çünkü stoğu düşürüyor.

Sayaç giriş sayacıyla **aynı tabloyu** kullanıyor (`LoginThrottle`): ihtiyaç
aynı — anahtar başına sayaç, pencere, kilit. Anahtarın ön eki işlemi ayırıyor.
İki fark var:

- **Başarısızlığı değil denemeyi sayıyor.** Girişte ölçüt hatalı denemeydi;
  burada kötüye kullanım hacmin kendisi — başarılı yüz sipariş de sorun.
- **Hata olursa geçiyor, engellemiyor.** Sayaç yazılamazsa müşterinin
  siparişi düşmemeli: sınır bir koruma, satışın önkoşulu değil.

Sipariş sınırı kasten yüksek (saatte 15): gerçek müşteriyi engellemek, betiği
engellemekten pahalı. Aynı evden ya da iş yerinden birden çok kişi aynı
adresle çıkabiliyor. Başlık yoksa (yerel ortam) sınır hiç uygulanmıyor —
herkesi tek sayaca toplamak bütün mağazayı kilitlerdi.

#### Denerken çıkan kusur: dönüş adresi rengi kaybediyordu

Sınır çalışıyordu ama mesaj ekranda görünmüyordu. Sebebi sınırla ilgili
değildi: "gelince haber ver" formunun dönüş adresi `/urun/<slug>?bildirim=…`
idi, **seçili renk taşınmıyordu.** Dönüşte sayfa varsayılan renge sıçrıyor,
varsayılan renk stoktaysa formun kendisi hiç çizilmiyor ve müşteri ne onay ne
hata mesajını görüyordu. Yalnızca yeni sınır mesajını değil, var olan
"e-posta geçersiz" uyarısını da yutuyordu. Renk artık gizli alanda taşınıyor.

**Denemede üç kez kendi denemem yanılttı** ve bu kayda değer: (1) `/odeme`
boş sepette `/sepet`'e yönlendiriyor, yani ham HTML'de mesaj aranamıyor;
(2) seçicim "Sepete ekle" formunu yakalıyordu, çünkü onda da `variantId` var;
(3) `waitForFunction` koşulum formun kendi açıklama metnine takılıyordu, yani
yönlendirmeyi hiç beklemeden geçiyordu. Üçü de "deneme geçti" diyebilirdi.

**Denenen:** 100 saat önce verilmiş havale siparişinin iptal edilip stoğun
geri verilmesi; süresi dolmamış siparişe dokunulmaması; hatırlatmanın bir kez
gönderilmesi; panelde kalan sürenin yazması; ayardan 0 verilince otomatik
iptalin kapanması ve süresi dolan siparişin iptal edilmemesi; hatırlatmanın
süreyi aşamaması. Sınır tarafında: 10 gönderimden sonra 11'incinin
engellenmesi, sebebin ekranda yazması, sayacın oluşması, başka adresin
etkilenmemesi, ödeme sayfasının mesajı göstermesi. Ayrıca JavaScript kapalı
satın alma akışının bozulmadığı.

**Nerede:** [`../server/odeme-suresi.ts`](../server/odeme-suresi.ts),
[`../server/istek-siniri.ts`](../server/istek-siniri.ts),
[`../server/siparis.ts`](../server/siparis.ts),
[`../server/stok-bildirimi-islem.ts`](../server/stok-bildirimi-islem.ts),
[`../app/yonetim/(panel)/ayarlar/page.tsx`](../app/yonetim/(panel)/ayarlar/page.tsx),
[`../db/schema.prisma`](../db/schema.prisma)

---

### K-65 · Yaş grupları panelden

Beden listesi K-56'da tabloya taşınmıştı; **yaş grubu taşınmamıştı.** Sonuç
yarım bir çözümdü: panelden yeni bir beden ekleniyor, ama o bedene
seçilebilecek yaş grubu hâlâ koddaki dört satırdan geliyordu. "24-36 ay"
bedenini ekleyen kişi onu hiçbir gruba bağlayamıyordu — açılır listede
karşılığı yoktu.

Gruplar artık `AgeGroup` tablosunda, beden ekranının altındaki kendi
bölümünde yönetiliyor: ekle, düzenle, sırala, kapat, sil.

**Kod adresin parçası, o yüzden serbest metin değil.** Grup kodu ekranda
görünen bir şey değil ama `/urunler?yas=6-12` bağlantısında duruyor:
paylaşılıyor, yer imine ekleniyor, arama motorunda kalıyor. Kullanıcı ne
yazarsa yazsın kod adres güvenli hâline çevriliyor ("6-12 Ay" → `6-12-ay`),
ekranda da bu hâliyle gösteriliyor — kaydettikten sonra kodun değişmiş
olmasına şaşırmasın.

**Kod değişince bedenler aynı işlemde taşınıyor.** Beden kaydı grubun kodunu
metin olarak tutuyor (`Size.yasKodu`). İki iş ayrı yapılsaydı arada düşen bir
istek o bedenleri olmayan bir gruba bağlı bırakır, yaş süzgeci onları hiç
getirmezdi. Bedenlerdeki ad değişikliğinin (K-56) aynısı.

**Kullanılan grup silinmiyor, kapatılıyor** — bedenlerdeki kuralın aynısı.
Silme düğmesi yine de duruyor ve sebebini yazıyor: gizlenseydi "silme nerede"
diye aranırdı (K-52).

**Son grup kapatılabiliyor — bedenlerden farkı bu.** Bedeni olmayan bir
mağazada hiçbir ürün satılamaz, o yüzden son açık beden kapatılamıyor. Yaş
grubu ise yalnızca vitrin dili: hiç grup yoksa ana sayfadaki "Yaşa göre"
bölümü ve süzgeçteki yaş başlığı **çizilmiyor**, satın alma yolunda hiçbir şey
kırılmıyor. Boş bir başlık bırakmak mağazayı eksik gösterirdi.

**Kapalı grup, bağlı olduğu bedenin formunda seçenek olarak kalıyor.** Yoksa
o bedeni başka bir sebeple kaydetmek grubunu sessizce düşürürdü.

**Nasıl denendi.** Üretim derlemesinde gerçek tarayıcıyla: Türkçe harfli ve
boşluklu kod girip sadeleştiğini, yeni grubun aynı anda beden formunun açılır
listesinde + ana sayfa kutularında + süzgeçte çıktığını, kod değişince
bedenlerin taşındığını, bağlı grubun silme yerine "kapat" dediğini, bağlı
olmayanın silindiğini. Hepsi bir de JavaScript kapalı tarayıcıda.

**Nerede:** [`../server/yas-gruplari.ts`](../server/yas-gruplari.ts),
[`../server/yonetim-yas.ts`](../server/yonetim-yas.ts),
[`../app/yonetim/(panel)/bedenler/page.tsx`](../app/yonetim/(panel)/bedenler/page.tsx),
[`../db/schema.prisma`](../db/schema.prisma)

---

### K-66 · Renkler panelden

Beden (K-56) ve yaş grubu (K-65) tabloya taşındıktan sonra **renk kalan son
sabit listeydi**: mağazayı işleten kişi "Pudra" ekleyemiyor, "Nane"nin adını
değiştiremiyordu. Renkler artık `Color` tablosunda ve kendi panel
ekranından yönetiliyor.

**Renk yalnızca bir ad değil — palet de kaydın parçası.** Fotoğrafı olmayan
ürünün çizimi dört renkle boyanıyor (zemin, gövde, vurgu, çizgi). Ad panelden
değişip palet kodda kalsaydı "Pudra" diye eklenen renk nane yeşili çizilirdi.
O yüzden ad ve palet aynı satırda; formun yanında canlı bir çizim önizlemesi
duruyor.

**Çizen bileşen artık renk kodu değil paletin kendisini alıyor.**
`UrunGorseli` eskiden koddaki `PALET` tablosuna bakıyordu; o tablo silindi.
Bileşen tarayıcıda da çiziliyor, yani sorgu yapamaz — palet veriyle geçiyor.
Aynı sebeple `Urun` tipi artık çözülmüş paleti (`paletRenkleri`) ve renk
listesini kod yerine **ad ve palet taşıyan nesnelerle** (`RenkSecenegi`)
tutuyor.

**Kod değişince dört yer birden taşınıyor:** varyantlar, renge özel ürün
fotoğrafları, ürünün çizim rengi ve afişler — hepsi aynı işlem içinde. Biri
atlansaydı o kayıtlar olmayan bir renge bağlı kalır, çizimleri nötr kum
rengine düşerdi. Sipariş satırlarına kasten dokunulmuyor: satılan şeyin kaydı
sonradan değişmemeli (K-56'daki gerekçenin aynısı).

**Ana sayfa afişinin tonu katalog rengi değil.** İkisinin adları örtüşüyordu
ve afişin çizimi katalog paletinden besleniyordu; ama afişin zemini marka
belirteçlerinden geliyor (`--nane-soluk`) ve koyu temaya uyuyor, katalog rengi
ise ürünün gerçek rengi. Bağlı kalsalardı katalogdaki "Mavi"yi yeniden
adlandırmak afişin zeminini de değiştirirdi. Afiş tonları
[`../ui/banner-bicim.ts`](../ui/banner-bicim.ts) içinde, tanımlandıkları
CSS'in yanında ayrıldı.

**Kapalı renk ile silinmiş renk farklı.** Kapatmak rengi süzgeçten, ürün
formundan ve yeni varyanttan düşürüyor; var olan varyantlar duruyor ve ürün
sayfasında adıyla, doğru paletiyle görünmeye devam ediyor. Bu yüzden ad
çözümlemesi (`tumRenkSecenekleri`) kapalıları da kapsıyor, seçenek listesi
(`renkSecenekleri`) kapsamıyor. Son açık renk kapatılamıyor — bedendeki
kuralın aynısı, renksiz mağazada ürüne varyant eklenemez.

**Silinmiş renk çizimi boş bırakmıyor.** Listede olmayan kod nötr bir kum
tonuna düşüyor (`VARSAYILAN_PALET`); marka renklerinden biri seçilseydi yanlış
bir ürün rengi gösterirdi.

**Nasıl denendi.** Üretim derlemesinde gerçek tarayıcıyla: Türkçe harfli ve
boşluklu kod girip sadeleştiğini ("Açık Pudra" → `acik-pudra`), yeni rengin
aynı anda ürün formunda + varyant listesinde + mağaza süzgecinde + ürün
sayfasının renk noktalarında (doğru onaltılık değerle) + toplu yükleme yardım
metninde ve şablonunda çıktığını, kod değişince varyantın taşındığını,
kapatılınca süzgeçten ve formdan düştüğü hâlde ürün sayfasında adıyla
durduğunu, kullanılan rengin silme yerine "kapat" dediğini, kullanılmayanın
silindiğini. Hepsi bir de JavaScript kapalı tarayıcıda — renk seçici alanı
kapalıyken düz metin kutusuna düşüyor ve `#rrggbb` yazılabiliyor.

**Nerede:** [`../server/renkler.ts`](../server/renkler.ts),
[`../server/yonetim-renk.ts`](../server/yonetim-renk.ts),
[`../app/yonetim/(panel)/renkler/page.tsx`](../app/yonetim/(panel)/renkler/page.tsx),
[`../ui/katalog-bicim.ts`](../ui/katalog-bicim.ts),
[`../ui/urun-gorseli.tsx`](../ui/urun-gorseli.tsx),
[`../ui/banner-bicim.ts`](../ui/banner-bicim.ts),
[`../db/schema.prisma`](../db/schema.prisma)

---

### K-67 · Bütün listelerde sayfalama

Sayfalama yalnızca iki ekranda vardı: stok ve siparişler. Geri kalan her
liste **hepsini birden çiziyordu** — bedenler, renkler, kategoriler, ürünler,
kullanıcılar, duyurular, afişler — ya da sessizce kesiyordu: yorumlar ve
talepler ilk 100 kayıtta duruyor, yüz birinci hiçbir yerden görünmüyordu.
Mağaza tarafında da ürün listesi, arama sonucu ve ürün sayfasının
değerlendirmeleri sınırsızdı.

Artık hepsi sayfalı, tek bir ortak parçayla:
[`../ui/sayfalama-bicim.ts`](../ui/sayfalama-bicim.ts) (hesap) ve
[`../ui/sayfalama.tsx`](../ui/sayfalama.tsx) (çubuk). Stok ve siparişler de
kendi kopyalarını bırakıp bu bileşene geçti — iki ayrı `Sayfa` bileşeni
vardı, ikisi de aynı işi yapıyordu.

**Sayfa adres satırında.** Panelin geri kalanı gibi JavaScript'siz çalışıyor:
geri tuşu işliyor, bağlantı paylaşılabiliyor, yenilenince aynı yerde kalıyor.

**Sayfa boyu ekran başına.** Tek bir sabit hem 24'lük ürün ızgarasına hem de
tek satırlık beden listesine uymuyordu. Ürün ızgarası 24 (iki ve üç sütunda
da tam sıra), panel listeleri 15-20, ürün sayfasındaki değerlendirmeler 10.

**Ok düğmeleri listenin tamamına bakıyor.** Sıralama yapılan ekranlarda
(beden, renk, kategori) "yukarı" düğmesi sayfadaki değil listedeki sıraya
göre kapanıyor; yoksa her sayfanın ilk kaydı listenin başıymış gibi
görünürdü. Taşıma sayfa sınırını aşınca dönüş adresi **kaydın yeni yerine**
bakıyor: sayfanın ilk kaydını yukarı taşıyan kişi onu bir önceki sayfada
buluyor, "ok çalışmadı" sanmıyor.

**Her işlem kaldığın sayfaya dönüyor.** Kaydetme, kapatma, silme ve toplu
işlem formları sayfa numarasını gizli alanda taşıyor; yorumlar ve taleplerde
seçili süzgeç de. Yoksa dördüncü sayfadaki kaydı düzelten kişi her seferinde
listenin başına atılırdı.

**Süzgeç değişince sayfa sıfırlanıyor.** Mağazadaki renk/beden/yaş
bağlantıları sayfa numarasını kasten taşımıyor: süzgeci değiştiren kişi yeni
bir liste istiyor, o listenin yedinci sayfasını değil — hem de çoğu zaman o
kadar sayfa hiç olmuyor.

**Sınır aşılırsa son sayfa, boş ekran değil.** Üçüncü sayfadayken kayıt
silinince sayfa sayısı ikiye düşebiliyor; adreste kalan `?sayfa=3` boş liste
yerine son sayfayı açıyor. Geçersiz değer (`?sayfa=abc`) birinci sayfa.

**Birinci sayfanın adresi sade.** `?sayfa=1` yazılmıyor: aynı listenin iki
farklı adresi olmasın. Mağaza tarafında sayfa numarası **canonical adrese
giriyor** — süzgeçler girmiyor (K-16) ama ikinci sayfa başka ürünler
gösteriyor, birincinin kopyası değil.

**Toplamlar sayfadan değil bütünden.** Sayfalama iki yeri sessizce
bozabilirdi ve ikisi de düzeltildi: bekleyen iadelerin toplam tutarı
(mağazanın müşteriye borcu, ilk sayfanın borcu değil) ve ürün sayfasındaki
puan ortalaması ile yıldız dağılımı. İkincisi **zaten bozuktu**: ortalama ve
dağılım çekilen ilk 50 yorumdan hesaplanıyordu, elli birinci yorumdan sonra
gerçek ortalama olmaktan çıkıyordu. Artık ikisi de ayrı bir toplama
sorgusundan geliyor.

**Ürün listesi artık yalnızca görünen sayfayı okuyor.** Panel ürün ekranı
bütün ürünleri varyantları ve fotoğraf sayılarıyla birlikte çekiyordu;
katalog büyüdükçe panelin en pahalı sorgusu oluyordu.

**Mağaza listesinde dilimleme bellekte, sorguda değil.** Sıralama kampanyalar
uygulandıktan sonra yapılıyor (K-10): "önce ucuz" listesinde müşterinin
gördüğü indirimli fiyat geçerli. Veritabanına `skip`/`take` verilseydi
sıralama liste fiyatına göre yapılmış olur, indirimli ürünler yanlış sayfaya
düşerdi. Liste zaten önbellekte duruyor.

**Günün işi ekranı kasten sayfalanmadı.** O bir liste değil iş emri: depoda
dolaşırken elinde "1/3" yazan bir toplama listesi olması, üç turda toplamak
ya da bir sayfayı atlamak demek. Liste zaten kendiliğinden sınırlı — kargoya
verilmemiş ödenmiş siparişler kadar.

**Nasıl denendi.** Üretim derlemesinde gerçek tarayıcıyla, listeleri iki
sayfaya taşıracak kadar deneme kaydı üretilerek: her ekranın çubuğu, ileri
düğmesinin gerçekten başka kayıtlar getirdiği (sayfalar arası kesişim sıfır),
beden ve yaş grubu listelerinin birbirinin sayfasını bozmadığı, toplu işlemin
sayfayı koruduğu, ikinci sayfanın ilk kaydı yukarı taşınınca birinci sayfada
göründüğü, `?sayfa=999` ve `?sayfa=abc`, ikinci sayfanın canonical adresi,
değerlendirme ortalamasının bütün yorumlardan geldiği. İleri-geri bir de
JavaScript kapalı tarayıcıda.

**Nerede:** [`../ui/sayfalama-bicim.ts`](../ui/sayfalama-bicim.ts),
[`../ui/sayfalama.tsx`](../ui/sayfalama.tsx),
[`../server/katalog.ts`](../server/katalog.ts),
[`../server/yorum.ts`](../server/yorum.ts),
[`../server/iade.ts`](../server/iade.ts),
[`../server/gunluk.ts`](../server/gunluk.ts)

---

### K-68 · Otomatik testler: önce paranın hesaplandığı yerler

Altmış yedi karar, gerçek para ve stok mantığı, **tek bir otomatik test yok.**
Her değişiklik gerçek tarayıcıda elle denendi, betikler sonra silindi. Bu
oturumda bulunan üç sessiz hata (yorum ortalamasının ilk 50 yorumdan
hesaplanması, iade toplamının sayfadan gelmesi, listelerin 100'de kesilmesi)
tam olarak bunun sonucuydu: kimse bakmadığı için yıllarca durabilirlerdi.

**Kapsam: parayla ve veriyle ilgili saf mantık.** 84 sınav; kampanya indirimi
ve "en çok indiren kazanır" kuralı (K-10), kargo eşiği, belge basma kuralı
(K-54), sayfalama (K-67), katalog biçimi, arama metni, ödeme süresi ve toplu
yükleme süzgeci (K-26). Hepsi veritabanına dokunmuyor, hepsi yarım saniyede
bitiyor.

**Veritabanına bağlı akışlar şimdilik dışarıda** — stok düşme yarışı, sipariş
oluşturma, iade kaydı. Bunlar gerçek bir Postgres istiyor; testin kendisi
değil, kurulumu zor. Tarayıcı denemeleri bu boşluğu kapatmaya devam ediyor.

**Next.js olmadan çalışıyor.** Sunucu modülleri `server-only` işaretini
taşıyor; Next derlerken kendi çözüyor, düz Node'da böyle bir modül yok.
Testler bunu Node'un `registerHooks` çengeliyle boş bir modüle bağlıyor —
işaretin amacı sunucu kodunun tarayıcıya sızmasını engellemek, testte tarayıcı
yok. `DATABASE_URL` de sahte bir değerle dolduruluyor: Prisma istemcisini
kurmak bağlanmak demek değil, ilk sorguya kadar hiçbir yere gidilmiyor.

**Testler derlemenin içinde.** `npm run build` artık önce `npm test`
çalıştırıyor, hem de göçlerden önce: bozuk bir hesap veritabanına dokunmadan,
dağıtıma çıkmadan duruyor. Yarım saniyelik bir gecikmenin karşılığı bu.

**İlk koşuşunda gerçek bir hata buldu.** Toplu yüklemede stok `"2,5"` yazılan
satır **25 adet** oluyordu: kod rakam dışındaki her karakteri siliyordu, yani
virgül düşüp iki rakam birleşiyordu. Sessizce oluyordu ve toplu yükleme
yüzlerce satırı tek seferde kataloğa yazıyor — on iki kat fazla stok,
satılamayacak ürünün satılması demek. Artık stok tam sayı olmak zorunda;
binlik ayracı (`1.000`, Excel'in verdiği biçim) kabul ediliyor, virgül
edilmiyor — Türkçede virgül ondalık demek ve yarım zıbın diye bir şey yok.

**Nerede:** [`../testler/`](../testler/),
[`../testler/hazirlik.ts`](../testler/hazirlik.ts),
[`../server/toplu-urun.ts`](../server/toplu-urun.ts),
[`../package.json`](../package.json)

---

### K-69 · Panel listelerinde arama

Arama kutusu yalnızca stok (K-44) ve siparişlerde (K-31) vardı. Listeler
sayfalandıktan sonra (K-67) geri kalanında bir kaydı bulmak **sayfa çevirmek**
demeye başladı: yüz ürünün içinden "fitilli tulum"u aramak beş sayfa gezmek
oluyordu. Artık on ekranda arama var: ürünler, bedenler, yaş grupları,
renkler, kategoriler, kullanıcılar, yorumlar, talepler, iadeler, kampanyalar.

Kutu ortak parça ([`../ui/panel-arama.tsx`](../ui/panel-arama.tsx)); stok ve
sipariş ekranlarındaki kutunun aynısı. Düz GET formu, yani JavaScript'siz
çalışıyor, sonuç adresi paylaşılabiliyor ve geri tuşu işliyor.

**Üç farklı arama yolu, üçü de aynı yerden.** Listenin nereden geldiğine göre:

- **Bellekteki listeler** (beden, yaş grubu, renk, kategori, kullanıcı) zaten
  önbellekte ve küçük; süzme bellekte yapılıyor, fazladan sorgu açmanın
  anlamı yok.
- **`aramaMetni` sütunu olan tablo** (ürün) stok ekranının koşulunun aynısını
  kullanıyor: sütun her kayıtta tazeleniyor ve Türkçe harf katlamasını
  içeriyor (K-35).
- **Sütunu olmayan tablolar** (yorum, talep, iade, kampanya) alanların
  üstünde aranıyor. Türkçe katlama burada yok — Postgres `ı` ile `i`yi ayrı
  harf sayıyor — ama aranan şeyler sipariş numarası, ad ve kupon kodu gibi
  çoğunlukla ASCII.

**Kısa kod araması listeyi sessizce açıyordu.** `kelimeler` tek harflik
parçaları atıyor (neredeyse her kayda uyuyorlar) ve `"0-3"` iki tek harfe
bölünüyordu: geriye kelime kalmayınca arama **tüm listeyi** döndürüyordu.
Kullanıcı süzdüğünü sanıp tam listeye bakıyordu. Beden ve renk kodlarının
çoğu böyle kısa, yani bu ekranların en doğal araması işe yaramıyordu. Artık
geriye kelime kalmadığında metnin kendisi aranıyor.

**Arama açıkken ok düğmeleri tam listeye bakıyor.** Süzülmüş listenin ilk
kaydı listenin başı olmayabilir; taşıma zaten sunucuda tam liste üzerinde
yapılıyor. Sıra sayfadaki değil, kaydın gerçek sırası.

**Her işlem aramaya geri dönüyor.** Sayfa numarası gibi arama metni de
formlarda gizli alanla taşınıyor: aradığın listede bir rengi kapatınca tam
listeye atılmak, hem sayfayı hem aramayı yeniden yazmak demekti. Süzgeç
değiştirmek de aramayı düşürmüyor — "bekleyenler içinde 'iade' ara" makul bir
istek. Sayfa numarası ise düşüyor: yeni arama yeni liste.

**Nasıl denendi.** Otomatik sınavlar (Türkçe katlama, her kelimenin bulunma
zorunluluğu, kısa kod yedeği, Prisma koşullarının biçimi) ve üretim
derlemesinde gerçek tarayıcıyla: on ekranın kutusu, "zibin" yazınca
"Zıbın"ın bulunması, beden ve yaş listelerinin birbirinin aramasını
bozmaması, süzülmüş listede ok düğmesinin açık kalması, kapatma sonrası
aramanın adreste durması. Arama ve temizleme bir de JavaScript kapalı
tarayıcıda.

**Nerede:** [`../ui/panel-arama.tsx`](../ui/panel-arama.tsx),
[`../ui/panel-arama-bicim.ts`](../ui/panel-arama-bicim.ts),
[`../testler/panel-arama.test.ts`](../testler/panel-arama.test.ts)

---

### K-70 · Müşteriler ekranı ve KVKK'nın panel kapısı

`Customer` tablosu vardı ama **panelde hiçbir yerde görünmüyordu.** Mağaza
sahibi "bu müşteri kaç sipariş verdi, toplam ne harcadı, adresi ne"
sorusuna bakamıyor, sipariş listesinde adı tek tek arıyordu. Daha ciddi bir
boşluk da vardı: üye kendi verisini indirip hesabını silebiliyordu (K-39),
ama **telefonla arayıp "verilerimi silin" diyen biri için panelde bir yol
yoktu.** KVKK'nın erişim ve silme hakkı başvuru kanalına göre değişmiyor.

Liste **en yeni üye önce** ve aranabilir (K-69); kart bir müşteri hakkında
sorulan her şeyi tek ekranda topluyor: siparişleri, adres defteri, e-posta
doğrulaması, pazarlama izni ve izni verdiği an, açık oturum sayısı.

**Harcama yalnızca ödenmiş siparişlerden.** İptal edilmiş ya da parası hiç
gelmemiş sipariş "bu müşteri 12.000 ₺ harcadı" demez; öyle sayılsaydı en
değerli müşteri, en çok sipariş açıp ödemeyen kişi olurdu.

**Panelden düzenleme yok, silme var.** Müşterinin adını, adresini ya da
e-postasını panelden değiştirmek kişinin kendi verisini haberi olmadan
değiştirmek demek; üstelik siparişlerdeki kopyaları da düzeltmiyor (adres
kopyalanıyor, işaret edilmiyor). Silme ise bir yükümlülük.

**Silme kuralları kopyalanmadı.** Neyin silinip neyin kaldığı K-39'da bir
kere kararlaştırıldı ve `server/kisisel-veri.ts` içinde duruyor; panel aynı
işlevi çağırıyor. İki kapı, tek kural: hesap, oturumlar, jetonlar, adres
defteri ve stok bildirimi istekleri gidiyor; siparişler ve faturalar vergi
mevzuatının süresi boyunca kalıyor ama hesapla bağları kopuyor,
değerlendirmelerin adı "Müşteri"ye dönüyor. Ekranda bu olduğu gibi yazıyor
— "her şeyi sildik" demek yanlış olurdu.

**Siparişi olan hesapta yazılı onay isteniyor** — ürün silmedeki kuralın
aynısı (K-52). Veri indirme dosyası üyenin kendi indirdiğiyle birebir aynı:
şifre özeti ve oturum jetonları ikisinde de dışarıda.

**Üyeliksiz siparişler bu ekranda yok** ve ekran bunu yazıyor. Onlar bir
hesaba bağlı değil; sipariş ekranından e-postayla aranıyorlar. Yazmasaydı
liste eksik sanılırdı.

**Nasıl denendi.** Üretim derlemesinde gerçek tarayıcıyla: menü maddesi,
liste ve arama, kartın beş bölümü, harcama toplamının yalnızca ödenmişi
sayması, veri dosyasında şifre özeti bulunmaması, oturumsuz indirmenin giriş
sayfasına düşmesi, yanlış onayla silmenin **hesabı silmemesi**. Sonra
gerçekten silindi ve veritabanından doğrulandı: hesap ve adres gitti, sipariş
kaydı durdu, `customerId` boşaldı. Silme akışı bir de JavaScript kapalı
tarayıcıda.

**Nerede:** [`../server/musteri.ts`](../server/musteri.ts),
[`../server/yonetim-musteri.ts`](../server/yonetim-musteri.ts),
[`../app/yonetim/(panel)/musteriler/page.tsx`](../app/yonetim/(panel)/musteriler/page.tsx),
[`../server/kisisel-veri.ts`](../server/kisisel-veri.ts)

---

### K-71 · Ürün ekranındaki üç liste: çizim bir kategori değil

Renkler panele taşındıktan sonra (K-66) ürün ekranında iki şey sırıtmaya
başladı. İkisi de "eklediğim renk neden burada yok" diye sorulunca ortaya
çıktı.

#### Fotoğrafın renk listesi tek seçenek gösteriyordu

Fotoğrafa **yalnızca ürünün kendi varyant renkleri** atanabiliyordu. Mantığı
vardı: galeri seçili renge göre süzülüyor, seçili renk varyantlardan geliyor,
yani satılmayan bir renge atanan fotoğraf hiç görünmüyor — hatta o üründe
başka renkli fotoğraf varsa **gizleniyor** (K-48'deki süzgeç).

Ama bir sıra tuzağı kuruyordu. Doğal iş akışı "önce çekimi yükle, sonra stoğu
gir": tek renkte varyantı olan bir ürüne altı fotoğraf yükleyen kişi açılır
listede yalnızca o rengi görüyor, mağazasında beş renk tanımlı olduğu hâlde.
Sebebi hiçbir yerde yazmıyordu, dolayısıyla eksiklik gibi görünüyordu.

Liste artık ikiye ayrılmış: ürünün kendi renkleri üstte, mağazanın öteki açık
renkleri **"Bu üründe henüz yok"** grubunda. Varyantı olmayan bir renge
atanmış fotoğrafın altında da uyarı duruyor: o renk stoğa girilene kadar
galeride görünmeyebilir. Engellemek yerine söylemek doğrusu — stok birazdan
girilecek olabilir.

#### "Çizim" listesi kategori sanılıyordu

Açılır listede ham anahtarlar yazıyordu: `zibin`, `tulum`, `battaniye`,
`patik`, `sapka`, `onluk`. Türkçesi bile değildi ve tam da mağazanın kategori
adlarına benziyordu — "yeni kategori ekledim, neden burada yok" sorusunun
kaynağı buydu. Adlar düzeltildi (Zıbın, Şapka, Önlük…).

**Bu liste panelden uzatılamıyor ve uzatılmayacak.** Beden (K-56), yaş grubu
(K-65) ve renk (K-66) tabloya taşındı; çizimler taşınamaz, çünkü her biri
`ui/urun-gorseli.tsx` içinde elle çizilmiş bir SVG. Yeni bir tip eklemek kod
işi değil, çizim işi. Ekran bunu artık yazıyor ve doğru çözümü söylüyor:
ürüne uyan çizim yoksa fotoğraf yükle.

**Fotoğrafı olan üründe bu bölümün hiçbir etkisi yok** — çizim yalnızca
fotoğraf yokken gösteriliyor. Öyle ürünlerde bölümün başında bunu söyleyen
bir satır çıkıyor; yoksa "çizimi değiştirdim ama bir şey olmadı" denirdi.

**Nasıl denendi.** Üretim derlemesinde gerçek tarayıcıyla, sayfadaki bütün
açılır listeler seçenekleriyle dökülerek: çizim adlarının Türkçeleştiği,
fotoğraf listesinin gruplandığı (üç kendi rengi + iki "henüz yok"),
fotoğrafı olan üründe uyarı satırının çıktığı ve varyantı olmayan bir renge
atanan fotoğrafın altında uyarının belirdiği.

**Nerede:** [`../ui/fotograf-yonetimi.tsx`](../ui/fotograf-yonetimi.tsx),
[`../ui/urun-formu.tsx`](../ui/urun-formu.tsx),
[`../ui/katalog-bicim.ts`](../ui/katalog-bicim.ts),
[`../app/yonetim/(panel)/urunler/[slug]/page.tsx`](../app/yonetim/(panel)/urunler/[slug]/page.tsx)

---

### K-72 · Telefonda önce ürün, sonra süzgeç

Liste sayfasının süzgeç sütunu masaüstünde solda duruyordu; telefonda ise
`lg:` kırılımının altında ürünlerin **üstüne** yığılıyordu. Panelden beden
eklendikçe sütun uzadı ve ölçüldüğünde şu çıktı: **ilk ürün kartı sayfanın
1322 piksel altında.** 844 piksellik bir telefonda bir buçuk ekran boyu
süzgeç kaydırmadan tek bir ürün görünmüyordu. Mağazanın ilk ekranında satacak
bir şey yoktu.

Artık telefonda süzgeçler kapalı bir panelde, ürünler hemen altında: **ilk
ürün 524 piksele çıktı**, yani ilk ekranda. Masaüstünde yan sütun olduğu gibi.

**Aynı süzgeçler iki kez yazılıyor, biri gizli.** Tek bir `<details>` kullanıp
masaüstünde CSS ile açık tutmak denenmedi: kapalı bir `<details>`in içeriğini
CSS'le geri getirmek tarayıcıdan tarayıcıya değişiyor. İki ayrı blok
`hidden` / `lg:hidden` ile ayrılıyor — `hidden` `display:none` demek, yani
gizli olan erişilebilirlik ağacında da yok, ekran okuyucu süzgeçleri iki kez
okumuyor. Fazladan giden şey birkaç bağlantıdan ibaret.

**Panel süzgeç seçiliyken de kapalı açılıyor.** Önce "açık gelsin, ne
süzdüğünü görsün" diye yapıldı; ölçünce tam tersi çıktı: iki süzgeç seçili
bir listede ürünler 1445 piksele düşüyordu — düzeltilmeye çalışılan şeyin
kendisi. Süzgece dokunan müşteri süzgeci değil **sonucu** görmek istiyor.
Neyin açık olduğunu başlıktaki sayı ve ürünlerin üstündeki rozetler
söylüyor.

**Açık süzgeçler ürünlerin üstünde, tek dokunuşla kalkıyor.** Her rozet
kendi süzgecini kaldıran bir bağlantı; ötekiler yerinde kalıyor. Yalnızca
telefonda — masaüstünde yan sütun zaten gösteriyor.

#### Aynı açıklamalı iki yaş grubu, aynı görünen iki düğme

Süzgeç etiketinde yalnızca açıklama yazıyordu ("0-3 ay"). Panelden iki gruba
aynı açıklama verilince — "2-14 Yaş"ı ikiye bölmek olağan bir şey —
süzgeçte **birbirinin aynı iki düğme** çıkıyor, hangisinin ne getirdiği
anlaşılmıyordu. Artık açıklama o listede tekse olduğu gibi kalıyor (kısa
etiket iyi etiket), çakışıyorsa grubun adı önüne geliyor: "Çocuk · 2-14 Yaş",
"Genç · 2-14 Yaş". Açıklama hiç yoksa ad, o da yoksa kod — etiket hiç boş
kalmıyor.

**Nasıl denendi.** Üretim derlemesinde gerçek tarayıcıyla, kullanıcının
verisi taklit edilerek (uzun beden listesi + aynı açıklamalı iki grup): ilk
ürün kartının sayfadaki yeri telefonda ve masaüstünde ölçülerek, panelin
açılıp kapandığı, masaüstünde yan sütunun görünüp panelin gizlendiği,
rozetlerin doğru süzgeci kaldırdığı (ötekiler dururken), etiketlerin
ayrıştığı. Panel ve rozetler bir de JavaScript kapalı tarayıcıda.

**Nerede:** [`../app/(magaza)/(vitrin)/[kategori]/page.tsx`](../app/(magaza)/(vitrin)/[kategori]/page.tsx),
[`../ui/katalog-bicim.ts`](../ui/katalog-bicim.ts)

---

### K-73 · Üst çubuk iki sıra, boş kategori vitrinde yok

Kategoriler panelden çoğalınca üst çubuk iki yerden birden bozuldu.

#### Şerit sarıyordu, başlık her sayfada başka boydaydı

Kategori bağlantıları logo ile aynı sarmalayan kutudaydı. Uzun adlı altı
kategoriyle ("Yenidoğan - Hastane Çıkış Setleri", "Çorap - İç Çamaşırı")
şerit ikinci satıra taşıyor, arama kutusuyla logo yer değiştiriyor, başlığın
yüksekliği kategori sayısına göre değişiyordu.

Üst çubuk artık **iki sıra**: logo, arama ve hesap üstte; kategori şeridi
altta, kendi satırında. Şerit **sarmıyor, kayıyor** — kategori sayısı ne
olursa olsun tek satır, sığmayanlar yatay kaydırmayla geliyor. Ölçüldü:
aynı uzun adlarla başlık 1280 ve 768 pikselde 130 pikselde kalıyor ve şerit
tek satır.

Bağlantılar düz yazıdan **yuvarlak düğmelere** geçti: sitenin geri kalanında
gezinme öğeleri (süzgeçler, sıralama, rozetler) zaten böyle. Şeridin başına
"Tüm ürünler" eklendi — eskiden yalnızca telefon menüsünde vardı.

`scrollbar-gizli` yalnızca kaydırma çubuğunu saklıyor: kaydırma, dokunma,
fare tekerleği ve klavye (Tab ile sıradaki bağlantıya gidince şerit
kendiliğinden kayıyor) olduğu gibi çalışıyor.

#### Boş kategori vitrinde görünüyordu

Menüdeki her bağlantı boş bir sayfa açıyordu, çünkü kategoriler açılmış ama
içlerine henüz ürün atanmamıştı. Vitrin açısından bu bir hata değil ama
sonucu hata gibi: müşteri menüden ne seçerse seçsin boş sayfa görüyor,
mağazanın eksik olduğunu düşünüyor.

**Vitrin artık yalnızca içinde yayında ürün olan kategorileri gösteriyor** —
menüde, ana sayfa kutularında, arama rozetlerinde, 404 sayfasında ve site
haritasında. Kategori panelde duruyor ve ürün atanır atanmaz menüye giriyor.
Kategori sayfasının kendisi hâlâ açılıyor (adresi paylaşılmış olabilir) ama
artık doğru şeyi söylüyor: süzgeç varken "bir süzgeci kaldırmayı dene",
süzgeç yokken **"bu kategoride henüz ürün yok"**. Eskiden kaldıracak süzgeç
olmadığı hâlde süzgeç mesajı çıkıyordu.

**Nasıl denendi.** Üretim derlemesinde gerçek tarayıcıyla, kullanıcının
kategori adları taklit edilerek: üç genişlikte başlığın yüksekliği ve şeridin
satır sayısı ölçülerek, boş kategorilerin menüden düştüğü, ürün atanınca geri
geldiği, dolu kategorilerin çalışmaya devam ettiği, boş kategori sayfasının
doğru mesajı verdiği. Telefon menüsü ve kategoriye gidiş bir de JavaScript
kapalı tarayıcıda.

**Nerede:** [`../ui/ust-cubuk.tsx`](../ui/ust-cubuk.tsx),
[`../server/katalog.ts`](../server/katalog.ts),
[`../app/(magaza)/(vitrin)/[kategori]/page.tsx`](../app/(magaza)/(vitrin)/[kategori]/page.tsx),
[`../app/globals.css`](../app/globals.css)

---

### K-74 · Ürünü kategoriye atamanın yolu görünmüyordu

"Ürünü kategoriye nasıl ekleyeceğim, eksiklik var gibi" diye soruldu. Alan
aslında **vardı**: ürün ekranında "Temel bilgiler → Kategori", ürün adının
hemen altında. Eksik olan alan değil, ona giden yoldu — ve kataloğu yeniden
düzenlerken asıl gereken şey zaten başka bir şeydi.

**Kategori ekranından ürüne giden bir yol yoktu.** Kategoriyi açan kişi
sonraki adımı orada arıyor: "kategoriyi kurdum, şimdi içine ürün koyayım."
Ekran yalnızca "3 ürün" yazıyordu, bağlantı değildi. Artık bağlantı ve ürün
listesini o kategoriye süzülmüş açıyor; boş kategorilerin yanında
**"mağazada görünmüyor"** uyarısı var (K-73'ün sonucu artık sebebiyle
birlikte görünüyor). Ekranın başında da iki yolu anlatan bir satır duruyor.

**Ürün listesinde kategori süzgeci yoktu.** "Bu kategoride ne var"
sorusunun panelde karşılığı yoktu; kataloğu düzenlerken en çok sorulan şey
buydu. Artık üstte kategori rozetleri, her birinde ürün adedi; kapalı
kategoriler de listede, çünkü ürün oraya da taşınabilmeli.

**Toplu taşıma yoktu.** Yayına alma, pasife alma ve silme toplu
yapılabiliyordu ama taşıma yapılamıyordu: her ürünü aç, açılır listeyi
değiştir, sayfanın sonundaki kaydete bas — yirmi ürün için altmış tıklama.
Toplu çubuğa **"Kategoriye taşı"** eklendi. Hedef seçilmeden basılırsa
sessizce hiçbir şey yapmıyor, "Ürünlerin taşınacağı kategoriyi seç" diyor.

Süzgeç ve arama taşımadan sonra korunuyor (K-69): taşıdığın listeye geri
dönüyorsun, tam listeye değil.

**Nasıl denendi.** Üretim derlemesinde gerçek tarayıcıyla, iki yol da uçtan
uca: ürün ekranından kategori değiştirip kaydetmek, listeden iki ürün
işaretleyip taşımak, kategori süzgecinin doğru sayıda ürün getirmesi,
kategori ekranındaki bağlantıların doğru süzgece gitmesi, hedefsiz taşımanın
hata vermesi. Sonunda mağaza menüsünde kategorinin belirdiği ve sayfasının
ürünleri gösterdiği de doğrulandı.

**Nerede:** [`../app/yonetim/(panel)/urunler/page.tsx`](../app/yonetim/(panel)/urunler/page.tsx),
[`../app/yonetim/(panel)/kategoriler/page.tsx`](../app/yonetim/(panel)/kategoriler/page.tsx),
[`../server/yonetim.ts`](../server/yonetim.ts)

---

### K-75 · Satışa hazırlık ekranı

"Mağaza açılmaya hazır mı" sorusunun cevabı sekiz ayrı ekrana dağılmıştı:
havale bilgisi satış ayarlarında, metinlerin taslak olup olmadığı yasal
metinlerde, kart ödemesinin açık olup olmadığı **hiçbir yerde**. Bir eksiği
fark etmenin tek yolu müşterinin şikâyet etmesiydi — havale bilgisi boşken
sipariş veren müşteri parayı nereye yatıracağını göremiyor ve sipariş
ödenmeden kalıyor.

Tek ekran, on üç kontrol, dört bölüm: para akışı, yasal, katalog, altyapı.

**Üç ağırlık var ve karışmıyorlar.** `engel` satış yapılamaz ya da hukuka
aykırı demek (havale bilgisi boş, yasal metin taslak, künye boş, yayında ürün
yok, ürünün varyantı yok). `uyari` satış olur ama bir şey yarım kalır
(e-posta servisi yok, fotoğrafsız ürün, tükenmiş ürün). `bilgi` bakılması iyi
olan şeyler. Her şeye "engel" diyen bir liste, hiçbir şeye demeyen kadar işe
yaramaz — ayrım bu yüzden sınavla korunuyor.

**Ekran iyimser değil.** Her şey tamamsa bunu bir cümleyle söylüyor; değilse
en kötü haber en üstte. Yeşil bir onay kutusu gösterebilmek için eksikler
yumuşatılmıyor.

**Her satır üç şey söylüyor:** ne durumda, eksikse ne olacağı ve nereden
düzeltileceği. "Eksik" demek yetmiyor; panelde hangi ekrana gidileceği
yazmazsa aranıyor. Anahtar ve hesap isteyenlerde (kart ödemesi, e-posta
servisi, alan adı) panel yolu yok, onun yerine Vercel ortam değişkeni
gerektiği yazıyor.

**Sayımlar yalnızca yayındaki ürünler üzerinden.** Pasif bir üründe
fotoğrafın ya da stoğun eksik olması bugünün işi değil; o ürün zaten satışta
değil.

**Ekran hiçbir şeyi değiştirmiyor**, yalnızca bakıyor.

**Nasıl denendi.** Üretim derlemesinde gerçek tarayıcıyla, mevcut kurulumun
eksikleriyle: iki engel (havale bilgisi, üç taslak metin) ve dört eksik
doğru sayıldı, katalog sayımları veritabanıyla tuttu, fiyatlar Türkçe biçimde
yazıldı. Ağırlık sınıflandırması ayrıca sınavla korunuyor.

**Nerede:** [`../server/hazirlik.ts`](../server/hazirlik.ts),
[`../app/yonetim/(panel)/hazirlik/page.tsx`](../app/yonetim/(panel)/hazirlik/page.tsx),
[`../testler/hazirlik.test.ts`](../testler/hazirlik.test.ts)

---

### K-76 · Ödenemeyecek sipariş açılmıyor

Satın alma yolu baştan sona gerçek tarayıcıda yürünürken çıktı: renk ve
beden seçimi, sepete ekleme, kupon, adres, havaleyle sipariş, panelde görme,
ödemeyi onaylama, kargoya verme, müşterinin takip etmesi ve iade talebi —
hepsi çalışıyordu. **Tek bir yer üç ayrı yalan söylüyordu.**

Havale bilgisi (banka, hesap sahibi, IBAN) satış ayarlarında boşken:

1. Ödeme sayfasındaki havale seçeneği **"Siparişi verdikten sonra banka
   bilgileri ekranda çıkar"** diyordu. Çıkmıyordu.
2. Sipariş yine de oluşuyor, **stok düşüyordu**.
3. Onay sayfası **"Ödeme bilgilerini en kısa sürede e-posta ile
   ileteceğiz"** diyordu — e-posta servisi de tanımlı değilken. Müşteri hiç
   gelmeyecek bir posta bekliyor, ürün kimseye satılamadan rafta kilitli
   kalıyordu.

**Kural:** hiçbir ödeme yöntemi açık değilse sipariş alınmıyor. Kart
anahtarları yoksa **ve** havale bilgisi girilmemişse ödeme sayfası formu hiç
çizmiyor; onun yerine "şu anda sipariş alamıyoruz, sepetin duruyor" diyor ve
künyedeki telefon/e-postayı gösteriyor. Sipariş eylemi de aynı kontrolü
yapıyor: form kurcalansa bile ödenemeyecek sipariş açılmıyor.

Havale bilgisi boş ama kart açıksa havale seçeneği hiç gösterilmiyor —
çalışmayan bir seçenek sunmaktansa sunmamak.

**Eski siparişler için de düzeltildi:** havale bilgisi sonradan boşaltılmış
olabiliyor. Onay sayfası artık tutulamayacak bir söz vermek yerine
müşteriye ulaşabileceği kanalı gösteriyor.

**Kural tek yerde.** İki yerde ayrı yazılsaydı biri gevşediğinde öteki fark
etmezdi. [`../ui/odeme-bicim.ts`](../ui/odeme-bicim.ts) saf bir modül:
kararı verenler kart durumunu ve havale metnini okuyup geçiriyor, kural
sınavla korunuyor.

**Yürüyüşün geri kalanı temiz çıktı.** Kupon indirimi doğru uygulandı, stok
düştü, ödenmemiş siparişe belge basılmadı, kargo kaydı siparişi "kargoda"ya
aldı, müşteri takip numarasını gördü, iade formu doğru ürün ve bedenle
açıldı.

**Nerede:** [`../ui/odeme-bicim.ts`](../ui/odeme-bicim.ts),
[`../app/(magaza)/odeme/page.tsx`](../app/(magaza)/odeme/page.tsx),
[`../server/siparis-islem.ts`](../server/siparis-islem.ts),
[`../app/(magaza)/siparis/[numara]/page.tsx`](../app/(magaza)/siparis/[numara]/page.tsx)

---

### K-77 · Veritabanına bağlı testler: stok yarışı ve iade tutarı

K-68'deki 125 sınav saf mantığı koruyordu; **paranın en kritik kısmı hâlâ
elle denemeye bağlıydı.** Aynı anda iki kişi son adedi alırsa ne olduğu,
iptal edilen siparişin stoğunun geri dönüp dönmediği, iade tutarının
siparişin toplamını aşıp aşmadığı — hiçbiri sınanmıyordu. Dokuz sınav
eklendi.

**Üretime asla dokunmuyorlar.** Ölçüt `DATABASE_URL` değil, ayrı bir
`TEST_DATABASE_URL`. Tanımlı değilse bu testler atlanıyor ve sebebini
yazıyor. `DATABASE_URL` kullanılsaydı `npm run build` içindeki test koşusu
Vercel'de **gerçek mağazanın veritabanına sipariş açardı.** Ayrı bir değişken
istemek bu kazayı imkânsız kılıyor.

**Gerçek kod yolu sınanıyor, taklidi değil.** `TEST_DATABASE_URL` varken
`hazirlik.ts` onu `DATABASE_URL` olarak yazıyor, yani testler uygulamanın
kendi `db` istemcisiyle `siparisOlustur`, `siparisiIptalEtVeStoguIadeEt` ve
`iadeTutari` işlevlerini **olduğu gibi** çağırıyor. Sipariş kalemlerini
sepetten okuduğu için test de gerçek bir `Cart` kuruyor.

**Next.js'in istek bağlamı taklit ediliyor, mantık değil.** `next/headers`
bellekteki bir çerez kutusuna, `next/cache` de önbelleksiz bir geçişe
bağlanıyor — ikisi de istek bağlamı olmadan çalışmıyor. Önbelleğin atlanması
testte istenen davranış: sınanan şey önbellek değil, stoğun doğruluğu; bayat
bir değerin sınavı yanıltması istenmez.

**En önemli sınav:** on istek aynı anda üç adetlik stoğa saldırıyor, tam
olarak üçü geçiyor ve stok sıfırda duruyor. Koşullu düşüm (`where stok >=
adet`) kaldırılsa hepsi geçer, stok eksiye düşer ve olmayan ürün satılırdı.
İkincisi: iptal iki kez çağrılınca stok iki kez artmıyor — çift tıklama stok
uydurmuyor.

**Her test kendi verisini kuruyor ve siliyor.** Bütün kayıtlar `T_` önekli
kimliklerle açılıyor; ortak bir tohuma güvenilseydi testler birbirinin
sonucunu bozar, sıra değişince anlaşılmaz hatalar çıkardı.

**Nasıl çalıştırılıyor.** Yerelde bir Postgres'te `basoftbaby_test`
veritabanı açılıp göçler uygulanıyor, sonra
`TEST_DATABASE_URL=... npm test`. Değişken olmadan `npm test` yalnızca saf
sınavları koşuyor — Vercel'deki derleme de böyle.

**Nerede:** [`../testler/stok-db.test.ts`](../testler/stok-db.test.ts),
[`../testler/veritabani.ts`](../testler/veritabani.ts),
[`../testler/hazirlik.ts`](../testler/hazirlik.ts)

### K-78 · Kategori sayfası yalnızca kendi ürünlerini ve kendi süzgeçlerini gösteriyor

İki ayrı şikâyet vardı, ikisi de "kategori süzgeci yanlış" diye geldi.

**Başka kategorinin ürünleri.** Kategori sayfası kökte duruyor (`/uyku`), yani
mağazanın öteki sayfalarıyla aynı adres alanını paylaşıyor. Panelde "Ürünler"
adlı bir kategori açılınca slug'ı `urunler` oluyordu; o adres "tüm ürünler"
listesi olduğu için kategoriye tıklayan müşteri **bütün kataloğu** görüyordu.
"Arama", "Sepet", "Giriş" gibi adlarda ise kategori sayfası hiç açılmıyor,
bağlantı o sayfaya gidiyordu. Yeni kategoride bu adresler çakışma sayılıyor ve
sonuna sayı ekleniyor (`urunler-2`); var olan çakışmalar bir göçle aynı biçimde
taşındı. Liste `server/slug.ts` içinde (`AYRILMIS_ADRESLER`); mağazaya kökte
yeni bir sayfa eklenince oraya da eklenmeli.

**Alakasız süzgeçler.** Beden, renk, yaş ve fiyat seçenekleri bütün katalogdan
geliyordu: "Aksesuar"da hiç üretilmemiş bedenler, "Uyku"da olmayan renkler
çıkıyor, seçen müşteri boş listeye düşüyordu. Seçenekler artık o kategorinin
yayındaki ürünlerinden çıkıyor, süzgecin kendi kurallarıyla: beden ve yaş stokta
olan varyanta, renk varyantın varlığına, fiyat en düşük liste fiyatına bakıyor.
Seçili bir değer karşılığı olmasa da görünür kalıyor — yoksa adresle gelen bir
süzgeç kaldırılamazdı. Seçenekler öteki seçili süzgeçlere göre daraltılmıyor:
her tıklamada listenin yeniden dizilmesi, müşterinin "az önce buradaydı"
dediği düğmeyi kaybettiriyordu.

**Nerede:** [`../server/slug.ts`](../server/slug.ts),
[`../ui/katalog-bicim.ts`](../ui/katalog-bicim.ts) (`suzgecKapsami`),
[`../app/(magaza)/(vitrin)/[kategori]/page.tsx`](../app/(magaza)/(vitrin)/[kategori]/page.tsx)

### K-79 · Panelde rol yok

K-45'teki iki rol (sahip / yönetici) kaldırıldı. Yöneticiden gizlenen tek şey
Kullanıcılar ekranıydı, ama yeni kullanıcı formunda rol varsayılan olarak
"Yönetici" geldiği için sonradan açılan her hesap o menüyü göremiyordu; mağaza
sahibi bunu "yeni admin bazı menüleri göremiyor" diye hata olarak bildirdi.
Bir-iki kişilik bir mağazada ayrımın koruduğu bir şey yoktu. Artık her panel
kullanıcısı her şeyi yapabiliyor; `AdminUser.rol` sütunu bir göçle silindi.

Kendini kilitleme koruması (K-46) duruyor, ölçütü değişti: "son açık sahip"
değil **son açık hesap** kapatılamıyor ve silinemiyor; kontrol yine
değişiklikle aynı `Serializable` işlemde.

**Nerede:** [`../server/yonetim-kimlik.ts`](../server/yonetim-kimlik.ts),
[`../server/yonetim-kimlik-islem.ts`](../server/yonetim-kimlik-islem.ts),
[`../server/panel-menu.ts`](../server/panel-menu.ts)

### K-80 · Yaş grubu bir kategoriye bağlanabiliyor

Mağazada yaş grupları bölüm olarak kullanılıyor: "Kız Çocuk · 2-14 Yaş",
"Erkek Çocuk · 2-14 Yaş". Yaş süzgeci ise yalnızca bedene bakıyordu ve bir
beden tek bir gruba bağlanabiliyor. 2-14 yaş bedenlerinin hepsi erkek grubuna
bağlıydı; o yüzden **"Erkek Çocuk" süzgeci kız ürünlerini de getiriyor**, kız
grubunun hiç bedeni kalmadığı için "Kız Çocuk" süzgeci boş dönüyordu.

Bedeni birden çok gruba bağlamak çözmüyordu: iki grup yine aynı ürünleri
getirirdi, çünkü kız ve erkek ürünleri aynı bedenlerde. Ayrımı taşıyan şey
kategori. Yaş grubuna isteğe bağlı bir kategori eklendi:

- Kategori seçilirse süzgeç yalnızca o kategorinin ürünlerini getiriyor;
  grubun bedenleri de varsa ikisi birlikte geçerli.
- Bedeni olmayan grup yalnızca kategoriye göre süzüyor.
- Ne bedeni ne kategorisi olan ya da bilinmeyen bir grup **hiçbir şey**
  getirmiyor. Eskiden koşul boş kalıyor, bütün katalog listeleniyordu.
- Kategori sayfasında bir yaş grubu, seçilince en az bir ürün getirecekse
  görünüyor (K-78'in kuralı); başka kategoriye bağlı grup orada çıkmıyor.

Bağ yabancı anahtar, `SetNull` ile: kategori silinirse grup durur, bağ kalkar.

**Nerede:** [`../server/katalog.ts`](../server/katalog.ts) (`yasKosulu`),
[`../server/yonetim-yas.ts`](../server/yonetim-yas.ts),
[`../testler/yas-suzgeci-db.test.ts`](../testler/yas-suzgeci-db.test.ts)

### K-81 · Süzgeç sütununda kategori

"Tüm ürünler" sayfasında kategori seçmenin yolu yoktu: yan sütunda yaş, beden,
renk ve fiyat vardı, kategori için müşteri üst çubuğa dönmek zorundaydı.
Sütunun başına kategori düğmeleri eklendi ("Tümü" + vitrindeki kategoriler);
kategori sayfalarında da aynı liste duruyor, açık olan işaretli.

Kategori bir sorgu değeri değil, adresin kendisi (`/kiz-cocuk`): canonical
adres, site haritası ve üst çubuk zaten bunu kullanıyor. Düğme o adrese
gidiyor; açık süzgeçler geçişte korunuyor, sayfa numarası düşüyor.

**Nerede:** [`../app/(magaza)/(vitrin)/[kategori]/page.tsx`](../app/(magaza)/(vitrin)/[kategori]/page.tsx)

### K-82 · Kapalı kategori gerçekten kapalı, aynı adlı kategori açılmıyor

Canlıda kategori süzgeci ve üst çubuktaki "Kız Çocuk" / "Erkek Çocuk" görünmüyor,
"Erkek Çocuk" yaş süzgeci sıfır ürün getiriyordu. Sebep veriydi, ama veriyi bu
hâle getiren üç kod kusuru vardı:

- Eski "Uyku" (`/uyku`) ve "Aksesuar" (`/aksesuar`) kategorileri "Kız Çocuk" ve
  "Erkek Çocuk" diye yeniden adlandırılıp **kapatılmış**, ürünler onlarda
  kalmıştı. Aynı adlarla açılan yeni kategoriler (`/kiz-cocuk`,
  `/erkek-cocuk`) boştu. Vitrin kapalıyı ve boşu göstermediği için menüde
  ikisi de yoktu.
- **Aynı adla ikinci kategori açılabiliyordu.** Artık açılmıyor; yeniden
  adlandırmada da aynı kural.
- **Seçim listelerinde yalnızca ad yazıyordu:** iki "Kız Çocuk" alt alta,
  hangisinin dolu olduğu belirsiz. Yaş grubu boş olana bağlandı. Artık ad
  çakışırsa adres ekleniyor ("Kız Çocuk · /uyku"), kapalı olan işaretli —
  ürün formu, toplu taşıma, kategori silme, kampanya ve yaş grubu seçimlerinde.
- **Kapalı kategorinin ürünleri listelerde çıkmaya devam ediyordu.** Panel
  "kapalı kategori menüde ve listelerde çıkmaz" diyordu; ürünleri Tüm
  ürünler'de, aramada, yaş süzgecinde ve öne çıkanlarda görünüyordu. Artık
  çıkmıyor, kapalı kategorinin sayfası 404. Ürün sayfası doğrudan adresle
  açılmaya devam ediyor: paylaşılmış bağlantı kırılmasın.

Verinin düzeltilmesi panelden: eski kategori silinirken "Ürünler nereye
taşınsın?" bölümünde yenisi seçiliyor (K-74'ün taşıyarak silmesi).

**Nerede:** [`../ui/kategori-etiketi.ts`](../ui/kategori-etiketi.ts),
[`../server/katalog.ts`](../server/katalog.ts),
[`../server/yonetim.ts`](../server/yonetim.ts) (`kategoriKaydet`)

### K-83 · Kategori adı veritabanında tekil

K-82'deki kontrol uygulamada: önce okuyor, sonra yazıyor. Aynı anda gelen iki
istek ikisi de geçebilir. Asıl garanti artık veritabanında: `Category` üzerinde
`lower(btrim(ad))` tekil dizini. Büyük-küçük harf ve kenar boşluğu farkı ayrı ad
sayılmıyor.

- **Prisma şeması ifade dizinini tanımlayamıyor.** Dizin yalnızca göçte
  duruyor; `prisma migrate diff` onu fark saymıyor (denendi).
- **Göç çakışma varsa dizini kurmuyor, hata vermiyor.** Hata verseydi Prisma
  göçü "başarısız" işaretler ve elle çözülene kadar bütün dağıtımlar
  dururdu. Çakışma varken dizin kurulmuyor, uyarı bırakılıyor; Kategoriler
  ekranı çakışan adresleri sarı kutuda gösteriyor. Öyle bir durumda dizin,
  çakışma giderildikten sonra yeni bir göçle kurulmalı.
- **Dizin harfleri veritabanının kuralıyla küçültüyor**, uygulama ise Türkçe
  kuralla. "KIZ" ile "kiz" veritabanında aynı, uygulamada farklı. Bu yüzden
  kayıt hatası (`P2002`) da yakalanıyor ve aynı "bu adda kategori var"
  mesajına dönüyor, 500 değil.
- Testlerin ürün kurucusu her kategoriye aynı adı veriyordu; dizin bunu
  yakaladı, artık her test kategorisinin adı kendi kimliği.

**Nerede:** [`../db/migrations/20260922220000_kategori_adi_tekil/migration.sql`](../db/migrations/20260922220000_kategori_adi_tekil/migration.sql),
[`../testler/kategori-db.test.ts`](../testler/kategori-db.test.ts)

### K-84 · Ödeme sayfasında kategori menüsü yok

Ödeme adımında amaç müşterinin işlemi bitirmesi; kategori şeridi ona vitrine
dönmenin en kolay yolunu gösteriyordu. Menü (geniş ekrandaki şerit ve telefondaki
açılır menü) yalnızca `/odeme`'de gizleniyor. Logo, arama, hesap ve sepet
duruyor: sepete bir şey eklemek isteyen müşterinin geri dönüş yolu kapanmıyor.
Sipariş onay sayfasında menü geri geliyor — alışveriş bitti, gezinmek serbest.

Hesabım'da menü kalıyor: oradan çoğunlukla alışverişe dönülüyor.

Üst çubuk ortak düzende çiziliyor ve düzen açık sayfanın yolunu bilmiyor.
Menü küçük bir istemci sarmalayıcısıyla (`usePathname`) gizleniyor; sunucu
çiziminde de yok, JavaScript kapalıyken de görünmüyor (denendi).

**Nerede:** [`../ui/odemede-gizli.tsx`](../ui/odemede-gizli.tsx),
[`../ui/ust-cubuk.tsx`](../ui/ust-cubuk.tsx)

### K-85 · E-postanın gerçekten gittiği panelden denenebiliyor

Resend anahtarı tanımlanınca Satışa hazırlık "bildirimler gönderiliyor"
diyordu. Doğru değildi: gönderen adresin alan adı Resend'de doğrulanmadan her
gönderim 403 ile reddediliyor. Hata yalnızca sunucu günlüğüne düşüyordu, üstelik
Resend'in sebebi söyleyen cümlesi atılıp yalnızca durum kodu yazılıyordu. Bunu
fark etmenin tek yolu müşterinin "e-posta gelmedi" demesiydi.

- Satışa hazırlık ekranında **Deneme e-postası gönder** düğmesi. Paneli açan
  kişinin kendi adresine gidiyor — başka adres yazılabilseydi panel, mağaza
  adına herkese e-posta attıran bir form olurdu.
- Sonuç ekranda: kabul edildiyse "gelen kutusuna ya da spam'e bak",
  reddedildiyse Resend'in kendi cümlesi ve en sık durumların (alan adı
  doğrulanmamış, anahtar geçersiz, gönderen biçimi, anahtar bu dağıtımda yok)
  Türkçe karşılığı.
- Gönderim hatalarında Resend'in mesajı artık günlüğe de yazılıyor.
- Ekran gönderen adresi gösteriyor: alan adının Resend'de doğrulanan alan
  adıyla aynı olması gerekiyor.

Sahte bir Resend sunucusuyla (`EPOSTA_TABAN_ADRES`) iki yol da denendi.

**Nerede:** [`../server/eposta.ts`](../server/eposta.ts) (`denemeEpostasi`),
[`../server/eposta-deneme.ts`](../server/eposta-deneme.ts),
[`../app/yonetim/(panel)/hazirlik/page.tsx`](../app/yonetim/(panel)/hazirlik/page.tsx)

### K-86 · Resend anahtarı temizlenerek kullanılıyor, özeti panelde

Canlıdaki ilk deneme `401 API key is invalid` döndü. Anahtar ortam
değişkeninden olduğu gibi okunuyordu: Vercel'e yapıştırırken sona kaçan satır
sonu ya da `.env` alışkanlığıyla yazılan tırnaklar anahtarın parçası sayılıyor,
Resend geçerli bir anahtarı bile reddediyordu. Artık baştaki/sondaki boşluk ve
tırnak atılıyor.

Temizlik yetmediyse (anahtar eksik kopyalanmış, silinmiş, başka hesabın) ilk
soru "Vercel'deki anahtar Resend'deki mi". Deneme kutusu anahtarın ilk beş
karakterini ve uzunluğunu gösteriyor — anahtarın kendisi hiçbir yerde
gösterilmiyor. "re_" ile başlamıyorsa ya da temizlik bir şey değiştirdiyse
bunu da yazıyor.

**Nerede:** [`../server/eposta.ts`](../server/eposta.ts) (`resendAnahtari`, `anahtarOzeti`)

### K-87 · Panel kullanıcısı davetle ekleniyor, e-postası doğrulanıyor

Yeni kullanıcı eklenirken e-posta ve şifre formda yazılıyordu. Adres yanlış
yazılsa da hesap açılıyordu; şifre kişiye başka bir yoldan (mesaj, telefon)
iletilmek zorundaydı ve ekleyen kişi başkasının şifresini biliyordu.

Artık şifre sorulmuyor. Kişiye 48 saat geçerli, tek kullanımlık bir **davet
bağlantısı** gidiyor; şifresini kendisi belirliyor. Bağlantıya tıklayıp şifre
koymak e-postanın o kişiye ait olduğunu kanıtlıyor (`AdminUser.epostaDogrulandi`).

- **Davet bekleyen hesap giremiyor.** Şifresi rastgele, kimse bilmiyor; giriş
  kontrolü ayrıca doğrulanmamış hesabı reddediyor.
- **Davet bekleyen hesaba şifre atanmıyor**, "Daveti yeniden gönder" var.
  Yeni bağlantı eskisini geçersiz kılıyor. Süresi dolmuş davet bağlantısı
  "yeni bağlantı iste" değil "seni ekleyen kişiden yeniden göndermesini iste"
  diyor.
- **"Son açık hesap" sayımına davet bekleyen girmiyor** (K-46): açık ama
  giremeyen bir hesap paneli tek başına ayakta tutamaz.
- **Şifre sıfırlama da doğruluyor:** e-postaya giden bağlantıyla şifre koymak
  aynı kanıt. Davet bağlantısı sıfırlama altyapısını (tek kullanımlık jeton,
  K-47) kullanıyor; yalnızca süresi ve sayfanın başlığı farklı.
- **E-posta servisi yoksa kullanıcı açılmıyor:** davetsiz hesap kimsenin
  kullanamayacağı bir satır olurdu. Hesap açılıp davet gönderilemezse hesap
  kalıyor, hata ve "yeniden gönder" çıkıyor.
- Var olan hesaplar göçle doğrulanmış sayıldı. İlk kurulum hesabı da doğrulanmış
  açılıyor: `YONETIM_SIFRE` ile korunuyor ve o anda e-posta servisi olmayabilir.

**Nerede:** [`../server/yonetim-kimlik-islem.ts`](../server/yonetim-kimlik-islem.ts) (`kullaniciEkle`, `davetiYenidenGonder`),
[`../server/yonetim-kimlik.ts`](../server/yonetim-kimlik.ts),
[`../testler/panel-davet-db.test.ts`](../testler/panel-davet-db.test.ts)

### K-88 · Kart üzerindeki renk noktaları fotoğrafı değiştiriyor

Çok renkli bir üründe müşteri rengin nasıl göründüğünü görmek için ürüne
girmek zorundaydı; karttaki noktalar yalnızca süstü.

- **Masaüstü:** noktanın üzerine gelmek fotoğrafı o rengin fotoğrafına
  çeviriyor, fare çekilince seçili renge (yoksa ilk fotoğrafa) dönüyor.
  Klavyeyle odaklanmak da aynısını yapıyor.
- **Telefon:** üzerine gelmek yok; dokunmak rengi seçiyor ve seçim kalıyor.
  Aynı noktaya yeniden dokunmak seçimi kaldırıyor.
- **Seçilen renk kartın geri kalanına geçiyor:** "Sepete ekle" o rengin
  stoktaki ilk bedenini ekliyor (renk tükenmişse düğme kapanıyor), ürün
  bağlantısı sayfayı `?renk=` ile o renkte açıyor. Mavi fotoğrafa bakıp
  pembe eklemek, hiç değişmemesinden kötü olurdu.
- Fotoğrafın rengi panelde yüklenirken seçiliyor (K-48). Rengine ait fotoğrafı
  olmayan renkte genel fotoğraf kalıyor; hiç fotoğraf yoksa çizim o rengin
  paletine boyanıyor.
- Fare noktalara yaklaşınca renk fotoğraflarının küçük hâlleri önceden
  isteniyor: yoksa değişim anında bir süre boş kare görünüyordu.
- Kart bu yüzden istemci bileşeni oldu. Tek renkli üründe nokta düğme değil.

**Nerede:** [`../ui/urun-karti.tsx`](../ui/urun-karti.tsx)

### K-89 · Banner yalnızca bir resim olabiliyor

Banner başlık, alt yazı, düğme ve hazır çizimlerden (amblem, zıbın, tulum…)
oluşuyordu; resim yüklenemiyordu. Hazırlanmış bir kampanya görseli banner
yapılamıyordu.

Yeni banner eklerken tür seçiliyor:

- **Yalnızca resim:** banner yüklenen resmin kendisi. Başlık zorunlu değil;
  "resmin açıklaması" alternatif metin oluyor. Bağlantı verilirse resmin
  tamamı tıklanıyor. Resim kırpılmıyor, ekranın genişliğinde olduğu gibi
  görünüyor (2400 piksele kadar saklanıyor).
- **Telefon resmi (isteğe bağlı):** geniş bir görsel telefonda yazısı okunmaz
  hâle geliyor; buraya konan dik görsel dar ekranda (`<picture>`) gösteriliyor.
- **Yazı ve çizim:** eskisi gibi; başlık zorunlu.

Seçilmeyen türün alanları CSS `:has()` ile gizleniyor, JavaScript yok. İki
türün alanları ayrı adlarla: biri ötekini ezmesin.

Yükleme ürün fotoğraflarının altyapısını kullanıyor (tarayıcıda küçültme,
webp, Blob); ölçüler banner'a göre büyütüldü, "kare değil" uyarısı banner'da
kapalı. Banner silinince resim dosyaları da siliniyor.

**Nerede:** [`../ui/hero-banner.tsx`](../ui/hero-banner.tsx) (`ResimSlayt`),
[`../server/yonetim.ts`](../server/yonetim.ts) (`bannerKaydet`),
[`../app/yonetim/(panel)/banner/page.tsx`](../app/yonetim/(panel)/banner/page.tsx)

### K-90 · Banner düzenlenebiliyor; ürün sayfasında bedenler renkli

**Banner düzenleme.** Panelde yalnızca ekleme, açma-kapama ve silme vardı;
bir resmi ya da bağlantıyı değiştirmek için yeni banner ekleyip eskisini
silmek gerekiyordu. Listede her satırda "Düzenle" var; ekleme formunun
aynısı o satırın altında dolu açılıyor.

- Resim yüklemek isteğe bağlı: yeni resim seçilmezse eskisi kalıyor.
- Resim değişince eski dosyalar siliniyor — önce kayıt, sonra dosya: kayıt
  başarısız olursa eski resim kaybolmasın.
- Telefon resmi ayrıca kaldırılabiliyor.
- Tür değiştirilebiliyor; resimliden yazılıya geçince resimler temizleniyor.
- Hata olursa (başlıksız yazılı banner, yüklenemeyen resim) düzenleme formu
  açık dönüyor.

**Renkli bedenler.** Ürün sayfasındaki beden düğmeleri beyazdı; yalnızca
seçili olan renkliydi. Artık her beden ana sayfadaki "Yaşa göre" kutularının
dört pastel tonundan birinde. Ton bedenin mağazadaki sırasından geliyor, yani
"3-4 Yaş" her üründe aynı renkte. Üründeki sırasından alınsaydı aynı beden
üründen ürüne renk değiştirirdi. Seçili beden koyu bir halkayla, tükenmiş
beden eskisi gibi gri ve üstü çizili: stok bilgisi renkten önemli.

**Nerede:** [`../app/yonetim/(panel)/banner/page.tsx`](../app/yonetim/(panel)/banner/page.tsx) (`BannerFormu`),
[`../server/yonetim.ts`](../server/yonetim.ts) (`bannerKaydet`),
[`../ui/varyant-secici.tsx`](../ui/varyant-secici.tsx)

### K-91 · Fotoğrafın rengi yüklerken seçiliyor, varsayılanı akıllı

Fotoğraflar renksiz yükleniyor, sonra her fotoğrafın altındaki listeden renk
tek tek seçilip kaydediliyordu. Stok eklerken renk zaten seçilmişti; aynı
bilgi iki kez giriliyordu, beş mavi fotoğraf beş ayrı kayıt demekti.

- Yükleme formunda **Renk** seçimi var; o seferde seçilen bütün fotoğraflar o
  renge atanıyor.
- Varsayılanı: az önce stoğu eklenen renk (varyant eklemek `?renk=` ile
  dönüyor); yoksa ürünün henüz kendi fotoğrafı olmayan ilk rengi. Renk renk
  yükleyen kişiye her seferinde sıradaki renk seçili geliyor.
- "Her renk" hâlâ seçilebiliyor: kumaş yakın çekimi, etiket gibi renkten
  bağımsız kareler için. Sonradan değiştirmek her fotoğrafın altından
  yapılmaya devam ediyor.

**Rengi resimden tahmin etmek denenmedi:** arka plan, desen ve ışık yüzünden
sık yanılır; yanlış renkte görünen fotoğraf renksiz fotoğraftan kötü.

**Nerede:** [`../ui/fotograf-yonetimi.tsx`](../ui/fotograf-yonetimi.tsx),
[`../server/yonetim.ts`](../server/yonetim.ts) (`fotografEkle`, `varyantEkle`)

---

## Açık sorular

Liste ikiye ayrılıyor: **bekleyenler** (bir hesap, anahtar ya da onay lazım)
ve **kapananlar** (ne yapıldığı kayıtta dursun diye duruyorlar). Bekleyenlerin
hemen hepsinde kod hazır ve denendi; eksik olan koddan başka bir şey.

## Bekleyenler

### A-02 · Alan adı
Araştırılıyor. Açılış için gerekli. Alındığında Vercel'e bağlanıp `SITE_URL`
ortam değişkeni tanımlanacak: sitemap, canonical adresler ve yapısal veri
tek değişkenle birlikte düzeliyor (K-16).

### A-03 · Şirket ve vergi levhası
Hazırlıklara başlandı. iyzico sanal POS başvurusu bununla yapılıyor. Ödeme
kodu hazır ve denendi; başvuru sonuçlanıp anahtarlar Vercel'e girilene kadar
kart seçeneği müşteriye gösterilmiyor (K-17). Künye de buna bağlı (K-15).

### A-04 · Logonun orijinal dosyası
Mevcut değil. Vektör yeniden çizim şimdilik resmî kaynak. Açılışı engellemiyor:
her boyut vektörden üretiliyor.

### A-05 · Yasal metinlerin hukuki onayı
Dört metnin taslağı yazıldı ve panelden düzenlenebilir hâlde sitede duruyor
(K-15), ama hiçbiri avukat onayından geçmedi: hepsi taslak işaretli, yani
sayfada uyarı çıkıyor ve arama motorlarına kapalılar. Avukattan gelen metin
panele yapıştırılıp "metin hazır" işaretlendiğinde yayımlanmış olacaklar.
Şirket kurulmadan (A-03) künye de doldurulamıyor.

### A-06 · Yönetim paneli şifresi  ·  kapandı
**19 Eylül 2026'da kapandı.** Aykut Vercel'de `YONETIM_SIFRE` ortam değişkenini
tanımladı ve panele girdi. Şifre koda ya da depoya hiçbir zaman yazılmıyor.

### A-07 · Havale hesabı
Yönetim panelindeki **Satış ayarları** ekranında banka adı, hesap sahibi ve IBAN
alanı boş. Doldurulana kadar sipariş veren müşteri parayı nereye yatıracağını
göremiyor. Şirket kurulunca (A-03) hesap açılıp buraya yazılacak.

### A-08 · Fotoğraf deposunun açılması  ·  kapandı
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

### A-12 · Uyanık tutma servisi
**Bölge sorusu kapandı:** işlev de veritabanı da Frankfurt'ta (K-30). Kalan iş
soğuk açılış. `/api/canli` ucu hazır; dışarıdan bir izleme servisinde
(UptimeRobot ya da cron-job.org, ikisi de ücretsiz) beş dakikalık bir kontrol
tanımlanması gerekiyor. Bu yapılana kadar uzun süre ziyaretçi almayan sitede
ilk açılış saniyeler sürmeye devam ediyor.

### A-10 · Giriş denemesi sınırı  ·  kapandı
**21 Eylül 2026'da kapandı (K-38).** E-posta başına beş, IP başına yirmi
hatalı denemeden sonra on beş dakika kilit.

### A-11 · Kargo toplayıcısı ve fatura sağlayıcısı
Kargo (Geliver/Navlungo) ve e-arşiv fatura (Paraşüt/Bizim Hesap) hesapları
şirket kuruluşuna bağlı (A-03). Kod ikisi olmadan da çalışıyor: takip numarası
panelden giriliyor, fatura panelden yazdırılıyor (K-19, K-20). Hesaplar
açılınca entegrasyonlar tek modülde yazılacak; o zaman API dokümanlarına
bakılıp alan adları doğrulanmalı.
