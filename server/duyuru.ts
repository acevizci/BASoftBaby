/**
 * Duyuru şeridi — sitenin en üstündeki kayan yazı.
 *
 * Mesajlar ve şerit ayarları yönetim panelinden değiştirilir; sayfalar hep bu
 * fonksiyonlardan okur.
 */

import { db } from "@/server/veritabani";

export type Duyuru = {
  id: string;
  metin: string;
  /** Tıklanınca gidilecek sayfa. Boşsa mesaj tıklanmaz. */
  link?: string;
  sira: number;
  aktif: boolean;
  baslangic?: Date;
  bitis?: Date;
};

export type SeritHizi = "yavas" | "orta" | "hizli";
export type SeritRengi = "nane" | "mercan" | "sari" | "mavi";

export type SeritAyari = {
  acik: boolean;
  hiz: SeritHizi;
  renk: SeritRengi;
  /** Fare üzerine gelince akış dursun mu */
  durdurHover: boolean;
  mobildeGoster: boolean;
};

export const VARSAYILAN_AYAR: SeritAyari = {
  acik: true,
  hiz: "orta",
  renk: "nane",
  durdurHover: true,
  mobildeGoster: true,
};

export async function seritAyariGetir(): Promise<SeritAyari> {
  const s = await db.storeSetting.findUnique({ where: { id: "tek" } });
  if (!s) return VARSAYILAN_AYAR;
  return {
    acik: s.seritAcik,
    hiz: s.seritHiz as SeritHizi,
    renk: s.seritRenk as SeritRengi,
    durdurHover: s.seritDurdurHover,
    mobildeGoster: s.seritMobilde,
  };
}

function satirCevir(d: {
  id: string;
  metin: string;
  link: string | null;
  sira: number;
  aktif: boolean;
  baslangic: Date | null;
  bitis: Date | null;
}): Duyuru {
  return {
    id: d.id,
    metin: d.metin,
    link: d.link ?? undefined,
    sira: d.sira,
    aktif: d.aktif,
    baslangic: d.baslangic ?? undefined,
    bitis: d.bitis ?? undefined,
  };
}

/** Panelde görünen liste: kapalı ve tarihi geçmiş mesajlar da dahil. */
export async function tumDuyurular(): Promise<Duyuru[]> {
  const satirlar = await db.announcement.findMany({ orderBy: { sira: "asc" } });
  return satirlar.map(satirCevir);
}

/** Sitede görünen liste: tarihi gelmemiş ya da geçmiş mesajlar kendiliğinden düşer. */
export async function yayindakiDuyurular(simdi: Date = new Date()): Promise<Duyuru[]> {
  const satirlar = await db.announcement.findMany({
    where: {
      aktif: true,
      AND: [
        { OR: [{ baslangic: null }, { baslangic: { lte: simdi } }] },
        { OR: [{ bitis: null }, { bitis: { gte: simdi } }] },
      ],
    },
    orderBy: { sira: "asc" },
  });
  return satirlar.map(satirCevir);
}
