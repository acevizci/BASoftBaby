"use server";

/**
 * Yönetim panelinin yazma işlemleri.
 *
 * Hepsi sunucuda çalışır; tarayıcıya hiç veritabanı kodu gitmez. Her
 * değişiklikten sonra vitrin sayfaları yenilenir, yoksa müşteri eski fiyatı
 * görmeye devam eder.
 */

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { fiyatiKaydet } from "@/server/fiyat-gecmisi";
import { db } from "@/server/veritabani";
import { Prisma } from "@/db/uretilen/client";
import { TUM_ETIKETLER } from "@/server/onbellek";
import { DURUMLAR, ODEME_DURUMLARI } from "@/ui/siparis-bicim";
import { BANNER_GORSELLERI, BANNER_PALETLERI } from "@/server/banner";
import { GorselHatasi, gorselDosyalariniSil, gorselYukle } from "@/server/gorsel-depo";
import { TASIYICILAR, takipAdresi, tasiyiciAdi } from "@/server/kargo";
import { faturaOlustur } from "@/server/fatura";
import { belgeBasilabilirMi } from "@/server/siparis-belge";
import { irsaliyeOlustur, irsaliyeSevkiniYaz } from "@/server/irsaliye";
import { after } from "next/server";
import { adresAyrilmisMi, slugYap } from "@/server/slug";
import { silinenleriYonlendir } from "@/server/urun-yonlendirme";
import { indexNowBildir } from "@/server/arama-motoru";
import { renkKodlari } from "@/server/renkler";
import { formSayfaEki, tasimaSayfaEki } from "@/ui/sayfalama-bicim";
import { formAramaEki } from "@/ui/panel-arama-bicim";
import { aramaMetniniTazele } from "@/server/arama";
import { stokBildirimleriniGonder } from "@/server/stok-bildirimi";
import { renkAdlari } from "@/server/renkler";
import {
  cakismaAdresi,
  stokAdresi,
  stokDegisiklikleri,
  stoklariYaz,
  suzgeciCoz as stokSuzgeciniCoz,
} from "@/server/stok-ekrani";
import {
  suzgecAdresi as siparisSuzgecAdresi,
  suzgeciCoz as siparisSuzgeciniCoz,
} from "@/server/siparis-arama";
import { kargoyaVerildiEpostasi, odemeAlindiEpostasi } from "@/server/eposta";
import { KAMPANYA_TIPLERI } from "@/server/kampanya";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { hareketYaz } from "@/server/stok-hareket";
import { maliyetiGecmiseYaz } from "@/server/maliyet";
import { tutarCoz } from "@/server/tutar";
import { siparisiIptalEtVeStoguIadeEt } from "@/server/odeme-akis";

/**
 * Kaydedildikten sonra dönülecek adres; katlanır bölüm açık kalsın diye.
 *
 * Forma gizli alan olarak konan `ac` değeri doğrudan adrese yazılmıyor:
 * yalnızca harf, rakam ve tire kabul ediliyor, gerisi atılıyor (K-44).
 */
function acikDonus(yol: string, form: FormData, ek = "kayit=1"): string {
  const ac = String(form.get("ac") ?? "").trim();
  const temiz = /^[a-z0-9-]{1,40}$/.test(ac) ? ac : "";
  return temiz ? `${yol}?${ek}&ac=${temiz}#${temiz}` : `${yol}?${ek}`;
}

/**
 * Panelde bir şey kaydedilince vitrini tazeler.
 *
 * Sayfa önbelleğinin yanında veri önbelleğinin etiketleri de düşürülüyor:
 * kategoriler, ayarlar, duyurular ve yasal metinler istekler arasında
 * saklandığı için (bkz. server/onbellek.ts) değişiklik ancak böyle anında
 * görünür.
 */
function vitriniYenile() {
  // `updateTag`, server action içinde kullanılan biçim: kaydeden kişi
  // yönlendirildiği sayfada kendi değişikliğini hemen görüyor.
  for (const etiket of TUM_ETIKETLER) updateTag(etiket);
  revalidatePath("/", "layout");
}

/**
 * Paneldeki tutar kutuları. Türkçe yazım (K-115): "1.250" bin iki yüz elli,
 * "1.249,90" ve "249,90" de olur. Eskiden nokta her zaman ondalık
 * sayılıyordu; "1.250" yazılan fiyat 12,50 ₺ kaydediliyordu.
 */
function kurusaCevir(deger: FormDataEntryValue | null): number | null {
  if (deger === null) return null;
  return tutarCoz(String(deger));
}

function metin(form: FormData, ad: string): string {
  return String(form.get(ad) ?? "").trim();
}

export async function urunKaydet(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const eskiSlug = metin(form, "eskiSlug");
  const ad = metin(form, "ad");
  const fiyatKurus = kurusaCevir(form.get("fiyat"));

  if (!ad || fiyatKurus === null) {
    throw new Error("Ürün adı ve geçerli bir fiyat gerekli.");
  }

  const kategoriSlug = metin(form, "kategori");
  const kategori = await db.category.findUniqueOrThrow({ where: { slug: kategoriSlug } });

  // Çizim rengi boş gelirse listedeki ilk renk: "mint" sabiti renk listesi
  // panele taşınınca (K-66) silinmiş bir renge işaret edebilirdi.
  const renkler = await renkKodlari();
  const paletGirdisi = metin(form, "palet");

  const rozetYazi = metin(form, "rozetYazi");
  const alanlar = {
    ad,
    ozet: metin(form, "ozet"),
    categoryId: kategori.id,
    fiyatKurus,
    eskiFiyatKurus: kurusaCevir(form.get("eskiFiyat")),
    alisFiyatKurus: kurusaCevir(form.get("alisFiyat")),
    kumasIcerigi: metin(form, "kumasIcerigi"),
    yikamaTalimati: metin(form, "yikamaTalimati"),
    ozellikler: metin(form, "ozellikler")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    rozetTon: rozetYazi ? metin(form, "rozetTon") : null,
    rozetYazi: rozetYazi || null,
    gorsel: metin(form, "gorsel") || "zibin",
    palet: renkler.includes(paletGirdisi) ? paletGirdisi : (renkler[0] ?? paletGirdisi),
    aktif: form.get("aktif") === "on",
  };

  if (eskiSlug) {
    const guncel = await db.product.update({
      where: { slug: eskiSlug },
      data: alanlar,
      select: { id: true },
    });
    // İlk kez girilen alış fiyatı maliyeti bilinmeyen eski satışlara tahmini
    // olarak yazılıyor (K-111).
    await maliyetiGecmiseYaz(guncel.id, alanlar.alisFiyatKurus);
    // Fiyat geçmişi: üstü çizili fiyat bununla sınanıyor (K-164).
    await fiyatiKaydet(db, guncel.id, alanlar.fiyatKurus);
    await aramaMetniniTazele(guncel.id);
    vitriniYenile();
    // Bing ve Yandex'e yanıt gittikten sonra (K-129).
    after(() => indexNowBildir([`/urun/${eskiSlug}`, `/${kategori.slug}`]));
    redirect(`/yonetim/urunler/${eskiSlug}?kayit=1`);
  }

  const slug = slugYap(ad);
  const varOlan = await db.product.findUnique({ where: { slug } });
  if (varOlan) throw new Error(`"${ad}" adında bir ürün zaten var.`);

  const yeni = await db.product.create({ data: { slug, ...alanlar }, select: { id: true } });
  await fiyatiKaydet(db, yeni.id, alanlar.fiyatKurus);
  await aramaMetniniTazele(yeni.id);
  vitriniYenile();
  after(() => indexNowBildir([`/urun/${slug}`, `/${kategori.slug}`]));
  redirect(`/yonetim/urunler/${slug}?kayit=1`);
}

/**
 * Ürünü siler.
 *
 * **Sipariş geçmişi zarar görmüyor.** Sipariş satırı ürünün adını, adresini,
 * bedenini ve rengini kendi içinde kopya tutuyor; varyant bağlantısı
 * `SetNull` ile kopuyor. Yani beş yıl önce satılmış bir ürün silinse bile
 * eski sipariş aynı görünüyor — muhasebe ve cayma hakkı kayıtları için
 * gerekli olan bu (K-52).
 *
 * **Silmek yerine pasif yapmak çoğu durumda doğrusu**: ürün vitrinden kalkar
 * ama değerlendirmeleri, fotoğrafları ve sipariş bağlantısı durur. O yüzden
 * satılmış bir ürünü silmek için onay yazmak gerekiyor.
 */
export async function urunSil(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const slug = metin(form, "slug");
  if (!slug) redirect("/yonetim/urunler");

  const urun = await db.product.findUnique({
    where: { slug },
    select: { id: true, categoryId: true, images: { select: { yol: true, kucukYol: true } } },
  });
  if (!urun) redirect("/yonetim/urunler?hata=bulunamadi");

  const siparisAdedi = await db.orderItem.count({
    where: { variant: { productId: urun.id } },
  });
  if (siparisAdedi > 0 && metin(form, "onay").toLocaleUpperCase("tr") !== "SİL") {
    redirect(`/yonetim/urunler/${slug}?hata=onay`);
  }

  // Fotoğraf dosyaları da gitsin: kayıt silinince depoda öksüz kalırlardı.
  await gorselDosyalariniSil(urun.images.flatMap((g) => [g.yol, g.kucukYol]).filter(Boolean));
  // Adresi kategorisine yönlensin (K-128).
  await silinenleriYonlendir([{ slug, categoryId: urun.categoryId }]);
  await db.product.delete({ where: { id: urun.id } });
  await kampanyaKapsamindanCikar({ urunIdleri: [urun.id] });

  vitriniYenile();
  // Silinen adres artık yönleniyor; arama motoru bunu öğrensin.
  after(() => indexNowBildir([`/urun/${slug}`]));
  redirect("/yonetim/urunler?kayit=silindi");
}

