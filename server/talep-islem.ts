"use server";

/**
 * Talep formunun eylemleri.
 *
 * **Kimlik denetimi:** talep açmak siparişi görmekle aynı yetki. Site zaten
 * sipariş numarası + e-posta eşleşmesiyle çalışıyor (numara tek başına
 * yetmiyor, yoksa numara deneyerek başkasının siparişine dokunulabilirdi);
 * burada da aynı kural uygulanıyor. Formdaki gizli e-posta alanı
 * kurcalanabilir ama kurcalayan kişinin doğru adresi bilmesi gerekiyor — ki
 * o zaten siparişi görme yetkisi demek.
 */

import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { talepAc } from "@/server/talep";
import { talepAlindiEpostasi, talepBildirimiEpostasi } from "@/server/eposta";
import { turAdi } from "@/ui/talep-bicim";

function geri(numara: string, eposta: string, ek: string): string {
  const p = new URLSearchParams({ numara, eposta });
  return `/siparis-takip?${p.toString()}&${ek}`;
}

export async function talepGonder(form: FormData): Promise<void> {
  const numara = String(form.get("numara") ?? "").trim().toUpperCase();
  const eposta = String(form.get("eposta") ?? "").trim().toLowerCase();
  const tur = String(form.get("tur") ?? "").trim();
  const sebep = String(form.get("sebep") ?? "").trim();
  const aciklama = String(form.get("aciklama") ?? "").trim();

  if (!numara || !eposta) redirect("/siparis-takip");

  const siparis = await db.order.findUnique({
    where: { numara },
    select: { eposta: true, adSoyad: true },
  });
  // Bulunamadı ile eşleşmedi aynı cevabı veriyor: numara deneyerek hangi
  // numaraların var olduğu öğrenilmesin.
  if (!siparis || siparis.eposta.toLowerCase() !== eposta) {
    redirect(geri(numara, eposta, "talep=yetki"));
  }

  // Satır seçimleri `satir-<orderItemId>` adıyla geliyor.
  const satirlar: Record<string, number> = {};
  for (const [ad, deger] of form.entries()) {
    if (!ad.startsWith("satir-")) continue;
    const adet = Number(String(deger));
    if (Number.isInteger(adet) && adet > 0) satirlar[ad.slice(6)] = adet;
  }

  const sonuc = await talepAc({ numara, tur, sebep, aciklama, satirlar });
  if (!sonuc.tamam) {
    redirect(geri(numara, eposta, `talep=hata&mesaj=${encodeURIComponent(sonuc.hata)}`));
  }

  const kayit = await db.orderRequest.findUniqueOrThrow({
    where: { id: sonuc.id },
    select: {
      tur: true,
      satirlar: {
        select: { adet: true, orderItem: { select: { urunAd: true, beden: true, renk: true } } },
      },
    },
  });

  const bilgi = {
    numara,
    adSoyad: siparis.adSoyad,
    turAdi: turAdi(kayit.tur),
    satirlar: kayit.satirlar.map(
      (s) => `${s.orderItem.urunAd} — ${s.orderItem.beden}, ${s.orderItem.renk} (${s.adet} adet)`,
    ),
  };

  // E-posta gönderimi akışı bozmuyor: anahtar yoksa da talep açılmış oluyor.
  await talepAlindiEpostasi(eposta, bilgi);
  await talepBildirimiEpostasi(bilgi);

  redirect(geri(numara, eposta, "talep=alindi"));
}
