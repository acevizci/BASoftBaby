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
 *
 * Ödeme iki türlü: havale/EFT'de sipariş "ödeme bekliyor" açılıp iş bitiyor;
 * kartta sipariş yine açılıyor (stok o anda rezerve oluyor) ve müşteri
 * iyzico'nun ödeme ekranına yönlendiriliyor. Kart bilgisi bize hiç gelmiyor.
 */

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { ayarlariGetir, sepetGetir, sepetIdOku } from "@/server/sepet";
import { HEDIYE_CEKI_CEREZI, sepetteCek } from "@/server/hediye-ceki";
import { tahsilat } from "@/server/hediye-ceki-bicim";
import { KUPON_CEREZI } from "@/server/kampanya";
import { SON_SIPARIS_CEREZI, siparisGetirPanel, siparisOlustur } from "@/server/siparis";
import { odemeAcikMi, odemeBaslat } from "@/server/odeme";
import { odemeDurumu } from "@/ui/odeme-bicim";
import {
  odemeGirisimiKaydet,
  sepetiSiparistenDoldur,
  siparisiIptalEtVeStoguIadeEt,
} from "@/server/odeme-akis";
import { girisYapan, jetonUret, oturumAc, sifreKisaMi, sifreOzetle } from "@/server/uyelik";
import { dogrulamaEpostasi, siparisAlindiEpostasi } from "@/server/eposta";
import { islemSinirla } from "@/server/istek-siniri";

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
  listeAdresine: boolean;
}): boolean {
  if (g.adSoyad.length < 3) return true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.eposta)) return true;
  // Türkiye cep telefonu: rakamları say, 10 veya 11 hane bekle
  if (g.telefon.replace(/\D/g, "").length < 10) return true;
  // Liste sahibinin adresine gidiyorsa adres sunucuda dolduruluyor (K-149).
  if (g.listeAdresine) return false;
  if (g.adres.length < 10) return true;
  if (g.ilce.length < 2 || g.il.length < 2) return true;
  return false;
}

