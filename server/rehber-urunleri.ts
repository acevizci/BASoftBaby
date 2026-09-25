import "server-only";
import { db } from "@/server/veritabani";
import { urunleriSec, type Urun } from "@/server/katalog";
import { kelimeler } from "@/server/arama-metin";
import { ETIKETLER, paylasilanOnbellekli } from "@/server/onbellek";

/**
 * Rehber yazısının altındaki ürünler (K-157): panelde elle seçilenler
 * önde; azsa yazının anahtar kelimeleriyle eşleşen stoktaki ürünlerle
 * tamamlanıyor. Kelimelerden **herhangi biri** yetiyor (arama kutusunun
 * aksine). Önce yazılan kelime daha ağır basıyor ("zıbın body tulum"da zıbın
 * en önemli); puan eşitse daha çok değerlendirilen önde.
 */
export async function rehberUrunleri(
  sluglar: string[],
  urunArama: string,
  adet = 6,
): Promise<{ urunler: Urun[]; elle: boolean }> {
  const secilen = await urunleriSec({ sluglar });
  if (secilen.length >= 3 || !urunArama.trim()) {
    return { urunler: secilen.slice(0, adet), elle: secilen.length > 0 };
  }
  const bulunan = await kelimeyleSorgula(urunArama, adet);
  const var_ = new Set(secilen.map((u) => u.slug));
  return {
    urunler: [...secilen, ...bulunan.filter((u) => !var_.has(u.slug))].slice(0, adet),
    elle: secilen.length > 0,
  };
}

/**
 * Saf: adayları tutan kelimelerin ağırlığına göre sıralar (ilk kelime en
 * ağır), hiç tutmayanı atar.
 */
export function kelimeyleSirala<T extends { aramaMetni: string; yorumSayisi: number }>(
  adaylar: T[],
  aranan: string[],
): T[] {
  return adaylar
    .map((a) => ({
      a,
      puan: aranan.reduce((t, k, i) => t + (a.aramaMetni.includes(k) ? aranan.length - i : 0), 0),
    }))
    .filter((x) => x.puan > 0)
    .sort((x, y) => y.puan - x.puan || y.a.yorumSayisi - x.a.yorumSayisi)
    .map((x) => x.a);
}

const kelimeyleSorgula = paylasilanOnbellekli(
  async function kelimeyleSorgula(urunArama: string, adet: number): Promise<Urun[]> {
    const aranan = kelimeler(urunArama);
    if (aranan.length === 0) return [];
    const adaylar = await db.product.findMany({
      where: {
        aktif: true,
        category: { aktif: true },
        OR: aranan.map((k) => ({ aramaMetni: { contains: k } })),
      },
      select: { id: true, aramaMetni: true, yorumSayisi: true },
      orderBy: { yorumSayisi: "desc" },
      take: 60,
    });
    const sirali = kelimeyleSirala(adaylar, aranan).map((a) => a.id);
    const urunler = await urunleriSec({ idler: sirali });
    return urunler.filter((u) => u.varyantlar.some((v) => v.stok > 0)).slice(0, adet);
  },
  ["rehber-urunleri"],
  [ETIKETLER.katalog],
  600,
);
