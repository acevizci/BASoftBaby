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
import { db } from "@/server/veritabani";
import { TUM_ETIKETLER } from "@/server/onbellek";
import { DURUMLAR, ODEME_DURUMLARI } from "@/ui/siparis-bicim";
import { BANNER_GORSELLERI, BANNER_PALETLERI } from "@/server/banner";
import { GorselHatasi, gorselDosyalariniSil, gorselYukle } from "@/server/gorsel-depo";
import { TASIYICILAR, takipAdresi, tasiyiciAdi } from "@/server/kargo";
import { faturaOlustur } from "@/server/fatura";
import { belgeBasilabilirMi } from "@/server/siparis-belge";
import { irsaliyeOlustur, irsaliyeSevkiniYaz } from "@/server/irsaliye";
import { adresAyrilmisMi, slugYap } from "@/server/slug";
import { renkKodlari } from "@/server/renkler";
import { formSayfaEki, tasimaSayfaEki } from "@/ui/sayfalama-bicim";
import { formAramaEki } from "@/ui/panel-arama-bicim";
import { aramaMetniniTazele } from "@/server/arama";
import { stokBildirimleriniGonder } from "@/server/stok-bildirimi";
import { stokAdresi, suzgeciCoz as stokSuzgeciniCoz } from "@/server/stok-ekrani";
import {
  suzgecAdresi as siparisSuzgecAdresi,
  suzgeciCoz as siparisSuzgeciniCoz,
} from "@/server/siparis-arama";
import { kargoyaVerildiEpostasi } from "@/server/eposta";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

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

function kurusaCevir(deger: FormDataEntryValue | null): number | null {
  if (deger === null) return null;
  const metin = String(deger).trim().replace(/\s/g, "").replace(",", ".");
  if (!metin) return null;
  const sayi = Number(metin);
  if (!Number.isFinite(sayi) || sayi < 0) return null;
  // Kayan noktalı çarpmada 249.9 * 100 = 24989.999... çıkıyor, yuvarlıyoruz.
  return Math.round(sayi * 100);
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
    await aramaMetniniTazele(guncel.id);
    vitriniYenile();
    redirect(`/yonetim/urunler/${eskiSlug}?kayit=1`);
  }

  const slug = slugYap(ad);
  const varOlan = await db.product.findUnique({ where: { slug } });
  if (varOlan) throw new Error(`"${ad}" adında bir ürün zaten var.`);

  const yeni = await db.product.create({ data: { slug, ...alanlar }, select: { id: true } });
  await aramaMetniniTazele(yeni.id);
  vitriniYenile();
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
    select: { id: true, images: { select: { yol: true, kucukYol: true } } },
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
  await db.product.delete({ where: { id: urun.id } });

  vitriniYenile();
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
    await db.product.deleteMany({ where: { id: { in: silinecekler.map((u) => u.id) } } });
    vitriniYenile();
  }

  redirect(donus(`toplu=sil&adet=${silinecekler.length}&atlanan=${atlananlar}`));
}

export async function varyantEkle(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const slug = metin(form, "slug");
  const beden = metin(form, "beden");
  const renk = metin(form, "renk");
  const stok = Number(metin(form, "stok") || "0");

  const urun = await db.product.findUniqueOrThrow({ where: { slug } });
  const varyant = await db.productVariant.upsert({
    where: { productId_beden_renk: { productId: urun.id, beden, renk } },
    update: { stok: Math.max(0, stok) },
    create: {
      productId: urun.id,
      beden,
      renk,
      stok: Math.max(0, stok),
      sku: `${slug}-${beden.replace(/\s/g, "")}-${renk}`,
    },
    select: { id: true },
  });
  await stokBildirimleriniGonder([varyant.id]);
  vitriniYenile();
  redirect(`/yonetim/urunler/${slug}?kayit=1`);
}

export async function varyantSil(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = metin(form, "id");
  const slug = metin(form, "slug");
  await db.productVariant.delete({ where: { id } });
  vitriniYenile();
  redirect(`/yonetim/urunler/${slug}?kayit=1`);
}

