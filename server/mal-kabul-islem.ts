"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TUM_ETIKETLER } from "@/server/onbellek";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { stokBildirimleriniGonder } from "@/server/stok-bildirimi";
import { gelenAdetler, kabulNotu, malKabulYaz } from "@/server/mal-kabul";

function metin(form: FormData, ad: string, uzunluk: number): string {
  return String(form.get(ad) ?? "").trim().slice(0, uzunluk);
}

/**
 * Mal kabulü formu (K-104). Tedarikçi ve irsaliye adrese geri yazılıyor:
 * aynı irsaliyedeki bir sonraki ürün aranırken yeniden girilmesin.
 */
export async function malKabulKaydet(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();

  const bilgi = {
    tedarikci: metin(form, "tedarikci", 80),
    irsaliye: metin(form, "irsaliye", 40),
    not: metin(form, "not", 150),
  };
  const kalemler = gelenAdetler(form.entries());

  const p = new URLSearchParams();
  if (bilgi.tedarikci) p.set("tedarikci", bilgi.tedarikci);
  if (bilgi.irsaliye) p.set("irsaliye", bilgi.irsaliye);

  if (kalemler.length === 0) {
    p.set("ara", metin(form, "ara", 120));
    p.set("hata", "bos");
    redirect(`/yonetim/stok/mal-kabul?${p.toString()}`);
  }

  const sonuc = await malKabulYaz(kalemler, kabulNotu(bilgi), ben);
  // Tükenmiş bir bedene mal geldiyse bekleyenlere haber gidiyor.
  await stokBildirimleriniGonder(sonuc.idler);
  for (const etiket of TUM_ETIKETLER) updateTag(etiket);
  revalidatePath("/", "layout");

  p.set("eklendi", String(sonuc.adet));
  p.set("beden", String(sonuc.beden));
  redirect(`/yonetim/stok/mal-kabul?${p.toString()}`);
}
