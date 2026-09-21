"use server";

/**
 * Değerlendirme formunun eylemi.
 *
 * Kimlik denetimi talep akışıyla aynı: sipariş numarası **ve** e-posta
 * eşleşmesi. Yorum yazmak siparişi görmekle aynı yetki.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/veritabani";
import { yorumYaz } from "@/server/yorum";

export async function degerlendirmeGonder(form: FormData): Promise<void> {
  const numara = String(form.get("numara") ?? "").trim().toUpperCase();
  const eposta = String(form.get("eposta") ?? "").trim().toLowerCase();
  const orderItemId = String(form.get("orderItemId") ?? "").trim();
  const puan = Number(String(form.get("puan") ?? "0"));
  const yorum = String(form.get("yorum") ?? "");

  if (!numara || !eposta) redirect("/siparis-takip");

  // Aynı form iki yerde: sipariş takip sayfasında ve üyenin kendi sipariş
  // ayrıntısında. Nereden gelindiyse oraya dönülüyor; yalnızca kendi
  // sitemizin düz bir yolu kabul ediliyor.
  const nereye = String(form.get("nereye") ?? "").trim();
  const geri = (ek: string) =>
    nereye.startsWith("/") && !nereye.startsWith("//") && !nereye.includes("?")
      ? `${nereye}?${ek}`
      : `/siparis-takip?${new URLSearchParams({ numara, eposta }).toString()}&${ek}`;

  const siparis = await db.order.findUnique({
    where: { numara },
    select: { eposta: true },
  });
  if (!siparis || siparis.eposta.toLowerCase() !== eposta) {
    redirect(geri("yorum=yetki"));
  }

  const sonuc = await yorumYaz({ numara, orderItemId, puan, yorum });
  if (!sonuc.tamam) {
    redirect(geri(`yorum=hata&ymesaj=${encodeURIComponent(sonuc.hata)}`));
  }

  // Ürün sayfasındaki puan ve yorum listesi hemen tazelensin.
  revalidatePath("/", "layout");
  redirect(geri("yorum=alindi"));
}
