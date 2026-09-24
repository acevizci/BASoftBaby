import "server-only";

/**
 * Ürün soruları — okuma (K-135). Yalnızca cevaplanmış ve yayındakiler;
 * ürün sayfası dinamik, bu yüzden önbellekte (katalog etiketiyle düşüyor).
 */

import { db } from "@/server/veritabani";
import { ETIKETLER, paylasilanOnbellekli } from "@/server/onbellek";

export type UrunSorusu = { id: string; soru: string; adSoyad: string; cevap: string; tarih: string };

export const urunSorulari = paylasilanOnbellekli(
  async function urunSorulari(productId: string): Promise<UrunSorusu[]> {
    const satirlar = await db.productQuestion.findMany({
      where: { productId, durum: "yayinda" },
      orderBy: { cevaplandi: "desc" },
      take: 30,
      select: { id: true, soru: true, adSoyad: true, cevap: true, cevaplandi: true, olusturuldu: true },
    });
    return satirlar.map((s) => ({
      id: s.id,
      soru: s.soru,
      adSoyad: s.adSoyad || "Ziyaretçi",
      cevap: s.cevap,
      tarih: (s.cevaplandi ?? s.olusturuldu).toISOString(),
    }));
  },
  ["urun-sorulari"],
  [ETIKETLER.katalog],
);

