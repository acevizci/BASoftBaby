"use server";

/**
 * Depo ekranının sunucu eylemleri (K-176). Ekran istemci bileşeni; bu
 * eylemler veri döndürüyor, sayfa değiştirmiyor. Hepsi yönetici ister.
 */

import { revalidatePath, updateTag } from "next/cache";
import { TUM_ETIKETLER } from "@/server/onbellek";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import {
  barkodCoz,
  barkodKaldir,
  barkodOgret,
  depoAra,
  depoKaydet,
  type DepoHatasi,
  type DepoKaydi,
} from "@/server/depo";
import type { CozSonucu, DepoBedeni, DepoSonucu } from "@/ui/depo-bicim";

export async function depoBarkodCoz(kod: string): Promise<CozSonucu> {
  await yoneticiGerekli();
  return barkodCoz(String(kod ?? ""));
}

export type AramaUrunu = {
  id: string;
  ad: string;
  aktif: boolean;
  bedenler: { id: string; beden: string; renkAdi: string; stok: number }[];
};

export async function depoUrunAra(metin: string): Promise<AramaUrunu[]> {
  await yoneticiGerekli();
  const { urunler } = await depoAra(String(metin ?? "").slice(0, 120));
  return urunler.map((u) => ({
    id: u.id,
    ad: u.ad,
    aktif: u.aktif,
    bedenler: u.bedenler.map((b) => ({
      id: b.id,
      beden: b.beden,
      renkAdi: b.renkAdi,
      stok: b.stok,
    })),
  }));
}

export async function depoBarkodOgret(g: {
  kod: string;
  variantId: string;
  carpan?: number;
  tekBag?: boolean;
}): Promise<{ tamam: true; beden: DepoBedeni } | { tamam: false; sebep: string }> {
  const ben = await yoneticiGerekli();
  return barkodOgret({ ...g, adminId: ben.id });
}

/** Barkodsuz ürün: aramadan seçilen bedeni listeye eklemek için kart bilgisi. */
export async function depoBedenGetir(variantId: string): Promise<CozSonucu> {
  await yoneticiGerekli();
  return barkodCoz(String(variantId ?? ""));
}

export async function depoListeKaydet(
  k: DepoKaydi,
): Promise<{ tamam: true; sonuc: DepoSonucu } | { tamam: false; hata: DepoHatasi }> {
  const ben = await yoneticiGerekli();
  const sonuc = await depoKaydet(k, ben);
  if (sonuc.tamam && !sonuc.sonuc.tekrar && sonuc.sonuc.kalem > 0) {
    // Stok değişti: vitrindeki "tükendi" ve "son adet" yazıları tazelensin.
    for (const etiket of TUM_ETIKETLER) updateTag(etiket);
    revalidatePath("/", "layout");
  }
  return sonuc;
}

/** Ürün sayfasından barkod bağını kaldırma. */
export async function barkodBaginiKaldir(form: FormData): Promise<void> {
  await yoneticiGerekli();
  await barkodKaldir(String(form.get("id") ?? ""));
  revalidatePath(`/yonetim/urunler/${String(form.get("slug") ?? "")}`);
}
