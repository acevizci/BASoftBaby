"use server";

/**
 * Beden yönetimi.
 *
 * Bedenler kodda sabitti; artık `Size` tablosunda ve buradan yönetiliyor
 * (K-56). Dört kural bu dosyanın tamamını açıklıyor:
 *
 * 1. **Ad değişince açık varyantlar da değişiyor, sipariş geçmişi
 *    değişmiyor.** Varyant bedeni metin olarak tutuyor; ad değiştiğinde aynı
 *    işlem içinde güncellenmezse o ürünler adı olmayan bir bedende kalırdı.
 *    Sipariş satırları ise kasten dokunulmuyor: satılan şeyin kaydı sonradan
 *    değişmemeli.
 * 2. **Kullanılan beden silinmiyor, kapatılıyor.** Silmek o bedendeki
 *    varyantları sahipsiz bırakırdı. Kapatmak mağazada görünmez yapıyor,
 *    veriye dokunmuyor — geri alınabilir bir işlem.
 * 3. **Son açık beden kapatılamıyor.** Hiç bedeni olmayan bir mağazada
 *    hiçbir ürün satılamaz; kategorilerdeki "son kategori" kuralının aynısı.
 * 4. **Sıra ok düğmeleriyle.** Panelin geri kalanı gibi JavaScript'siz
 *    çalışıyor.
 */

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { TUM_ETIKETLER } from "@/server/onbellek";
import { yasKodlari } from "@/server/yas-gruplari";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

const SAYFA = "/yonetim/bedenler";

function vitriniYenile() {
  for (const etiket of TUM_ETIKETLER) updateTag(etiket);
  revalidatePath("/", "layout");
}

/**
 * Boş ya da tanınmayan yaş kodu "hiçbiri" demek.
 *
 * Kod listesi artık veritabanından geliyor (K-65): silinmiş bir gruba ait
 * kod forma elle yazılsa bile bedene yazılmıyor.
 */
async function yasKoduCoz(ham: string): Promise<string | null> {
  const k = ham.trim();
  if (!k) return null;
  return (await yasKodlari()).includes(k) ? k : null;
}

async function alanlar(veri: FormData) {
  return {
    ad: String(veri.get("ad") ?? "").trim().slice(0, 40),
    boy: String(veri.get("boy") ?? "").trim().slice(0, 40),
    kilo: String(veri.get("kilo") ?? "").trim().slice(0, 40),
    yasKodu: await yasKoduCoz(String(veri.get("yasKodu") ?? "")),
  };
}

export async function bedenEkle(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const { ad, boy, kilo, yasKodu } = await alanlar(veri);
  if (!ad) redirect(`${SAYFA}?hata=ad`);

  const varMi = await db.size.findUnique({ where: { ad }, select: { id: true } });
  if (varMi) redirect(`${SAYFA}?hata=tekrar`);

  const son = await db.size.aggregate({ _max: { sira: true } });
  await db.size.create({
    data: { ad, boy, kilo, yasKodu, sira: (son._max.sira ?? 0) + 1 },
  });

  vitriniYenile();
  redirect(`${SAYFA}?kayit=eklendi`);
}

/**
 * Adı, ölçüleri ve yaş grubunu kaydeder.
 *
 * Ad değiştiyse o bedendeki varyantlar aynı işlemde güncelleniyor: ikisi ayrı
 * yapılsaydı arada düşen bir istek ürünleri artık var olmayan bir beden
 * adında bırakırdı.
 */
export async function bedenKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  const { ad, boy, kilo, yasKodu } = await alanlar(veri);
  if (!id) redirect(SAYFA);
  if (!ad) redirect(`${SAYFA}?hata=ad`);

  const mevcut = await db.size.findUnique({ where: { id }, select: { ad: true } });
  if (!mevcut) redirect(SAYFA);

  if (mevcut.ad !== ad) {
    const cakisma = await db.size.findUnique({ where: { ad }, select: { id: true } });
    if (cakisma) redirect(`${SAYFA}?hata=tekrar`);
  }

  await db.$transaction(async (islem) => {
    await islem.size.update({ where: { id }, data: { ad, boy, kilo, yasKodu } });
    if (mevcut.ad !== ad) {
      // Sipariş satırlarına dokunulmuyor: satılan bedenin adı kayıtta
      // olduğu gibi kalmalı.
      await islem.productVariant.updateMany({
        where: { beden: mevcut.ad },
        data: { beden: ad },
      });
    }
  });

  vitriniYenile();
  redirect(`${SAYFA}?kayit=kaydedildi`);
}

export async function bedenCevir(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  if (!id) redirect(SAYFA);

  const mevcut = await db.size.findUnique({ where: { id }, select: { aktif: true } });
  if (!mevcut) redirect(SAYFA);

  // Son açık bedeni kapatmak mağazada satılabilir hiçbir ürün bırakmazdı.
  if (mevcut.aktif) {
    const acikSayisi = await db.size.count({ where: { aktif: true } });
    if (acikSayisi <= 1) redirect(`${SAYFA}?hata=sonbeden`);
  }

  await db.size.update({ where: { id }, data: { aktif: !mevcut.aktif } });

  vitriniYenile();
  redirect(`${SAYFA}?kayit=${mevcut.aktif ? "kapatildi" : "acildi"}`);
}

/**
 * Bedeni siler — yalnızca hiçbir üründe kullanılmıyorsa.
 *
 * Kullanılıyorsa silmek yerine kapatmak gerekiyor; ekran da bunu söylüyor.
 * Kategori silmedeki "ürünleri nereye taşıyalım" sorusunun karşılığı burada
 * yok: bir ürünü başka bir bedene taşımak stok bilgisini bozar.
 */
export async function bedenSil(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  if (!id) redirect(SAYFA);

  const beden = await db.size.findUnique({ where: { id }, select: { ad: true } });
  if (!beden) redirect(SAYFA);

  const kullanim = await db.productVariant.count({ where: { beden: beden.ad } });
  if (kullanim > 0) redirect(`${SAYFA}?hata=kullanimda&adet=${kullanim}`);

  await db.size.delete({ where: { id } });

  vitriniYenile();
  redirect(`${SAYFA}?kayit=silindi`);
}

/** Sıralama ok düğmeleriyle: JavaScript'siz çalışıyor. */
export async function bedenTasi(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  const yon = String(veri.get("yon") ?? "") === "yukari" ? -1 : 1;
  if (!id) redirect(SAYFA);

  const hepsi = await db.size.findMany({ orderBy: { sira: "asc" }, select: { id: true } });
  const yer = hepsi.findIndex((b) => b.id === id);
  const hedef = yer + yon;
  if (yer === -1 || hedef < 0 || hedef >= hepsi.length) redirect(SAYFA);

  [hepsi[yer], hepsi[hedef]] = [hepsi[hedef], hepsi[yer]];

  // Sıra numaraları baştan yazılıyor: elle açılmış boşluklar da düzeliyor.
  await db.$transaction(
    hepsi.map((b, i) => db.size.update({ where: { id: b.id }, data: { sira: i + 1 } })),
  );

  vitriniYenile();
  redirect(`${SAYFA}?kayit=sira`);
}
