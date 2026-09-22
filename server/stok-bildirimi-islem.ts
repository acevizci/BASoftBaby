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
import { islemSinirla } from "@/server/istek-siniri";

function epostaGecerliMi(eposta: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta);
}

export async function stokBildirimiIste(form: FormData): Promise<void> {
  const variantId = String(form.get("variantId") ?? "").trim();
  const slug = String(form.get("slug") ?? "").trim();
  const eposta = String(form.get("eposta") ?? "").trim().toLowerCase();
  const renk = String(form.get("renk") ?? "").trim();

  // Renk dönüş adresinde korunuyor: yoksa sayfa varsayılan renge sıçrıyor ve
  // seçili beden-renk stoktaysa bu formun kendisi çizilmiyordu — müşteri ne
  // onay ne hata mesajını görüyordu (K-64).
  const geri = (durum: string) => {
    const p = new URLSearchParams({ bildirim: durum });
    if (renk) p.set("renk", renk);
    return `/urun/${slug}?${p.toString()}`;
  };

  // Hız sınırı (K-64).
  const sinir = await islemSinirla("stok-bildirimi");
  if (!sinir.izin) redirect(geri("cok-istek"));

  if (!epostaGecerliMi(eposta)) redirect(geri("eposta"));
  if (!variantId) redirect(geri("hata"));

  const oldu = await bildirimIste(variantId, eposta);
  redirect(geri(oldu ? "alindi" : "stokta"));
}
