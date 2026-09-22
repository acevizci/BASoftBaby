# BASoftBaby

Online bebek kıyafetleri ve aksesuarları mağazası.

> **Yol haritasındaki yedi adımın kodu da yazıldı.** Proje iskeleti ve marka
> sistemi, katalog vitrini, yönetim paneli, sepet ve sipariş, üyelik, kampanya
> motoru, kartla ödeme, e-postalar, kargo ve fatura, yasal metinler, SEO ve
> ölçümleme. Geriye dış hesaplar kaldı: iyzico, Resend, kargo toplayıcısı ve
> e-arşiv sağlayıcısı. Hiçbiri tanımlı değilken de mağaza çalışıyor — sipariş
> alınıyor, kargoya veriliyor, fatura kesiliyor. Veriler Neon Postgres'te, panelden girilen her değişiklik
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
`YONETIM_SIFRE` (panelin **kurulum** şifresi — yalnızca ilk kullanıcıyı
oluşturmak için; sonrasında panele kişisel hesaplarla giriliyor ve bu değişken
silinebilir). İkisi de depoya girmez; yayında Vercel'in proje ayarlarında
durur.

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu, kaydettiğin an ekranda |
| `npm run build` | Yayına çıkacak sürümü derler |
| `npm run goc` | Bekleyen veritabanı göçlerini uygular (yapı da bunu çağırır) |

Bu üçü her gönderimde GitHub Actions'ta da çalışıyor (K-37).
| `npm run kontrol` | Tip ve kod denetimi — göndermeden önce bunu çalıştır |
| `npm run tohum` | Kategorileri, örnek ürünleri ve duyuruları veritabanına yazar |

Yayına ilk gönderimde bu veri kendiliğinden bir kez yazılıyor; sonraki
gönderimlerde yazılmıyor, yani sildiğin örnek ürünler geri gelmiyor.

Göçler de yapı sırasında uygulanıyor. Göç kilidi meşgulse yapı düşmüyor:
kilidi tutan oturum çalışıyorsa bekliyor, yarıda kesilmiş bir dağıtımdan
kalmışsa temizleyip geçiyor (K-25).

## Klasörler

| Klasör | İçinde ne var |
| --- | --- |
| `app/` | Kök çerçeve (yazı tipleri, `globals.css`) ve yönlendirme |
| `app/(magaza)/` | Mağaza sayfaları ve mağaza çerçevesi: duyuru şeridi, üst çubuk, alt bilgi |
| `app/yonetim/` | Yönetim paneli; kendi çerçevesi, mağaza başlığı olmadan (K-43) |
| `db/` | Veritabanı şeması, göç dosyaları ve başlangıç verisi |
| `ui/` | Ortak arayüz parçaları: duyuru şeridi, üst çubuk, alt bilgi, katlanır bölüm |
| `server/` | İş kuralları. Sayfalar veriyi hep buradan okur |
| `app/(magaza)/(hesap)/` | Giriş, kayıt ve hesap sayfaları |
| `app/(magaza)/yasal/` | Sözleşmeler, KVKK ve çerez politikası sayfaları |
| `public/marka/` | Logo dosyaları (SVG ve PNG) |
| `docs/` | Plan, mimari, tasarım sistemi, kararlar |
| `tasarim/` | Gezilebilir tasarım mokapı |

## Yönetim paneli

`/yonetim` adresinde, kendi çerçevesinde: mağazanın başlığı, arama kutusu ve
sepeti panelde görünmüyor. Menü dört grupta (Satış, Katalog, Vitrin, Ayarlar),
açık sayfa işaretli ve bekleyen iş sayıları maddelerin yanında — müşterinin
beklediği işler dolu renkte, mağazanın kendi işleri sessiz. Telefonda menü
açılır hâlde, kapalı başlıkta bekleyen iş toplamı yazıyor (K-43).

Özet ekranı günlük yapılacakları gösteriyor: havale onayı
bekleyen ve hazırlanacak siparişler, geciken kargolar, tükenen bedenler,
"gelince haber ver" diyenler ve tamamlanmamış ayarlar — her biri kendi
listesine bağlanıyor (K-32).

