import { NextResponse, type NextRequest } from "next/server";
import { hareketCsv, hareketleriDisaAktar, hareketSuzgeciniCoz } from "@/server/stok-hareket";
import { renkAdlari } from "@/server/renkler";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

/**
 * Stok hareketlerinin dökümü; ekrandaki süzgeçle aynı (K-103).
 *
 * Oturum kontrolünü kendi yapıyor: route handler'lar düzenden geçmiyor (K-45).
 */
export const dynamic = "force-dynamic";

export async function GET(istek: NextRequest): Promise<NextResponse> {
  await yoneticiGerekli();

  const suzgec = hareketSuzgeciniCoz(Object.fromEntries(istek.nextUrl.searchParams.entries()));
  const [satirlar, adlar] = await Promise.all([hareketleriDisaAktar(suzgec), renkAdlari()]);
  const gun = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });

  return new NextResponse(hareketCsv(satirlar, adlar), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="basoftbaby-stok-hareketleri-${gun}.csv"`,
      "cache-control": "no-store",
    },
  });
}
