/**
 * Başlangıç verisi.
 *
 * Mağaza ilk açıldığında boş görünmesin diye kategoriler, örnek ürünler ve
 * duyuru şeridi mesajları buradan yazılır. `npm run tohum` ile çalışır ve
 * tekrar tekrar çalıştırılabilir: var olan kaydı günceller, yenisini ekler,
 * eldeki stoğu ya da sonradan girilmiş ürünleri silmez.
 *
 * Örnek ürünler gerçek ürünler girilince yönetim panelinden silinebilir.
 *
 * `--bir-kez` ile çağrıldığında (yayın adımı böyle çağırıyor) yalnızca ilk
 * seferinde çalışır: mağaza ayarındaki `tohumAtildi` işareti konduktan sonra
 * hiçbir şey yapmaz. Böylece silinen örnek ürünler sonraki yayında geri gelmez.
 */

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "./uretilen/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Yerelde .env dosyasindan okur; Vercel'de degisken zaten ortamda hazir.
const yerelEnv = path.join(process.cwd(), ".env");
if (fs.existsSync(yerelEnv)) process.loadEnvFile(yerelEnv);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL tanımlı değil.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const KATEGORILER = [
  { slug: "yenidogan", ad: "Yenidoğan", aciklama: "İlk aylar için en yumuşak kumaşlar", sira: 1 },
  { slug: "zibin-body", ad: "Zıbın & Body", aciklama: "Günlük kullanımın temel parçası", sira: 2 },
  { slug: "tulum", ad: "Tulum", aciklama: "Tek parça, kolay giydirilen kalıplar", sira: 3 },
  { slug: "uyku", ad: "Uyku", aciklama: "Uyku tulumu, battaniye ve örtüler", sira: 4 },
  {
    slug: "aksesuar",
    ad: "Aksesuar",
    aciklama: "Şapka, patik, önlük ve küçük tamamlayıcılar",
    sira: 5,
  },
];

type TohumUrun = {
  slug: string;
  ad: string;
  ozet: string;
  kategori: string;
  gorsel: string;
  palet: string;
  fiyatKurus: number;
  eskiFiyatKurus?: number;
  rozetTon?: string;
  rozetYazi?: string;
  puan: number;
  yorumSayisi: number;
  kumasIcerigi: string;
  yikamaTalimati: string;
  ozellikler: string[];
  /** [renk, beden, stok] üçlüleri */
  varyantlar: [string, string, number][];
};

function varyantlar(renkler: string[], bedenler: string[], stoklar: number[]) {
  const cikti: [string, string, number][] = [];
  renkler.forEach((renk, ri) => {
    bedenler.forEach((beden, bi) => {
      cikti.push([renk, beden, stoklar[(ri * bedenler.length + bi) % stoklar.length]]);
    });
  });
  return cikti;
}

