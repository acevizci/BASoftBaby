"use server";

/**
 * Toplu ürün yüklemesinin panel eylemleri.
 *
 * İki adım: önce dosya okunup "ne olacak" gösteriliyor, sonra onaylanıyor.
 * Arada çözülmüş satırlar `ProductImport` kaydında duruyor — ara kayıt
 * olmasaydı onay ekranı JavaScript gerektirirdi.
 */

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { TUM_ETIKETLER } from "@/server/onbellek";
import {
  planiUygula,
  satirlariCoz,
  tabloyuOku,
  type Hata,
  type Satir,
} from "@/server/toplu-urun";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

/** Yükleme dosyası için üst sınır. Birkaç bin satırlık tablo bunun çok altında. */
const EN_BUYUK_BAYT = 5 * 1024 * 1024;

function vitriniYenile() {
  for (const etiket of TUM_ETIKETLER) updateTag(etiket);
  revalidatePath("/", "layout");
}

export async function topluOnizle(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const dosya = form.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) {
    redirect("/yonetim/urunler/toplu?hata=dosya");
  }
  if (dosya.size > EN_BUYUK_BAYT) {
    redirect("/yonetim/urunler/toplu?hata=buyuk");
  }

  let satirlar: Satir[];
  let hatalar: Hata[];
  try {
    const { basliklar, satirlar: ham } = await tabloyuOku(dosya.name, await dosya.arrayBuffer());
    ({ satirlar, hatalar } = satirlariCoz(basliklar, ham));
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : "Dosya okunamadı.";
    redirect(`/yonetim/urunler/toplu?hata=okuma&mesaj=${encodeURIComponent(mesaj)}`);
  }

  // Biçim hatası olsa bile kayıt açılıyor: hatalar da onay ekranında,
  // satır numaralarıyla birlikte gösteriliyor — insan neyi düzelteceğini
  // görsün diye.
  const kayit = await db.productImport.create({
    data: {
      dosyaAdi: dosya.name,
      satirlar: satirlar as unknown as object,
      hatalar: hatalar as unknown as object,
      satirSayisi: satirlar.length,
    },
    select: { id: true },
  });

  redirect(`/yonetim/urunler/toplu?yukleme=${kayit.id}`);
}

export async function topluUygula(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(form.get("id") ?? "").trim();
  const kayit = await db.productImport.findUnique({ where: { id } });
  if (!kayit) redirect("/yonetim/urunler/toplu?hata=yok");
  if (kayit.uygulandi) redirect(`/yonetim/urunler/toplu?yukleme=${id}&hata=zaten`);

  const satirlar = kayit.satirlar as unknown as Satir[];

  let sonuc: { urun: number; varyant: number };
  try {
    sonuc = await planiUygula(satirlar);
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : "Yazma sırasında hata oldu.";
    redirect(
      `/yonetim/urunler/toplu?yukleme=${id}&hata=yazma&mesaj=${encodeURIComponent(mesaj)}`,
    );
  }

  await db.productImport.update({ where: { id }, data: { uygulandi: new Date() } });
  vitriniYenile();
  redirect(`/yonetim/urunler/toplu?urun=${sonuc.urun}&varyant=${sonuc.varyant}`);
}

export async function topluVazgec(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(form.get("id") ?? "").trim();
  if (id) await db.productImport.deleteMany({ where: { id, uygulandi: null } });
  redirect("/yonetim/urunler/toplu");
}
