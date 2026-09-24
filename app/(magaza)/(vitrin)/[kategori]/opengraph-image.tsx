import { kategoriGetir, urunleriGetir } from "@/server/katalog";
import { BOYUT, paylasimKarti } from "@/server/paylasim-gorseli";

/** Kategorinin paylaşım kartı: adı, açıklaması ve ilk ürünlerinin fotoğrafları (K-127). */
export const size = BOYUT;
export const contentType = "image/png";
export const alt = "BASoftBaby kategori";
export const revalidate = 3600;

export default async function Gorsel({ params }: { params: Promise<{ kategori: string }> }) {
  const { kategori } = await params;
  const tumu = kategori === "urunler";
  const [bilgi, urunler] = await Promise.all([
    tumu ? undefined : kategoriGetir(kategori),
    urunleriGetir(tumu ? {} : { kategori }),
  ]);
  return paylasimKarti({
    baslik: tumu ? "Tüm ürünler" : (bilgi?.ad ?? "BASoftBaby"),
    altBaslik: tumu ? "Bebek ve çocuk giyimi" : bilgi?.aciklama,
    fotograflar: urunler.flatMap((u) => u.fotograflar.slice(0, 1).map((f) => f.yol)),
  });
}