const URUNLER: TohumUrun[] = [
  {
    slug: "ayiciklu-organik-body",
    ad: "Ayıcıklı organik body",
    ozet: "Kısa kollu, çıtçıtlı",
    kategori: "zibin-body",
    gorsel: "zibin",
    palet: "mercan",
    fiyatKurus: 24990,
    rozetTon: "mercan",
    rozetYazi: "Çok satan",
    puan: 4.8,
    yorumSayisi: 126,
    kumasIcerigi: "%100 organik pamuk",
    yikamaTalimati: "30°C hassas yıkama, çamaşır suyu kullanmayın",
    ozellikler: ["Dikişsiz omuz bandı", "Çıtçıtlı alt kapama", "OEKO-TEX sertifikalı"],
    varyantlar: varyantlar(
      ["mercan", "krem", "mint", "mavi", "sari"],
      ["0-3 ay", "3-6 ay", "6-9 ay", "9-12 ay"],
      [12, 8, 0, 5, 3, 14, 7, 2],
    ),
  },
  {
    slug: "fitilli-pamuk-tulum",
    ad: "Fitilli pamuk tulum",
    ozet: "Fermuarlı, ayaklı",
    kategori: "tulum",
    gorsel: "tulum",
    palet: "mint",
    fiyatKurus: 42990,
    eskiFiyatKurus: 49990,
    rozetTon: "mint",
    rozetYazi: "İndirimde",
    puan: 4.9,
    yorumSayisi: 84,
    kumasIcerigi: "%95 pamuk, %5 elastan",
    yikamaTalimati: "30°C hassas yıkama, düşük ısıda ütüleyin",
    ozellikler: ["Boydan fermuar", "Kapalı ayak", "Çenelik korumalı fermuar ucu"],
    varyantlar: varyantlar(
      ["mint", "krem", "mavi"],
      ["0-3 ay", "3-6 ay", "6-9 ay", "9-12 ay", "12-18 ay"],
      [6, 9, 4, 0, 11, 2],
    ),
  },
  {
    slug: "muslin-battaniye-120x120",
    ad: "Müslin battaniye 120×120",
    ozet: "Çift kat, dört mevsim",
    kategori: "uyku",
    gorsel: "battaniye",
    palet: "mavi",
    fiyatKurus: 37990,
    puan: 4.7,
    yorumSayisi: 203,
    kumasIcerigi: "%100 pamuk müslin",
    yikamaTalimati: "40°C yıkama, her yıkamada yumuşar",
    ozellikler: ["Tek beden 120×120 cm", "Nefes alan dokuma", "Kundak olarak da kullanılır"],
    varyantlar: [
      ["mavi", "0-3 ay", 18],
      ["mint", "0-3 ay", 7],
      ["krem", "0-3 ay", 0],
      ["sari", "0-3 ay", 24],
    ],
  },
  {
    slug: "bambu-patik-2li",
    ad: "Bambu patik · 2'li",
    ozet: "Kaydırmaz tabanlı",
    kategori: "aksesuar",
    gorsel: "patik",
    palet: "sari",
    fiyatKurus: 15990,
    eskiFiyatKurus: 19990,
    rozetTon: "mercan",
    rozetYazi: "%20",
    puan: 4.6,
    yorumSayisi: 51,
    kumasIcerigi: "%70 bambu, %30 pamuk",
    yikamaTalimati: "30°C yıkama, kurutma makinesine vermeyin",
    ozellikler: ["Kaydırmaz silikon taban", "Lastiği bacağı sıkmaz", "İkili paket"],
    varyantlar: varyantlar(["sari", "krem", "mercan"], ["0-3 ay", "3-6 ay", "6-9 ay"], [15, 0, 6, 9, 3]),
  },
  {
    slug: "kadife-sapka",
    ad: "Kadife şapka",
    ozet: "Kulak korumalı",
    kategori: "aksesuar",
    gorsel: "sapka",
    palet: "krem",
    fiyatKurus: 18990,
    rozetTon: "sari",
    rozetYazi: "Son 3 adet",
    puan: 4.9,
    yorumSayisi: 37,
    kumasIcerigi: "%100 pamuk kadife, astarlı",
    yikamaTalimati: "Elde yıkama, gölgede kurutun",
    ozellikler: ["Kulakları kapatan kesim", "Bağcıksız, boğmaz", "Astarlı iç yüzey"],
    varyantlar: varyantlar(["krem", "mint", "mavi", "sari"], ["0-3 ay", "3-6 ay", "6-9 ay"], [1, 2, 0, 3]),
  },
  {
    slug: "organik-zibin-3lu-set",
    ad: "Organik zıbın · 3'lü set",
    ozet: "Uzun kollu, dikişsiz",
    kategori: "yenidogan",
    gorsel: "zibin",
    palet: "mint",
    fiyatKurus: 21990,
    eskiFiyatKurus: 28990,
    rozetTon: "mercan",
    rozetYazi: "%24",
    puan: 4.8,
    yorumSayisi: 168,
    kumasIcerigi: "%100 organik pamuk",
    yikamaTalimati: "30°C hassas yıkama, ilk yıkamayı giymeden yapın",
    ozellikler: ["Üç adet bir arada", "Dikişsiz yan bantlar", "Bebek eli kapatmalı kol ucu"],
    varyantlar: varyantlar(
      ["mint", "krem", "mercan", "mavi", "sari"],
      ["0-3 ay", "3-6 ay", "6-9 ay"],
      [22, 14, 9, 0, 17, 6],
    ),
  },
  {
    slug: "pamuklu-onluk-3lu",
    ad: "Pamuklu önlük · 3'lü",
    ozet: "Su geçirmez arkalı",
    kategori: "aksesuar",
    gorsel: "onluk",
    palet: "mercan",
    fiyatKurus: 13990,
    rozetTon: "mint",
    rozetYazi: "Yeni",
    puan: 4.5,
    yorumSayisi: 29,
    kumasIcerigi: "%100 pamuk ön yüz, su geçirmez arka",
    yikamaTalimati: "40°C yıkama, sık yıkamaya dayanıklı",
    ozellikler: ["Çıtçıtlı boyun", "Üçlü paket", "Leke tutmayan yüzey"],
    varyantlar: [
      ["mercan", "0-3 ay", 31],
      ["sari", "0-3 ay", 12],
      ["mint", "0-3 ay", 8],
    ],
  },
  {
    slug: "uyku-tulumu-25-tog",
    ad: "Uyku tulumu · 2.5 TOG",
    ozet: "Kolsuz, fermuarlı",
    kategori: "uyku",
    gorsel: "tulum",
    palet: "mavi",
    fiyatKurus: 62990,
    eskiFiyatKurus: 74990,
    rozetTon: "mercan",
    rozetYazi: "%16",
    puan: 4.9,
    yorumSayisi: 92,
    kumasIcerigi: "%100 pamuk dış, elyaf dolgu",
    yikamaTalimati: "30°C yıkama, dolgusu topaklanmaz",
    ozellikler: ["Kış kalınlığı 2.5 TOG", "Ters yönde fermuar", "Kolsuz kesim, terletmez"],
    varyantlar: varyantlar(["mavi", "krem", "mint"], ["0-3 ay", "3-6 ay", "6-9 ay", "9-12 ay"], [4, 7, 0, 2, 9]),
  },
];

