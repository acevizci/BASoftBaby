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
Şifre sıfırlama, e-posta doğrulaması, sipariş onay e-postası ve eski
siparişlerin hesaba bağlanması buna bağlı. Planda Resend var; alan adı (A-02)
alınınca 04. adımda kurulacak. O zamana kadar şifresini unutan müşterinin
yazması gerekiyor.

### A-10 · Giriş denemesi sınırı
Şu an yanlış şifre denemesi sayılmıyor. scrypt her denemeyi kendiliğinden
yavaşlatıyor, ama sürekli deneyen birine karşı hesap ya da IP başına bir sınır
gerekiyor. Ödeme adımıyla birlikte ele alınacak.
