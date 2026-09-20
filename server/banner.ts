/**
 * Ana sayfadaki dönen banner.
 *
 * Tarihi gelen banner kendiliğinden girer, biten çıkar — duyuru şeridiyle aynı
 * mantık. Geçiş tamamen CSS ile yapılıyor, sayfada bunun için JavaScript yok.
 */

import { db } from "@/server/veritabani";
import { ETIKETLER, paylasilanOnbellek } from "@/server/onbellek";

export type Banner = {
  id: string;
  baslik: string;
  altYazi: string;
  dugmeYazi: string;
  dugmeLink: string;
  palet: string;
  gorsel: string;
};

export const BANNER_PALETLERI = ["sari", "mint", "mercan", "mavi", "krem"] as const;
export const BANNER_GORSELLERI = [
  "amblem",
  "zibin",
  "tulum",
  "battaniye",
  "patik",
  "sapka",
  "onluk",
] as const;

export async function yayindakiBannerlar(simdi?: Date): Promise<Banner[]> {
  if (!simdi) return bannerlariOku();
  return bannerSorgusu(simdi);
}

const bannerlariOku = paylasilanOnbellek(
  () => bannerSorgusu(new Date()),
  ["yayindaki-bannerlar"],
  [ETIKETLER.banner],
  60,
);

async function bannerSorgusu(simdi: Date): Promise<Banner[]> {
  const satirlar = await db.heroBanner.findMany({
    where: {
      aktif: true,
      AND: [
        { OR: [{ baslangic: null }, { baslangic: { lte: simdi } }] },
        { OR: [{ bitis: null }, { bitis: { gte: simdi } }] },
      ],
    },
    orderBy: [{ sira: "asc" }, { olusturuldu: "asc" }],
  });

  return satirlar.map((b) => ({
    id: b.id,
    baslik: b.baslik,
    altYazi: b.altYazi,
    dugmeYazi: b.dugmeYazi,
    dugmeLink: b.dugmeLink,
    palet: b.palet,
    gorsel: b.gorsel,
  }));
}

/** Panel için: tarihi geçmiş ve kapalı olanlar da gelsin. */
export async function tumBannerlar() {
  return db.heroBanner.findMany({ orderBy: [{ sira: "asc" }, { olusturuldu: "asc" }] });
}

export const bannerSaniyeGetir = paylasilanOnbellek(
  async function bannerSaniyeGetir(): Promise<number> {
    const ayar = await db.storeSetting.findUnique({
      where: { id: "tek" },
      select: { bannerSaniye: true },
    });
    return ayar?.bannerSaniye ?? 6;
  },
  ["banner-saniye"],
  [ETIKETLER.banner],
);
