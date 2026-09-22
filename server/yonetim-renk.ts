"use server";

/**
 * Renk yönetimi.
 *
 * Renkler kodda sabitti; artık `Color` tablosunda ve buradan yönetiliyor
 * (K-66). Beden (K-56) ve yaş grubu (K-65) yönetiminin kardeşi; farkları:
 *
 * 1. **Renk dört yerde metin olarak geçiyor:** varyantta, ürün
 *    fotoğrafında, ürünün çizim renginde ve afişte. Kod değişince dördü de
 *    aynı işlem içinde güncelleniyor — biri atlanırsa o kayıtlar olmayan bir
 *    renge bağlı kalır, çizim nötr kum rengine düşerdi.
 * 2. **Palet de kaydın parçası.** Renk yalnızca ad değil: fotoğrafı olmayan
 *    ürünün çizimi bu dört renkle boyanıyor. Adı "Pudra" yapıp paleti nane
 *    yeşili bırakmak yanlış ürün gösterir.
 * 3. **Son açık renk kapatılamıyor** — bedendeki kuralın aynısı: rengi
 *    olmayan bir mağazada ürüne varyant eklenemez.
 */

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { TUM_ETIKETLER } from "@/server/onbellek";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

const SAYFA = "/yonetim/renkler";

function vitriniYenile() {
  for (const etiket of TUM_ETIKETLER) updateTag(etiket);
  revalidatePath("/", "layout");
}

/**
 * Kodu sade hâle getirir: "Açık Pudra" → "acik-pudra".
 *
 * Kod adres satırında geçiyor (`/urunler?renk=mint`) ve toplu ürün
 * yüklemedeki CSV sütununda kabul ediliyor; Türkçe harf ve boşluk ikisini de
 * zorlaştırıyor.
 */
function koduDuzelt(ham: string): string {
  const harita: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return ham
    .trim()
    .replace(/[çğıöşüÇĞİIÖŞÜ]/g, (h) => harita[h] ?? h)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

/**
 * Renk kodunu okur.
 *
 * Tarayıcının renk seçicisi hep `#rrggbb` gönderiyor ama form elle de
 * doldurulabiliyor (JavaScript kapalıyken alan düz metin oluyor). Geçersiz
 * değer yerine yedek renk kullanılıyor: kaydı reddetmek, tek bir harf
 * hatasında dört alanın hepsini yeniden yazdırırdı.
 */
function renkKodu(ham: string, yedek: string): string {
  const k = ham.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(k)) return k.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(k)) {
    const [, a, b, c] = k.toLowerCase();
    return `#${a}${a}${b}${b}${c}${c}`;
  }
  return yedek;
}

function alanlar(veri: FormData, yedek?: { zemin: string; c1: string; c2: string; c3: string }) {
  return {
    kod: koduDuzelt(String(veri.get("kod") ?? "")),
    ad: String(veri.get("ad") ?? "").trim().slice(0, 40),
    zemin: renkKodu(String(veri.get("zemin") ?? ""), yedek?.zemin ?? "#f4efe6"),
    c1: renkKodu(String(veri.get("c1") ?? ""), yedek?.c1 ?? "#d9cfc0"),
    c2: renkKodu(String(veri.get("c2") ?? ""), yedek?.c2 ?? "#eae3d6"),
    c3: renkKodu(String(veri.get("c3") ?? ""), yedek?.c3 ?? "#8c8378"),
  };
}

export async function renkEkle(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const { kod, ad, zemin, c1, c2, c3 } = alanlar(veri);
  if (!kod) redirect(`${SAYFA}?hata=kod`);
  if (!ad) redirect(`${SAYFA}?hata=ad`);

  const varMi = await db.color.findUnique({ where: { kod }, select: { id: true } });
  if (varMi) redirect(`${SAYFA}?hata=tekrar`);

  const son = await db.color.aggregate({ _max: { sira: true } });
  await db.color.create({
    data: { kod, ad, zemin, c1, c2, c3, sira: (son._max.sira ?? 0) + 1 },
  });

  vitriniYenile();
  redirect(`${SAYFA}?kayit=eklendi`);
}

/**
 * Adı, kodu ve paleti kaydeder.
 *
 * Kod değiştiyse o renge bağlı her şey aynı işlemde taşınıyor: varyantlar,
 * renge özel ürün fotoğrafları, ürünün çizim rengi ve afişler. Sipariş
 * satırlarına kasten dokunulmuyor — satılan şeyin kaydı sonradan değişmemeli.
 */