/**
 * Seçili ürünleri yayına alır, pasif yapar ya da siler.
 *
 * **Toplu silme yalnızca hiç satılmamış ürünleri siliyor.** Satılmış bir
 * ürünü silmek geri alınamıyor ve değerlendirmelerini götürüyor (K-52); tek
 * tek silerken kutuya SİL yazmak gerekiyor. Toplu işlemde böyle bir onay
 * yok, o yüzden satılmışlar sessizce değil **sayılarak** atlanıyor: "3 ürün
 * silindi, 2'si siparişte geçtiği için atlandı" (K-53).
 */
export async function topluUrunIslemi(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const islem = metin(form, "islem");
  const eksik = metin(form, "eksik");
  const ara = metin(form, "ara").slice(0, 100);
  const kategoriSuzgeci = metin(form, "kategori");

  // Süzgeç ve arama dönüş adresinde korunuyor: toplu işlemden sonra aradığın
  // listeye geri dönmek istiyorsun, tam listeye değil (K-69).
  const sorgu = new URLSearchParams();
  if (eksik === "fotograf") sorgu.set("eksik", "fotograf");
  if (ara) sorgu.set("ara", ara);
  if (kategoriSuzgeci) sorgu.set("kategori", kategoriSuzgeci);
  const liste = sorgu.toString() ? `/yonetim/urunler?${sorgu}` : "/yonetim/urunler";
  // Kaldığın sayfa korunuyor: toplu işlemden sonra listenin başına
  // atılmak, kaldığın yeri yeniden bulmak demekti (K-67).
  const donus = (ek: string) =>
    `${liste}${liste.includes("?") ? "&" : "?"}${ek}${formSayfaEki(form)}`;

  const sluglar = form
    .getAll("secili")
    .map((d) => String(d).trim())
    .filter(Boolean)
    .slice(0, 200);
  if (sluglar.length === 0) redirect(donus("hata=secim-yok"));

  if (islem === "yayin" || islem === "pasif") {
    const sonuc = await db.product.updateMany({
      where: { slug: { in: sluglar } },
      data: { aktif: islem === "yayin" },
    });
    vitriniYenile();
    redirect(donus(`toplu=${islem}&adet=${sonuc.count}`));
  }

  /**
   * Seçilenleri başka bir kategoriye taşır.
   *
   * Kataloğu yeniden düzenlerken tek tek gerekiyordu: her ürünü aç, açılır
   * listeyi değiştir, sayfanın sonundaki kaydete bas. Yirmi ürün için
   * altmış tıklama (K-74). Yayına alma ve pasife alma zaten toplu
   * yapılabiliyordu; taşımanın olmaması bir eksiklikti.
   */
  if (islem === "kategori") {
    const hedefSlug = metin(form, "hedefKategori");
    const hedef = hedefSlug
      ? await db.category.findUnique({ where: { slug: hedefSlug }, select: { id: true, ad: true } })
      : null;
    if (!hedef) redirect(donus("hata=hedef-yok"));

    const sonuc = await db.product.updateMany({
      where: { slug: { in: sluglar } },
      data: { categoryId: hedef.id },
    });
    vitriniYenile();
    redirect(donus(`toplu=kategori&adet=${sonuc.count}&ad=${encodeURIComponent(hedef.ad)}`));
  }

  if (islem !== "sil") redirect(liste);

  // Satılmışlar ayrılıyor: silinecekler ile atlananlar ayrı sayılıyor.
  const urunler = await db.product.findMany({
    where: { slug: { in: sluglar } },
    select: {
      id: true,
      slug: true,
      categoryId: true,
      images: { select: { yol: true, kucukYol: true } },
      _count: { select: { variants: { where: { orderItems: { some: {} } } } } },
    },
  });

  const silinecekler = urunler.filter((u) => u._count.variants === 0);
  const atlananlar = urunler.length - silinecekler.length;

  if (silinecekler.length > 0) {
    await gorselDosyalariniSil(
      silinecekler.flatMap((u) => u.images.flatMap((g) => [g.yol, g.kucukYol])).filter(Boolean),
    );
    await silinenleriYonlendir(silinecekler);
    await db.product.deleteMany({ where: { id: { in: silinecekler.map((u) => u.id) } } });
    await kampanyaKapsamindanCikar({ urunIdleri: silinecekler.map((u) => u.id) });
    vitriniYenile();
  }

  redirect(donus(`toplu=sil&adet=${silinecekler.length}&atlanan=${atlananlar}`));
}

/**
 * Ürüne yeni beden-renk ekler.
 *
 * Eskiden "ekle / güncelle"ydi: var olan bir birleşim girilirse stoğunun
 * üzerine yazıyordu — arada satılanlar da geri geliyordu, üstelik ekrandaki
 * adet 0 varsayılanıyla kalırsa stok sessizce sıfırlanıyordu. Artık var
 * olana dokunulmuyor; stok değişikliği stok ekranından (K-102).
 */
export async function varyantEkle(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();

  const slug = metin(form, "slug");
  const beden = metin(form, "beden");
  const renk = metin(form, "renk");
  const stok = Number(metin(form, "stok") || "0");

  const urun = await db.product.findUniqueOrThrow({ where: { slug } });
  const varOlan = await db.productVariant.findUnique({
    where: { productId_beden_renk: { productId: urun.id, beden, renk } },
    select: { id: true },
  });
  if (varOlan) {
    const adlar = await renkAdlari();
    redirect(
      `/yonetim/urunler/${slug}?varolan=${encodeURIComponent(`${beden} · ${adlar[renk] ?? renk}`)}`,
    );
  }

  const ilkStok = Number.isInteger(stok) ? Math.max(0, stok) : 0;
  const varyant = await db.$transaction(async (islem) => {
    const v = await islem.productVariant.create({
      data: {
        productId: urun.id,
        beden,
        renk,
        stok: ilkStok,
        sku: `${slug}-${beden.replace(/\s/g, "")}-${renk}`,
      },
      select: { id: true },
    });
    await hareketYaz(islem, [{ variantId: v.id, degisim: ilkStok, sebep: "yeni", yapan: ben }]);
    return v;
  });
  await stokBildirimleriniGonder([varyant.id]);
  vitriniYenile();
  // Eklenen renk fotoğraf yükleme formunda seçili gelsin: sıradaki iş
  // çoğunlukla o rengin fotoğrafını yüklemek (K-91).
  redirect(`/yonetim/urunler/${slug}?kayit=1&renk=${encodeURIComponent(renk)}`);
}

export async function varyantSil(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();

  const id = metin(form, "id");
  const slug = metin(form, "slug");
  await db.$transaction(async (islem) => {
    // Silinen stok da geçmişte görünsün (K-103); satır bedenin adını
    // kopyaladığı için beden gidince de okunuyor.
    const v = await islem.productVariant.findUnique({ where: { id }, select: { stok: true } });
    if (v) await hareketYaz(islem, [{ variantId: id, degisim: -v.stok, sebep: "silindi", yapan: ben }]);
    await islem.productVariant.delete({ where: { id } });
  });
  vitriniYenile();
  redirect(`/yonetim/urunler/${slug}?kayit=1`);
}

/**
 * Stok ekranı: tek seferde birçok varyantın adedini günceller.
 *
 * Yalnızca değiştirilen satırlar yazılıyor ve her biri ekran açıldığında
 * görülen değerle koşullu: arada sipariş gelip stok değiştiyse o satır
 * yazılmıyor, ekran uyarıyor (K-102).
 */
export async function stoklariKaydet(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();

  const { yazilan, cakisan } = await stoklariYaz(stokDegisiklikleri(form.entries()), ben);
  // Stok yazıldıktan sonra: bekleyen varsa ve artık stok varsa haber gidiyor.
  await stokBildirimleriniGonder(yazilan);
  vitriniYenile();

  // Kaldığı süzgeç ve sayfaya dönülüyor. Değerler forma gizli alan olarak
  // konuyor ama yine de çözümleyiciden geçiyor: adres elle kurulduğu için
  // forma ne gelirse gelsin yalnızca bilinen değerler adrese yazılıyor
  // (K-44).
  const suzgec = stokSuzgeciniCoz({
    ara: String(form.get("ara") ?? ""),
    durum: String(form.get("durum") ?? ""),
    sayfa: String(form.get("sayfa") ?? ""),
  });
  const adres = stokAdresi(suzgec);
  const sonuc = new URLSearchParams({ kayit: String(yazilan.length) });
  if (cakisan.length > 0) sonuc.set("cakisma", cakismaAdresi(cakisan));
  redirect(`${adres}${adres.includes("?") ? "&" : "?"}${sonuc.toString()}`);
}

export async function duyuruEkle(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const metinAlani = metin(form, "metin");
  if (!metinAlani) throw new Error("Duyuru metni boş olamaz.");

  const sonSira = await db.announcement.aggregate({ _max: { sira: true } });
  const baslangic = metin(form, "baslangic");
  const bitis = metin(form, "bitis");

  await db.announcement.create({
    data: {
      metin: metinAlani,
      link: metin(form, "link") || null,
      sira: (sonSira._max.sira ?? 0) + 1,
      baslangic: tariheCevir(baslangic),
      bitis: tariheCevir(bitis, "son"),
    },
  });
  vitriniYenile();
  redirect(acikDonus("/yonetim/duyuru", form));
}

export async function duyuruCevir(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = metin(form, "id");
  if (!id) redirect(`/yonetim/duyuru?hata=bulunamadi${formSayfaEki(form)}`);

  const mevcut = await db.announcement.findUnique({ where: { id }, select: { aktif: true } });
  if (!mevcut) redirect(`/yonetim/duyuru?hata=bulunamadi${formSayfaEki(form)}`);

  await db.announcement.update({ where: { id }, data: { aktif: !mevcut.aktif } });
  vitriniYenile();
  redirect(`/yonetim/duyuru?kayit=${mevcut.aktif ? "kapatildi" : "acildi"}${formSayfaEki(form)}`);
}

