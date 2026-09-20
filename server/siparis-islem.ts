"use server";

/**
 * Ödeme formunun server action'ı.
 *
 * Hata mesajları adres satırında kod olarak taşınır, düz metin olarak değil:
 * aksi halde biri `/odeme?hata=...` bağlantısı hazırlayıp sayfamızda istediği
 * yazıyı gösterebilirdi.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ayarlariGetir } from "@/server/sepet";
import { KUPON_CEREZI } from "@/server/kampanya";
import { SON_SIPARIS_CEREZI, siparisOlustur } from "@/server/siparis";

function temiz(veri: FormData, alan: string): string {
  return String(veri.get(alan) ?? "").trim();
}

/** Sunucu tarafı doğrulama; tarayıcının `required` kontrolüne güvenilmez. */
function eksikMi(g: Record<string, string>): boolean {
  if (g.adSoyad.length < 3) return true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.eposta)) return true;
  // Türkiye cep telefonu: rakamları say, 10 veya 11 hane bekle
  if (g.telefon.replace(/\D/g, "").length < 10) return true;
  if (g.adres.length < 10) return true;
  if (g.ilce.length < 2 || g.il.length < 2) return true;
  return false;
}

export async function siparisiTamamla(veri: FormData): Promise<void> {
  const girdi = {
    adSoyad: temiz(veri, "adSoyad"),
    eposta: temiz(veri, "eposta").toLowerCase(),
    telefon: temiz(veri, "telefon"),
    adres: temiz(veri, "adres"),
    ilce: temiz(veri, "ilce"),
    il: temiz(veri, "il"),
    postaKodu: temiz(veri, "postaKodu"),
    not: temiz(veri, "not").slice(0, 500),
  };

  if (eksikMi(girdi)) redirect("/odeme?hata=eksik");

  const ayar = await ayarlariGetir();
  const sonuc = await siparisOlustur(girdi, ayar);

  if (!sonuc.tamam) {
    redirect(sonuc.hata.includes("boş") ? "/odeme?hata=bos" : "/odeme?hata=stok");
  }

  // Onay sayfası bu çerezle açılır; olmayanlar e-postayla takip sayfasından bakar.
  const kavanoz = await cookies();
  // Kupon bir siparişlik: kalırsa müşteri farkında olmadan tekrar kullanır.
  kavanoz.delete(KUPON_CEREZI);
  kavanoz.set(SON_SIPARIS_CEREZI, sonuc.numara, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  revalidatePath("/", "layout");
  redirect(`/siparis/${sonuc.numara}`);
}
