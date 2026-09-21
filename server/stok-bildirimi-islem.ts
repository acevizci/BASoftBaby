"use server";

/**
 * "Stoka girince haber ver" formunun eylemi.
 *
 * Düz HTML formundan çağrılıyor; JavaScript kapalı tarayıcıda da çalışıyor.
 * Sonuç adres satırındaki kodla taşınıyor, düz metinle değil: aksi halde biri
 * hazırladığı bağlantıyla sayfamızda istediği yazıyı gösterebilirdi.
 */

import { redirect } from "next/navigation";
import { bildirimIste } from "@/server/stok-bildirimi";

function epostaGecerliMi(eposta: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta);
}

export async function stokBildirimiIste(form: FormData): Promise<void> {
  const variantId = String(form.get("variantId") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim();
  const eposta = String(form.get("eposta") ?? "").trim().toLowerCase();

  const geri = (durum: string) => `/urun/${slug}?bildirim=${durum}`;

  if (!epostaGecerliMi(eposta)) redirect(geri("eposta"));
  if (!variantId) redirect(geri("hata"));

  const oldu = await bildirimIste(variantId, eposta);
  redirect(geri(oldu ? "alindi" : "stokta"));
}