**Günün işi** (`/yonetim/gunluk`): ödemesi tamamlanmış ve henüz kargoya
verilmemiş siparişler, yanında birleştirilmiş toplama listesi — beş siparişte
geçen aynı bedeni bir kez raftan alıyorsun. Yazdırılabiliyor. Kargoya
verilişinin üstünden uzun süre geçen siparişler sipariş listesinde rozetle
işaretleniyor; taşıyıcı bildirimi bağlanana kadar teslim işaretleme elle
yapılıyor — tahmine dayalı otomatik tarih müşterinin 14 günlük cayma hakkını
kısaltırdı (K-59).

Siparişler (numara, ad, e-posta, telefon ve kargo takip
numarasıyla arama; durum, ödeme ve tarih süzgeçleri; listeden seçip toplu
durum değiştirme ve toplu kargo etiketi yazdırma, K-48), ürün ekleme ve düzenleme,
beden-renk stokları (arama, "sorunlular / bitenler / hepsi" süzgeci ve
sayfalama; süzgeçli görünümde stoğu yerinde bedenler katlanmış durur, K-44),
kategoriler (açma, adını değiştirme, sıralama, kapatma, silme — dolu bir
kategori silinirken ürünlerin nereye taşınacağı soruluyor, K-52),
ürün silme (sipariş geçmişi etkilenmiyor; satılmış ürün için onay isteniyor),
ürün listesinde toplu pasife alma / yayına alma / silme — toplu silmede
siparişte geçmiş ürünler atlanıyor ve kaç tanesinin atlandığı yazılıyor (K-53);
toplu işlem çubuğu ancak bir kutu işaretlendiğinde çıkıyor (K-55),
Excel/CSV'den toplu ürün yükleme, satış raporu (dönem seçimi, grafik, CSV),
duyuru şeridi,
ana sayfa banner'ı, kampanyalar ve satış ayarları (kargo ücreti,
bedava kargo eşiği, havale bilgisi).

Panelde her işlem sonucunu söylüyor — silme, aç/kapat, sıralama dahil. Geri
alınamayan her silme iki adımlı onay istiyor ve ne kaybolacağını yazıyor:
ürün, kategori, toplu ürün, kullanıcı, fotoğraf, beden, varyant, kampanya,
banner, duyuru ve müşteri adresi. Onay kutusu kapatılabilir şeylerde ikinci
yolu da gösteriyor ("silmek yerine kapat") — çoğu zaman istenen şey silmek
değil (K-57, K-61).

Ürün formundaki **Değişiklikleri kaydet** düğmesi sayfanın sonunda: form
sayfanın ortasında bitiyor ama düğme HTML'in `form` niteliğiyle dışarıdan
bağlı. Yapışkan değil — yapışkan hâli içeriğin üstünde gezen bir çubuğa
dönüşüyordu (K-61, K-63).

**Bedenler panelden yönetiliyor** (`/yonetim/bedenler`): yeni beden ekleme,
ad ve boy-kilo ölçülerini değiştirme, sıralama, kapatma ve silme. Ad
değiştirilince o bedendeki ürünler de taşınıyor, satılmış siparişlerin kaydı
olduğu gibi kalıyor. Üründe kullanılan beden silinemiyor — kapatılıyor; son
açık beden de kapatılamıyor (K-56).

Beden-boy-kilo tablosu mağazadaki beden rehberinde olduğu gibi ürün
düzenleme ve stok ekranlarında da var; rakamlar tek kaynaktan geliyor
(K-55, K-56).

**Ödemesi tamamlanmamış ya da iptal edilmiş siparişe kargo etiketi ve fatura
basılmıyor** — etiket basmak "gönderiyorum" demek, fatura ise satışın
belgesi. Kural tek modülde (`server/siparis-belge.ts`); bağlantılar
çıkmıyor, sayfalar adres elle yazılsa da reddediyor, toplu etikette
atlananların numarası yazılıyor (K-54).

Sol menüde ikonlar var ve geniş ekranda daraltılabiliyor (210px ↔ 56px);
tercih çerezde tutulduğu için sayfalar arasında kalıyor ve JavaScript kapalı
tarayıcıda da çalışıyor. Dar menüde rozet sayısı noktaya dönüşüyor, madde
adları ekran okuyucu için duruyor (K-60).