/** Stok ekranı: tek seferde birçok varyantın adedini günceller. */
export async function stoklariKaydet(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const islemler = [];
  const idler: string[] = [];
  for (const [ad, deger] of form.entries()) {
    if (!ad.startsWith("stok-")) continue;
    const id = ad.slice(5);
    const adet = Number(String(deger));
    if (!Number.isFinite(adet) || adet < 0) continue;
    islemler.push(db.productVariant.update({ where: { id }, data: { stok: Math.trunc(adet) } }));
    idler.push(id);
  }
  await db.$transaction(islemler);
  // Stok yazıldıktan sonra: bekleyen varsa ve artık stok varsa haber gidiyor.
  await stokBildirimleriniGonder(idler);
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
  redirect(`${adres}${adres.includes("?") ? "&" : "?"}kayit=1`);
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
      baslangic: baslangic ? new Date(baslangic) : null,
      bitis: bitis ? new Date(bitis) : null,
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
  await yoneticiGerekli();

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
    select: { teslimTarihi: true },
  });

  await db.order.update({
    where: { numara },
    data: {
      durum,
      odemeDurumu,
      kargoTakipNo: kargoTakipNo || null,
      ...(durum === "teslim" && !oncesi?.teslimTarihi ? { teslimTarihi: new Date() } : {}),
    },
  });

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
  if (!(DURUMLAR as readonly string[]).includes(durum)) redirect("/yonetim/siparisler");

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

  const sonuc = await db.order.updateMany({
    where: { numara: { in: numaralar } },
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
      await db.category.update({ where: { id }, data: { ad, aciklama, aktif } });
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
      data: { slug, ad, aciklama, aktif, sira: (sonSira._max.sira ?? 0) + 1 },
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
    vitriniYenile();
    redirect(
      `/yonetim/kategoriler?kayit=tasindi&adet=${urunAdedi}${formSayfaEki(veri)}${formAramaEki(veri)}`,
    );
  }

  await db.category.delete({ where: { id } });
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
  if (!numara) return;
  if (!TASIYICILAR.some((t) => t.kod === tasiyici)) redirect(`/yonetim/siparisler/${numara}`);

  const siparis = await db.order.findUnique({
    where: { numara },
    select: {
      id: true,
      numara: true,
      adSoyad: true,
      eposta: true,
      toplamKurus: true,
      odemeYontemi: true,
      durum: true,
      gonderiler: { orderBy: { olusturuldu: "desc" }, take: 1 },
    },
  });
  if (!siparis) redirect("/yonetim/siparisler");

  const oncekiTakip = siparis.gonderiler[0]?.takipNo ?? "";
  const gonderi = siparis.gonderiler[0];

  if (gonderi) {
    await db.shipment.update({
      where: { id: gonderi.id },
      data: {
        tasiyici,
        takipNo,
        barkod: takipNo || siparis.numara,
        durum: takipNo ? "verildi" : "hazirlandi",
      },
    });
  } else {
    await db.shipment.create({
      data: {
        orderId: siparis.id,
        tasiyici,
        takipNo,
        barkod: takipNo || siparis.numara,
        durum: takipNo ? "verildi" : "hazirlandi",
      },
    });
  }

  // Sipariş kartındaki takip numarası da aynı değeri göstersin.
  await db.order.update({
    where: { id: siparis.id },
    data: {
      kargoTakipNo: takipNo || null,
      durum: takipNo && siparis.durum !== "teslim" ? "kargoda" : siparis.durum,
    },
  });

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

const TIPLER = ["yuzde", "tutar"];
const KAPSAMLAR = ["tumu", "kategori", "urun"];

function tariheCevir(deger: FormDataEntryValue | null): Date | null {
  const metin = String(deger ?? "").trim();
  if (!metin) return null;
  const t = new Date(metin);
  return Number.isNaN(t.getTime()) ? null : t;
}

export async function kampanyaKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  const ad = String(veri.get("ad") ?? "").trim().slice(0, 80);
  const tip = String(veri.get("tip") ?? "yuzde");
  const kapsam = String(veri.get("kapsam") ?? "tumu");
  if (!ad || !TIPLER.includes(tip) || !KAPSAMLAR.includes(kapsam)) return;

  // Yüzde tam sayı, tutar kuruş. İkisi de aynı kutudan geliyor.
  const ham = String(veri.get("deger") ?? "").trim();
  const deger =
    tip === "yuzde"
      ? Math.max(1, Math.min(100, Math.round(Number(ham.replace(",", ".")) || 0)))
      : (kurusaCevir(ham) ?? 0);
  if (deger <= 0) return;

  const kuponKodu =
    String(veri.get("kuponKodu") ?? "").trim().toUpperCase().slice(0, 40) || null;

  const veriler = {
    ad,
    tip,
    deger,
    kapsam,
    categoryId: kapsam === "kategori" ? String(veri.get("categoryId") ?? "") || null : null,
    productId: kapsam === "urun" ? String(veri.get("productId") ?? "") || null : null,
    kuponKodu,
    enAzSepetKurus: kurusaCevir(veri.get("enAzSepet")) ?? 0,
    aktif: veri.get("aktif") === "on",
    baslangic: tariheCevir(veri.get("baslangic")),
    bitis: tariheCevir(veri.get("bitis")),
  };

  // Kapsam kategori ya da ürünse hedef seçilmiş olmalı, yoksa kampanya
  // sessizce herkese uygulanırdı.
  if (kapsam === "kategori" && !veriler.categoryId) return;
  if (kapsam === "urun" && !veriler.productId) return;

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

export async function bannerKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  const baslik = String(veri.get("baslik") ?? "").trim().slice(0, 120);
  if (!baslik) return;

  const palet = String(veri.get("palet") ?? "sari");
  const gorsel = String(veri.get("gorsel") ?? "amblem");
  if (!(BANNER_PALETLERI as readonly string[]).includes(palet)) return;
  if (!(BANNER_GORSELLERI as readonly string[]).includes(gorsel)) return;

  const siraHam = Number(String(veri.get("sira") ?? "0").trim());

  const veriler = {
    baslik,
    altYazi: String(veri.get("altYazi") ?? "").trim().slice(0, 300),
    dugmeYazi: String(veri.get("dugmeYazi") ?? "").trim().slice(0, 40),
    dugmeLink: String(veri.get("dugmeLink") ?? "").trim().slice(0, 200),
    palet,
    gorsel,
    sira: Number.isFinite(siraHam) ? Math.trunc(siraHam) : 0,
    aktif: veri.get("aktif") === "on",
    baslangic: tariheCevir(veri.get("baslangic")),
    bitis: tariheCevir(veri.get("bitis")),
  };

  if (id) {
    await db.heroBanner.update({ where: { id }, data: veriler });
  } else {
    await db.heroBanner.create({ data: veriler });
  }

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

  const b = await db.heroBanner.findUnique({ where: { id }, select: { id: true } });
  if (!b) redirect(`/yonetim/banner?hata=bulunamadi${formSayfaEki(veri)}`);

  await db.heroBanner.delete({ where: { id } });
  vitriniYenile();
  redirect(`/yonetim/banner?kayit=silindi${formSayfaEki(veri)}`);
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
  let sira = urun.images.reduce((e, g) => Math.max(e, g.sira), 0);
  const hatalar: string[] = [];

  for (const dosya of dosyalar) {
    try {
      const y = await gorselYukle(dosya);
      sira += 1;
      await db.productImage.create({
        data: {
          productId: urun.id,
          yol: y.yol,
          kucukYol: y.kucukYol,
          genislik: y.genislik,
          yukseklik: y.yukseklik,
          boyutBayt: y.boyutBayt,
          altMetin,
          sira,
        },
      });
    } catch (hata) {
      hatalar.push(hata instanceof GorselHatasi ? hata.message : "Fotoğraf yüklenemedi.");
      console.error("Fotoğraf yüklenemedi:", hata);
    }
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
  const yon = String(veri.get("yon") ?? "") === "yukari" ? -1 : 1;
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
  const hedef = yer + yon;
  if (yer === -1 || hedef < 0 || hedef >= hepsi.length) {
    redirect(`/yonetim/urunler/${slug}#fotograflar`);
  }

  [hepsi[yer], hepsi[hedef]] = [hepsi[hedef], hepsi[yer]];

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
