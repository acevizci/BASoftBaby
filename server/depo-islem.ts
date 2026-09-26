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
import { stokBildirimleriniGonder } from "@/server/stok-bildirimi";
import {
  acikSayim,
  depoSayimAc,
  depoSayimBitir,
  depoSayimIptal,
  depoSayimYaz,
  sayimFarklari,
  type AcikSayim,
  type SayimFarklari,
} from "@/server/depo-sayim";

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

/* ── Sayım (K-177) ─────────────────────────────────────────────────────── */

function vitriniTazele() {
  for (const etiket of TUM_ETIKETLER) updateTag(etiket);
  revalidatePath("/", "layout");
}

export async function depoSayimGetir(): Promise<AcikSayim | null> {
  await yoneticiGerekli();
  return acikSayim();
}

export async function depoSayimBaslat(kapsam: string): Promise<AcikSayim | null> {
  const ben = await yoneticiGerekli();
  await depoSayimAc(String(kapsam ?? "").slice(0, 120), ben);
  return acikSayim();
}

export async function depoSayimKaydet(
  countId: string,
  satirlar: { variantId: string; adet: number }[],
  kaldirilan: string[],
): Promise<{ tamam: boolean }> {
  await yoneticiGerekli();
  const r = await depoSayimYaz(
    String(countId ?? ""),
    Array.isArray(satirlar) ? satirlar : [],
    Array.isArray(kaldirilan) ? kaldirilan.map(String).slice(0, 2000) : [],
  );
  return { tamam: r.tamam };
}

export async function depoSayimFarklari(countId: string): Promise<SayimFarklari | null> {
  await yoneticiGerekli();
  return sayimFarklari(String(countId ?? ""));
}

export async function depoSayimiBitir(
  countId: string,
  okutulmayanSifir: boolean,
): Promise<{ tamam: true; duzeltilen: number } | { tamam: false }> {
  const ben = await yoneticiGerekli();
  const r = await depoSayimBitir(String(countId ?? ""), { okutulmayanSifir: !!okutulmayanSifir }, ben);
  if (!r) return { tamam: false };
  // Sayım fazla çıkardıysa tükenmiş bir beden stoğa girmiş olabilir.
  await stokBildirimleriniGonder(r.artanlar);
  vitriniTazele();
  return { tamam: true, duzeltilen: r.duzeltilen };
}

export async function depoSayimiIptalEt(countId: string): Promise<void> {
  await yoneticiGerekli();
  await depoSayimIptal(String(countId ?? ""));
}