/**
 * Ana sayfadaki dönen banner boş görünmesin diye üç örnek. Panelden
 * düzenlenebilir ya da silinebilir; bir kez yazıldıktan sonra geri gelmezler.
 */
const BANNERLAR = [
  {
    baslik: "Minik bedenlere, yumuşacık kumaşlar",
    altYazi:
      "%100 organik pamuk, dikişsiz bantlar, kolay çıtçıtlı kalıplar. Bebeğin hassas cildi için seçilmiş ürünler.",
    dugmeYazi: "Tüm ürünler",
    dugmeLink: "/urunler",
    palet: "sari",
    gorsel: "amblem",
    sira: 1,
  },
  {
    baslik: "Yenidoğan setleri hazır",
    altYazi:
      "Hastane çantasına giren her şey tek pakette: zıbın, tulum, şapka ve patik.",
    dugmeYazi: "Yenidoğan ürünleri",
    dugmeLink: "/yenidogan",
    palet: "mint",
    gorsel: "zibin",
    sira: 2,
  },
  {
    baslik: "750 TL üzeri kargo bizden",
    altYazi: "Aynı gün kargo, 14 gün içinde koşulsuz iade.",
    dugmeYazi: "Alışverişe başla",
    dugmeLink: "/urunler",
    palet: "mercan",
    gorsel: "battaniye",
    sira: 3,
  },
];

/**
 * Yasal metinlerin başlangıç taslakları.
 *
 * Metinler koda gömülü değil, veritabanında duruyor ve panelden düzenleniyor:
 * avukattan gelen metin yayın beklemeden yapıştırılabilsin. Buradakiler
 * taslak işaretiyle yazılıyor, yani sayfanın tepesinde "bu metin taslak"
 * uyarısı çıkıyor. Var olan sayfanın içeriğine dokunulmuyor — panelden
 * yapılan düzeltme tohum tekrar çalışınca geri alınmasın.
 */
