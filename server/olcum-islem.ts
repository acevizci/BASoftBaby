"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { ETIKETLER } from "@/server/onbellek";
import { googleKimligiCoz, metaKimligiCoz } from "@/ui/olcum-bicim";

/** Reklam ölçümü kimlikleri (K-124). Hatalı biçimde kimlik kaydedilmiyor. */
export async function olcumAyariKaydet(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const metaPikselId = metaKimligiCoz(String(form.get("meta") ?? ""));
  const googleEtiketId = googleKimligiCoz(String(form.get("google") ?? ""));
  if (metaPikselId === null) redirect("/yonetim/ayarlar/olcum?hata=meta");
  if (googleEtiketId === null) redirect("/yonetim/ayarlar/olcum?hata=google");

  const veri = { metaPikselId, googleEtiketId };
  await db.storeSetting.upsert({ where: { id: "tek" }, update: veri, create: { id: "tek", ...veri } });
  updateTag(ETIKETLER.ayarlar);
  revalidatePath("/", "layout");
  redirect("/yonetim/ayarlar/olcum?kayit=1");
}
