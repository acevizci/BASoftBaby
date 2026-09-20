"use server";

/**
 * Yönetim panelinin yazma işlemleri.
 *
 * Hepsi sunucuda çalışır; tarayıcıya hiç veritabanı kodu gitmez. Her
 * değişiklikten sonra vitrin sayfaları yenilenir, yoksa müşteri eski fiyatı
 * görmeye devam eder.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { DURUMLAR, ODEME_DURUMLARI } from "@/ui/siparis-bicim";
import { BANNER_GORSELLERI, BANNER_PALETLERI } from "@/server/banner";
import { GorselHatasi, gorselDosyalariniSil, gorselYukle } from "@/server/gorsel-depo";

function vitriniYenile() {
  revalidatePath("/", "layout");
}

/** "Organik zıbın · 3'lü" → "organik-zibin-3lu" */
function slugYap(metin: string): string {
  const harfler: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return metin
    .split("")
    .map((h) => harfler[h] ?? h)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
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
  const eskiSlug = metin(form, "eskiSlug");
  const ad = metin(form, "ad");
  const fiyatKurus = kurusaCevir(form.get("fiyat"));

  if (!ad || fiyatKurus === null) {
    throw new Error("Ürün adı ve geçerli bir fiyat gerekli.");
  }

  const kategoriSlug = metin(form, "kategori");
  const kategori = await db.category.findUniqueOrThrow({ where: { slug: kategoriSlug } });

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
    palet: metin(form, "palet") || "mint",
    aktif: form.get("aktif") === "on",
  };

  if (eskiSlug) {
    await db.product.update({ where: { slug: eskiSlug }, data: alanlar });
    vitriniYenile();
    redirect(`/yonetim/urunler/${eskiSlug}?kayit=1`);
  }

  const slug = slugYap(ad);
  const varOlan = await db.product.findUnique({ where: { slug } });
  if (varOlan) throw new Error(`"${ad}" adında bir ürün zaten var.`);

  await db.product.create({ data: { slug, ...alanlar } });
  vitriniYenile();
  redirect(`/yonetim/urunler/${slug}?kayit=1`);
}

export async function varyantEkle(form: FormData): Promise<void> {
  const slug = metin(form, "slug");
  const beden = metin(form, "beden");
  const renk = metin(form, "renk");
  const stok = Number(metin(form, "stok") || "0");

  const urun = await db.product.findUniqueOrThrow({ where: { slug } });
  await db.productVariant.upsert({
    where: { productId_beden_renk: { productId: urun.id, beden, renk } },
    update: { stok: Math.max(0, stok) },
    create: {
      productId: urun.id,
      beden,
      renk,
      stok: Math.max(0, stok),
      sku: `${slug}-${beden.replace(/\s/g, "")}-${renk}`,
    },
  });
  vitriniYenile();
  redirect(`/yonetim/urunler/${slug}?kayit=1`);
}

export async function varyantSil(form: FormData): Promise<void> {
  const id = metin(form, "id");
  const slug = metin(form, "slug");
  await db.productVariant.delete({ where: { id } });
  vitriniYenile();
  redirect(`/yonetim/urunler/${slug}?kayit=1`);
}

/** Stok ekranı: tek seferde birçok varyantın adedini günceller. */
export async function stoklariKaydet(form: FormData): Promise<void> {
  const islemler = [];
  for (const [ad, deger] of form.entries()) {
    if (!ad.startsWith("stok-")) continue;
    const id = ad.slice(5);
    const adet = Number(String(deger));
    if (!Number.isFinite(adet) || adet < 0) continue;
    islemler.push(db.productVariant.update({ where: { id }, data: { stok: Math.trunc(adet) } }));
  }
  await db.$transaction(islemler);
  vitriniYenile();
  redirect("/yonetim/stok?kayit=1");
}

export async function duyuruEkle(form: FormData): Promise<void> {
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
  redirect("/yonetim/duyuru?kayit=1");
}

export async function duyuruCevir(form: FormData): Promise<void> {
  const id = metin(form, "id");
  const mevcut = await db.announcement.findUniqueOrThrow({ where: { id } });
  await db.announcement.update({ where: { id }, data: { aktif: !mevcut.aktif } });
  vitriniYenile();
  redirect("/yonetim/duyuru");
}

export async function duyuruSil(form: FormData): Promise<void> {
  await db.announcement.delete({ where: { id: metin(form, "id") } });
  vitriniYenile();
  redirect("/yonetim/duyuru");
}

export async function seritAyariKaydet(form: FormData): Promise<void> {
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
  redirect("/yonetim/duyuru?kayit=1");
}

/* ── Siparişler ─────────────────────────────────────────────────────────── */

/**
 * Sipariş durumu ve ödeme durumu. Yalnızca bilinen değerler kabul edilir;
 * form kurcalanıp durum alanına rastgele metin yazılamaz.
 */
export async function siparisDurumuKaydet(veri: FormData): Promise<void> {
  const numara = String(veri.get("numara") ?? "").trim().toUpperCase();
  const durum = String(veri.get("durum") ?? "");
  const odemeDurumu = String(veri.get("odemeDurumu") ?? "");
  const kargoTakipNo = String(veri.get("kargoTakipNo") ?? "").trim();
  if (!numara) return;

  if (!(DURUMLAR as readonly string[]).includes(durum)) return;
  if (!(ODEME_DURUMLARI as readonly string[]).includes(odemeDurumu)) return;

  await db.order.update({
    where: { numara },
    data: { durum, odemeDurumu, kargoTakipNo: kargoTakipNo || null },
  });

  vitriniYenile();
  redirect(`/yonetim/siparisler/${numara}?kayit=1`);
}

