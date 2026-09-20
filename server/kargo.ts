import "server-only";
import { db } from "@/server/veritabani";

/**
 * Kargo — gönderi kaydı, takip bağlantısı, durum akışı.
 *
 * **Toplayıcı henüz bağlı değil.** Plandaki Geliver/Navlungo entegrasyonu için
 * hesap ve API anahtarı gerekiyor; ikisi de şirket kaydına bağlı. O yüzden bu
 * adımda sağlayıcıdan bağımsız olan her şey yapıldı: gönderi kaydı, barkodlu
 * etiket, müşteri bildirimi, durum akışı ve taşıyıcının kendi takip sayfasına
 * bağlantı. Mağaza bugün anlaşmalı kargodan aldığı takip numarasını panele
 * yazıyor, geri kalanı kendiliğinden işliyor.
 *
 * Toplayıcı bağlanınca değişecek tek yer `gonderiOlustur`: gönderiyi orada
 * açıp dönen takip numarasını ve etiket adresini aynı kayda yazmak yetiyor
 * (K-19).
 */

export const TASIYICILAR = [
  { kod: "yurtici", ad: "Yurtiçi Kargo" },
  { kod: "aras", ad: "Aras Kargo" },
  { kod: "mng", ad: "MNG Kargo" },
  { kod: "ptt", ad: "PTT Kargo" },
  { kod: "surat", ad: "Sürat Kargo" },
  { kod: "diger", ad: "Diğer" },
] as const;

export type TasiyiciKodu = (typeof TASIYICILAR)[number]["kod"];

export const GONDERI_DURUMLARI = ["hazirlandi", "verildi", "yolda", "teslim", "iade"] as const;
export type GonderiDurumu = (typeof GONDERI_DURUMLARI)[number];

export const GONDERI_DURUM_ADLARI: Record<GonderiDurumu, string> = {
  hazirlandi: "Etiket hazır",
  verildi: "Kargoya verildi",
  yolda: "Yolda",
  teslim: "Teslim edildi",
  iade: "İade",
};

export function tasiyiciAdi(kod: string): string {
  return TASIYICILAR.find((t) => t.kod === kod)?.ad ?? "Kargo";
}

/**
 * Taşıyıcıların kendi gönderi sorgulama sayfaları. Adresler değişebiliyor;
 * tek yerde durmasının sebebi bu.
 */
const TAKIP_ADRESLERI: Record<string, (takipNo: string) => string> = {
  yurtici: (n) =>
    `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${encodeURIComponent(n)}`,
  aras: (n) =>
    `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${encodeURIComponent(n)}`,
  mng: (n) => `https://kargotakip.mngkargo.com.tr/?takipNo=${encodeURIComponent(n)}`,
  ptt: (n) => `https://gonderitakip.ptt.gov.tr/Track/Verify?q=${encodeURIComponent(n)}`,
  surat: (n) =>
    `https://www.suratkargo.com.tr/KargoTakip/?kargotakipno=${encodeURIComponent(n)}`,
};

/** Taşıyıcının sorgulama sayfası; bilinmeyen taşıyıcıda bağlantı verilmiyor. */
export function takipAdresi(tasiyici: string, takipNo: string): string | undefined {
  if (!takipNo) return undefined;
  return TAKIP_ADRESLERI[tasiyici]?.(takipNo);
}

export type Gonderi = {
  id: string;
  tasiyici: string;
  tasiyiciAdi: string;
  takipNo: string;
  barkod: string;
  durum: string;
  etiketAdresi: string | null;
  olusturuldu: Date;
  takipAdresi?: string;
};

function gonderiYap(k: {
  id: string;
  tasiyici: string;
  takipNo: string;
  barkod: string;
  durum: string;
  etiketAdresi: string | null;
  olusturuldu: Date;
}): Gonderi {
  return {
    ...k,
    tasiyiciAdi: tasiyiciAdi(k.tasiyici),
    takipAdresi: takipAdresi(k.tasiyici, k.takipNo),
  };
}

export async function gonderiGetir(numara: string): Promise<Gonderi | undefined> {
  const kayit = await db.shipment.findFirst({
    where: { order: { numara } },
    orderBy: { olusturuldu: "desc" },
    select: {
      id: true,
      tasiyici: true,
      takipNo: true,
      barkod: true,
      durum: true,
      etiketAdresi: true,
      olusturuldu: true,
    },
  });
  return kayit ? gonderiYap(kayit) : undefined;
}

/** Toplayıcı bağlandığında burası dolacak; şu an elle giriş kullanılıyor. */
export function kargoSaglayiciAcikMi(): boolean {
  return Boolean(process.env.KARGO_API_ANAHTARI);
}
