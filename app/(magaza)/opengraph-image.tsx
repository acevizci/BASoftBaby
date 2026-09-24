import { oneCikanUrunler } from "@/server/katalog";
import { BOYUT, paylasimKarti } from "@/server/paylasim-gorseli";

/** Ana sayfanın ve kendi görseli olmayan mağaza sayfalarının paylaşım kartı (K-127). */
export const size = BOYUT;
export const contentType = "image/png";
export const alt = "BASoftBaby · Bebek kıyafetleri ve aksesuarları";
export const revalidate = 3600;

export default async function Gorsel() {
  const urunler = await oneCikanUrunler();
  return paylasimKarti({
    baslik: "Minik bedenlere, yumuşacık kumaşlar",
    altBaslik: "Organik pamuklu bebek kıyafetleri, zıbın, tulum ve uyku ürünleri",
    fotograflar: urunler.flatMap((u) => u.fotograflar.slice(0, 1).map((f) => f.yol)),
  });
}
