"use server";

/** "Sipariş ver" ekranının sunucu eylemleri (K-179). Hepsi yönetici ister. */

import { revalidatePath } from "next/cache";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { tedarikciAdiTemizle, tedarikSiparisiYaz, urunlereTedarikciYaz } from "@/server/tedarik";
import { telefonCoz } from "@/ui/tedarik-bicim";

const SAYFA = "/yonetim/stok/siparis-ver";

/** WhatsApp'a ya da panoya gönderilen mesajın kaydı. */
export async function tedarikSiparisiKaydet(g: {
  supplierId: string | null;
  satirlar: { variantId: string; adet: number }[];
  metin: string;
}): Promise<{ tamam: boolean }> {
  const ben = await yoneticiGerekli();
  await tedarikSiparisiYaz({
    supplierId: typeof g.supplierId === "string" ? g.supplierId : null,
    satirlar: Array.isArray(g.satirlar) ? g.satirlar : [],
    metin: String(g.metin ?? ""),
    adminId: ben.id,
  });
  revalidatePath(SAYFA);
  return { tamam: true };
}

/** Tedarikçinin telefonu; boş bırakılırsa siliniyor. */
export async function tedarikciTelefonKaydet(
  form: FormData,
): Promise<{ tamam: boolean; hata?: string }> {
  await yoneticiGerekli();
  const id = String(form.get("id") ?? "");
  const ham = String(form.get("telefon") ?? "").trim();
  const telefon = ham ? telefonCoz(ham) : null;
  if (ham && !telefon) {
    return { tamam: false, hata: "Numara okunamadı. Ör. 0532 123 45 67 ya da +90 532 123 45 67." };
  }
  await db.supplier.updateMany({ where: { id }, data: { telefon } });
  revalidatePath(SAYFA);
  return { tamam: true };
}

/** Ürüne tedarikçi ve (isteğe bağlı) tedarikçinin model kodunu yazar. */
export async function urunTedarikcisiAta(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const productId = String(form.get("productId") ?? "");
  const ad = tedarikciAdiTemizle(String(form.get("tedarikci") ?? ""));
  const kod = String(form.get("kod") ?? "")
    .trim()
    .slice(0, 60);
  if (!productId) return;
  if (ad) await urunlereTedarikciYaz([productId], ad);
  if (form.has("kod")) {
    await db.product.updateMany({ where: { id: productId }, data: { tedarikciKodu: kod || null } });
  }
  revalidatePath(SAYFA);
}
