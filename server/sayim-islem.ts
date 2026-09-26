"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TUM_ETIKETLER } from "@/server/onbellek";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { stokBildirimleriniGonder } from "@/server/stok-bildirimi";
import { db } from "@/server/veritabani";
import { sayilanlar, sayilanlariYaz, sayimBitir, sayimIptal } from "@/server/sayim";

/** Stok sayımı eylemleri (K-107). */

function metin(form: FormData, ad: string): string {
  return String(form.get(ad) ?? "").trim();
}

/** Formdaki süzgeç ve arama, kaydettikten sonra aynı yere dönmek için. */
function donus(form: FormData, id: string, ek: string): string {
  const p = new URLSearchParams();
  for (const ad of ["ara", "suzgec", "sayfa"]) {
    const d = metin(form, ad);
    if (d) p.set(ad, d.slice(0, 120));
  }
  const m = p.toString();
  return `/yonetim/stok/sayim/${encodeURIComponent(id)}?${m ? `${m}&` : ""}${ek}`;
}

export async function sayimKaydet(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const id = metin(form, "id");
  const yazilan = await sayilanlariYaz(id, sayilanlar(form.entries()));
  redirect(donus(form, id, `kayit=${yazilan}`));
}

export async function sayimBitirEylem(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();
  const id = metin(form, "id");
  const sonuc = await sayimBitir(id, ben);
  if (!sonuc) redirect(`/yonetim/stok/sayim/${encodeURIComponent(id)}`);
  // Sayım fazla çıkardıysa tükenmiş bir beden stoğa girmiş olabilir.
  const idler = await db.stockCountLine.findMany({
    where: { countId: id, uygulanan: { gt: 0 }, variantId: { not: null } },
    select: { variantId: true },
  });
  await stokBildirimleriniGonder(idler.map((s) => s.variantId!));
  for (const etiket of TUM_ETIKETLER) updateTag(etiket);
  revalidatePath("/", "layout");
  redirect(`/yonetim/stok/sayim/${encodeURIComponent(id)}?bitti=${sonuc.duzeltilen}`);
}

export async function sayimIptalEylem(form: FormData): Promise<void> {
  await yoneticiGerekli();
  await sayimIptal(metin(form, "id"));
  redirect("/yonetim/stok/sayim");
}
