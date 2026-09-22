"use server";

/**
 * Müşteri hesabının panel eylemleri.
 *
 * Şu an tek eylem var ve o da bir yükümlülük: **hesabı silmek** (K-70).
 * Üye kendi hesabını zaten silebiliyordu (K-39); telefonla ya da e-postayla
 * "verilerimi silin" diyen biri için panelde bir yol yoktu. KVKK'nın silme
 * hakkı başvuru kanalına göre değişmiyor.
 *
 * **Silme kuralları kopyalanmadı.** Neyin silinip neyin kaldığı
 * `server/kisisel-veri.ts` içinde bir kere kararlaştırıldı: oturumlar,
 * jetonlar, adres defteri ve hesap gidiyor; siparişler yasal saklama süresi
 * boyunca kalıyor ama hesapla bağları kopuyor, değerlendirmelerin adı
 * "Müşteri"ye dönüyor. Panel aynı işlevi çağırıyor — iki kapı, tek kural.
 *
 * **Siparişi olan hesapta yazılı onay isteniyor.** Ürün silmedeki kuralın
 * aynısı (K-52): geri alınamayan ve başka kayıtları da etkileyen bir işlem
 * tek tıkla olmamalı.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { hesabiSil } from "@/server/kisisel-veri";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

const LISTE = "/yonetim/musteriler";

export async function musteriHesabiniSil(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(form.get("id") ?? "").trim();
  if (!id) redirect(LISTE);

  const musteri = await db.customer.findUnique({
    where: { id },
    select: { id: true, _count: { select: { siparisler: true } } },
  });
  if (!musteri) redirect(`${LISTE}?hata=bulunamadi`);

  const onay = String(form.get("onay") ?? "").trim().toLocaleUpperCase("tr");
  if (musteri._count.siparisler > 0 && onay !== "SİL") {
    redirect(`/yonetim/musteriler/${id}?hata=onay`);
  }

  await hesabiSil(id);

  revalidatePath("/", "layout");
  redirect(`${LISTE}?kayit=silindi`);
}