export async function siparisiTamamla(veri: FormData): Promise<void> {
  // Sipariş açılırken stok hemen düşülüyor; sınırsız çağrı bütün stoğu
  // kilitleyebilirdi (K-64).
  const sinir = await islemSinirla("siparis");
  if (!sinir.izin) redirect(`/odeme?hata=cok-istek&dk=${sinir.kalanDk}`);

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
    hediyePaketi: veri.get("hediye") !== null,
    hediyeNotu: temiz(veri, "hediyeNotu").slice(0, 200),
    listeGonderen: temiz(veri, "listeGonderen").slice(0, 60),
    listeNotu: temiz(veri, "listeNotu").slice(0, 300),
    listeAdresine: temiz(veri, "teslimat") === "liste",
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

    // Doğrulama bağlantısı: doğrulanınca eski siparişleri de hesaba bağlanır.
    await dogrulamaEpostasi(
      girdi.eposta,
      girdi.adSoyad,
      await jetonUret(yeni.id, "dogrulama"),
    );
  }

  // Kart yalnızca anahtarlar tanımlıyken seçilebiliyor; form kurcalansa bile
  // kapalı bir yöntemle sipariş açılmıyor.
  const kartMi = temiz(veri, "odemeYontemi") === "kart" && odemeAcikMi();

  const ayar = await ayarlariGetir();

  /**
   * Ödenemeyecek sipariş açılmıyor (K-76).
   *
   * Havale bilgisi boşken sipariş alınıyor, stok düşüyor ve müşteriye
   * "ödeme bilgilerini en kısa sürede e-posta ile ileteceğiz" deniyordu —
   * e-posta servisi de tanımlı değilken. Müşteri hiç gelmeyecek bir posta
   * bekliyor, ürün kimseye satılamadan rafta kilitli kalıyordu.
   *
   * Satış yolunu açık tutan tek şey ödeme yöntemidir: kart kapalıysa ve
   * havale bilgisi girilmemişse mağaza sipariş alamaz. Bunu sipariş anında
   * söylemek, sipariş aldıktan sonra söylememekten iyidir.
   */
  //
  // Hediye çeki sepetin tamamını karşılıyorsa ödeme yöntemi gerekmiyor (K-137).
  const yalnizCek = !kartMi && !odemeDurumu(odemeAcikMi(), ayar.havaleBilgisi).havale;
  if (yalnizCek) {
    const { toplamKurus } = await sepetGetir();
    const cek = await sepetteCek(toplamKurus);
    const tamamiCekle = cek && "kullanilanKurus" in cek && cek.kullanilanKurus >= toplamKurus;
    if (!tamamiCekle) redirect("/odeme?hata=odeme-yok");
  }
  // Ekranda gösterilen çek tutarı; sunucu yalnızca bunu harcıyor (K-137).
  const beklenenKurus = Number(veri.get("cekKurus") ?? 0);
  const sonuc = await siparisOlustur(girdi, ayar, customerId, kartMi ? "kart" : "havale", {
    yalnizCek,
    beklenenKurus: Number.isInteger(beklenenKurus) && beklenenKurus >= 0 ? beklenenKurus : 0,
  });

  if (!sonuc.tamam && sonuc.sebep === "cek") {
    // Kullanılamayan çek çerezde kalırsa her deneme aynı hatayla dönerdi;
    // müşteri yeni tutarı görüp çeksiz ya da yeni kodla devam edebilsin.
    (await cookies()).delete(HEDIYE_CEKI_CEREZI);
    redirect("/odeme?hata=cek");
  }
  if (!sonuc.tamam && sonuc.sebep === "liste-adres") redirect("/odeme?hata=liste-adres");
  if (!sonuc.tamam && sonuc.sebep === "kupon") {
    (await cookies()).delete(KUPON_CEREZI);
    redirect("/odeme?hata=kupon");
  }
  if (!sonuc.tamam) {
    redirect(sonuc.hata.includes("boş") ? "/odeme?hata=bos" : "/odeme?hata=stok");
  }

  // Adres defterine kaydetme siparişten sonra: sipariş tutmadıysa deftere de
  // yazılmasın. Yazılamaması siparişi bozmamalı, o yüzden sessizce geçiliyor.
  if (customerId && !girdi.listeAdresine && veri.get("adresiKaydet") !== null) {
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
  // Karta gidilecekse de şimdi kuruluyor: müşteri iyzico'dan dönünce onay
  // sayfasını açabilsin.
  const kavanoz = await cookies();
  // Kupon bir siparişlik: kalırsa müşteri farkında olmadan tekrar kullanır.
  kavanoz.delete(KUPON_CEREZI);
  kavanoz.delete(HEDIYE_CEKI_CEREZI);
  kavanoz.set(SON_SIPARIS_CEREZI, sonuc.numara, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  revalidatePath("/", "layout");

  // Çek tamamını karşıladıysa karta gidilecek bir tutar yok.
  const cekleOdendi = sonuc.tahsilatKurus === 0;
  if (kartMi && !cekleOdendi) redirect(await odemeyeYonlendir(sonuc.numara));

  // Havalede sipariş burada tamamlanıyor: onay e-postası şimdi gidiyor.
  // Kartta ödeme sonucu belli olunca gidiyor (dönüş ucunda).
  await siparisAlindiEpostasi(
    {
      numara: sonuc.numara,
      adSoyad: girdi.adSoyad,
      eposta: girdi.eposta,
      toplamKurus: sonuc.toplamKurus,
      hediyeCekiKurus: sonuc.hediyeCekiKurus,
      odemeYontemi: cekleOdendi ? "hediye-ceki" : "havale",
    },
    ayar.havaleBilgisi,
  );

  redirect(`/siparis/${sonuc.numara}`);
}

/**
 * Kartla ödemede iyzico'nun ödeme ekranına giden adresi hazırlar.
 *
 * Başlatma tutmazsa sipariş açıkta kalmıyor: iptal edilip rezerve stok aynı
 * anda geri veriliyor, müşteri de ödeme sayfasına hatayla dönüyor. Yoksa
 * stok, hiç ödenmeyecek bir siparişin altında kilitli kalırdı.
 */
async function odemeyeYonlendir(numara: string): Promise<string> {
  const siparis = await siparisGetirPanel(numara);
  if (!siparis) return `/siparis/${numara}`;

  const baslik = await headers();
  const ip = (baslik.get("x-forwarded-for") ?? "").split(",")[0].trim() || "127.0.0.1";

  const baslatma = await odemeBaslat(siparis, { ip });

  if (!baslatma.tamam) {
    const kayit = await db.order.findUnique({ where: { numara }, select: { id: true } });
    if (kayit) await siparisiIptalEtVeStoguIadeEt(kayit.id);
    // Sipariş açılırken sepet boşalmıştı; müşteri ürünleri baştan seçmesin.
    await sepetiSiparistenDoldur(await sepetIdOku(), numara);
    revalidatePath("/", "layout");
    return "/odeme?hata=odeme-baslatilamadi";
  }

  const kayit = await db.order.findUnique({ where: { numara }, select: { id: true } });
  if (kayit) await odemeGirisimiKaydet(kayit.id, baslatma.jeton, tahsilat(siparis));

  return baslatma.adres;
}
