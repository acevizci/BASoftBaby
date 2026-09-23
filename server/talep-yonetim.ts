"use server";

/**
 * Taleplerin panel eylemleri: onayla, kabul etme, tamamla.
 *
 * Her sonuçlandırma müşteriye e-posta gönderiyor — talep açan insan cevabı
 * beklerken panele bakamaz. Gönderim başarısız olsa bile karar kaydediliyor.
 */

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { TUM_ETIKETLER } from "@/server/onbellek";
import { talebiSonuclandir } from "@/server/talep";
import { talepCevabiEpostasi } from "@/server/eposta";
import { talepDurumAdi, turAdi } from "@/ui/talep-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { formSayfaEki } from "@/ui/sayfalama-bicim";

const SONUCLAR = ["onaylandi", "reddedildi", "tamamlandi"] as const;
type Sonuc = (typeof SONUCLAR)[number];

const SAYFA = "/yonetim/talepler";

/** İşlem bitince dönülecek adres: seçili süzgeç ve kaldığın sayfa korunuyor (K-67). */
function donus(form: FormData, ek: string): string {
  const durum = String(form.get("durum") ?? "").trim();
  const suzgec = /^[a-z]{1,20}$/.test(durum) ? `&durum=${durum}` : "";
  return `${SAYFA}?${ek}${suzgec}${formSayfaEki(form)}`;
}

export async function talebiCevapla(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();

  const id = String(form.get("id") ?? "").trim();
  const sonuc = String(form.get("sonuc") ?? "");
  const cevap = String(form.get("cevap") ?? "").trim();
  const yeniVaryantId = String(form.get("yeniVaryantId") ?? "").trim() || undefined;

  if (!id || !(SONUCLAR as readonly string[]).includes(sonuc)) {
    redirect(donus(form, "hata=1"));
  }

  const kayit = await db.orderRequest.findUnique({
    where: { id },
    select: {
      order: { select: { numara: true, adSoyad: true, eposta: true } },
      satirlar: {
        select: { adet: true, orderItem: { select: { urunAd: true, beden: true, renk: true } } },
      },
    },
  });
  if (!kayit) redirect(donus(form, "hata=1"));

  const sonuclanan = await talebiSonuclandir(id, sonuc as Sonuc, cevap, yeniVaryantId, ben);
  if (!sonuclanan) redirect(donus(form, "hata=1"));
  // Değişimde gönderilecek bedenin stoğu yetmedi: hiçbir şey yazılmadı,
  // müşteriye de e-posta gitmiyor (K-102).
  if ("hata" in sonuclanan) {
    redirect(donus(form, `hata=stok&mevcut=${sonuclanan.mevcut}&gereken=${sonuclanan.gereken}`));
  }

  await talepCevabiEpostasi(kayit.order.eposta, {
    numara: kayit.order.numara,
    adSoyad: kayit.order.adSoyad,
    turAdi: turAdi(sonuclanan.tur),
    durumAdi: talepDurumAdi(sonuc),
    cevap,
    satirlar: kayit.satirlar.map(
      (s) => `${s.orderItem.urunAd} — ${s.orderItem.beden}, ${s.orderItem.renk} (${s.adet} adet)`,
    ),
  });

  // Onaylanan iptal stoğu geri verdi; vitrindeki "tükendi" düşsün.
  for (const etiket of TUM_ETIKETLER) updateTag(etiket);
  revalidatePath("/", "layout");

  redirect(donus(form, "kayit=1"));
}
