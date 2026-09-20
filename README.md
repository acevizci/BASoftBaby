# BASoftBaby

Online bebek kıyafetleri ve aksesuarları mağazası.

> Yol haritasında **01, 02, 03, 03b ve 06. adımlar** tamam, **07. adımın kod
> kısmı** da bitti: proje iskeleti ve marka sistemi, katalog vitrini, yönetim
> paneli, sepet ve sipariş, üyelik, kampanya motoru, yasal metinler, SEO ve
> ölçümleme. Veriler Neon Postgres'te, panelden girilen her değişiklik
> anında mağazaya yansıyor. Sırada ödeme (iyzico) ve kargo var; ikisi de şirket
> evrakına bağlı.

## Çalıştırmak

Node.js 20 veya üstü gerekiyor.

```bash
npm install
cp .env.example .env    # içini doldur
npm run tohum           # kategorileri ve örnek ürünleri yazar
npm run dev
```

Sonra tarayıcıda `http://localhost:3000`.

`.env` içinde iki değer var: `DATABASE_URL` (Postgres bağlantısı) ve
`YONETIM_SIFRE` (yönetim panelinin şifresi). İkisi de depoya girmez; yayında
Vercel'in proje ayarlarında durur.

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu, kaydettiğin an ekranda |
| `npm run build` | Yayına çıkacak sürümü derler |
| `npm run kontrol` | Tip ve kod denetimi — göndermeden önce bunu çalıştır |
| `npm run tohum` | Kategorileri, örnek ürünleri ve duyuruları veritabanına yazar |

Yayına ilk gönderimde bu veri kendiliğinden bir kez yazılıyor; sonraki
gönderimlerde yazılmıyor, yani sildiğin örnek ürünler geri gelmiyor.

## Klasörler

| Klasör | İçinde ne var |
| --- | --- |
| `app/` | Sayfalar ve ortak çerçeve. `globals.css` marka renklerini tanımlar |
| `db/` | Veritabanı şeması, göç dosyaları ve başlangıç verisi |
| `ui/` | Ortak arayüz parçaları: duyuru şeridi, üst çubuk, alt bilgi |
| `server/` | İş kuralları. Sayfalar veriyi hep buradan okur |
| `app/(hesap)/` | Giriş, kayıt ve hesap sayfaları |
| `app/yasal/` | Sözleşmeler, KVKK ve çerez politikası sayfaları |
| `public/marka/` | Logo dosyaları (SVG ve PNG) |
| `docs/` | Plan, mimari, tasarım sistemi, kararlar |
| `tasarim/` | Gezilebilir tasarım mokapı |

## Yönetim paneli

`/yonetim` adresinde. Siparişler, ürün ekleme ve düzenleme, beden-renk stokları,
duyuru şeridi, ana sayfa banner'ı, kampanyalar ve satış ayarları (kargo ücreti,
bedava kargo eşiği, havale bilgisi). Açılabilmesi için `YONETIM_SIFRE` tanımlı olmalı; tanımlı değilse panel
kendini tamamen kapatır (404 verir), yani ayar unutulursa açıkta kalmaz.

## Sipariş akışı

Sepet veritabanında durur, tarayıcıda yalnızca sepetin kimliğini taşıyan
httpOnly bir çerez vardır. Müşteri üye olarak da üye olmadan da sipariş verir;
ödeme kartla ya da havale/EFT ile yapılır. Stok sipariş anında tek bir veritabanı işlemi içinde düşer, aynı
anda gelen iki sipariş son adedi birlikte alamaz. Müşteri siparişini numarası
ve e-postasıyla `/siparis-takip` adresinden görür. Bütün ekranlar düz HTML
formuyla çalışır, JavaScript kapalı tarayıcıda da sipariş verilebilir.

## Üyelik