/* ── Satış ayarları ─────────────────────────────────────────────────────── */

export async function satisAyariKaydet(veri: FormData): Promise<void> {
  const kargo = kurusaCevir(veri.get("kargo")) ?? 0;
  const esik = kurusaCevir(veri.get("esik")) ?? 0;
  const havaleBilgisi = String(veri.get("havaleBilgisi") ?? "").trim().slice(0, 1000);

  await db.storeSetting.upsert({
    where: { id: "tek" },
    update: { kargoKurus: kargo, bedavaKargoEsigi: esik, havaleBilgisi },
    create: { id: "tek", kargoKurus: kargo, bedavaKargoEsigi: esik, havaleBilgisi },
  });

  vitriniYenile();
  redirect("/yonetim/ayarlar?kayit=1");
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
  const id = String(veri.get("id") ?? "");
  if (!id) return;

  const k = await db.campaign.findUnique({ where: { id }, select: { aktif: true } });
  if (!k) return;

  await db.campaign.update({ where: { id }, data: { aktif: !k.aktif } });
  vitriniYenile();
}

export async function kampanyaSil(veri: FormData): Promise<void> {
  const id = String(veri.get("id") ?? "");
  if (!id) return;

  await db.campaign.delete({ where: { id } });
  vitriniYenile();
}

/* ── Ana sayfa banner'ı ─────────────────────────────────────────────────── */

export async function bannerKaydet(veri: FormData): Promise<void> {
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
  redirect("/yonetim/banner?kayit=1");
}

export async function bannerCevir(veri: FormData): Promise<void> {
  const id = String(veri.get("id") ?? "");
  if (!id) return;

  const b = await db.heroBanner.findUnique({ where: { id }, select: { aktif: true } });
  if (!b) return;

  await db.heroBanner.update({ where: { id }, data: { aktif: !b.aktif } });
  vitriniYenile();
}

export async function bannerSil(veri: FormData): Promise<void> {
  const id = String(veri.get("id") ?? "");
  if (!id) return;

  await db.heroBanner.delete({ where: { id } });
  vitriniYenile();
}

export async function bannerSuresiKaydet(veri: FormData): Promise<void> {
  const ham = Number(String(veri.get("saniye") ?? "").trim());
  const saniye = Number.isFinite(ham) ? Math.max(2, Math.min(30, Math.round(ham))) : 6;

  await db.storeSetting.upsert({
    where: { id: "tek" },
    update: { bannerSaniye: saniye },
    create: { id: "tek", bannerSaniye: saniye },
  });

  vitriniYenile();
  redirect("/yonetim/banner?kayit=1");
}

/* ---------------------------------------------------------------- fotoğraf */

/**
 * Ürüne fotoğraf ekler. Birden çok dosya seçilebiliyor; biri bozuksa
 * diğerleri yine de yükleniyor ve kaç tanesinin başarısız olduğu ekrana
 * dönüyor. Yükleme sırası seçim sırası.
 */
export async function fotografEkle(veri: FormData): Promise<void> {
  const slug = String(veri.get("slug") ?? "");
  const urun = await db.product.findUnique({
    where: { slug },
    select: { id: true, ad: true, images: { select: { sira: true } } },
  });
  if (!urun) redirect("/yonetim/urunler");

  const dosyalar = veri.getAll("fotograf").filter((d): d is File => d instanceof File && d.size > 0);
  if (dosyalar.length === 0) redirect(`/yonetim/urunler/${slug}?fhata=bos`);

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
    redirect(`/yonetim/urunler/${slug}?fhata=${encodeURIComponent(hatalar[0])}`);
  }
  redirect(`/yonetim/urunler/${slug}?fkayit=${dosyalar.length - hatalar.length}`);
}

export async function fotografSil(veri: FormData): Promise<void> {
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
  redirect(`/yonetim/urunler/${slug}?fsil=1`);
}

/**
 * Fotoğrafı bir sıra yukarı ya da aşağı taşır. Sürükle bırak yerine düğme,
 * çünkü JavaScript kapalıyken de çalışması gerekiyor. İlk sıradaki fotoğraf
 * kapak fotoğrafı.
 */
export async function fotografTasi(veri: FormData): Promise<void> {
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
    redirect(`/yonetim/urunler/${slug}`);
  }

  [hepsi[yer], hepsi[hedef]] = [hepsi[hedef], hepsi[yer]];

  // Sıra numaraları baştan yazılıyor: elle girilmiş boşluklu numaralar da
  // böylece düzeliyor.
  await db.$transaction(
    hepsi.map((g, i) => db.productImage.update({ where: { id: g.id }, data: { sira: i + 1 } })),
  );

  vitriniYenile();
  redirect(`/yonetim/urunler/${slug}`);
}

export async function fotografAdiKaydet(veri: FormData): Promise<void> {
  const id = String(veri.get("id") ?? "");
  const slug = String(veri.get("slug") ?? "");
  const altMetin = String(veri.get("altMetin") ?? "").trim().slice(0, 200);
  if (!id) return;

  await db.productImage.update({ where: { id }, data: { altMetin } });
  vitriniYenile();
  redirect(`/yonetim/urunler/${slug}?fkayit=0`);
}