export async function duyuruSil(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = metin(form, "id");
  if (!id) redirect(`/yonetim/duyuru?hata=bulunamadi${formSayfaEki(form)}`);

  // Kayıt önce aranıyor: olmayan bir kimlikle gelen istek sessizce değil,
  // "bulunamadı" diyerek dönüyor (K-57).
  const mevcut = await db.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!mevcut) redirect(`/yonetim/duyuru?hata=bulunamadi${formSayfaEki(form)}`);

  await db.announcement.delete({ where: { id } });
  vitriniYenile();
  redirect(`/yonetim/duyuru?kayit=silindi${formSayfaEki(form)}`);
}

export async function seritAyariKaydet(form: FormData): Promise<void> {
  await yoneticiGerekli();

  await db.storeSetting.upsert({
    where: { id: "tek" },
    update: {
      seritAcik: form.get("acik") === "on",
      seritHiz: metin(form, "hiz"),
      seritRenk: metin(form, "renk"),
      seritDurdurHover: form.get("durdurHover") === "on",
      seritMobilde: form.get("mobilde") === "on",
    },
    create: { id: "tek" },
  });
  vitriniYenile();
  redirect(acikDonus("/yonetim/duyuru", form));
}

/* ── Siparişler ─────────────────────────────────────────────────────────── */

/**
 * Sipariş durumu ve ödeme durumu. Yalnızca bilinen değerler kabul edilir;
 * form kurcalanıp durum alanına rastgele metin yazılamaz.
 */
export async function siparisDurumuKaydet(veri: FormData): Promise<void> {
  const ben = await yoneticiGerekli();

  const numara = String(veri.get("numara") ?? "").trim().toUpperCase();
  const durum = String(veri.get("durum") ?? "");
  const odemeDurumu = String(veri.get("odemeDurumu") ?? "");
  const kargoTakipNo = String(veri.get("kargoTakipNo") ?? "").trim();
  if (!numara) return;

  if (!(DURUMLAR as readonly string[]).includes(durum)) return;
  if (!(ODEME_DURUMLARI as readonly string[]).includes(odemeDurumu)) return;

  // Teslim anı ayrıca tutuluyor: cayma hakkının 14 günü buradan sayılıyor
  // (K-33). Zaten doluysa dokunulmuyor — durum ileri geri değiştirilse bile
  // müşterinin süresi baştan başlamamalı.
  const oncesi = await db.order.findUnique({
    where: { numara },
    select: {
      id: true,
      durum: true,
      teslimTarihi: true,
      odemeDurumu: true,
      odemeYontemi: true,
      adSoyad: true,
      eposta: true,
      toplamKurus: true,
      hediyeCekiKurus: true,
    },
  });
  if (!oncesi) return;

  // Ödeme durumu elle geri alınamıyor (K-167): "ödendi" sipariş "bekliyor"a
  // dönerse süre dolumu onu iptal edip stoğu geri veriyordu, alınan paranın
  // iade kaydı açılmıyordu. İade durumları da yalnızca İadeler ekranından
  // değişiyor; elle yazılınca borcun kaydı olmuyordu.
  const odemeGecisiGecerli =
    odemeDurumu === oncesi.odemeDurumu ||
    (oncesi.odemeDurumu === "bekliyor" && odemeDurumu === "odendi");
  if (!odemeGecisiGecerli) {
    redirect(`/yonetim/siparisler/${numara}?hata=odeme-gecisi`);
  }

  // İptal edilmiş sipariş yeniden açılamıyor: stoğu geri verildi, açılırsa
  // ürünler stoktan düşmeden "hazırlanıyor"a geçerdi (K-103).
  if (oncesi.durum === "iptal" && durum !== "iptal") {
    redirect(`/yonetim/siparisler/${numara}?hata=iptal-acilmaz`);
  }

  // Ödemesi beklenen sipariş kargoya ya da teslime geçmiyor (K-166): havalesi
  // gelmemiş ürün yola çıkmasın. Havale geldiyse ödeme de aynı formda
  // "Ödendi" yapılıyor.
  if ((durum === "kargoda" || durum === "teslim") && odemeDurumu === "bekliyor") {
    redirect(`/yonetim/siparisler/${numara}?hata=kargo-odenmedi`);
  }

  // Panelden iptal de müşterinin iptali gibi: stok geri veriliyor, parası
  // alınmışsa iade kaydı açılıyor. Eskiden yalnızca durum yazılıyordu; stok
  // kayboluyor, alınan paranın borcu hiçbir yerde görünmüyordu (K-103).
  if (durum === "iptal" && oncesi.durum !== "iptal") {
    await siparisiIptalEtVeStoguIadeEt(oncesi.id, ben);
    await db.order.update({ where: { numara }, data: { kargoTakipNo: kargoTakipNo || null } });
    vitriniYenile();
    redirect(`/yonetim/siparisler/${numara}?kayit=iptal`);
  }

  // Havale onayı (K-167): ödeme koşullu olarak "ödendi"ye geçiyor; iki kez
  // basılınca ya da iki kişi aynı anda onaylayınca e-posta bir kez gidiyor.
  // Bekleyen sipariş kendiliğinden hazırlanmaya geçiyor (kartta da öyle).
  const odemeOnaylandi =
    oncesi.odemeDurumu === "bekliyor" && odemeDurumu === "odendi"
      ? (
          await db.order.updateMany({
            where: { id: oncesi.id, odemeDurumu: "bekliyor", durum: { not: "iptal" } },
            data: { odemeDurumu: "odendi" },
          })
        ).count === 1
      : false;

  await db.order.update({
    where: { numara },
    data: {
      durum: odemeOnaylandi && durum === "bekliyor" ? "hazirlaniyor" : durum,
      kargoTakipNo: kargoTakipNo || null,
      ...(durum === "teslim" && !oncesi.teslimTarihi ? { teslimTarihi: new Date() } : {}),
    },
  });

  // Havalesi gelen müşteri paranın ulaştığını ancak kargo e-postasıyla
  // öğreniyordu; kartta ödeme alınınca giden e-postanın aynısı.
  if (odemeOnaylandi) {
    await odemeAlindiEpostasi({
      numara,
      adSoyad: oncesi.adSoyad,
      eposta: oncesi.eposta,
      toplamKurus: oncesi.toplamKurus,
      hediyeCekiKurus: oncesi.hediyeCekiKurus,
      odemeYontemi: oncesi.odemeYontemi,
    });
  }

  vitriniYenile();
  redirect(`/yonetim/siparisler/${numara}?kayit=1`);
}

/**
 * Seçili siparişlerin durumunu tek seferde değiştirir.
 *
 * Yirmi siparişi kargoya verirken her birine tek tek girmek günün yarım
 * saatini alıyordu. Liste ekranında onay kutusu + tek düğme (K-48).
 *
 * Ödeme durumuna dokunulmuyor: havale onayı siparişe tek tek bakmayı
 * gerektiren bir karar, toplu yapılacak iş değil.
 */
export async function topluDurumDegistir(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const durum = String(veri.get("durum") ?? "");
  // Toplu iptal yok: her iptal stok ve para hareketi, tek tek bakılacak iş.
  if (!(DURUMLAR as readonly string[]).includes(durum) || durum === "iptal") {
    redirect("/yonetim/siparisler");
  }

  const numaralar = veri
    .getAll("secili")
    .map((d) => String(d).trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 200);

  if (numaralar.length === 0) {
    redirect(`${suzgecAdresiniCoz(veri)}${suzgecAdresiniCoz(veri).includes("?") ? "&" : "?"}hata=secim-yok`);
  }

  // Teslim anı yalnızca ilk kez yazılıyor: cayma hakkının 14 günü buradan
  // sayılıyor (K-33) ve durum ileri geri alınsa bile baştan başlamamalı.
  const teslimEdilecekler =
    durum === "teslim"
      ? (
          await db.order.findMany({
            where: { numara: { in: numaralar }, teslimTarihi: null },
            select: { numara: true },
          })
        ).map((s) => s.numara)
      : [];

  // İptal edilmiş siparişler atlanıyor: yeniden açılırsa ürünleri stoktan
  // düşmeden hazırlanmaya geçerdi (K-103).
  // Kargoya/teslime yalnızca parası alınmış siparişler geçiyor (K-166); ödeme
  // bekleyenler atlanıyor ve sayıya girmiyor.
  const sonuc = await db.order.updateMany({
    where: {
      numara: { in: numaralar },
      durum: { not: "iptal" },
      ...(durum === "kargoda" || durum === "teslim"
        ? { odemeDurumu: { not: "bekliyor" } }
        : {}),
    },
    data: { durum },
  });

  if (teslimEdilecekler.length > 0) {
    await db.order.updateMany({
      where: { numara: { in: teslimEdilecekler } },
      data: { teslimTarihi: new Date() },
    });
  }

  vitriniYenile();
  const adres = suzgecAdresiniCoz(veri);
  redirect(`${adres}${adres.includes("?") ? "&" : "?"}toplu=${sonuc.count}`);
}

/**
 * Toplu işlemden sonra listenin kaldığı yere dönmek için adres.
 *
 * Süzgeç değerleri forma gizli alan olarak konuyor ama yine de
 * çözümleyiciden geçiyor: adres elle kuruluyor, forma ne gelirse gelsin
 * yalnızca bilinen değerler adrese yazılıyor (K-44'teki stok ekranıyla aynı
 * yol).
 */