### Panele giriş ve kullanıcılar

Panel kendi giriş ekranında (`/yonetim/giris`), site temasıyla. Tarayıcının
kendi şifre kutusu bırakıldı: biçimlendirilemiyordu, Türkçe değildi ve çıkış
yapmanın yolu yoktu (K-45).

Her kişinin kendi e-postası ve şifresi var. İki rol: **sahip** kullanıcı
ekleyip çıkarabiliyor, **yönetici** paneldeki her şeyi yapabiliyor ama
kullanıcılara dokunamıyor. Kendini kapatmak, silmek ya da son sahibi düşürmek
engelli.

İlk kurulum: hiç kullanıcı yokken giriş sayfası "ilk kullanıcıyı oluştur"
hâline geçiyor ve `YONETIM_SIFRE` ile korunuyor. Hesap açıldıktan sonra o
şifreyle kimse giriş yapamıyor ve değişken silinebilir. Ortam değişkeni hiç
tanımlı değilse ve kullanıcı da yoksa sayfa 404 veriyor — ayar unutulursa
panel açıkta kalmıyor.

**Şifremi unuttum** giriş ekranında: e-postaya bir saat geçerli, tek
kullanımlık bir bağlantı gidiyor, sıfırlayınca bütün cihazlardaki oturumlar
kapanıyor (K-47). E-posta servisi bağlı değilken sayfa bunu açıkça söylüyor
ve gitmeyecek bir bağlantı için "gönderdik" demiyor.

**Ayrıca:** panele girmenin başka yolu olmadığı için **her zaman
en az bir açık sahip kalıyor.** Silme, kapatma ve rol düşürme bunu bozacaksa
hiç uygulanmıyor; kontrol değişiklikle aynı veritabanı işleminde ve
`Serializable` yalıtımla yapılıyor, yani iki kişi aynı anda birbirini silse
bile biri geri çevriliyor (K-46). Tek sahipsen panel bunu ekranda söylüyor ve
ikinci bir sahip açmanı öneriyor — şifreni unutursan seni içeri alabilecek
tek şey o.

Oturum 12 saat (müşterininki 30 gün): panelde stok, sipariş ve müşteri
bilgisi var. Kapatılan ya da şifresi değiştirilen bir kullanıcının açık
oturumları anında düşüyor. Giriş denemesi sınırı müşteri tarafıyla ortak
(K-38).

## Ürün sayfası

Fotoğraf galerisi: küçük görsele basınca büyük kare değişiyor, büyük kareye
basınca fotoğraf tam ekran büyüyor. İkisi de `:target` ile, JavaScript
olmadan — geri tuşu çalışıyor, bağlantı paylaşılabiliyor (K-48).

Tükenmiş beden üstü çizili, tükenmiş renk çapraz çizgili — ikisi de **seçili
öteki seçeneğe göre** hesaplanıyor ve ekran okuyucuya ayrıca söyleniyor
(K-49). Tükenmiş seçenek tıklanabilir kalıyor: "stoka girince haber ver"
formu oradan açılıyor. Listede tükenmiş ürünün fotoğrafında "Tükendi" rozeti
var.

Renk adres satırında (`?renk=mavi`): seçim JavaScript kapalıyken de çalışıyor
ve galeri o renge ait fotoğrafları gösteriyor. Panelden her fotoğrafa bir
renk atanıyor; boş bırakılanlar (kumaş yakın çekimi, etiket) her renkte
görünüyor.

## İptal ve iade

Müşteri sipariş takip sayfasından kendi iptal, iade ya da beden değişimi
talebini açıyor; siparişin tamamını değil tek bir ürünü de iade edebiliyor.
Hangi siparişe ne açılabileceğine sunucu karar veriyor: kargoya verilmemişse
iptal, verilmişse iade, teslimden sonra 14 gün içinde iade ve değişim (K-33).
Onaylanan iptal siparişi iptal edip stoğu geri veriyor.

Parası alınmış bir sipariş iptal edilirse ödeme durumu **&quot;İade bekliyor&quot;**
oluyor: mağazanın müşteriye borcu olduğu kayıtta duruyor. Eskiden
&quot;ödeme bekliyor&quot;a düşüyordu, yani alınmış paranın izi siliniyordu (K-57).

