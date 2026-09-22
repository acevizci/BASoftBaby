"use server";

import { redirect } from "next/navigation";
import { denemeEpostasi } from "@/server/eposta";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

/**
 * Satışa hazırlık ekranındaki "Deneme e-postası gönder" düğmesi.
 *
 * Paneli açan kişinin kendi adresine gidiyor: başka bir adres yazılabilseydi
 * panel, istenen herkese mağaza adına e-posta attıran bir form olurdu.
 * Sonuç ekrana adres satırıyla dönüyor (K-85).
 */
export async function denemeEpostasiGonder(): Promise<void> {
  const ben = await yoneticiGerekli();
  const sonuc = await denemeEpostasi(ben.eposta);

  const p = new URLSearchParams();
  if (sonuc.gonderildi) {
    p.set("eposta", "gitti");
  } else {
    p.set("eposta", "hata");
    p.set("sebep", sonuc.sebep ?? "bilinmiyor");
    if (sonuc.mesaj) p.set("mesaj", sonuc.mesaj.slice(0, 300));
  }
  redirect(`/yonetim/hazirlik?${p}#eposta-denemesi`);
}
