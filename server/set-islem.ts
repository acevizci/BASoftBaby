"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { TUM_ETIKETLER } from "@/server/onbellek";
import { setBoz, setHazirla, varyantBul } from "@/server/set";
import { stokBildirimleriniGonder } from "@/server/stok-bildirimi";

/** Set eylemleri (K-133). Hepsi ürün düzenleme ekranının set bölümüne dönüyor. */

async function donus(form: FormData, ek: string): Promise<never> {
  const setVariantId = String(form.get("setVariantId") ?? "");
  const v = await db.productVariant.findUnique({
    where: { id: setVariantId },
    select: { product: { select: { slug: true } } },
  });
  redirect(`/yonetim/urunler/${v?.product.slug ?? ""}?${ek}#set`);
}

function yenile() {
  for (const e of TUM_ETIKETLER) updateTag(e);
  revalidatePath("/", "layout");
}

export async function setParcasiEkle(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const setVariantId = String(form.get("setVariantId") ?? "");
  const adet = Math.max(1, Math.min(20, Math.floor(Number(form.get("adet") ?? 1)) || 1));
  const parca = await varyantBul(String(form.get("kod") ?? ""));
  if (!parca) return donus(form, "sethata=bulunamadi");
  const set = await db.productVariant.findUnique({ where: { id: setVariantId }, select: { productId: true } });
  // Set kendini ya da kendi ürününün bir bedenini içeremez.
  if (!set || parca.productId === set.productId) return donus(form, "sethata=kendisi");
  // Parça başka bir setin set varyantı olamaz: iç içe set stoğu karıştırırdı.
  // İç içe set yok: parça set olamaz, başka setin parçası da set olamaz.
  const [parcaSetMi, setParcaMi] = await Promise.all([
    db.bundleItem.count({ where: { setVariantId: parca.id } }),
    db.bundleItem.count({ where: { variantId: setVariantId } }),
  ]);
  if (parcaSetMi || setParcaMi) return donus(form, "sethata=icice");
  await db.bundleItem.upsert({
    where: { setVariantId_variantId: { setVariantId, variantId: parca.id } },
    update: { adet },
    create: { setVariantId, variantId: parca.id, adet },
  });
  yenile();
  return donus(form, "setkayit=eklendi");
}

export async function setParcasiSil(form: FormData): Promise<void> {
  await yoneticiGerekli();
  await db.bundleItem.deleteMany({ where: { id: String(form.get("id") ?? "") } });
  yenile();
  return donus(form, "setkayit=silindi");
}

export async function setIslemi(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();
  const setVariantId = String(form.get("setVariantId") ?? "");
  const adet = Math.floor(Number(form.get("adet") ?? 0));
  const tur = form.get("tur") === "boz" ? "boz" : "hazirla";
  const sonuc =
    tur === "boz"
      ? await setBoz(setVariantId, adet, ben)
      : await setHazirla(setVariantId, adet, ben);
  if (!sonuc.tamam) return donus(form, `sethata=${encodeURIComponent(sonuc.sebep)}`);
  // Stoğu artan varyant için "gelince haber ver" diyenler: hazırlamada set,
  // bozmada parçalar.
  const artan =
    tur === "boz"
      ? (await db.bundleItem.findMany({ where: { setVariantId }, select: { variantId: true } })).map(
          (p) => p.variantId,
        )
      : [setVariantId];
  await stokBildirimleriniGonder(artan);
  yenile();
  return donus(form, `setkayit=${tur}&setadet=${sonuc.adet}`);
}
