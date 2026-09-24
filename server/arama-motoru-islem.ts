"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { ETIKETLER } from "@/server/onbellek";
import { dogrulamaKoduCoz } from "@/server/arama-motoru-bicim";
import { indexNowBildir } from "@/server/arama-motoru";

const SAYFA = "/yonetim/ayarlar/arama-motorlari";

/** Doğrulama kodları ve IndexNow açık/kapalı (K-129). */
export async function aramaMotoruKaydet(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const google = dogrulamaKoduCoz(String(form.get("google") ?? ""));
  const bing = dogrulamaKoduCoz(String(form.get("bing") ?? ""));
  const yandex = dogrulamaKoduCoz(String(form.get("yandex") ?? ""));
  if (google === null) redirect(`${SAYFA}?hata=google`);
  if (bing === null) redirect(`${SAYFA}?hata=bing`);
  if (yandex === null) redirect(`${SAYFA}?hata=yandex`);

  const veri = {
    googleDogrulama: google,
    bingDogrulama: bing,
    yandexDogrulama: yandex,
    indexNowAcik: form.get("indexNow") === "on",
  };
  await db.storeSetting.upsert({ where: { id: "tek" }, update: veri, create: { id: "tek", ...veri } });
  updateTag(ETIKETLER.ayarlar);
  revalidatePath("/", "layout");
  redirect(`${SAYFA}?kayit=1`);
}

/** Bütün yayındaki ürün ve kategorileri bir kerede bildirir (ilk kurulumda). */
export async function hepsiniBildir(): Promise<void> {
  await yoneticiGerekli();
  const [urunler, kategoriler] = await Promise.all([
    db.product.findMany({ where: { aktif: true, category: { aktif: true } }, select: { slug: true } }),
    db.category.findMany({ where: { aktif: true }, select: { slug: true } }),
  ]);
  const sonuc = await indexNowBildir([
    "/",
    ...kategoriler.map((k) => `/${k.slug}`),
    ...urunler.map((u) => `/urun/${u.slug}`),
  ]);
  redirect(
    sonuc.gonderildi
      ? `${SAYFA}?bildirildi=${sonuc.adet}`
      : `${SAYFA}?bildirilemedi=${encodeURIComponent(sonuc.sebep ?? "")}`,
  );
}