**İade tamamlanınca** (ürün fiilen elinize geçince) iade edilen adetler stoğa
geri giriyor ve tutar kadar iade kaydı açılıyor. Tutar satır satır
hesaplanıyor: kampanya indiriminin o satıra düşen payı çıkarılıyor, kargo ise
yalnızca siparişin tamamı iade edildiğinde ekleniyor — parça parça iade
edildiyse de, birikimli sayıldığı için sonunda ekleniyor. **Değişimde** eski
ürün stoğa girer, yerine gönderilen bedenin stoğu düşer; panel hangi bedenin
gönderildiğini soruyor (K-58).

`/yonetim/iadeler` mağazanın müşteriye borçlu olduğu paraların listesi: havale
iadesi elle gönderilip işaretleniyor, kart iadesi iyzico'ya tek düğmeyle
gidiyor (anahtarlar tanımlıysa). Panelden elle iade kaydı da açılabiliyor.

## Üyelik

Üye kendi siparişini hesabında görüyor; iptal, iade ve değerlendirme formları
orada (K-36). Verilerini JSON olarak indirebiliyor ve hesabını silebiliyor —
silme ekranı sipariş ve fatura kayıtlarının yasal saklama süresince kalacağını
açıkça yazıyor (K-39).

Giriş denemesi sınırlı: e-posta başına beş, IP başına yirmi hatalı denemeden
sonra on beş dakika kilit. Kilit hesabın var olup olmadığını ele vermiyor
(K-38).

## Arama

Üst çubuktaki kutudan. Türkçe harflere dikkat etmek gerekmiyor: "zibin" de
"ZIBIN" da "Zıbın"ı buluyor. Ad, özet, açıklama, özellikler ve kumaş
içeriğinde aranıyor; birden çok kelime yazılırsa hepsinin bulunması gerekiyor.

Yazarken altta öneriler çıkıyor, ama bu bir kolaylık: JavaScript kapalıyken
kutu düz bir forma dönüşüp sonuç sayfasına gidiyor (K-35).

Listeler sıralanabiliyor (önerilen, önce ucuz, önce pahalı, yeniler, puana
göre). Küçük ekranda kategoriler açılır menüde; ikisi de JavaScript
gerektirmiyor (K-40).

## Değerlendirmeler

Ürün değerlendirmesini yalnızca o ürünü satın alıp teslim alan müşteri
yazabiliyor; sipariş takip sayfasından. Yorum kendiliğinden yayımlanıyor,
olumsuz olanlar da. Gizleme yalnızca içerik kuralı için (hakaret, kişisel
veri) ve sebep yazmadan yapılamıyor (K-34).

Ürünün puanı yalnızca gerçek değerlendirmelerden hesaplanıyor. Hiç yorum
yoksa puan boş kalıyor ve yıldız satırı hiç görünmüyor.

## E-posta

Sipariş onayı, ödeme onayı, kargo bildirimi, şifre sıfırlama ve e-posta
doğrulaması kendiliğinden gidiyor. Bunlar işlemin parçası, izin gerektirmiyor.

Sepetinde ürün bırakan üyeye günde bir kez hatırlatma gönderiliyor — ama
yalnızca kayıt olurken kutuyu **işaretlemiş** ve adresini doğrulamış üyeye,
sepet başına bir kez, altında tek tıkla listeden çıkma bağlantısıyla. Ticari
elektronik iletinin kuralı bu (K-27). Üyeliksiz sepetlere hiç gönderilmiyor:
sahibinin adresi bilinmiyor.

Tükenmiş bir beden-renk için "gelince haber ver" bırakılabiliyor. Bu izin
istemiyor — müşterinin kendi isteği, tek bir olay için. Haber verildiği an
adres siliniyor (K-28).

`RESEND_ANAHTARI` tanımlı değilse hiçbir e-posta gönderilmiyor ve akışlar
çalışmaya devam ediyor.

## Tanı

Panelin **Tanı** sayfası sunucu işlevinin ve veritabanının hangi bölgede
olduğunu, bağlantı kurma ve sorgu sürelerini, işlev örneğinin yaşını
gösteriyor. Yavaşlık şüphesinde ilk bakılacak yer (K-29).