Üyelik **zorunlu değil**: üye olmadan sipariş vermek olduğu gibi duruyor. Hesap
açan müşteri `/hesabim` altında siparişlerini görüyor, adres defteri tutuyor,
ad-telefon ve şifresini değiştiriyor. Sipariş formunda şifre belirlerse hesabı
sipariş verirken açılıyor; giriş yapmışsa adresi forma kendiliğinden geliyor.

Şifre saklanmıyor, scrypt özeti saklanıyor. Oturum çerezi httpOnly ve içindeki
jetonun kendisi veritabanında durmuyor, özeti duruyor. Şifre değiştirilince o
hesabın diğer cihazlardaki oturumları kapanıyor.

Henüz olmayan iki şey e-posta servisine bağlı (04. adım): **şifre sıfırlama** ve
**e-posta doğrulaması**. Doğrulama olmadığı için üyelikten önce verilmiş
siparişler hesaba kendiliğinden bağlanmıyor — onlar `/siparis-takip` sayfasından
numara ve e-postayla görülüyor. Gerekçesi: doğrulanmamış bir e-posta o kutunun
sahibi olduğunun kanıtı değil.

Yönetim paneli bu üyelikten ayrı; o `YONETIM_SIFRE` ile korunmaya devam ediyor.

## Kartla ödeme

Kart ödemesi **iyzico** ile. Müşteri kartını iyzico'nun kendi ekranında girer,
bankasının 3D Secure doğrulamasını orada geçer, taksit seçeneklerini de orada
görür; **kart bilgisi bize hiç ulaşmaz.**

Kart seçeneği yalnızca `IYZICO_API_ANAHTARI` ve `IYZICO_GIZLI_ANAHTAR` tanımlı
olduğunda görünür. Anahtarlar sanal POS başvurusu sonuçlanınca Vercel'in proje
ayarlarına girilir; o zamana kadar havale/EFT tek başına çalışır. Sandbox
anahtarları `sandbox-` ile başlar ve kendiliğinden sandbox adresine gider.

Ödemenin alındığı iyzico'ya ayrıca sorulur ve cevabın imzası doğrulanır; dönüş
çağrısındaki hiçbir bilgiye güvenilmez. Tutar siparişle tutmazsa ödeme başarılı
sayılmaz. Aynı dönüş iki kez gelirse ikincisi hiçbir şeyi değiştirmez.

Sipariş açılırken stok düşer, yani ödeme boyunca rezervedir. Ödeme tutmazsa
sipariş iptal olur, stok geri verilir ve **sepet geri doldurulur** — müşteri
ürünleri baştan seçmek zorunda kalmaz. Ödeme ekranını kapatıp gidenler için 15
dakikada bir çalışan zamanlı iş (`vercel.json`) 30 dakikayı geçen girişimleri
temizler.

## Yasal metinler ve künye

Mesafeli satış sözleşmesi, ön bilgilendirme formu, KVKK aydınlatma metni ve
çerez politikası `/yasal/<sayfa>` adreslerinde ve alt bilgiden bağlantılı.
Metinler koda gömülü değil: **panelden düzenleniyor** (Yönetim → Yasal
metinler), yani avukattan gelen metin yayın beklemeden yapıştırılabiliyor.

Her metin **taslak** olarak duruyor: sayfanın tepesinde uyarı çıkıyor, sayfa
arama motorlarına kapalı ve site haritasına girmiyor. Panelde "metin hazır"
işaretlenince üçü birden düzeliyor — bunu avukat onayı gelmeden işaretleme.

Aynı ekranda **künye** var: unvan, adres, vergi dairesi ve numarası, MERSİS ve
ETBİS numarası, destek telefonu ve e-postası. Bu bilgiler alt bilgide, yasal
metinlerin altında ve ana sayfanın yapısal verisinde görünüyor; boş bıraktığın
satır hiç basılmıyor.

Sipariş verirken **sözleşme onayı zorunlu**: kutu işaretlenmeden sipariş
oluşmuyor, kontrol sunucuda yapılıyor ve onay anı siparişe yazılıp sipariş
kartında görünüyor.

