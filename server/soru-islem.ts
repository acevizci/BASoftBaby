"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { islemSinirla } from "@/server/istek-siniri";
import { ETIKETLER } from "@/server/onbellek";
import { adiKisalt } from "@/server/yorum";
import { soruCevaplandiEpostasi } from "@/server/eposta";

/** Ürün sorusu eylemleri (K-135). */

const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function soruSor(form: FormData): Promise<void> {
  const slug = String(form.get("slug") ?? "");
  const geri = (ek: string): never => redirect(`/urun/${encodeURIComponent(slug)}?soru=${ek}#sorular`);
  // Bal küpü: insan bu alanı görmüyor, betik dolduruyor.
  if (String(form.get("web") ?? "")) geri("alindi");

  const soru = String(form.get("metin") ?? "").trim().slice(0, 1000);
  const ad = String(form.get("ad") ?? "").trim().slice(0, 60);
  const eposta = String(form.get("eposta") ?? "").trim().toLowerCase().slice(0, 120);
  if (soru.length < 10) geri("kisa");
  if (eposta && !EPOSTA.test(eposta)) geri("eposta");
  if (!(await islemSinirla("soru")).izin) geri("cok");

  const urun = await db.product.findUnique({ where: { slug }, select: { id: true, aktif: true } });
  if (!urun?.aktif) redirect("/");
  await db.productQuestion.create({ data: { productId: urun.id, soru, adSoyad: ad ? adiKisalt(ad) : "", eposta } });
  geri("alindi");
}

const PANEL = "/yonetim/sorular";

export async function soruCevapla(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const id = String(form.get("id") ?? "");
  const cevap = String(form.get("cevap") ?? "").trim().slice(0, 2000);
  if (cevap.length < 2) redirect(`${PANEL}?hata=cevap`);
  const onceki = await db.productQuestion.findUnique({
    where: { id },
    select: { eposta: true, soru: true, cevap: true, product: { select: { ad: true, slug: true } } },
  });
  if (!onceki) redirect(PANEL);
  await db.productQuestion.update({
    where: { id },
    data: { cevap, durum: "yayinda", cevaplandi: new Date() },
  });
  // İlk cevapta soran kişiye haber; cevabı düzeltmek ikinci e-posta göndermiyor.
  if (onceki.eposta && !onceki.cevap) {
    await soruCevaplandiEpostasi(onceki.eposta, {
      urunAd: onceki.product.ad,
      slug: onceki.product.slug,
      soru: onceki.soru,
      cevap,
    });
  }
  updateTag(ETIKETLER.katalog);
  revalidatePath(`/urun/${onceki.product.slug}`);
  redirect(`${PANEL}?kayit=cevaplandi`);
}

export async function soruGizle(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const id = String(form.get("id") ?? "");
  const s = await db.productQuestion.update({
    where: { id },
    data: { durum: "gizli" },
    select: { product: { select: { slug: true } } },
  });
  updateTag(ETIKETLER.katalog);
  revalidatePath(`/urun/${s.product.slug}`);
  redirect(`${PANEL}?kayit=gizlendi`);
}