function suzgecAdresiniCoz(veri: FormData): string {
  return siparisSuzgecAdresi(
    siparisSuzgeciniCoz({
      ara: String(veri.get("ara") ?? ""),
      durum: String(veri.get("suzgecDurum") ?? ""),
      odeme: String(veri.get("odeme") ?? ""),
      yontem: String(veri.get("yontem") ?? ""),
      baslangic: String(veri.get("baslangic") ?? ""),
      bitis: String(veri.get("bitis") ?? ""),
      sayfa: String(veri.get("sayfa") ?? ""),
    }),
  );
}

/* ── Kategoriler ────────────────────────────────────────────────────────── */

/**
 * Kategori ekler ya da günceller.
 *
 * **Slug yalnızca ilk oluşturmada addan üretiliyor.** Kategori adresi
 * (`/zibin-body`) slug'tan geliyor; sonradan değiştirmek verilmiş bağlantıları
 * ve arama motorundaki sırayı kırar. Adı değiştirmek serbest, adres sabit
 * kalıyor (K-24).
 */
export async function kategoriKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  const ad = String(veri.get("ad") ?? "").trim().slice(0, 60);
  const aciklama = String(veri.get("aciklama") ?? "").trim().slice(0, 200);
  const rehberMetni = String(veri.get("rehberMetni") ?? "").trim().slice(0, 8000);
  const aktif = veri.get("aktif") !== null;

  if (!ad) redirect(`/yonetim/kategoriler?hata=ad${id ? `&duzenle=${id}` : ""}`);

  // Aynı ad ikinci kez verilemiyor: iki "Kız Çocuk" alt alta durunca hangisinin
  // dolu olduğu anlaşılmıyor, yaş grubu da boş olana bağlanıyordu (K-82).
  const anahtar = (m: string) => m.trim().toLocaleLowerCase("tr");
  const adlar = await db.category.findMany({ select: { id: true, ad: true } });
  if (adlar.some((k) => k.id !== id && anahtar(k.ad) === anahtar(ad))) {
    redirect(`/yonetim/kategoriler?hata=ad-tekrar${id ? `&duzenle=${id}` : ""}`);
  }

  // Yukarıdaki kontrol okuyup sonra yazıyor; aynı anda gelen iki isteği
  // veritabanındaki tekil dizin yakalıyor (K-83). Dizin harfleri Türkçe
  // kurala göre değil veritabanınınkine göre küçültüyor ("KIZ" ile "kiz"
  // orada aynı), o yüzden nadiren buradan da dönebilir.
  const adCakisti = (e: unknown) =>
    (e as { code?: string }).code === "P2002" ||
    String((e as Error).message).includes("Category_ad_tekil");

  if (id) {
    try {
      await db.category.update({ where: { id }, data: { ad, aciklama, rehberMetni, aktif } });
    } catch (e) {
      if (adCakisti(e)) redirect(`/yonetim/kategoriler?hata=ad-tekrar&duzenle=${id}`);
      throw e;
    }
    vitriniYenile();
    redirect("/yonetim/kategoriler?kayit=1");
  }

  // Yeni kategori: slug addan üretiliyor, çakışırsa sonuna sayı ekleniyor.
  // Mağazanın kendi sayfalarının adresleri de çakışma sayılıyor: "Ürünler"
  // adlı kategori `/urunler` olursa tüm katalog listesine düşüyordu (K-78).
  const taban = slugYap(ad) || "kategori";
  let slug = adresAyrilmisMi(taban) ? `${taban}-2` : taban;
  for (
    let sayi = adresAyrilmisMi(taban) ? 3 : 2;
    await db.category.findUnique({ where: { slug } });
    sayi += 1
  ) {
    slug = `${taban}-${sayi}`;
  }

  const sonSira = await db.category.aggregate({ _max: { sira: true } });
  try {
    await db.category.create({
      data: { slug, ad, aciklama, rehberMetni, aktif, sira: (sonSira._max.sira ?? 0) + 1 },
    });
  } catch (e) {
    if (adCakisti(e)) redirect("/yonetim/kategoriler?hata=ad-tekrar");
    throw e;
  }

  vitriniYenile();
  redirect("/yonetim/kategoriler?kayit=1");
}

/**
 * Kategoriyi siler.
 *
 * İçinde ürün varsa silinmiyor: ürünün kategorisi zorunlu, silinseydi ürünler
 * de giderdi. Böyle bir durumda kategori kapatılabiliyor — kapalı kategori
 * vitrinde görünmüyor, ürünleri kendi sayfalarından erişilebilir kalıyor.
 */
/**
 * Kategoriyi siler; içinde ürün varsa önce onları başka bir kategoriye
 * taşıyor.
 *
 * Eskiden içinde ürün olan kategorinin "Sil" düğmesi kapalıydı. Bütün
 * kategorilerde ürün olduğu için düğme hep kapalıydı, yani ekranda silme
 * yokmuş gibi duruyordu. Kapalı bir düğme "yapamazsın" diyor ama "ne
 * yapmalısın"ı söylemiyor (K-52).
 *
 * Taşıma ve silme tek işlemde: yarısı olup yarısı olmasın, ürünler
 * kategorisiz kalmasın.
 */
export async function kategoriSil(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  if (!id) redirect("/yonetim/kategoriler");

  const urunAdedi = await db.product.count({ where: { categoryId: id } });

  if (urunAdedi > 0) {
    const hedefId = String(veri.get("hedefKategori") ?? "").trim();
    if (!hedefId || hedefId === id) {
      redirect(`/yonetim/kategoriler?hata=hedef-yok&duzenle=${id}${formSayfaEki(veri)}`);
    }
    const hedef = await db.category.count({ where: { id: hedefId } });
    if (hedef === 0)
      redirect(`/yonetim/kategoriler?hata=hedef-yok&duzenle=${id}${formSayfaEki(veri)}`);

    await db.$transaction([
      db.product.updateMany({ where: { categoryId: id }, data: { categoryId: hedefId } }),
      db.category.delete({ where: { id } }),
    ]);
    await kampanyaKapsamindanCikar({ kategoriId: id });
    vitriniYenile();
    redirect(
      `/yonetim/kategoriler?kayit=tasindi&adet=${urunAdedi}${formSayfaEki(veri)}${formAramaEki(veri)}`,
    );
  }

  await db.category.delete({ where: { id } });
  await kampanyaKapsamindanCikar({ kategoriId: id });
  vitriniYenile();
  redirect(`/yonetim/kategoriler?kayit=silindi${formSayfaEki(veri)}${formAramaEki(veri)}`);
}

/** Kategoriyi açar/kapatır; kapalı kategori vitrinde görünmüyor. */
export async function kategoriCevir(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  if (!id) redirect("/yonetim/kategoriler");

  const mevcut = await db.category.findUnique({
    where: { id },
    select: { aktif: true },
  });
  if (!mevcut) redirect("/yonetim/kategoriler?hata=bulunamadi");

  await db.category.update({ where: { id }, data: { aktif: !mevcut.aktif } });

  vitriniYenile();
  redirect(
    `/yonetim/kategoriler?kayit=${mevcut.aktif ? "kapatildi" : "acildi"}${formSayfaEki(veri)}${formAramaEki(veri)}`,
  );
}

/** Sıralama ok düğmeleriyle: panelin geri kalanı gibi JavaScript'siz çalışıyor. */
export async function kategoriTasi(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  const yon = String(veri.get("yon") ?? "") === "yukari" ? -1 : 1;
  if (!id) redirect("/yonetim/kategoriler");

  const hepsi = await db.category.findMany({
    orderBy: { sira: "asc" },
    select: { id: true },
  });

  const yer = hepsi.findIndex((k) => k.id === id);
  const hedef = yer + yon;
  if (yer === -1 || hedef < 0 || hedef >= hepsi.length) redirect("/yonetim/kategoriler");

  [hepsi[yer], hepsi[hedef]] = [hepsi[hedef], hepsi[yer]];

  // Sıra numaraları baştan yazılıyor: elle girilmiş boşluklu numaralar da
  // böylece düzeliyor.
  await db.$transaction(
    hepsi.map((k, i) => db.category.update({ where: { id: k.id }, data: { sira: i + 1 } })),
  );

  vitriniYenile();
  // Sayfanın ilk kaydı yukarı taşınınca bir önceki sayfaya geçiyor;
  // dönüş adresi kaydın yeni yerine bakıyor, gözden kaybolmasın (K-67).
  redirect(`/yonetim/kategoriler?kayit=sira${tasimaSayfaEki(veri, hedef)}${formAramaEki(veri)}`);
}

/* ── Kargo ve fatura ────────────────────────────────────────────────────── */

/**
 * Gönderiyi kaydeder ve müşteriye haber verir.
 *
 * Takip numarası girildiğinde sipariş kendiliğinden "kargoda" oluyor ve
 * müşteriye taşıyıcının sorgulama adresiyle birlikte e-posta gidiyor. Aynı
 * numara tekrar kaydedilirse e-posta bir daha gitmiyor: panelde bir şeyi
 * düzeltmek müşteriye ikinci bildirim göndermemeli.
 */
