"use server";

/**
 * Değerlendirmelerin panel eylemleri.
 *
 * **Gizlemek yalnızca içerik kuralı için.** Hakaret, kişisel veri, ürünle
 * alakasız metin. Yorumun olumsuz olması gizleme sebebi değil — satıcı
 * olumlu olumsuz ayrımı yapmadan yayımlamak zorunda. Sebep yazılmadan
 * gizlenemiyor; kayıt panelde duruyor ki sonradan bakılabilsin (K-34).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { puaniTazele } from "@/server/yorum";

export async function yorumuGizle(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "").trim();
  const sebep = String(form.get("sebep") ?? "").trim();

  if (!id) redirect("/yonetim/yorumlar");
  if (sebep.length < 5) redirect("/yonetim/yorumlar?hata=sebep");

  const yorum = await db.review.update({
    where: { id },
    data: { durum: "gizli", gizlemeSebebi: sebep.slice(0, 500) },
    select: { productId: true },
  });

  await puaniTazele(yorum.productId);
  revalidatePath("/", "layout");
  redirect("/yonetim/yorumlar?kayit=gizlendi");
}

export async function yorumuAc(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "").trim();
  if (!id) redirect("/yonetim/yorumlar");

  const yorum = await db.review.update({
    where: { id },
    data: { durum: "yayinda", gizlemeSebebi: "" },
    select: { productId: true },
  });

  await puaniTazele(yorum.productId);
  revalidatePath("/", "layout");
  redirect("/yonetim/yorumlar?kayit=acildi");
}

export async function yorumuYanitla(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "").trim();
  const yanit = String(form.get("yanit") ?? "").trim();
  if (!id) redirect("/yonetim/yorumlar");

  await db.review.update({ where: { id }, data: { yanit: yanit.slice(0, 1000) } });
  revalidatePath("/", "layout");
  redirect("/yonetim/yorumlar?kayit=yanit");
}
