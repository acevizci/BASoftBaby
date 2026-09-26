"use server";

/**
 * İadelerin panel eylemleri.
 *
 * İki yol var ve ikisi de aynı kaydı kapatıyor (K-58):
 *
 * - **Havale:** para bankadan elle gönderiliyor, panelde "iade edildi"
 *   işaretleniyor. Dekont açıklaması kayda yazılabiliyor.
 * - **Kart:** iyzico'ya iade gönderiliyor. Başarılıysa kayıt kendiliğinden
 *   kapanıyor; sağlayıcı reddederse kayıt **duruyor**, sebebi yazılıyor ve
 *   elle tamamlanabiliyor. Sağlayıcıya ulaşılamadı diye müşterinin
 *   alacağının kaydını düşürmek en kötü sonuç olurdu.
 *
 * Panelden elle iade kaydı da açılabiliyor: her iade bir talepten doğmuyor,
 * telefonla anlaşılan bir indirim ya da kargo bedeli de olabiliyor.
 *
 * **Tamamlanan her iade müşteriye bildiriliyor.** Beklenen haber bu; hesabına
 * bakmadan bilemez. Gönderim başarısız olsa bile kayıt kapanıyor: e-posta
 * servisi çalışmıyor diye paranın gönderildiği kaydı düşürmek yanlış
 * olurdu (K-62).
 */

import { headers } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { TUM_ETIKETLER } from "@/server/onbellek";
import { iadeKaydiAc, iadeyiBasarisizIsaretle, iadeyiTamamla } from "@/server/iade";
import { tutarCoz } from "@/server/tutar";
import { kartIadesiYap } from "@/server/odeme-iade";
import { iadeYapildiEpostasi } from "@/server/eposta";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { formSayfaEki } from "@/ui/sayfalama-bicim";

const SAYFA = "/yonetim/iadeler";

/** İşlem bitince dönülecek adres; kaldığın sayfa korunuyor (K-67). */
function donus(form: FormData, ek: string): string {
  return `${SAYFA}?${ek}${formSayfaEki(form)}`;
}

function vitriniYenile() {
  for (const etiket of TUM_ETIKETLER) updateTag(etiket);
  revalidatePath("/", "layout");
}

/** iyzico isteğin IP'sini istiyor; bulunamazsa sunucunun kendisi yazılıyor. */
async function istekAdresi(): Promise<string> {
  const basliklar = await headers();
  return (
    basliklar.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    basliklar.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/** Havale iadesi: para gönderildi, kayıt kapanıyor. */
export async function iadeyiIsaretle(form: FormData): Promise<void> {
  const yonetici = await yoneticiGerekli();

  const id = String(form.get("id") ?? "").trim();
  const ref = String(form.get("saglayiciRef") ?? "").trim().slice(0, 200);
  if (!id) redirect(donus(form, "hata=bulunamadi"));

  const kayit = await db.refund.findUnique({
    where: { id },
    select: {
      tutarKurus: true,
      yontem: true,
      order: { select: { numara: true, adSoyad: true, eposta: true } },
    },
  });

  const sonuc = await iadeyiTamamla(id, {
    saglayiciRef: ref || undefined,
    yapanId: yonetici.id,
  });
  if (!sonuc) redirect(donus(form, "hata=bulunamadi"));

  if (kayit) await musteriyeBildir(kayit);

  vitriniYenile();
  redirect(donus(form, "kayit=tamamlandi"));
}

/** Kart iadesi: iyzico'ya gönderiliyor. */
export async function karttanIadeEt(form: FormData): Promise<void> {
  const yonetici = await yoneticiGerekli();

  const id = String(form.get("id") ?? "").trim();
  if (!id) redirect(donus(form, "hata=bulunamadi"));

  const kayit = await db.refund.findUnique({
    where: { id },
    select: { id: true, orderId: true, tutarKurus: true, durum: true },
  });
  if (!kayit) redirect(donus(form, "hata=bulunamadi"));
  if (kayit.durum === "tamamlandi") redirect(donus(form, "kayit=zaten"));

  // Kayıt önce koşullu olarak "gonderiliyor"a alınıyor (K-166): düğmeye iki
  // kez basılınca ya da iki kişi aynı anda basınca ikisi de "bekliyor"
  // görüyor, iyzico'ya iki iade gidiyordu — müşteriye iki kez para. Yalnızca
  // bir istek kaydı alabiliyor. Yarıda kalırsa kayıt "gonderiliyor"da
  // kalıyor ve kendiliğinden yeniden gönderilmiyor: önce iyzico'dan bakılmalı.
  const alindi = await db.refund.updateMany({
    where: { id, durum: { in: ["bekliyor", "basarisiz"] } },
    data: { durum: "gonderiliyor", hata: null },
  });
  if (alindi.count === 0) redirect(donus(form, "hata=gonderiliyor"));

  const sonuc = await kartIadesiYap(kayit.orderId, kayit.tutarKurus, await istekAdresi());

  if (!sonuc.tamam) {
    await iadeyiBasarisizIsaretle(id, sonuc.hata);
    vitriniYenile();
    redirect(donus(form, "hata=saglayici"));
  }

  await iadeyiTamamla(id, { saglayiciRef: sonuc.saglayiciRef, yapanId: yonetici.id });

  const bilgi = await db.refund.findUnique({
    where: { id },
    select: {
      tutarKurus: true,
      yontem: true,
      order: { select: { numara: true, adSoyad: true, eposta: true } },
    },
  });
  if (bilgi) await musteriyeBildir(bilgi);

  vitriniYenile();
  redirect(donus(form, "kayit=kart"));
}

/** Panelden elle iade kaydı: talepten doğmayan iadeler için. */
export async function elleIadeAc(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const numara = String(form.get("numara") ?? "").trim().toUpperCase();
  const aciklama = String(form.get("aciklama") ?? "").trim();

  // Türkçe yazım (K-115): "1.250" bin iki yüz elli; eskiden 12,50 ₺ oluyordu.
  const tutarKurus = tutarCoz(String(form.get("tutar") ?? "")) ?? NaN;
  if (!numara) redirect(donus(form, "hata=numara"));
  if (!Number.isFinite(tutarKurus) || tutarKurus <= 0) redirect(donus(form, "hata=tutar"));

  const siparis = await db.order.findUnique({
    where: { numara },
    select: { id: true, toplamKurus: true },
  });
  if (!siparis) redirect(donus(form, "hata=siparis-yok"));
  if (tutarKurus > siparis.toplamKurus) redirect(donus(form, "hata=fazla"));

  const kayit = await iadeKaydiAc(siparis.id, tutarKurus, { aciklama });
  if (!kayit) redirect(donus(form, "hata=odenmemis"));

  vitriniYenile();
  redirect(donus(form, "kayit=acildi"));
}

/**
 * İade e-postası. Gönderim başarısızlığı iadeyi geri almıyor — e-posta
 * servisi çalışmıyor diye paranın gönderildiği kaydı düşürmek yanlış olurdu.
 */
async function musteriyeBildir(kayit: {
  tutarKurus: number;
  yontem: string;
  order: { numara: string; adSoyad: string; eposta: string };
}): Promise<void> {
  await iadeYapildiEpostasi(kayit.order.eposta, {
    numara: kayit.order.numara,
    adSoyad: kayit.order.adSoyad,
    tutarKurus: kayit.tutarKurus,
    yontem: kayit.yontem,
  });
}