`/api/canli` uyanık tutma ucu: `select 1` yapıp döner. Dışarıdan bir izleme
servisiyle beş dakikada bir çağrıldığında hem Vercel işlevi hem Neon uyanık
kalıyor; soğuk açılışın saniyeleri böyle gidiyor (K-30).

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

Yönetim paneli bu üyelikten tamamen ayrı: ayrı tablo, ayrı çerez, ayrı
oturum. Müşteri oturumu hiçbir koşulda panele geçiş vermiyor.

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
ürünleri baştan seçmek zorunda kalmaz. Ödeme ekranını kapatıp gidenlerin
tuttuğu stok iki yerde serbest bırakılır: yeni bir sipariş açılmadan hemen önce
ve günde bir çalışan zamanlı işte (`vercel.json`). Zamanlı iş günlüktür çünkü
Vercel'in Hobby planı daha sık çalıştırmaya izin vermez; asıl temizlik zaten
sipariş anında yapılır.

## E-postalar

Sipariş onayı, ödeme onayı, şifre sıfırlama ve e-posta doğrulama e-postaları
**Resend** ile gönderilir. Çalışması için `RESEND_ANAHTARI` ve
`EPOSTA_GONDEREN` tanımlanmalı; gönderen adresin alan adı Resend'de
doğrulanmış olmalı. Anahtar yokken e-posta gönderilmez, **akışlar çalışmaya
devam eder**: sipariş alınır, hesap açılır, bağlantı üretilir; yalnızca
gönderilemediği günlüğe yazılır.

Kart siparişinde onay e-postası ödeme sonucundan sonra gider; havalede sipariş
anında.

## Üyelikte e-posta

**Şifremi unuttum** `/sifremi-unuttum` adresinde: adres kayıtlı olsa da olmasa
da aynı cevap verilir. Bağlantı 1 saat geçerli, tek kullanımlık; sıfırlama
sonrası o hesabın bütün oturumları kapanır.

**E-posta doğrulama** kayıt sırasında gönderilir. Doğrulanınca, üye olmadan o
adresle verilmiş **eski siparişler hesaba bağlanır** — doğrulama olmadan
bağlanmaz, çünkü doğrulanmamış bir adres o kutunun sahibi olunduğunun kanıtı
değildir. Şifre sıfırlamak da adresi doğrulanmış sayar.

## Kargo

Sipariş ekranındaki **Kargo** bölümünde taşıyıcıyı seçip takip numarasını
yazıyorsun. Kaydedince sipariş "kargoda" oluyor ve müşteriye taşıyıcının kendi
sorgulama bağlantısıyla birlikte e-posta gidiyor; aynı numarayı tekrar
kaydetmek ikinci e-posta göndermiyor.

**Etiketi yazdır** bağlantısı barkodlu bir kargo etiketi açıyor: gönderici
künyesi, alıcı adresi ve Code 128 barkodu. Barkod, takip numarası girilmişse
onu, girilmemişse sipariş numarasını taşıyor. Tarayıcının yazdır komutuyla
basılıyor; yazdırmada yalnızca etiket kalıyor.

Kargo toplayıcısı (Geliver/Navlungo) henüz bağlı değil — hesap şirket kaydına
bağlı. Bağlanınca gönderi kendiliğinden açılacak; etiket, bildirim ve durum
akışı aynı kalacak. `KARGO_BILDIRIM_SIRRI` tanımlanırsa `/api/kargo/durum`
ucundan gelen durum bildirimleriyle sipariş "kargoda" ve "teslim edildi"
olarak kendi kendine ilerliyor, teslimde müşteriye e-posta gidiyor.

## Fatura

Sipariş ekranından **Fatura oluştur** dediğinde numara veriliyor ve KDV,
sipariş toplamından geriye ayrıştırılıyor (fiyatlar KDV dahil). Oran satış
ayarlarından değiştiriliyor; **kesilmiş faturalar sonradan değişmiyor.**

**Faturayı yazdır** e-arşiv düzeninde bir belge açıyor: satıcı künyesi, alıcı,
kalemler, matrah, KDV ve genel toplam. Resmî faturayı e-arşivde kestikten
sonra numarasını ve belgesinin adresini aynı ekrana yazabilir, durumu
"kesildi" yapabilirsin.