export async function kargoKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const numara = String(veri.get("numara") ?? "").trim().toUpperCase();
  const tasiyici = String(veri.get("tasiyici") ?? "").trim();
  const takipNo = String(veri.get("takipNo") ?? "").trim().slice(0, 60);
  // Kargo firmasına ödenen ücret, kâr hesabı için; boşsa ortalama (K-112).
  const ucretKurus = kurusaCevir(veri.get("ucret"));
  if (!numara) return;
  if (!TASIYICILAR.some((t) => t.kod === tasiyici)) redirect(`/yonetim/siparisler/${numara}`);

  // Sipariş satırı kilitlenerek (K-166): "Kaydet"e iki kez basılınca iki
  // gönderi kaydı açılıyor, müşteriye iki e-posta gidiyordu. Önceki takip
  // numarası kilidin içinde okunuyor; ikinci istek ilkinin yazdığını görüyor.
  const sonuc = await db.$transaction(async (islem) => {
    const [kilitli] = await islem.$queryRaw<{ id: string }[]>`
      select id from "Order" where numara = ${numara} for update`;
    if (!kilitli) return { hata: "yok" as const };
    const siparis = await islem.order.findUniqueOrThrow({
      where: { id: kilitli.id },
      select: {
        id: true,
        numara: true,
        adSoyad: true,
        eposta: true,
        toplamKurus: true,
        odemeYontemi: true,
        odemeDurumu: true,
        durum: true,
        gonderiler: { orderBy: { olusturuldu: "desc" }, take: 1 },
      },
    });
    // İptal edilmiş sipariş kargolanamaz (K-166): eskiden takip numarası
    // girilince "kargoda"ya dönüyordu; stoğu geri verilmiş sipariş yeniden
    // açılıyor, aynı ürün iki kez satılmış oluyordu.
    if (siparis.durum === "iptal") return { hata: "kargo-iptal" as const };
    // Parası alınmamış sipariş kargoya verilmez (K-166).
    if (takipNo && siparis.odemeDurumu === "bekliyor") return { hata: "kargo-odenmedi" as const };

    const gonderi = siparis.gonderiler[0];
    const oncekiTakip = gonderi?.takipNo ?? "";
    const veri = {
      tasiyici,
      takipNo,
      barkod: takipNo || siparis.numara,
      durum: takipNo ? "verildi" : "hazirlandi",
      ucretKurus,
    };
    if (gonderi) await islem.shipment.update({ where: { id: gonderi.id }, data: veri });
    else await islem.shipment.create({ data: { orderId: siparis.id, ...veri } });

    // Sipariş kartındaki takip numarası da aynı değeri göstersin.
    await islem.order.update({
      where: { id: siparis.id },
      data: {
        kargoTakipNo: takipNo || null,
        durum: takipNo && siparis.durum !== "teslim" ? "kargoda" : siparis.durum,
      },
    });
    return { siparis, oncekiTakip };
  });
  if ("hata" in sonuc) {
    if (sonuc.hata === "yok") redirect("/yonetim/siparisler");
    redirect(`/yonetim/siparisler/${numara}?hata=${sonuc.hata}`);
  }
  const { siparis, oncekiTakip } = sonuc;

  // İrsaliye kargo girilmeden kesilmiş olabiliyor (paket akşam hazırlanır,
  // sabah verilir). Fiili sevk anı burada doluyor — bir kez (K-59).
  if (takipNo) {
    await irsaliyeSevkiniYaz(siparis.id, { tasiyici, takipNo });
  }

  if (takipNo && takipNo !== oncekiTakip) {
    await kargoyaVerildiEpostasi(
      {
        numara: siparis.numara,
        adSoyad: siparis.adSoyad,
        eposta: siparis.eposta,
        toplamKurus: siparis.toplamKurus,
        odemeYontemi: siparis.odemeYontemi,
      },
      {
        tasiyiciAdi: tasiyiciAdi(tasiyici),
        takipNo,
        takipAdresi: takipAdresi(tasiyici, takipNo),
      },
    );
  }

  vitriniYenile();
  redirect(`/yonetim/siparisler/${numara}?kayit=kargo`);
}

/** Faturayı oluşturur; zaten varsa yazdırma sayfasına gider. */
export async function faturaHazirla(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const numara = String(veri.get("numara") ?? "").trim().toUpperCase();
  if (!numara) return;

  // Fatura olmamış bir satışı belgelememeli: ödeme gelmeden kesilmiyor.
  // Düğme zaten çıkmıyor ama form dışarıdan da gönderilebiliyor (K-54).
  const siparis = await db.order.findUnique({
    where: { numara },
    select: { odemeDurumu: true, durum: true },
  });
  if (!siparis) return;
  if (!belgeBasilabilirMi(siparis).basilabilir) {
    redirect(`/yonetim/siparisler/${numara}?hata=odenmedi`);
  }

  await faturaOlustur(numara);
  vitriniYenile();
  redirect(`/yonetim/siparisler/${numara}/fatura`);
}

/**
 * Siparişin sevk irsaliyesini oluşturur.
 *
 * Faturayla aynı kural: ödemesi tamamlanmamış siparişin malı da çıkmamalı
 * (K-54, K-59).
 */
export async function irsaliyeHazirla(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const numara = String(veri.get("numara") ?? "").trim().toUpperCase();
  if (!numara) return;

  const siparis = await db.order.findUnique({
    where: { numara },
    select: { odemeDurumu: true, durum: true },
  });
  if (!siparis) return;
  if (!belgeBasilabilirMi(siparis).basilabilir) {
    redirect(`/yonetim/siparisler/${numara}?hata=odenmedi`);
  }

  await irsaliyeOlustur(numara);
  redirect(`/yonetim/siparisler/${numara}/irsaliye`);
}

/** Resmî fatura dışarıda kesildiyse numarası ve belgesi buraya yazılıyor. */
export async function faturaKaydiGuncelle(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const numara = String(veri.get("numara") ?? "").trim().toUpperCase();
  const saglayiciRef = String(veri.get("saglayiciRef") ?? "").trim().slice(0, 60);
  const pdfAdresi = String(veri.get("pdfAdresi") ?? "").trim().slice(0, 500);
  const durum = String(veri.get("durum") ?? "taslak");
  if (!numara) return;
  if (!["taslak", "kesildi", "iptal"].includes(durum)) return;

  // Bağlantı yalnızca http(s) olabilir: panele yapıştırılan bir javascript:
  // adresi tıklandığında tarayıcıda çalışırdı.
  const guvenliAdres = /^https?:\/\//.test(pdfAdresi) ? pdfAdresi : "";

  await db.invoice.updateMany({
    where: { order: { numara } },
    data: {
      saglayiciRef: saglayiciRef || null,
      pdfAdresi: guvenliAdres || null,
      durum,
    },
  });

  vitriniYenile();
  redirect(`/yonetim/siparisler/${numara}?kayit=fatura`);
}

/* ── Satış ayarları ─────────────────────────────────────────────────────── */

export async function satisAyariKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const kargo = kurusaCevir(veri.get("kargo")) ?? 0;
  const esik = kurusaCevir(veri.get("esik")) ?? 0;
  const havaleBilgisi = String(veri.get("havaleBilgisi") ?? "").trim().slice(0, 1000);

  // KDV oranı faturada kullanılıyor; 0-100 dışında bir değer kabul edilmiyor.
  const kdvHam = Number(String(veri.get("kdvOrani") ?? "").replace(",", "."));
  const kdvOrani = Number.isFinite(kdvHam) ? Math.min(100, Math.max(0, Math.round(kdvHam))) : 10;

  // Ödeme süresi saat cinsinden; 0 "otomatik iptal kapalı" demek. Üst sınır
  // 720 saat (30 gün): daha uzunu stoğu aylarca tutmak olurdu (K-64).
  const saat = (ad: string, varsayilan: number): number => {
    const ham = Number(String(veri.get(ad) ?? "").replace(",", "."));
    return Number.isFinite(ham) ? Math.min(720, Math.max(0, Math.round(ham))) : varsayilan;
  };
  const havaleSaat = saat("havaleSaat", 72);
  // Hatırlatma süreden uzun olamaz: sipariş verilir verilmez hatırlatma
  // göndermek anlamsız.
  const havaleHatirlatmaSaat = Math.min(saat("havaleHatirlatmaSaat", 24), havaleSaat);

  // İkinci sipariş teşviki (K-151): 0 kapalı; oran %50'yi, süreler bir yılı geçmiyor.
  const tamSayi = (ad: string, enAz: number, enCok: number, varsayilan: number): number => {
    const ham = Number(String(veri.get(ad) ?? "").replace(",", "."));
    return Number.isFinite(ham) ? Math.min(enCok, Math.max(enAz, Math.round(ham))) : varsayilan;
  };
  const tesvik = {
    tesvikYuzde: tamSayi("tesvikYuzde", 0, 50, 0),
    tesvikGun: tamSayi("tesvikGun", 1, 365, 10),
    tesvikGecerlilik: tamSayi("tesvikGecerlilik", 1, 365, 30),
    // Arkadaşını davet et (K-152): ödül en çok 5.000 ₺.
    davetOdulKurus: Math.min(500000, Math.max(0, kurusaCevir(veri.get("davetOdul")) ?? 0)),
    davetYuzde: tamSayi("davetYuzde", 0, 50, 10),
    davetEnFazla: tamSayi("davetEnFazla", 1, 100, 10),
  };

  const tasiyiciKodu = String(veri.get("varsayilanTasiyici") ?? "yurtici");
  const varsayilanTasiyici = TASIYICILAR.some((t) => t.kod === tasiyiciKodu)
    ? tasiyiciKodu
    : "yurtici";

  await db.storeSetting.upsert({
    where: { id: "tek" },
    update: {
      kargoKurus: kargo,
      bedavaKargoEsigi: esik,
      havaleBilgisi,
      havaleSaat,
      havaleHatirlatmaSaat,
      kdvOrani,
      varsayilanTasiyici,
      ...tesvik,
    },
    create: {
      id: "tek",
      kargoKurus: kargo,
      bedavaKargoEsigi: esik,
      havaleBilgisi,
      havaleSaat,
      havaleHatirlatmaSaat,
      kdvOrani,
      varsayilanTasiyici,
      ...tesvik,
    },
  });

  vitriniYenile();
  redirect("/yonetim/ayarlar?kayit=1");
}

/* ── Yasal metinler ve künye ────────────────────────────────────────────── */

