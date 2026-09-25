"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { siparisleriSil } from "@/server/siparis-silme";

const SAYFA = "/yonetim/hazirlik";
const CAPA = "#deneme-siparisleri";

/**
 * Seçilen deneme siparişlerini siler (K-163). Geri alınamadığı için onay
 * kutusuna "SİL" yazılması gerekiyor; kimin sildiği sunucu günlüğüne yazılıyor.
 */
export async function denemeSiparisleriniSil(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli(SAYFA);
  const onay = String(form.get("onay") ?? "")
    .trim()
    .toLocaleUpperCase("tr");
  if (onay !== "SİL") redirect(`${SAYFA}?silme=onay${CAPA}`);

  const numaralar = form
    .getAll("numara")
    .map((n) => String(n).trim().toUpperCase())
    .filter((n) => /^BA-\d{4}-\d{1,8}$/.test(n))
    .slice(0, 500);
  if (numaralar.length === 0) redirect(`${SAYFA}?silme=secim${CAPA}`);

  const { silinen } = await siparisleriSil(numaralar);
  console.info(`Deneme siparişleri silindi (${ben.eposta}): ${silinen.join(", ")}`);
  revalidatePath("/", "layout");
  redirect(`${SAYFA}?silindi=${silinen.length}${CAPA}`);
}
