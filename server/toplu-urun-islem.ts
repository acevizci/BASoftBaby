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
  anlikStokAl,
  planiUygula,
  satirlariCoz,
  tabloyuOku,
  type Hata,
  type Satir,
  type UygulamaSonucu,
} from "@/server/toplu-urun";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { bedenAdlari } from "@/server/bedenler";
import { renkSecenekleri } from "@/server/renkler";

/**
 * Yükleme dosyası için üst sınır. Birkaç bin satırlık tablo bunun çok altında.
 * Vercel 4,5 MB'tan büyük isteği sunucuya hiç ulaştırmıyor; sınır onun altında
 * olmazsa kişi bu mesaj yerine anlaşılmaz bir tarayıcı hatası görüyor.
 */
const EN_BUYUK_BAYT = 4 * 1024 * 1024;

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
    ({ satirlar, hatalar } = satirlariCoz(
      basliklar,
      ham,
      await bedenAdlari(),
      await renkSecenekleri(),
    ));
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
      // Onayda "arada satış oldu mu" diye bakılacak (K-102).
      anlikStok: await anlikStokAl(satirlar),
    },
    select: { id: true },
  });

  redirect(`/yonetim/urunler/toplu?yukleme=${kayit.id}`);
}

export async function topluUygula(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();

  const id = String(form.get("id") ?? "").trim();
  const kayit = await db.productImport.findUnique({ where: { id } });
  if (!kayit) redirect("/yonetim/urunler/toplu?hata=yok");
  if (kayit.uygulandi) redirect(`/yonetim/urunler/toplu?yukleme=${id}&hata=zaten`);

  const satirlar = kayit.satirlar as unknown as Satir[];

  let sonuc: UygulamaSonucu;
  try {
    sonuc = await planiUygula(satirlar, kayit.anlikStok as Record<string, number> | null, ben);
  } catch (e) {
    const mesaj = e instanceof Error ? e.message : "Yazma sırasında hata oldu.";
    redirect(
      `/yonetim/urunler/toplu?yukleme=${id}&hata=yazma&mesaj=${encodeURIComponent(mesaj)}`,
    );
  }

  await db.productImport.update({ where: { id }, data: { uygulandi: new Date() } });
  vitriniYenile();
  const p = new URLSearchParams({ urun: String(sonuc.urun), varyant: String(sonuc.varyant) });
  if (sonuc.atlanan.length > 0) {
    p.set("atlanan", String(sonuc.atlanan.length));
    // Adres uzamasın: ilk yirmisi yazılıyor, sayı zaten tamamını söylüyor.
    p.set(
      "atlananlar",
      sonuc.atlanan
        .slice(0, 20)
        .map((a) => `${a.ad} · ${a.beden} · ${a.renk}`)
        .join("\n"),
    );
  }
  redirect(`/yonetim/urunler/toplu?${p.toString()}`);
}

export async function topluVazgec(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(form.get("id") ?? "").trim();
  if (id) await db.productImport.deleteMany({ where: { id, uygulandi: null } });
  redirect("/yonetim/urunler/toplu");
}
