/**
 * Hazır kampanyaların aç/kapat düğmesi (K-172).
 *
 * Şablonun kaydı yoksa ilk açılışta şablon değerleriyle oluşturuluyor; sonra
 * aynı kayıt açılıp kapatılıyor, "Düzenle"den değişen değerler korunuyor.
 * Flaş kampanya her açılışta açıldığı andan başlayıp şablon süresi kadar
 * sürüyor.
 */

import "server-only";
import { Prisma } from "@/db/uretilen/client";
import { db } from "@/server/veritabani";
import { KAMPANYA_TIPLERI, kademeCoz } from "@/server/kampanya";
import {
  calismaDurumu,
  sablonBul,
  type KampanyaTaslagi,
  type KampanyaTuru,
} from "@/ui/kampanya-bicim";

export type SablonSonucu = "acildi" | "kapatildi" | "bulunamadi" | "kupon";

export async function sablonuCevir(anahtar: string, simdi = new Date()): Promise<SablonSonucu> {
  const s = sablonBul(anahtar);
  if (!s) return "bulunamadi";

  const sureli = (): { baslangic: Date; bitis: Date } | Record<string, never> =>
    s.saat ? { baslangic: simdi, bitis: new Date(simdi.getTime() + s.saat * 3_600_000) } : {};

  const varOlan = await db.campaign.findUnique({
    where: { sablon: anahtar },
    select: {
      id: true,
      aktif: true,
      baslangic: true,
      bitis: true,
      kullanim: true,
      enFazlaKullanim: true,
    },
  });
  if (varOlan) {
    // Süresi dolmuş kampanya "açık" görünse de çalışmıyor; düğme onu yeniden
    // açıyor: flaşta yeni süre, ötekilerde bitiş kaldırılıyor.
    const durum = calismaDurumu(varOlan, simdi);
    const kapat = durum === "acik" || durum === "bekliyor" || durum === "doldu";
    await db.campaign.update({
      where: { id: varOlan.id },
      data: kapat
        ? { aktif: false }
        : { aktif: true, ...(s.saat ? sureli() : durum === "bitti" ? { bitis: null } : {}) },
    });
    return kapat ? "kapatildi" : "acildi";
  }

  const t = s.taslak;
  if (t.kuponKodu) {
    const ayni = await db.campaign.findUnique({
      where: { kuponKodu: t.kuponKodu },
      select: { id: true },
    });
    if (ayni) return "kupon";
  }
  try {
    await db.campaign.create({
      data: {
        sablon: anahtar,
        ad: t.ad,
        tip: t.tip,
        deger: t.deger ?? 0,
        alAdet: t.alAdet ?? null,
        odeAdet: t.odeAdet ?? null,
        kademeler: t.kademeler ?? Prisma.DbNull,
        enFazlaIndirimKurus: t.enFazlaIndirimKurus ?? null,
        kapsam: "tumu",
        kuponKodu: t.kuponKodu ?? null,
        enAzSepetKurus: t.enAzSepetKurus ?? 0,
        // İlk sipariş ve kişi başı sınır üyelik gerektiriyor (K-170).
        uyelereOzel: !!(t.uyelereOzel || t.ilkSiparis || t.kisiBasiSinir),
        ilkSiparis: t.ilkSiparis ?? false,
        kisiBasiSinir: t.kisiBasiSinir ?? null,
        enFazlaKullanim: t.enFazlaKullanim ?? null,
        aktif: true,
        ...sureli(),
      },
    });
  } catch (e) {
    // Aynı anda iki tıklama: ikincisi benzersiz şablon kısıtına çarpıyor, ilk
    // tıklamanın açtığı kampanya duruyor. Arada kupon kodunu başka bir
    // kampanya almışsa kurulmadı.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const kuruldu = await db.campaign.findUnique({
        where: { sablon: anahtar },
        select: { id: true },
      });
      return kuruldu ? "acildi" : "kupon";
    }
    throw e;
  }
  return "acildi";
}

/** Kayıtlı kampanya sihirbazın ve özetin taslağına (K-172). */
export function kaydiTaslaga(k: {
  ad: string;
  tip: string;
  deger: number;
  alAdet: number | null;
  odeAdet: number | null;
  kademeler: unknown;
  enFazlaIndirimKurus: number | null;
  kapsam: string;
  categoryId: string | null;
  productId: string | null;
  kategoriIdleri: string[];
  urunIdleri: string[];
  kuponKodu: string | null;
  enAzSepetKurus: number;
  uyelereOzel: boolean;
  ilkSiparis: boolean;
  kisiBasiSinir: number | null;
  enFazlaKullanim: number | null;
  baslangic: Date | null;
  bitis: Date | null;
  aktif: boolean;
}): KampanyaTaslagi {
  return {
    ad: k.ad,
    tip: (KAMPANYA_TIPLERI as readonly string[]).includes(k.tip)
      ? (k.tip as KampanyaTuru)
      : "yuzde",
    deger: k.deger,
    alAdet: k.alAdet,
    odeAdet: k.odeAdet,
    kademeler: kademeCoz(k.kademeler),
    enFazlaIndirimKurus: k.enFazlaIndirimKurus,
    kapsam: k.kapsam === "kategori" || k.kapsam === "urun" ? k.kapsam : "tumu",
    // Eski tekli kapsam (K-171 öncesi) çoklu listeye taşınıyor.
    kategoriIdleri: k.kategoriIdleri.length ? k.kategoriIdleri : k.categoryId ? [k.categoryId] : [],
    urunIdleri: k.urunIdleri.length ? k.urunIdleri : k.productId ? [k.productId] : [],
    kuponKodu: k.kuponKodu,
    enAzSepetKurus: k.enAzSepetKurus,
    uyelereOzel: k.uyelereOzel,
    ilkSiparis: k.ilkSiparis,
    kisiBasiSinir: k.kisiBasiSinir,
    enFazlaKullanim: k.enFazlaKullanim,
    baslangic: k.baslangic?.toISOString() ?? null,
    bitis: k.bitis?.toISOString() ?? null,
    aktif: k.aktif,
  };
}