const YASAL_SAYFALAR = [
  {
    slug: "on-bilgilendirme-formu",
    baslik: "Ön bilgilendirme formu",
    ozet: "Sipariş vermeden önce bilmen gerekenler: ürün, fiyat, teslimat, cayma hakkı.",
    sira: 1,
    icerik: `Bu form, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli
Sözleşmeler Yönetmeliği uyarınca, siparişini vermeden önce bilmen gerekenleri
özetler. Siparişi onayladığında bu formu okuduğunu kabul etmiş olursun.

## Satıcı
Satıcının unvanı, adresi, vergi bilgileri ve iletişim kanalları sayfanın
altındaki künyede yer alır.

## Ürün ve fiyat
Sipariş ettiğin ürünlerin adı, adedi, bedeni ve rengi ile birim fiyatları
sipariş özetinde gösterilir. Fiyatlara KDV dahildir. Kargo ücreti ve varsa
indirim, sipariş özetinde ayrı satırlarda görünür; ödeyeceğin toplam tutar
siparişi onaylamadan önce ekranda yazar.

## Ödeme
Ödeme şu anda havale/EFT ile alınmaktadır. Siparişi verdikten sonra banka
bilgileri ekranda gösterilir; açıklama kısmına sipariş numaranı yazman
gerekir. Kredi kartıyla ödeme eklendiğinde bu bölüm güncellenecektir.

## Teslimat
Ürünler, ödemenin hesaba geçmesinden sonra hazırlanır ve anlaşmalı kargo
firmasına teslim edilir. Kargo süresi ve ücretleri "Kargo ve teslimat"
sayfasında yazılıdır. Teslimat, siparişte belirttiğin adrese yapılır.

## Cayma hakkı
Teslim tarihinden itibaren 14 gün içinde hiçbir gerekçe göstermeden ve ceza
ödemeden cayma hakkın vardır. Cayma bildirimini künyedeki iletişim
kanallarından iletebilirsin. Cayma hakkının kullanılabilmesi için ürünün
kullanılmamış, etiketleri sökülmemiş ve tekrar satılabilir durumda olması
gerekir.

## Cayma hakkının kullanılamadığı hâller
Hijyen kuralları gereği ambalajı açıldığında iade edilemeyen ürünler ile
müşterinin isteği üzerine kişiye özel hazırlanan ürünlerde cayma hakkı
kullanılamaz. Bu ürünler, ürün sayfasında açıkça belirtilir.

## İade ve geri ödeme
İade edilen ürün elimize ulaştıktan sonra ödeme, 14 gün içinde ödeme yaptığın
yönteme iade edilir. Ayrıntılar "İade ve değişim" sayfasındadır.

## Şikâyet ve itiraz
Uyuşmazlıklarda, parasal sınırlar dâhilinde Tüketici Hakem Heyetlerine veya
Tüketici Mahkemelerine başvurabilirsin. Parasal sınırlar her yıl Ticaret
Bakanlığı tarafından belirlenir.`,
  },
  {
    slug: "mesafeli-satis-sozlesmesi",
    baslik: "Mesafeli satış sözleşmesi",
    ozet: "Sipariş verdiğinde kurulan sözleşmenin metni.",
    sira: 2,
    icerik: `Bu sözleşme, sipariş verdiğin anda satıcı ile alıcı arasında kurulur.
Siparişi onaylamadan önce ön bilgilendirme formunu da okuman gerekir.

## Taraflar
SATICI: Sayfanın altındaki künyede unvanı, adresi, vergi dairesi ve numarası,
MERSİS ve ETBİS bilgileri ile iletişim kanalları yazılı tüzel/gerçek kişi.

ALICI: Sipariş formunda ad, adres ve iletişim bilgilerini veren kişi.

## Konu
Sözleşmenin konusu, alıcının satıcıya ait internet sitesinden elektronik
ortamda sipariş verdiği ürünlerin satışı ve teslimidir. Ürünlerin temel
nitelikleri, satış fiyatı, ödeme ve teslimat bilgileri sipariş özetinde ve ön
bilgilendirme formunda yer alır.

## Genel hükümler
- Alıcı, sipariş öncesinde ön bilgilendirme formunu okuduğunu ve onayladığını
  kabul eder.
- Ürün, ödemenin satıcıya ulaşmasının ardından hazırlanır ve yasal süre içinde
  kargoya verilir.
- Kargo firması kaynaklı gecikmelerde satıcı, alıcıyı bilgilendirir.
- Ürünün hasarlı ya da eksik teslim edildiği durumlarda alıcı, teslim aldığı
  anda kargo görevlisine tutanak tutturmalı ve satıcıya bildirmelidir.
- Sipariş edilen ürünün tükenmesi hâlinde satıcı, durumu alıcıya bildirir ve
  ödenen tutarı iade eder.

## Cayma hakkı
Alıcı, teslim tarihinden itibaren 14 gün içinde cayma hakkını kullanabilir.
Cayma hakkının kapsamı, kullanım şekli, istisnaları ve geri ödeme süresi ön
bilgilendirme formunda ayrıntılı olarak açıklanmıştır.

## Kişisel veriler
Sipariş sırasında verilen kişisel veriler, siparişin yerine getirilmesi
amacıyla işlenir. Ayrıntılar "Gizlilik ve KVKK" sayfasındadır.

## Yetkili merciler
Uyuşmazlıklarda Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.

## Yürürlük
Alıcının siparişi onaylamasıyla bu sözleşme kurulmuş sayılır ve taraflar
hükümleriyle bağlı olur. Sözleşmenin bir örneği alıcının e-posta adresine
gönderilir.`,
  },
  {
    slug: "gizlilik-kvkk",
    baslik: "Gizlilik ve KVKK",
    ozet: "Kişisel verilerinin nasıl işlendiği, kimlerle paylaşıldığı ve hakların.",
    sira: 3,
    icerik: `Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca, kişisel
verilerinin nasıl işlendiğini açıklar.

## Veri sorumlusu
Veri sorumlusu, sayfanın altındaki künyede yer alan satıcıdır.

## İşlenen veriler
- Kimlik ve iletişim: ad soyad, e-posta, telefon
- Teslimat: adres, ilçe, il, posta kodu, sipariş notu
- Sipariş: sipariş numarası, ürünler, tutarlar, ödeme ve kargo durumu
- Hesap: e-posta, şifrenin geri döndürülemez özeti, adres defteri
- Teknik: oturum ve sepet çerezleri

Şifrenin kendisi hiçbir yerde saklanmaz; yalnızca geri döndürülemez bir özeti
tutulur. Kart bilgisi ise hiçbir aşamada bize ulaşmaz.

## İşleme amaçları
- Siparişin alınması, hazırlanması, kargolanması ve takibi
- İade ve değişim taleplerinin karşılanması
- Yasal saklama ve faturalandırma yükümlülüklerinin yerine getirilmesi
- Talep ve şikâyetlerin yanıtlanması

## Hukuki sebep
Veriler, sözleşmenin kurulması ve ifası ile satıcının hukuki yükümlülüklerini
yerine getirmesi hukuki sebeplerine dayanarak işlenir. Pazarlama amaçlı
e-posta gönderimi, yalnızca ayrıca açık rıza verilmesi hâlinde yapılır.

## Aktarım
Veriler; kargo firmasına (teslimat için), ödeme kuruluşuna (ödeme için),
muhasebe ve e-fatura hizmet sağlayıcısına ve yetkili kamu kurumlarına, yalnızca
ilgili işlemin gerektirdiği ölçüde aktarılır.

## Saklama süresi
Sipariş ve fatura kayıtları, ilgili mevzuatın öngördüğü süre boyunca saklanır.
Hesap verileri, hesap silinene kadar tutulur.

## Haklar
KVKK'nın 11. maddesi uyarınca; verilerine erişme, düzeltilmesini veya
silinmesini isteme, işlemeye itiraz etme ve zararın giderilmesini talep etme
haklarına sahipsin. Taleplerini künyedeki iletişim kanallarından iletebilirsin;
başvurular en geç 30 gün içinde yanıtlanır.`,
  },
  {
    slug: "cerez-politikasi",
    baslik: "Çerez politikası",
    ozet: "Sitede hangi çerezler var, ne işe yarıyorlar.",
    sira: 4,
    icerik: `Bu sayfa, sitede hangi çerezlerin kullanıldığını ve neden kullanıldığını
açıklar.

## Kullanılan çerezler
- **sepet** — sepetinin kimliğini taşır. İçeriği tarayıcıda değil sunucuda
  durur; çerez httpOnly'dir, yani JavaScript okuyamaz. 30 gün yaşar.
- **oturum** — giriş yaptıysan hesabını tanır. Yine httpOnly'dir ve içinde
  şifren bulunmaz. 30 gün yaşar, çıkış yapınca silinir.
- **kupon** — yazdığın kupon kodunu sipariş tamamlanana kadar taşır.
- **son-siparis** — sipariş onay sayfasını yalnızca siparişi veren kişiye
  açmak için kullanılır, bir gün yaşar.

## Reklam ve takip çerezi yok
Sitede reklam çerezi, sosyal medya piksel kodu veya kişiyi siteler arasında
izleyen üçüncü taraf çerezi kullanılmaz.

## Ölçümleme
Ziyaret sayıları, çerez kullanmayan ve ziyaretçiyi tanımlamayan bir ölçümleme
ile toplanır; hangi sayfanın kaç kez açıldığı görülür, kişi görülmez.

## Çerezleri kapatmak
Yukarıdaki çerezlerin tamamı sitenin çalışması için zorunludur: kapatılırsa
sepet ve giriş çalışmaz. Tarayıcının ayarlarından çerezleri her zaman
silebilir veya engelleyebilirsin.`,
  },
];