## Arama motorları ve ölçümleme

`/sitemap.xml` ve `/robots.txt` kendiliğinden üretiliyor. Harita ana sayfayı,
kategorileri, ürünleri, yardım sayfalarını ve **yayımlanmış** yasal metinleri
listeliyor; saatte bir yenilendiği için panelden eklenen ürün bir sonraki
dağıtımı beklemiyor. Robots dosyası yönetim panelini, hesap sayfalarını,
sepeti, ödemeyi ve sipariş adreslerini dizine kapatıyor.

Ürün sayfalarında fiyat ve stok durumu yapısal veri olarak da veriliyor, yani
Google ürünü tanıyor. Kategori sayfalarında süzgeçler canonical adrese
girmiyor.

Alan adı alınınca Vercel'de **`SITE_URL`** tanımlanmalı: site haritası,
canonical adresler ve yapısal veri bu değişkeni kullanıyor. Tanımlı değilse
Vercel'in verdiği üretim adresi kullanılıyor.

Ziyaret sayıları **Vercel Analytics** ile ölçülüyor: çerez kullanmıyor,
ziyaretçiyi tanımlamıyor. Bu yüzden çerez onay bandı yok — sitedeki çerezlerin
tamamı (sepet, oturum, kupon, son sipariş) zorunlu çerez. Ölçümün çalışması
için Vercel panelinde Analytics'in açılması gerekiyor.

## Hareketli alanlar

Sitede kendiliğinden hareket eden iki yer var ve ikisi de panelden yönetiliyor:
en üstteki **duyuru şeridi** (kayan yazı) ve ana sayfadaki **banner** (sırayla
geçen tanıtım alanı). İkisinin geçişi de tamamen CSS ile yapılıyor, JavaScript
kullanmıyor. Cihazında "hareketi azalt" ayarı açık olan ziyaretçide ikisi de
durur; şeritte mesajlar sabit görünür, banner'da ilk banner kalır. Bu
erişilebilirlik gereği, kapatılabilir bir ayar değil.

Banner tek başınayken dönmez, sabit durur: geçişi görmek için en az iki banner
gerekiyor. Bu yüzden başlangıç verisi üç örnek banner yazıyor. Örnekler bir kez
yazılır (`StoreSetting.bannerTohumu` işareti), panelden silinirse sonraki
yayında geri gelmezler.

## Ürün fotoğrafları

Panelde ürünü açınca altta **Fotoğraflar** bölümü var. Birden fazla dosya birden
seçilebiliyor; her fotoğraf yüklenirken en fazla 1400 piksele küçültülüp webp'ye
çevriliyor, kartlar için 600 piksellik ikinci bir kopya da saklanıyor. Telefonla
çekilmiş büyük dosyalar sorun değil.

Ok düğmeleriyle sıralanıyor, ilk sıradaki kapak fotoğrafı oluyor. Fotoğrafı olan
ürün kartta, ürün sayfasında ve sepette fotoğrafıyla görünüyor; olmayan ürün
çizimiyle görünmeye devam ediyor, yani ürünler tek tek geçirilebiliyor.

Dosyalar yayında **Vercel Blob**'da duruyor. Çalışması için Vercel panelinde
Storage bölümünden bir Blob deposu oluşturulup projeye bağlanması gerekiyor;
bağlanmadan yüklemeye çalışılırsa panel bunu söylüyor. Yerelde geliştirirken
jeton gerekmiyor, dosyalar `.yuklenen/` klasörüne yazılıyor.

## Yardım sayfaları

Alt bilgideki Yardım sütunu gerçek sayfalara gidiyor: beden rehberi, kargo ve
teslimat, iade ve değişim, sıkça sorulanlar. Kargo ücreti ve bedava kargo sınırı
bu sayfalarda ve ana sayfadaki güven satırında **sabit yazılmıyor**, satış
ayarından okunuyor; panelden ücret değişince metin de değişiyor, sepetle
çelişmiyor.