/**
 * Yasal metni kaydeder.
 *
 * Metin düz yazı olarak saklanıyor ve ekranda da düz yazı olarak basılıyor
 * (bkz. ui/yasal-metin.tsx): HTML olarak yorumlanmadığı için avukattan gelen
 * metin olduğu gibi yapıştırılabiliyor.
 */
export async function yasalKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const slug = String(veri.get("slug") ?? "").trim();
  if (!slug) redirect("/yonetim/yasal");

  const baslik = String(veri.get("baslik") ?? "").trim().slice(0, 120);
  const ozet = String(veri.get("ozet") ?? "").trim().slice(0, 300);
  const icerik = String(veri.get("icerik") ?? "").trim().slice(0, 60_000);
  // Onay kutusu "metin hazır" diye soruyor; kayıtta tutulan ise taslak işareti.
  const taslakMi = veri.get("hazir") === null;

  if (!baslik || !icerik) redirect(`/yonetim/yasal?duzenle=${slug}&hata=eksik`);

  const sonuc = await db.legalPage.updateMany({
    where: { slug },
    data: { baslik, ozet, icerik, taslakMi },
  });
  if (sonuc.count === 0) redirect("/yonetim/yasal");

  vitriniYenile();
  redirect(`/yonetim/yasal?duzenle=${slug}&kayit=1`);
}

/** Satıcı künyesi: mesafeli satışta sitede görünmesi zorunlu bilgiler. */
export async function kunyeKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const al = (ad: string, sinir = 200) =>
    String(veri.get(ad) ?? "").trim().slice(0, sinir);

  const girdi = {
    unvan: al("unvan"),
    vergiDairesi: al("vergiDairesi"),
    vergiNo: al("vergiNo", 30),
    mersisNo: al("mersisNo", 30),
    etbisNo: al("etbisNo", 60),
    sirketAdresi: al("sirketAdresi", 400),
    destekTelefon: al("destekTelefon", 40),
    destekEposta: al("destekEposta", 120),
    whatsappNumara: al("whatsappNumara", 40),
  };

  await db.storeSetting.upsert({
    where: { id: "tek" },
    update: girdi,
    create: { id: "tek", ...girdi },
  });

  vitriniYenile();
  redirect(acikDonus("/yonetim/yasal", veri, "kayit=kunye"));
}

/* ── Kampanyalar ────────────────────────────────────────────────────────── */

const TIPLER: readonly string[] = KAMPANYA_TIPLERI;
const KAPSAMLAR = ["tumu", "kategori", "urun"];

/**
 * Paneldeki tarih kutusu (`<input type="date">`) "2026-09-30" gönderiyor.
 * `new Date("2026-09-30")` UTC gece yarısı, yani İstanbul'da 03:00: bitişi
 * 30 Eylül seçilen kampanya o günün başında bitiyor, başlangıcı 1 Ekim
 * seçilen de 03:00'te başlıyordu (K-164). Gün İstanbul saatiyle okunuyor:
 * başlangıç günün başı, bitiş günün sonu — seçilen gün dahil.
 */
function tariheCevir(deger: FormDataEntryValue | null, uc: "bas" | "son" = "bas"): Date | null {
  const metin = String(deger ?? "").trim();
  if (!metin) return null;
  const t = /^\d{4}-\d{2}-\d{2}$/.test(metin)
    ? new Date(`${metin}T${uc === "bas" ? "00:00:00.000" : "23:59:59.999"}+03:00`)
    : new Date(metin);
  return Number.isNaN(t.getTime()) ? null : t;
}

/**
 * Silinen kategori ya da ürün kampanya kapsamlarından çıkarılıyor (K-171).
 * Eskiden tekli alanın `Cascade`i kampanyanın kendisini siliyordu; çoklu
 * kapsamda öteki kategoriler için kampanya sürmeli. Liste boşalırsa kampanya
 * hiçbir ürüne uygulanmıyor (herkese değil).
 */
async function kampanyaKapsamindanCikar(g: { kategoriId?: string; urunIdleri?: string[] }) {
  if (g.kategoriId) {
    await db.$executeRaw`
      update "Campaign" set "kategoriIdleri" = array_remove("kategoriIdleri", ${g.kategoriId}),
             "guncellendi" = now()
       where ${g.kategoriId} = any("kategoriIdleri")`;
  }
  for (const id of g.urunIdleri ?? []) {
    await db.$executeRaw`
      update "Campaign" set "urunIdleri" = array_remove("urunIdleri", ${id}), "guncellendi" = now()
       where ${id} = any("urunIdleri")`;
  }
}

/**
 * Kademe metni (K-170): her satırda "eşik = indirim", ₺ cinsinden
 * ("500 = 50", "1.000 = 150"). Eşikler artan, indirim eşikten küçük; aynı
 * eşik iki kez yazılamıyor. Geçersizse `null`.
 */
function kademeleriOku(metin: string): { esikKurus: number; indirimKurus: number }[] | null {
  const satirlar = metin
    .split(/\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (satirlar.length === 0 || satirlar.length > 10) return null;
  const liste: { esikKurus: number; indirimKurus: number }[] = [];
  for (const satir of satirlar) {
    const [e, i] = satir.split(/[=:]/).map((x) => x?.trim());
    const esikKurus = tutarCoz(e ?? "");
    const indirimKurus = tutarCoz(i ?? "");
    if (!esikKurus || !indirimKurus || indirimKurus <= 0 || indirimKurus >= esikKurus) return null;
    liste.push({ esikKurus, indirimKurus });
  }
  liste.sort((a, b) => a.esikKurus - b.esikKurus);
  if (new Set(liste.map((k) => k.esikKurus)).size !== liste.length) return null;
  return liste;
}

export async function kampanyaKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  const ad = String(veri.get("ad") ?? "").trim().slice(0, 80);
  const tip = String(veri.get("tip") ?? "yuzde");
  const kapsam = String(veri.get("kapsam") ?? "tumu");
  // Geçersiz giriş sebebiyle geri dönüyor (K-168): eskiden form sessizce
  // hiçbir şey yapmıyordu, kampanya kaydedildi sanılıyordu.
  const hata = (kod: string): never => redirect(`/yonetim/kampanyalar?hata=${kod}`);
  if (!ad) hata("ad");
  if (!TIPLER.includes(tip) || !KAPSAMLAR.includes(kapsam)) hata("gecersiz");

  // Yüzde tam sayı, tutar kuruş. İkisi de aynı kutudan geliyor. Sayı
  // olmayan yüzde eskiden sessizce %1 oluyordu.
  const ham = String(veri.get("deger") ?? "").trim();
  let deger = 0;
  if (tip === "yuzde" || tip === "nci-urun") {
    const n = Number(ham.replace(",", "."));
    if (!Number.isFinite(n) || n < 1 || n > 100) hata("yuzde");
    deger = Math.round(n);
  } else if (tip === "tutar") {
    deger = kurusaCevir(ham) ?? 0;
    if (deger <= 0) hata("tutar");
  }

  // "N. ürüne %X" (K-170): N 2-10; yüzde yukarıda sınandı.
  const nciN = tip === "nci-urun" ? Number(veri.get("nciN")) : null;
  if (tip === "nci-urun" && !(Number.isInteger(nciN) && nciN! >= 2 && nciN! <= 10)) hata("nci-urun");

  // Kademeli (K-170): her satır "eşik = indirim" (500 = 50).
  const kademeler = tip === "kademeli" ? kademeleriOku(String(veri.get("kademeler") ?? "")) : null;
  if (tip === "kademeli" && !kademeler) hata("kademeli");

  // Tavan ve üyelik kuralları (K-170).
  const tavanHam = String(veri.get("tavan") ?? "").trim();
  const enFazlaIndirimKurus = tavanHam ? kurusaCevir(tavanHam) : null;
  if (tavanHam && (!enFazlaIndirimKurus || enFazlaIndirimKurus <= 0)) hata("tavan");
  const sayiOku = (alan: string): number | null | "hata" => {
    const h = String(veri.get(alan) ?? "").trim();
    if (!h) return null;
    const n = Number(h);
    return Number.isInteger(n) && n >= 1 && n <= 100_000 ? n : "hata";
  };
  const kisiBasiSinir = sayiOku("kisiBasiSinir");
  const enFazlaKullanim = sayiOku("enFazlaKullanim");
  if (kisiBasiSinir === "hata" || enFazlaKullanim === "hata") hata("sinir");
  const ilkSiparis = veri.get("ilkSiparis") === "on";

  // "X al Y öde" (K-168): 2 ≤ X ≤ 20, 1 ≤ Y < X.
  const alAdet = tip === "al-ode" ? Number(veri.get("alAdet")) : tip === "nci-urun" ? nciN : null;
  const odeAdet = tip === "al-ode" ? Number(veri.get("odeAdet")) : null;
  if (
    tip === "al-ode" &&
    !(
      Number.isInteger(alAdet) &&
      Number.isInteger(odeAdet) &&
      alAdet! >= 2 &&
      alAdet! <= 20 &&
      odeAdet! >= 1 &&
      odeAdet! < alAdet!
    )
  ) {
    hata("al-ode");
  }

  // Kupon kodu yalnızca Latin harf, rakam, tire: "İNDİRİM" gibi bir kod
  // müşterinin yazdığı "indirim" ile tutmuyordu (büyütünce "INDIRIM").
  const kuponKodu =
    String(veri.get("kuponKodu") ?? "").trim().toUpperCase().slice(0, 40) || null;
  if (kuponKodu && !/^[A-Z0-9_-]{3,40}$/.test(kuponKodu)) hata("kupon-harf");

  // Seçilen kategoriler ve ürünler (K-171): yalnızca var olanlar.
  const secilen = (alan: string) =>
    [...new Set(veri.getAll(alan).map((x) => String(x).trim()).filter(Boolean))].slice(0, 500);
  const kategoriIdleri =
    kapsam === "kategori"
      ? (
          await db.category.findMany({
            where: { id: { in: secilen("kategoriIdleri") } },
            select: { id: true },
          })
        ).map((x) => x.id)
      : [];
  const urunIdleri =
    kapsam === "urun"
      ? (
          await db.product.findMany({
            where: { id: { in: secilen("urunIdleri") } },
            select: { id: true },
          })
        ).map((x) => x.id)
      : [];

  const veriler = {
    ad,
    tip,
    deger,
    alAdet,
    odeAdet,
    kademeler: kademeler ?? Prisma.DbNull,
    enFazlaIndirimKurus,
    // İlk sipariş ve kişi başı sınır üyelik gerektiriyor; işaretli sayılıyor.
    uyelereOzel: veri.get("uyelereOzel") === "on" || ilkSiparis || kisiBasiSinir !== null,
    ilkSiparis,
    kisiBasiSinir: kisiBasiSinir as number | null,
    enFazlaKullanim: enFazlaKullanim as number | null,
    kapsam,
    // Çoklu kapsam (K-171); tekli alanlar yeni kampanyada boş.
    categoryId: null,
    productId: null,
    kategoriIdleri,
    urunIdleri,
    kuponKodu,
    enAzSepetKurus: kurusaCevir(veri.get("enAzSepet")) ?? 0,
    aktif: veri.get("aktif") === "on",
    baslangic: tariheCevir(veri.get("baslangic")),
    bitis: tariheCevir(veri.get("bitis"), "son"),
  };

  // Kapsam kategori ya da ürünse hedef seçilmiş olmalı, yoksa kampanya
  // sessizce herkese uygulanırdı.
  if (kapsam === "kategori" && kategoriIdleri.length === 0) hata("kategori");
  if (kapsam === "urun" && urunIdleri.length === 0) hata("urun");
  // Bitiş başlangıçtan önceyse kampanya hiç çalışmaz.
  if (veriler.baslangic && veriler.bitis && veriler.bitis < veriler.baslangic) hata("tarih");

  // Kupon kodu benzersiz; aynı kodu ikinci kez vermek çökme değil, uyarı.
  if (kuponKodu) {
    const varOlan = await db.campaign.findUnique({
      where: { kuponKodu },
      select: { id: true },
    });
    if (varOlan && varOlan.id !== id) redirect("/yonetim/kampanyalar?hata=kupon");
  }

  if (id) {
    await db.campaign.update({ where: { id }, data: veriler });
  } else {
    await db.campaign.create({ data: veriler });
  }

  vitriniYenile();
  redirect("/yonetim/kampanyalar?kayit=1");
}

