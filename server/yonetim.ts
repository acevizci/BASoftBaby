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