Kurumsal sütunundaki yasal metinler (mesafeli satış sözleşmesi, ön
bilgilendirme formu, KVKK, çerez politikası) avukat işi ve şirket kaydına bağlı;
bu yüzden bağlantı verilmedi, düz yazı duruyor.

## Kampanyalar

Yüzde ya da sabit tutar indirimi; tüm ürünlere, bir kategoriye ya da tek ürüne
uygulanabilir. İsteğe bağlı kupon kodu, sepet alt sınırı ve tarih aralığı
verilebilir. **İndirimler üst üste binmez:** bir sepete birden çok kampanya
uyarsa yalnızca en çok indiren uygulanır, müşteri de hangisi olduğunu sepette
görür.

## Belgeler

| Dosya | Ne anlatıyor |
| --- | --- |
| [`docs/01-kurulus-plani.md`](docs/01-kurulus-plani.md) | Kapsam, teknoloji seçimi ve gerekçesi, Türkiye'ye özel yasal zorunluluklar, özellik önerileri, yol haritası |
| [`docs/02-mimari.md`](docs/02-mimari.md) | Sistem haritası, klasör yapısı, veri modeli, ödeme ve kargo akışları, baştan verilen sekiz teknik karar |
| [`docs/03-tasarim-sistemi.md`](docs/03-tasarim-sistemi.md) | Renk paleti, yazı tipleri, bileşenler, 28 ekranın listesi |
| [`docs/04-kararlar.md`](docs/04-kararlar.md) | Verilmiş kararlar ve hâlâ açık olan sorular |
| [`docs/05-marka.md`](docs/05-marka.md) | Logo dosyalarının hangisi nerede kullanılır, renk kodları, kullanım kuralları |
| [`tasarim/mokap.html`](tasarim/mokap.html) | 28 ekranlık tasarım mokapı — tarayıcıda açman yeterli, kurulum gerekmez |

## Özet

**Ne yapıyoruz:** Ürün ve görsel yönetimi, kampanya ve indirimler, online ödeme,
kargo etiketi basma ve fatura kesme yeteneği olan bir mağaza.

**Teknoloji:** Next.js + TypeScript + Tailwind CSS. Vitrin ve yönetim paneli tek
kod tabanında. Ödeme iyzico, kargo tek entegrasyonla Yurtiçi/Aras/MNG/PTT,
fatura e-arşiv, yayın Vercel üzerinde.

**Yol haritası:** 01 marka ve iskelet → 02 katalog ve yönetim paneli →
03 sepet, üyelik, sipariş → 04 ödeme → 05 kargo ve fatura →
06 kampanya ve indirim motoru → 07 yasal metinler, SEO ve açılış.

## Durum

- [x] Kuruluş planı
- [x] Sistem mimarisi
- [x] Marka ve tasarım sistemi
- [x] Logo (vektör olarak yeniden çizildi)
- [x] 28 ekranlık tasarım mokapı
- [x] 01. adım: proje iskeleti ve marka sistemi
- [x] 02. adım: katalog vitrini (ana sayfa, kategori, süzgeç, ürün detayı)
- [x] Veritabanı (Neon Postgres) ve yönetim paneli
- [x] Sepet, sipariş ve sipariş takibi (havale/EFT ile)
- [x] Kampanya ve kupon motoru
- [x] Panelden yönetilen, dönen ana sayfa banner'ı
- [x] Yardım sayfaları (beden, kargo, iade, SSS)
- [x] Panelden ürün fotoğrafı yükleme
- [ ] Gerçek ürünlerin girilmesi
- [ ] Havale hesabının panele girilmesi
- [ ] Üyelik (alan adı ve e-posta servisi gelince)
- [ ] 04. adım: kredi kartıyla ödeme (iyzico)