export async function kampanyaCevir(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "");
  if (!id) redirect(`/yonetim/kampanyalar?hata=bulunamadi${formSayfaEki(veri)}`);

  const k = await db.campaign.findUnique({ where: { id }, select: { aktif: true } });
  if (!k) redirect(`/yonetim/kampanyalar?hata=bulunamadi${formSayfaEki(veri)}`);

  await db.campaign.update({ where: { id }, data: { aktif: !k.aktif } });
  vitriniYenile();
  redirect(
    `/yonetim/kampanyalar?kayit=${k.aktif ? "kapatildi" : "acildi"}${formSayfaEki(veri)}`,
  );
}

export async function kampanyaSil(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "");
  if (!id) redirect(`/yonetim/kampanyalar?hata=bulunamadi${formSayfaEki(veri)}`);

  const k = await db.campaign.findUnique({ where: { id }, select: { id: true } });
  if (!k) redirect(`/yonetim/kampanyalar?hata=bulunamadi${formSayfaEki(veri)}`);

  await db.campaign.delete({ where: { id } });
  vitriniYenile();
  redirect(`/yonetim/kampanyalar?kayit=silindi${formSayfaEki(veri)}`);
}

/* ── Ana sayfa banner'ı ─────────────────────────────────────────────────── */

/** Banner resmi: ekranın tamamını kaplıyor, ürün fotoğrafından geniş (K-89). */
const BANNER_OLCU = { buyuk: 2400, kucuk: 1000 };
const TELEFON_OLCU = { buyuk: 1200, kucuk: 1200 };

/**
 * Banner ekler.
 *
 * İki tür var (K-89):
 * - **Resim:** banner yalnızca yüklenen resim. Başlık zorunlu değil; varsa
 *   resmin alternatif metni oluyor. Düğme bağlantısı varsa resmin tamamı o
 *   bağlantı. Telefon için ayrı bir resim isteğe bağlı.
 * - **Yazı ve çizim:** eskisi gibi; başlık zorunlu.
 */
export async function bannerKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  const tur = String(veri.get("tur") ?? "yazi") === "resim" ? "resim" : "yazi";
  // İki türün alanları formda yan yana duruyor; adlar ayrı ki biri ötekini
  // ezmesin. Resimde "başlık" resmin açıklaması (alternatif metin).
  const baslik = String(veri.get(tur === "resim" ? "resimAciklama" : "baslik") ?? "")
    .trim()
    .slice(0, 120);
  const hata = (kod: string, ek = "") =>
    redirect(
      id
        ? `/yonetim/banner?hata=${kod}${ek}&duzenle=${encodeURIComponent(id)}#banner-${encodeURIComponent(id)}`
        : `/yonetim/banner?hata=${kod}${ek}&ac=yeni-banner#yeni-banner`,
    );

  // Düzenlemede var olan resimler: yeni resim seçilmezse kalıyor (K-90).
  const mevcut = id
    ? await db.heroBanner.findUnique({
        where: { id },
        select: { resimYol: true, resimKucukYol: true, telefonYol: true },
      })
    : null;
  if (id && !mevcut) redirect("/yonetim/banner?hata=bulunamadi");
  /** Kayıttan sonra silinecek eski dosyalar: önce kayıt, sonra dosya. */
  const silinecek: string[] = [];
  if (tur === "yazi" && !baslik) hata("baslik");

  const palet = String(veri.get("palet") ?? "sari");
  const gorsel = String(veri.get("gorsel") ?? "amblem");
  if (!(BANNER_PALETLERI as readonly string[]).includes(palet)) return;
  if (!(BANNER_GORSELLERI as readonly string[]).includes(gorsel)) return;

  const siraHam = Number(String(veri.get("sira") ?? "0").trim());

  const resimAlanlari: Record<string, string | number> = {};
  if (tur === "resim") {
    const dosya = veri.get("resim");
    const telefon = veri.get("telefonResmi");
    const yeniResim = dosya instanceof File && dosya.size > 0;
    if (!yeniResim && !mevcut?.resimYol) hata("resim-yok");
    if (veri.get("telefonKaldir") === "on" && mevcut?.telefonYol) {
      Object.assign(resimAlanlari, { telefonYol: "", telefonGenislik: 0, telefonYukseklik: 0 });
      silinecek.push(mevcut.telefonYol);
    }
    try {
      if (yeniResim) {
        const y = await gorselYukle(dosya, BANNER_OLCU);
        Object.assign(resimAlanlari, {
          resimYol: y.yol,
          resimKucukYol: y.kucukYol,
          resimGenislik: y.genislik,
          resimYukseklik: y.yukseklik,
        });
        if (mevcut?.resimYol) silinecek.push(mevcut.resimYol, mevcut.resimKucukYol);
      }
      if (telefon instanceof File && telefon.size > 0) {
        const t = await gorselYukle(telefon, TELEFON_OLCU);
        // Telefon için tek boyut yeter; küçük kopya silinsin, depoda öksüz kalmasın.
        await gorselDosyalariniSil([t.kucukYol]);
        Object.assign(resimAlanlari, {
          telefonYol: t.yol,
          telefonGenislik: t.genislik,
          telefonYukseklik: t.yukseklik,
        });
        if (mevcut?.telefonYol && !silinecek.includes(mevcut.telefonYol)) {
          silinecek.push(mevcut.telefonYol);
        }
      }
    } catch (e) {
      console.error("Banner resmi yüklenemedi:", e);
      hata(
        "resim",
        `&mesaj=${encodeURIComponent(e instanceof GorselHatasi ? e.message : "Resim yüklenemedi.")}`,
      );
    }
  } else if (mevcut?.resimYol || mevcut?.telefonYol) {
    // Resimliden yazılıya geçti: resimler boşalıyor, dosyaları da gidiyor.
    Object.assign(resimAlanlari, {
      resimYol: "",
      resimKucukYol: "",
      resimGenislik: 0,
      resimYukseklik: 0,
      telefonYol: "",
      telefonGenislik: 0,
      telefonYukseklik: 0,
    });
    silinecek.push(mevcut.resimYol, mevcut.resimKucukYol, mevcut.telefonYol);
  }

  const veriler = {
    baslik,
    altYazi:
      tur === "resim" ? "" : String(veri.get("altYazi") ?? "").trim().slice(0, 300),
    dugmeYazi: tur === "resim" ? "" : String(veri.get("dugmeYazi") ?? "").trim().slice(0, 40),
    dugmeLink: String(veri.get(tur === "resim" ? "resimLink" : "dugmeLink") ?? "")
      .trim()
      .slice(0, 200),
    palet,
    gorsel,
    sira: Number.isFinite(siraHam) ? Math.trunc(siraHam) : 0,
    aktif: veri.get("aktif") === "on",
    baslangic: tariheCevir(veri.get("baslangic")),
    bitis: tariheCevir(veri.get("bitis"), "son"),
    ...resimAlanlari,
  };

  if (id) {
    await db.heroBanner.update({ where: { id }, data: veriler });
  } else {
    await db.heroBanner.create({ data: veriler });
  }
  await gorselDosyalariniSil(silinecek.filter(Boolean));

  vitriniYenile();
  redirect(acikDonus("/yonetim/banner", veri));
}

