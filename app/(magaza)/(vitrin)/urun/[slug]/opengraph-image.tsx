import { urunGetir } from "@/server/katalog";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { BOYUT, paylasimKarti } from "@/server/paylasim-gorseli";

/**
 * Ürünün paylaşım kartı (K-127): fotoğraf, ad ve fiyat. Eskiden fotoğrafın
 * kendisi gidiyordu; fotoğrafsız üründe kart boş kalıyordu, WebP'yi de
 * bazı uygulamalar göstermiyordu.
 */
export const size = BOYUT;
export const contentType = "image/png";
export const alt = "BASoftBaby ürün";
export const revalidate = 3600;

export default async function Gorsel({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const urun = await urunGetir(slug);
  if (!urun) return paylasimKarti({ baslik: "BASoftBaby" });
  const satis = urun.kampanya ? urun.kampanya.indirimliFiyatKurus : urun.fiyatKurus;
  return paylasimKarti({
    baslik: urun.ad,
    altBaslik: urun.ozet,
    vurgu: fiyatYaz(satis),
    fotograflar: urun.fotograflar.slice(0, 1).map((f) => f.yol),
  });
}
