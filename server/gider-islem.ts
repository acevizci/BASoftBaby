"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { tutarCoz } from "@/server/tutar";

/**
 * Kâr hesabının giderleri (K-112). Boş kutu "girilmedi" (`null`) olarak
 * yazılıyor, sıfır değil: sıfır "bu gider yok" demek, ikisi karışmasın.
 */

function kurus(form: FormData, ad: string): number | null {
  // Türkçe yazım: "1.250" bin iki yüz elli (K-115).
  const k = tutarCoz(String(form.get(ad) ?? ""));
  return k === null || k > 10_000_000 ? null : k;
}

/** "%3,49" → 349 (on binde). Üst sınır %30: yazım hatası kârı uçurmasın. */
function onbinde(form: FormData, ad: string): number | null {
  const metin = String(form.get(ad) ?? "").trim().replace("%", "").replace(",", ".");
  if (!metin) return null;
  const sayi = Number(metin);
  if (!Number.isFinite(sayi) || sayi < 0 || sayi > 30) return null;
  return Math.round(sayi * 100);
}

export async function giderAyariKaydet(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const veri = {
    kargoGiderKurus: kurus(form, "kargoGider"),
    paketGiderKurus: kurus(form, "paketGider"),
    hediyePaketGiderKurus: kurus(form, "hediyePaketGider"),
    iadeKargoGiderKurus: kurus(form, "iadeKargoGider"),
    kartKomisyonOnbinde: onbinde(form, "kartKomisyon"),
    kartKomisyonSabitKurus: kurus(form, "kartSabit"),
  };
  await db.storeSetting.upsert({ where: { id: "tek" }, update: veri, create: { id: "tek", ...veri } });
  redirect("/yonetim/ayarlar?kayit=gider#giderler");
}