export async function bannerCevir(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "");
  if (!id) redirect(`/yonetim/banner?hata=bulunamadi${formSayfaEki(veri)}`);

  const b = await db.heroBanner.findUnique({ where: { id }, select: { aktif: true } });
  if (!b) redirect(`/yonetim/banner?hata=bulunamadi${formSayfaEki(veri)}`);

  await db.heroBanner.update({ where: { id }, data: { aktif: !b.aktif } });
  vitriniYenile();
  redirect(
    `/yonetim/banner?kayit=${b.aktif ? "kapatildi" : "acildi"}${formSayfaEki(veri)}`,
  );
}

export async function bannerSil(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "");
  if (!id) redirect(`/yonetim/banner?hata=bulunamadi${formSayfaEki(veri)}`);

  const b = await db.heroBanner.findUnique({
    where: { id },
    select: { id: true, resimYol: true, resimKucukYol: true, telefonYol: true },
  });
  if (!b) redirect(`/yonetim/banner?hata=bulunamadi${formSayfaEki(veri)}`);

  // Resim dosyaları da gidiyor: kayıt silinince depoda öksüz kalırlardı.
  await gorselDosyalariniSil([b.resimYol, b.resimKucukYol, b.telefonYol].filter(Boolean));
  await db.heroBanner.delete({ where: { id } });
  vitriniYenile();
  redirect(`/yonetim/banner?kayit=silindi${formSayfaEki(veri)}`);
}

/**
 * Banner'ı listede bir yukarı ya da aşağı taşır (K-93).
 *
 * Sıra yalnızca formdaki sayıyla değişiyordu: iki banner'ın yerini
 * değiştirmek için ikisini de açıp numara yazmak gerekiyordu. Numaralar
 * baştan yazılıyor; elle girilmiş aynı ya da boşluklu numaralar da düzeliyor.
 */
export async function bannerTasi(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "");
  const yon = String(veri.get("yon") ?? "") === "yukari" ? -1 : 1;
  if (!id) redirect("/yonetim/banner");

  const hepsi = await db.heroBanner.findMany({
    orderBy: [{ sira: "asc" }, { olusturuldu: "asc" }],
    select: { id: true },
  });
  const yer = hepsi.findIndex((b) => b.id === id);
  const hedef = yer + yon;
  if (yer === -1 || hedef < 0 || hedef >= hepsi.length) redirect("/yonetim/banner");

  [hepsi[yer], hepsi[hedef]] = [hepsi[hedef], hepsi[yer]];
  await db.$transaction(
    hepsi.map((b, i) => db.heroBanner.update({ where: { id: b.id }, data: { sira: i } })),
  );

  vitriniYenile();
  redirect(`/yonetim/banner?kayit=sira${tasimaSayfaEki(veri, hedef)}`);
}

export async function bannerSuresiKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const ham = Number(String(veri.get("saniye") ?? "").trim());
  const saniye = Number.isFinite(ham) ? Math.max(2, Math.min(30, Math.round(ham))) : 6;

  await db.storeSetting.upsert({
    where: { id: "tek" },
    update: { bannerSaniye: saniye },
    create: { id: "tek", bannerSaniye: saniye },
  });

  vitriniYenile();
  redirect(acikDonus("/yonetim/banner", veri));
}

/* ---------------------------------------------------------------- fotoğraf */

/**
 * Ürüne fotoğraf ekler. Birden çok dosya seçilebiliyor; biri bozuksa
 * diğerleri yine de yükleniyor ve kaç tanesinin başarısız olduğu ekrana
 * dönüyor. Yükleme sırası seçim sırası.
 */
/**
 * Fotoğraf işlemleri hep `#fotograflar` bölümüne dönüyor.
 *
 * Silme, taşıma ve ad kaydetme düğmeleri sayfanın altındaki fotoğraf
 * bölümünde; dönüşte tarayıcı sayfanın en başına gidiyordu. Uzun bir ürün
 * sayfasında üç fotoğraf silmek üç kez aşağı kaydırmak demekti — işin
 * yapıldığı yerde kalmalı (K-55).
 */
export async function fotografEkle(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const slug = String(veri.get("slug") ?? "");
  const urun = await db.product.findUnique({
    where: { slug },
    select: { id: true, ad: true, images: { select: { sira: true } } },
  });
  if (!urun) redirect("/yonetim/urunler");

  const dosyalar = veri.getAll("fotograf").filter((d): d is File => d instanceof File && d.size > 0);
  if (dosyalar.length === 0) redirect(`/yonetim/urunler/${slug}?fhata=bos#fotograflar`);

  const altMetin = String(veri.get("altMetin") ?? "").trim() || urun.ad;
  // Yüklenen fotoğrafların hepsi bu renge atanıyor; boşsa "her renk".
  // Eskiden renk her fotoğrafta ayrı ayrı seçilip kaydediliyordu (K-91).
  const renkGirdisi = String(veri.get("renk") ?? "").trim();
  const renk = renkGirdisi && (await renkKodlari()).includes(renkGirdisi) ? renkGirdisi : null;
  let sira = urun.images.reduce((e, g) => Math.max(e, g.sira), 0);
  const hatalar: string[] = [];
  const eklenenler: string[] = [];

  for (const dosya of dosyalar) {
    try {
      const y = await gorselYukle(dosya);
      sira += 1;
      const yeni = await db.productImage.create({
        select: { id: true },
        data: {
          productId: urun.id,
          yol: y.yol,
          kucukYol: y.kucukYol,
          genislik: y.genislik,
          yukseklik: y.yukseklik,
          boyutBayt: y.boyutBayt,
          altMetin,
          renk,
          sira,
        },
      });
      eklenenler.push(yeni.id);
    } catch (hata) {
      hatalar.push(hata instanceof GorselHatasi ? hata.message : "Fotoğraf yüklenemedi.");
      console.error("Fotoğraf yüklenemedi:", hata);
    }
  }

  // "Kapak fotoğrafı olsun": yeni yüklenenler seçildikleri sırayla başa
  // geçiyor, eskiler arkalarında kalıyor (K-93).
  if (veri.get("kapak") === "on" && eklenenler.length > 0) {
    const eskiler = await db.productImage.findMany({
      where: { productId: urun.id, id: { notIn: eklenenler } },
      orderBy: { sira: "asc" },
      select: { id: true },
    });
    const yeniSira = [...eklenenler, ...eskiler.map((g) => g.id)];
    await db.$transaction(
      yeniSira.map((gid, i) => db.productImage.update({ where: { id: gid }, data: { sira: i + 1 } })),
    );
  }

  vitriniYenile();
  if (hatalar.length > 0) {
    redirect(`/yonetim/urunler/${slug}?fhata=${encodeURIComponent(hatalar[0])}#fotograflar`);
  }
  redirect(`/yonetim/urunler/${slug}?fkayit=${dosyalar.length - hatalar.length}#fotograflar`);
}

export async function fotografSil(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "");
  const slug = String(veri.get("slug") ?? "");
  if (!id) return;

  const kayit = await db.productImage.findUnique({
    where: { id },
    select: { yol: true, kucukYol: true },
  });
  await db.productImage.delete({ where: { id } });
  if (kayit) await gorselDosyalariniSil([kayit.yol, kayit.kucukYol]);

  vitriniYenile();
  redirect(`/yonetim/urunler/${slug}?fsil=1#fotograflar`);
}

/**
 * Fotoğrafı bir sıra yukarı ya da aşağı taşır. Sürükle bırak yerine düğme,
 * çünkü JavaScript kapalıyken de çalışması gerekiyor. İlk sıradaki fotoğraf
 * kapak fotoğrafı.
 */
export async function fotografTasi(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "");
  const slug = String(veri.get("slug") ?? "");
  const yonGirdisi = String(veri.get("yon") ?? "");
  const yon = yonGirdisi === "yukari" ? -1 : 1;
  if (!id) return;

  const kayit = await db.productImage.findUnique({
    where: { id },
    select: { productId: true },
  });
  if (!kayit) return;

  const hepsi = await db.productImage.findMany({
    where: { productId: kayit.productId },
    orderBy: { sira: "asc" },
    select: { id: true },
  });

  const yer = hepsi.findIndex((g) => g.id === id);
  if (yonGirdisi === "kapak") {
    // Tek tıkla başa: kapak için fotoğrafı teker teker yukarı taşımak
    // gerekiyordu (K-93).
    if (yer <= 0) redirect(`/yonetim/urunler/${slug}#fotograflar`);
    hepsi.unshift(...hepsi.splice(yer, 1));
  } else {
    const hedef = yer + yon;
    if (yer === -1 || hedef < 0 || hedef >= hepsi.length) {
      redirect(`/yonetim/urunler/${slug}#fotograflar`);
    }
    [hepsi[yer], hepsi[hedef]] = [hepsi[hedef], hepsi[yer]];
  }

  // Sıra numaraları baştan yazılıyor: elle girilmiş boşluklu numaralar da
  // böylece düzeliyor.
  await db.$transaction(
    hepsi.map((g, i) => db.productImage.update({ where: { id: g.id }, data: { sira: i + 1 } })),
  );

  vitriniYenile();
  redirect(`/yonetim/urunler/${slug}?fsira=1#fotograflar`);
}

export async function fotografAdiKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "");
  const slug = String(veri.get("slug") ?? "");
  const altMetin = String(veri.get("altMetin") ?? "").trim().slice(0, 200);
  if (!id) return;

  // Fotoğrafın gösterdiği renk; boş bırakılırsa her renkte görünüyor (K-48).
  const renkGirdisi = String(veri.get("renk") ?? "").trim();
  const renk = (await renkKodlari()).includes(renkGirdisi) ? renkGirdisi : null;

  await db.productImage.update({ where: { id }, data: { altMetin, renk } });
  vitriniYenile();
  redirect(`/yonetim/urunler/${slug}?fkayit=0#fotograflar`);
}