export async function renkKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  if (!id) redirect(SAYFA);

  const mevcut = await db.color.findUnique({
    where: { id },
    select: { kod: true, zemin: true, c1: true, c2: true, c3: true },
  });
  if (!mevcut) redirect(`${SAYFA}?hata=bulunamadi`);

  const { kod, ad, zemin, c1, c2, c3 } = alanlar(veri, mevcut);
  if (!kod) redirect(`${SAYFA}?hata=kod`);
  if (!ad) redirect(`${SAYFA}?hata=ad`);

  if (mevcut.kod !== kod) {
    const cakisma = await db.color.findUnique({ where: { kod }, select: { id: true } });
    if (cakisma) redirect(`${SAYFA}?hata=tekrar`);
  }

  await db.$transaction(async (islem) => {
    await islem.color.update({ where: { id }, data: { kod, ad, zemin, c1, c2, c3 } });
    if (mevcut.kod !== kod) {
      await islem.productVariant.updateMany({
        where: { renk: mevcut.kod },
        data: { renk: kod },
      });
      await islem.productImage.updateMany({
        where: { renk: mevcut.kod },
        data: { renk: kod },
      });
      await islem.product.updateMany({
        where: { palet: mevcut.kod },
        data: { palet: kod },
      });
      await islem.heroBanner.updateMany({
        where: { palet: mevcut.kod },
        data: { palet: kod },
      });
    }
  });

  vitriniYenile();
  redirect(`${SAYFA}?kayit=kaydedildi`);
}

export async function renkCevir(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  if (!id) redirect(SAYFA);

  const mevcut = await db.color.findUnique({ where: { id }, select: { aktif: true } });
  if (!mevcut) redirect(`${SAYFA}?hata=bulunamadi`);

  // Son açık rengi kapatmak ürüne varyant eklenemez hâle getirirdi.
  if (mevcut.aktif) {
    const acikSayisi = await db.color.count({ where: { aktif: true } });
    if (acikSayisi <= 1) redirect(`${SAYFA}?hata=sonrenk`);
  }

  await db.color.update({ where: { id }, data: { aktif: !mevcut.aktif } });

  vitriniYenile();
  redirect(`${SAYFA}?kayit=${mevcut.aktif ? "kapatildi" : "acildi"}`);
}

/**
 * Rengi siler — yalnızca hiçbir üründe, fotoğrafta ve afişte kullanılmıyorsa.
 *
 * Kullanılıyorsa silmek o varyantları sahipsiz, çizimleri nötr kum renginde
 * bırakırdı; ekran da bunu söylüyor ve kapatmayı öneriyor.
 */
export async function renkSil(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  if (!id) redirect(SAYFA);

  const renk = await db.color.findUnique({ where: { id }, select: { kod: true } });
  if (!renk) redirect(`${SAYFA}?hata=bulunamadi`);

  const [varyant, fotograf, urun, afis] = await Promise.all([
    db.productVariant.count({ where: { renk: renk.kod } }),
    db.productImage.count({ where: { renk: renk.kod } }),
    db.product.count({ where: { palet: renk.kod } }),
    db.heroBanner.count({ where: { palet: renk.kod } }),
  ]);
  const kullanim = varyant + fotograf + urun + afis;
  if (kullanim > 0) redirect(`${SAYFA}?hata=kullanimda&adet=${kullanim}`);

  await db.color.delete({ where: { id } });

  vitriniYenile();
  redirect(`${SAYFA}?kayit=silindi`);
}

/** Sıralama ok düğmeleriyle: JavaScript'siz çalışıyor. */
export async function renkTasi(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  const yon = String(veri.get("yon") ?? "") === "yukari" ? -1 : 1;
  if (!id) redirect(SAYFA);

  const hepsi = await db.color.findMany({ orderBy: { sira: "asc" }, select: { id: true } });
  const yer = hepsi.findIndex((r) => r.id === id);
  const hedef = yer + yon;
  if (yer === -1 || hedef < 0 || hedef >= hepsi.length) redirect(SAYFA);

  [hepsi[yer], hepsi[hedef]] = [hepsi[hedef], hepsi[yer]];

  // Sıra numaraları baştan yazılıyor: elle açılmış boşluklar da düzeliyor.
  await db.$transaction(
    hepsi.map((r, i) => db.color.update({ where: { id: r.id }, data: { sira: i + 1 } })),
  );

  vitriniYenile();
  redirect(`${SAYFA}?kayit=sira`);
}
