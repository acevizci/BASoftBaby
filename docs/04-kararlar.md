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
silebilen kim" sorusunun cevapsız kalmasının zararı olurdu.

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

### A-12 · Uyanık tutma servisi
**Bölge sorusu kapandı:** işlev de veritabanı da Frankfurt'ta (K-30). Kalan iş
soğuk açılış. `/api/canli` ucu hazır; dışarıdan bir izleme servisinde
(UptimeRobot ya da cron-job.org, ikisi de ücretsiz) beş dakikalık bir kontrol
tanımlanması gerekiyor. Bu yapılana kadar uzun süre ziyaretçi almayan sitede
ilk açılış saniyeler sürmeye devam ediyor.

### A-10 · Giriş denemesi sınırı
**21 Eylül 2026'da kapandı (K-38).** E-posta başına beş, IP başına yirmi
hatalı denemeden sonra on beş dakika kilit.

### A-11 · Kargo toplayıcısı ve fatura sağlayıcısı
Kargo (Geliver/Navlungo) ve e-arşiv fatura (Paraşüt/Bizim Hesap) hesapları
şirket kuruluşuna bağlı (A-03). Kod ikisi olmadan da çalışıyor: takip numarası
panelden giriliyor, fatura panelden yazdırılıyor (K-19, K-20). Hesaplar
açılınca entegrasyonlar tek modülde yazılacak; o zaman API dokümanlarına
bakılıp alan adları doğrulanmalı.
