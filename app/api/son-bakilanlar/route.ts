import { NextResponse, type NextRequest } from "next/server";
import { urunleriSec } from "@/server/katalog";

/**
 * "Son baktığın ürünler" şeridinin ürün bilgisi (K-95).
 *
 * Liste tarayıcıda tutuluyor (`ui/son-bakilan.tsx`); bu uç yalnızca adresleri
 * alıp kart verisini döndürüyor. Döndürdüğü şey zaten vitrinde görünen
 * bilgi. Vitrin kuralları geçerli: yayından kalkan ya da kategorisi kapanan
 * ürün gelmiyor. Adres sayısı ve biçimi sınırlı.
 */
export const dynamic = "force-dynamic";

const EN_COK = 12;
const SLUG = /^[a-z0-9-]{1,80}$/;

export async function GET(istek: NextRequest): Promise<NextResponse> {
  const sluglar = (istek.nextUrl.searchParams.get("sluglar") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => SLUG.test(s))
    .slice(0, EN_COK);

  const urunler = await urunleriSec({ sluglar });
  return NextResponse.json({ urunler }, { headers: { "cache-control": "no-store" } });
}