**Sevk irsaliyesi** ayrı bir belge ve ayrı bir seri numarası taşıyor
(`BA-I-2026-0001`): fatura satışın belgesi, irsaliye malın belgesi — kutunun
yanında gidiyor. **Fiyat yazmıyor**, çünkü kutuyu açan kargo görevlisinin ya
da hediye alıcısının tutarı görmesi gerekmiyor. Düzenleme tarih-saati ile
fiili sevk tarih-saati ayrı tutuluyor; sevk anı kargo kaydedildiğinde
kendiliğinden doluyor (K-59).

**Erişilebilirlik.** Mağaza ve panelde, açık ve koyu temada, görünür her
yazının zeminine karşı kontrastı ölçülüyor ve WCAG AA eşiğini (normal yazıda
4,5:1) geçiyor. Marka paletinin pastel tonları yazıda ve düğme zemininde
kullanılmıyor; birincil düğme kendi belirtecini kullanıyor ve iki temada ayrı
çözülüyor — açık temada koyu zemin + beyaz yazı, koyu temada açık zemin +
koyu yazı (K-62).

## Bekleyen siparişler ve kötüye kullanım

Sipariş açılırken stok hemen düşülüyor, yoksa son adedi iki kişi alabilirdi.
Bunun karşılığı: **bekleyen bir sipariş stoğu tutuyor.** Havale siparişine
panelden ayarlanan bir ödeme süresi tanınıyor (varsayılan 72 saat); süre
dolunca sipariş kendiliğinden iptal oluyor ve ürünler yeniden satışa
açılıyor. Bitmesine 24 saat kala müşteriye bir hatırlatma gidiyor. Süreye 0
yazılırsa otomatik iptal kapanıyor. Panelde sipariş listesinde kalan süre
rozetle görünüyor (K-64).

Temizlik hem günlük zamanlı işte hem de **sipariş verilmeden hemen önce**
çalışıyor: zamanlı iş günde bir kez çalıştığı için son adet bedenler onu
bekleyemez.

Kimlik istemeyen işlemlerde hız sınırı var: sipariş oluşturma, değerlendirme,
iade talebi ve "gelince haber ver". Sayaç giriş sınırıyla aynı tabloyu
kullanıyor; sınır aşılınca sebebi ekranda yazıyor. Sayaç çalışmazsa işlem
engellenmiyor — sınır bir koruma, satışın önkoşulu değil.

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

## Hız ve önbellek

Kategoriler, duyuru şeridi, yasal metinler, künye, satış ayarları ve kampanya
listesi **önbellekte** durur; bunlar her sayfada gereken ama seyrek değişen
veriler. Panelden bir şey kaydedilince önbellek düşer, değişiklik ziyaretçiye
saniyesinde yansır.

**Sepet, oturum, hesap ve siparişler hiçbir zaman önbelleğe girmez** — kişiye
özeldirler. Ürün listeleri 30 saniyelik önbellektedir, yani listedeki stok o
kadar bayatlayabilir; ürün sayfası ve sipariş anı stoğu her zaman doğrudan
veritabanından okur.

Bu düzenleme sayfa başına veritabanı sorgusunu ana sayfada 21'den 1'e, ürün
sayfasında 21'den 6'ya indirdi (ayrıntı: `docs/04-kararlar.md`, K-22).

## Bekleme göstergeleri

Yeni sayfa hazırlanırken en üstte marka renklerinde ince bir şerit akar; form
gönderilirken düğme kapanıp "Ekleniyor…", "Siparişin alınıyor…" gibi yazar,
böylece iki kez basılmaz.

Next'in `loading.tsx` bekleme ekranı **bilerek kullanılmadı**: o yöntem sayfayı
Suspense sınırına alıp içeriği gizli bir kutuda gönderiyor ve bir betikle
açıyor — JavaScript kapalı tarayıcıda içerik hiç görünmüyor. Çizgi bunun
yerine yalnızca tarayıcıda çalışan küçük bir bileşen; sunucudan giden HTML'e
karışmıyor.

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

## Yaş ve beden