const DUYURULAR = [
  { metin: "750 TL ve üzeri siparişlerde kargo bedava", sira: 1 },
  { metin: "Aynı gün kargo · saat 16:00'a kadar verilen siparişler bugün çıkar", sira: 2 },
  { metin: "Hediye paketi ücretsiz", sira: 3 },
];

/**
 * Örnek bannerlar, başlangıç verisinden ayrı bir işaretle korunuyor: mağaza
 * çoktan tohumlanmış olsa bile bir kez yazılsınlar, ama panelden silindikten
 * sonra bir daha geri gelmesinler.
 */
async function bannerTohumla() {
  const ayar = await db.storeSetting.findUnique({ where: { id: "tek" } });
  if (ayar?.bannerTohumu) return;

  for (const b of BANNERLAR) {
    const varOlan = await db.heroBanner.findFirst({ where: { baslik: b.baslik } });
    if (!varOlan) await db.heroBanner.create({ data: b });
  }

  await db.storeSetting.upsert({
    where: { id: "tek" },
    update: { bannerTohumu: true },
    create: { id: "tek", bannerTohumu: true },
  });

  console.log(`${BANNERLAR.length} örnek banner yazıldı.`);
}

async function main() {
  // Başlangıç verisinden bağımsız: kendi işaretiyle bir kez çalışır.
  await bannerTohumla();

  const birKez = process.argv.includes("--bir-kez");
  if (birKez) {
    const ayar = await db.storeSetting.findUnique({ where: { id: "tek" } });
    if (ayar?.tohumAtildi) {
      console.log("Başlangıç verisi daha önce yazılmış, atlandı.");
      return;
    }
  }

  for (const k of KATEGORILER) {
    await db.category.upsert({
      where: { slug: k.slug },
      update: { ad: k.ad, aciklama: k.aciklama, sira: k.sira },
      create: k,
    });
  }

  for (const u of URUNLER) {
    const kategori = await db.category.findUniqueOrThrow({ where: { slug: u.kategori } });
    const alanlar = {
      ad: u.ad,
      ozet: u.ozet,
      categoryId: kategori.id,
      fiyatKurus: u.fiyatKurus,
      eskiFiyatKurus: u.eskiFiyatKurus ?? null,
      kumasIcerigi: u.kumasIcerigi,
      yikamaTalimati: u.yikamaTalimati,
      ozellikler: u.ozellikler,
      rozetTon: u.rozetTon ?? null,
      rozetYazi: u.rozetYazi ?? null,
      gorsel: u.gorsel,
      palet: u.palet,
      puan: u.puan,
      yorumSayisi: u.yorumSayisi,
    };

    const urun = await db.product.upsert({
      where: { slug: u.slug },
      update: alanlar,
      create: { slug: u.slug, ...alanlar },
    });

    for (const [renk, beden, stok] of u.varyantlar) {
      await db.productVariant.upsert({
        where: { productId_beden_renk: { productId: urun.id, beden, renk } },
        // Stok mağazanın gerçek verisi; tohum onu ezmez, yalnızca yoksa yazar.
        update: {},
        create: {
          productId: urun.id,
          beden,
          renk,
          stok,
          sku: `${u.slug}-${beden.replace(/\s/g, "")}-${renk}`,
        },
      });
    }
  }

  for (const y of YASAL_SAYFALAR) {
    const varOlan = await db.legalPage.findUnique({ where: { slug: y.slug } });
    if (!varOlan) await db.legalPage.create({ data: { ...y, taslakMi: true } });
  }

  for (const d of DUYURULAR) {
    const varOlan = await db.announcement.findFirst({ where: { metin: d.metin } });
    if (!varOlan) await db.announcement.create({ data: d });
  }

  await db.storeSetting.upsert({
    where: { id: "tek" },
    update: { tohumAtildi: true },
    create: { id: "tek", tohumAtildi: true },
  });

  const [kategori, urun, varyant, duyuru, yasal] = await Promise.all([
    db.category.count(),
    db.product.count(),
    db.productVariant.count(),
    db.announcement.count(),
    db.legalPage.count(),
  ]);
  console.log(
    `Tamam: ${kategori} kategori, ${urun} ürün, ${varyant} varyant, ${duyuru} duyuru, ${yasal} yasal metin.`,
  );
}

main()
  .catch((hata) => {
    console.error(hata);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
