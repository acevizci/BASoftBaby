"use server";

/**
 * Ödeme formunun server action'ı.
 *
 * Hata mesajları adres satırında kod olarak taşınır, düz metin olarak değil:
 * aksi halde biri `/odeme?hata=...` bağlantısı hazırlayıp sayfamızda istediği
 * yazıyı gösterebilirdi.
 *
 * Sipariş üç şekilde verilebiliyor: giriş yapmış olarak, üyeliksiz, ya da
 * formdaki şifre alanı doldurularak — sonuncusunda sipariş verilirken hesap
 * da açılıyor ve sipariş o hesaba bağlanıyor.
 */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { ayarlariGetir } from "@/server/sepet";
import { KUPON_CEREZI } from "@/server/kampanya";
import { SON_SIPARIS_CEREZI, siparisOlustur } from "@/server/siparis";
import { girisYapan, oturumAc, sifreKisaMi, sifreOzetle } from "@/server/uyelik";

function temiz(veri: FormData, alan: string): string {
  return String(veri.get(alan) ?? "").trim();
}

/** Sunucu tarafı doğrulama; tarayıcının `required` kontrolüne güvenilmez. */
function eksikMi(g: {
  adSoyad: string;
  eposta: string;
  telefon: string;
  adres: string;
  ilce: string;
  il: string;
}): boolean {
  if (g.adSoyad.length < 3) return true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.eposta)) return true;
  // Türkiye cep telefonu: rakamları say, 10 veya 11 hane bekle
  if (g.telefon.replace(/\D/g, "").length < 10) return true;
  if (g.adres.length < 10) return true;
  if (g.ilce.length < 2 || g.il.length < 2) return true;
  return false;
}

export async function siparisiTamamla(veri: FormData): Promise<void> {
  // Mesafeli satışta ön bilgilendirme formu ile sözleşmenin onaylanması
  // zorunlu: kutu işaretli değilse sipariş hiç oluşturulmuyor.
  if (veri.get("sozlesme") === null) redirect("/odeme?hata=sozlesme");

  const girdi = {
    sozlesmeOnayi: new Date(),
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

  const musteri = await girisYapan();
  let customerId = musteri?.id;

  // Üyeliksiz müşteri şifre yazdıysa hesabı sipariş öncesinde açılıyor:
  // sipariş o hesaba bağlansın, "Siparişlerim"de baştan görünsün.
  const yeniSifre = String(veri.get("yeniSifre") ?? "");
  if (!customerId && yeniSifre) {
    if (sifreKisaMi(yeniSifre)) redirect("/odeme?hata=sifre-kisa");

    const varOlan = await db.customer.findUnique({
      where: { eposta: girdi.eposta },
      select: { id: true },
    });
    // Var olan hesabın şifresini bilmeden siparişle ele geçirilememeli.
    if (varOlan) redirect("/odeme?hata=eposta-kayitli");

    const yeni = await db.customer.create({
      data: {
        adSoyad: girdi.adSoyad,
        eposta: girdi.eposta,
        telefon: girdi.telefon,
        sifreOzeti: await sifreOzetle(yeniSifre),
      },
      select: { id: true },
    });
    await oturumAc(yeni.id);
    customerId = yeni.id;
  }

  const ayar = await ayarlariGetir();
  const sonuc = await siparisOlustur(girdi, ayar, customerId);

  if (!sonuc.tamam) {
    redirect(sonuc.hata.includes("boş") ? "/odeme?hata=bos" : "/odeme?hata=stok");
  }

  // Adres defterine kaydetme siparişten sonra: sipariş tutmadıysa deftere de
  // yazılmasın. Yazılamaması siparişi bozmamalı, o yüzden sessizce geçiliyor.
  if (customerId && veri.get("adresiKaydet") !== null) {
    try {
      const adetVar = await db.address.count({ where: { customerId } });
      await db.address.create({
        data: {
          customerId,
          baslik: temiz(veri, "adresBasligi").slice(0, 40) || "Teslimat adresim",
          adSoyad: girdi.adSoyad,
          telefon: girdi.telefon,
          adres: girdi.adres,
          ilce: girdi.ilce,
          il: girdi.il,
          postaKodu: girdi.postaKodu,
          varsayilan: adetVar === 0,
        },
      });
    } catch (hata) {
      console.error("Adres deftere yazılamadı:", hata);
    }
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
