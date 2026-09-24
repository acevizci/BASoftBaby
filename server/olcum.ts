import "server-only";

import { db } from "@/server/veritabani";
import { ETIKETLER, paylasilanOnbellek } from "@/server/onbellek";

/** Reklam ölçümü kimlikleri (K-124); boş olan araç yüklenmiyor. */
export type OlcumAyari = { metaPikselId: string; googleEtiketId: string };

export const olcumAyari = paylasilanOnbellek(
  async function olcumAyari(): Promise<OlcumAyari> {
    const ayar = await db.storeSetting.findUnique({
      where: { id: "tek" },
      select: { metaPikselId: true, googleEtiketId: true },
    });
    return {
      metaPikselId: ayar?.metaPikselId ?? "",
      googleEtiketId: ayar?.googleEtiketId ?? "",
    };
  },
  ["olcum-ayari"],
  [ETIKETLER.ayarlar],
);
