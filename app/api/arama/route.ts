import { NextResponse, type NextRequest } from "next/server";
import { urunleriGetir } from "@/server/katalog";
import { fiyatYaz } from "@/ui/katalog-bicim";

/**
 * Arama kutusunun altındaki öneriler.
 *
 * Yalnızca JavaScript açıkken kullanılıyor; kapalıyken kutu düz bir forma
 * dönüşüp `/arama` sayfasına gidiyor. Yani bu uç bir kolaylık, akışın şartı
 * değil.
 *
 * Herkese açık ama döndürdüğü şey zaten vitrinde görünen bilgi: ad, adres,
 * fiyat. Sorgu kısaltılıyor ve sonuç sayısı sınırlı.
 */
export const dynamic = "force-dynamic";

const EN_COK = 6;

export async function GET(istek: NextRequest): Promise<NextResponse> {
  const q = (istek.nextUrl.searchParams.get("q") ?? "").slice(0, 100).trim();
  if (q.length < 2) return NextResponse.json({ urunler: [] });

  const urunler = await urunleriGetir({ ara: q });

  return NextResponse.json(
    {
      toplam: urunler.length,
      urunler: urunler.slice(0, EN_COK).map((u) => ({
        slug: u.slug,
        ad: u.ad,
        kategori: u.kategori,
        fiyat: fiyatYaz(u.kampanya?.indirimliFiyatKurus ?? u.fiyatKurus),
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
