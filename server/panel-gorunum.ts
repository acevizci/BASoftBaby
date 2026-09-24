"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { BOLUM_CEREZI } from "@/ui/panel-menu-bicim";

/**
 * Panel menüsünün daraltılmış olup olmadığı.
 *
 * **Neden çerez, neden istemci durumu değil.** Menü geniş ekranda da
 * daraltılabiliyor. Tercih `useState` ile tutulsaydı her gezinmede sıfırlanır,
 * onay kutusu + CSS ile tutulsaydı her sayfa yüklemesinde açılırdı. Çerez
 * sunucuda okunuyor: ilk boyamada doğru genişlik çiziliyor, sıçrama olmuyor
 * ve JavaScript kapalı tarayıcıda da çalışıyor — daraltma düğmesi bir form
 * (K-60).
 *
 * Çerezde kişisel bir şey yok, yalnızca "dar mı geniş mi". O yüzden
 * `httpOnly` gerekmiyor ve uzun ömürlü.
 */

const CEREZ = "panel_menu";
const BIR_YIL = 60 * 60 * 24 * 365;

export async function menuDarMi(): Promise<boolean> {
  return (await cookies()).get(CEREZ)?.value === "dar";
}

/** Daraltma düğmesi; form olduğu için JavaScript gerekmiyor. */
export async function menuyuCevir(): Promise<void> {
  await yoneticiGerekli();

  const kutu = await cookies();
  const dar = kutu.get(CEREZ)?.value === "dar";
  kutu.set(CEREZ, dar ? "genis" : "dar", {
    path: "/yonetim",
    maxAge: BIR_YIL,
    sameSite: "lax",
  });

  // Düzen sunucuda çiziliyor; yeni genişlik görünsün.
  revalidatePath("/yonetim", "layout");
}

/**
 * Elle açılmış menü bölümleri (K-116), virgülle ayrılmış bölüm adresleri.
 * Açık sayfanın bölümü zaten her zaman açık; bu yalnızca "gitmeden bak"
 * için açılanlar. Tarayıcı yazıyor (`ui/panel-menu.tsx`), sunucu okuyor:
 * ilk boyamada doğru bölümler açık, sıçrama yok.
 */
export async function acikBolumler(): Promise<string[]> {
  const ham = (await cookies()).get(BOLUM_CEREZI)?.value ?? "";
  return decodeURIComponent(ham)
    .split(",")
    .filter((y) => /^\/yonetim(\/[a-z-]+)*$/.test(y))
    .slice(0, 20);
}
