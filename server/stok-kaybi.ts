import "server-only";

/**
 * Stok kaybı (K-179): Depo'da "Çıkar" (hasarlı, kayıp, numune) ve sayımda
 * eksik çıkanlar, alış fiyatıyla. Aylık net kârdan düşülüyor.
 *
 * - **Kayıp:** hasarlı/fire, kayıp ve sayımda eksik çıkanlar.
 * - **Numune ve hediye** ayrı: reklam gideri gibi, kayıptan ayrı görünsün.
 * - Sayımda fazla çıkanlar kayıpla netleşmiyor: fazla çıkan ürün önceki bir
 *   hatanın düzelmesi; ayrı yazılıyor.
 * - Tutar ürünün **şimdiki** alış fiyatıyla (hareket kaydı maliyet
 *   taşımıyor). Alış fiyatı olmayan ürünün adedi ayrı sayılıyor.
 */

import { db } from "@/server/veritabani";

export type StokKaybi = {
  kayipKurus: number;
  kayipAdet: number;
  numuneKurus: number;
  numuneAdet: number;
  /** Sayımda fazla çıkanların alış karşılığı; kârdan düşülmüyor. */
  fazlaKurus: number;
  /** Alış fiyatı olmadığı için tutara girmeyen adet. */
  maliyetsizAdet: number;
};

export async function stokKaybi(baslangic: Date, bitis: Date): Promise<StokKaybi> {
  const aralik = { gte: baslangic, lt: bitis };
  const [cikislar, sayimEksik, sayimFazla] = await Promise.all([
    db.stockMovement.groupBy({
      by: ["productId", "sebep"],
      where: { olusturuldu: aralik, sebep: { in: ["hasar", "kayip", "numune"] } },
      _sum: { degisim: true },
    }),
    db.stockMovement.groupBy({
      by: ["productId"],
      where: { olusturuldu: aralik, sebep: "sayim", degisim: { lt: 0 } },
      _sum: { degisim: true },
    }),
    db.stockMovement.groupBy({
      by: ["productId"],
      where: { olusturuldu: aralik, sebep: "sayim", degisim: { gt: 0 } },
      _sum: { degisim: true },
    }),
  ]);
  const idler = [...new Set([...cikislar, ...sayimEksik, ...sayimFazla].map((g) => g.productId))];
  const urunler = await db.product.findMany({
    where: { id: { in: idler } },
    select: { id: true, alisFiyatKurus: true },
  });
  const alis = new Map(urunler.map((u) => [u.id, u.alisFiyatKurus]));

  const k: StokKaybi = {
    kayipKurus: 0,
    kayipAdet: 0,
    numuneKurus: 0,
    numuneAdet: 0,
    fazlaKurus: 0,
    maliyetsizAdet: 0,
  };
  const ekle = (productId: string, adet: number, tur: "kayip" | "numune" | "fazla") => {
    const a = alis.get(productId) ?? null;
    if (tur === "kayip") k.kayipAdet += adet;
    if (tur === "numune") k.numuneAdet += adet;
    if (a === null) {
      if (tur !== "fazla") k.maliyetsizAdet += adet;
      return;
    }
    if (tur === "kayip") k.kayipKurus += adet * a;
    else if (tur === "numune") k.numuneKurus += adet * a;
    else k.fazlaKurus += adet * a;
  };
  for (const g of cikislar) {
    ekle(g.productId, -(g._sum.degisim ?? 0), g.sebep === "numune" ? "numune" : "kayip");
  }
  for (const g of sayimEksik) ekle(g.productId, -(g._sum.degisim ?? 0), "kayip");
  for (const g of sayimFazla) ekle(g.productId, g._sum.degisim ?? 0, "fazla");
  return k;
}
