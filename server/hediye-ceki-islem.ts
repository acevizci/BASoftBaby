"use server";

/**
 * Hediye çeki eylemleri (K-137): ödeme sayfasında kod yazma ve panelde
 * çek oluşturma, kapatma.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { islemSinirla } from "@/server/istek-siniri";
import { HEDIYE_CEKI_CEREZI, cekDurumu } from "@/server/hediye-ceki";
import { kodUret } from "@/server/hediye-ceki-bicim";
import { hediyeCekiEpostasi } from "@/server/eposta";

export async function hediyeCekiUygula(form: FormData): Promise<void> {
  const ham = String(form.get("kod") ?? "").slice(0, 40);
  if (!ham.trim()) redirect("/odeme");
  // Sınır dolunca kod hiç denenmiyor.
  if (!(await islemSinirla("hediye-ceki")).izin) redirect("/odeme?cek=cok#hediye-ceki");

  const durum = await cekDurumu(ham);
  if (!durum.gecerli) redirect(`/odeme?cek=${durum.sebep}#hediye-ceki`);

  const kavanoz = await cookies();
  kavanoz.set(HEDIYE_CEKI_CEREZI, durum.kod, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  redirect("/odeme#hediye-ceki");
}

export async function hediyeCekiKaldir(): Promise<void> {
  const kavanoz = await cookies();
  kavanoz.delete(HEDIYE_CEKI_CEREZI);
  redirect("/odeme#hediye-ceki");
}

const PANEL = "/yonetim/hediye-cekleri";
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function cekOlustur(form: FormData): Promise<void> {
  const yonetici = await yoneticiGerekli();
  const tutarKurus = Math.round(Number(String(form.get("tutar") ?? "").replace(",", ".")) * 100);
  const aliciAd = String(form.get("aliciAd") ?? "")
    .trim()
    .slice(0, 80);
  const aliciEposta = String(form.get("aliciEposta") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 120);
  const not = String(form.get("not") ?? "")
    .trim()
    .slice(0, 300);
  const sonKullanmaHam = String(form.get("sonKullanma") ?? "").trim();
  const gonder = form.get("gonder") !== null;

  if (!Number.isFinite(tutarKurus) || tutarKurus < 100 || tutarKurus > 10_000_000) {
    redirect(`${PANEL}?hata=tutar`);
  }
  if (aliciEposta && !EPOSTA.test(aliciEposta)) redirect(`${PANEL}?hata=eposta`);
  if (gonder && !aliciEposta) redirect(`${PANEL}?hata=eposta`);
  // Tarih günün sonuna kadar geçerli.
  const sonKullanma = sonKullanmaHam ? new Date(`${sonKullanmaHam}T23:59:59+03:00`) : null;
  if (sonKullanma && (Number.isNaN(sonKullanma.getTime()) || sonKullanma < new Date())) {
    redirect(`${PANEL}?hata=tarih`);
  }

  // Kod çakışması olasılığı çok düşük; yine de benzersiz alan hatasında yeniden deneniyor.
  let kod = "";
  for (let deneme = 0; deneme < 5 && !kod; deneme++) {
    const aday = kodUret();
    const var_ = await db.giftCard.findUnique({ where: { kod: aday }, select: { id: true } });
    if (!var_) kod = aday;
  }
  if (!kod) redirect(`${PANEL}?hata=kod`);

  await db.giftCard.create({
    data: {
      kod,
      tutarKurus,
      bakiyeKurus: tutarKurus,
      aliciAd,
      aliciEposta,
      not,
      sonKullanma,
      yapan: yonetici.adSoyad || yonetici.eposta,
    },
  });

  let gitti = "";
  if (gonder) {
    const sonuc = await hediyeCekiEpostasi(aliciEposta, { kod, aliciAd, tutarKurus, sonKullanma });
    gitti = sonuc.gonderildi ? "&eposta=gitti" : "&eposta=gitmedi";
  }
  revalidatePath(PANEL);
  redirect(`${PANEL}?kayit=${encodeURIComponent(kod)}${gitti}`);
}

export async function cekKapat(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const id = String(form.get("id") ?? "");
  const aktif = form.get("aktif") === "1";
  await db.giftCard.update({ where: { id }, data: { aktif } });
  revalidatePath(PANEL);
  redirect(`${PANEL}?kayit=${aktif ? "acildi" : "kapatildi"}`);
}
