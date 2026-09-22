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
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { formSayfaEki } from "@/ui/sayfalama-bicim";

const SAYFA = "/yonetim/yorumlar";

/**
 * İşlem bitince dönülecek adres: seçili süzgeç ve kaldığın sayfa korunuyor.
 *
 * Liste sayfalandıktan sonra (K-67) her işlem kullanıcıyı ilk sayfanın
 * varsayılan süzgecine atıyordu; onuncu yorumu yanıtlayan kişi listeyi
 * her seferinde yeniden bulmak zorunda kalırdı.
 */
function donus(form: FormData, ek: string): string {
  const durum = String(form.get("durum") ?? "").trim();
  const suzgec = /^[a-z]{1,20}$/.test(durum) ? `&durum=${durum}` : "";
  return `${SAYFA}?${ek}${suzgec}${formSayfaEki(form)}`;
}

export async function yorumuGizle(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(form.get("id") ?? "").trim();
  const sebep = String(form.get("sebep") ?? "").trim();

  if (!id) redirect(SAYFA);
  if (sebep.length < 5) redirect(donus(form, "hata=sebep"));

  const yorum = await db.review.update({
    where: { id },
    data: { durum: "gizli", gizlemeSebebi: sebep.slice(0, 500) },
    select: { productId: true },
  });

  await puaniTazele(yorum.productId);
  revalidatePath("/", "layout");
  redirect(donus(form, "kayit=gizlendi"));
}

export async function yorumuAc(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(form.get("id") ?? "").trim();
  if (!id) redirect(SAYFA);

  const yorum = await db.review.update({
    where: { id },
    data: { durum: "yayinda", gizlemeSebebi: "" },
    select: { productId: true },
  });

  await puaniTazele(yorum.productId);
  revalidatePath("/", "layout");
  redirect(donus(form, "kayit=acildi"));
}

export async function yorumuYanitla(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(form.get("id") ?? "").trim();
  const yanit = String(form.get("yanit") ?? "").trim();
  if (!id) redirect(SAYFA);

  await db.review.update({ where: { id }, data: { yanit: yanit.slice(0, 1000) } });
  revalidatePath("/", "layout");
  redirect(donus(form, "kayit=yanit"));
}