Kategori sayfalarında **yaş** ve **beden** ayrı iki süzgeç. Yaş grubu birden
çok bedeni kapsar: "6-12 ay" hem 6-9 hem 9-12 bedenindeki ürünleri getirir.
Ana sayfadaki yaş kutuları da bu gruplara gider.

Her bedenin **boy karşılığı** süzgecin içinde yazar; ürün sayfasında seçili
bedenin boy ve kilo aralığı görünür ve iki yerde de beden rehberine bağlantı
vardır. Ölçü tablosu tek yerde (`ui/katalog-bicim.ts`) durur; beden rehberi
sayfası da oradan okur.

Süzgeçler birleşince **aynı varyantı** ararlar: "6-9 ay" + "mint" seçen
müşteri, o bedende ve o renkte stoğu olan ürünleri görür.

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

Liste iki bölümde: **kodda biten** işler ve **dışarıdan bir şey bekleyenler.**
Ayrım önemli, çünkü bekleyenlerin çoğunda kod hazır ve denendi — eksik olan
bir hesap, bir anahtar ya da bir onay (ayrıntısı `docs/04-kararlar.md`
içindeki "Açık sorular").

### Kodda biten

- [x] Kuruluş planı, sistem mimarisi, marka ve tasarım sistemi
- [x] Logo (vektör olarak yeniden çizildi), 28 ekranlık tasarım mokapı
- [x] Proje iskeleti, katalog vitrini (ana sayfa, kategori, süzgeç, arama, ürün detayı)
- [x] Veritabanı (Neon Postgres) ve yönetim paneli
- [x] Sepet, sipariş, sipariş takibi ve havale/EFT akışı
- [x] Üyelik: kayıt, giriş, e-posta doğrulama, adres defteri, siparişlerim
- [x] KVKK: veri indirme ve hesap silme
- [x] Kredi kartıyla ödeme (iyzico) — kod yazıldı ve denendi, anahtar bekliyor
- [x] Kargo: gönderi kaydı, barkodlu etiket, takip bağlantısı, durum ucu
- [x] Fatura ve sevk irsaliyesi (panelden yazdırılıyor)
- [x] İptal, iade ve değişim akışı; para iadesi kaydı ve takibi
- [x] Kampanya ve kupon motoru
- [x] Panelden yönetilen dönen ana sayfa banner'ı ve duyuru şeridi
- [x] Ürün, kategori, beden ve stok yönetimi; Excel/CSV ile toplu ürün yükleme
- [x] Değerlendirmeler, "gelince haber ver", bırakılan sepet hatırlatması
- [x] Satış raporu (dönem, grafik, kırılımlar, CSV) ve günün işi ekranı
- [x] Panel kullanıcıları, roller, şifre sıfırlama, giriş denemesi sınırı
- [x] Yardım sayfaları (beden, kargo, iade, SSS) ve yasal metin altyapısı
- [x] SEO: sitemap, robots, yapısal veri, canonical adresler
- [x] Erişilebilirlik: iki temada WCAG AA kontrast denetimi
- [x] JavaScript kapalı tarayıcıda çalışan tam satın alma akışı

### Dışarıdan bir şey bekleyenler

- [ ] **Gerçek ürünlerin ve fotoğraflarının girilmesi** — ürün görselleri hâlâ çizim
- [ ] **Havale hesabının panele girilmesi** (A-07) — doldurulana kadar müşteri parayı nereye yatıracağını göremiyor
- [ ] **Alan adı** (A-02) — `SITE_URL` buna bağlı
- [ ] **E-posta servisi anahtarı** (A-09) — alan adına bağlı; anahtar yokken e-postalar gönderilmiyor, akışlar çalışıyor
- [ ] **Şirket kuruluşu** (A-03) — iyzico sanal POS, künye ve vergi bilgileri buna bağlı
- [ ] **Yasal metinlerin avukat onayı** (A-05) — dördü de taslak işaretli, arama motorlarına kapalı
- [ ] **Kargo toplayıcısı ve fatura sağlayıcısı hesapları** (A-11) — ikisi de şirkete bağlı
- [ ] **Uyanık tutma servisi** (A-12) — `/api/canli` hazır, dışarıdan beş dakikalık kontrol tanımlanacak
