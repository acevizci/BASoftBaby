import { NextResponse, type NextRequest } from "next/server";
import { pencereCoz, satmayanCsv, satmayanlar } from "@/server/satmayan";
import { renkAdlari } from "@/server/renkler";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

/** Satmayan stok dökümü (K-108). Oturumu kendi soruyor (K-45). */
export const dynamic = "force-dynamic";

export async function GET(istek: NextRequest): Promise<NextResponse> {
  await yoneticiGerekli();
  const gun = pencereCoz(istek.nextUrl.searchParams.get("gun"));
  const [rapor, adlar] = await Promise.all([satmayanlar(gun), renkAdlari()]);
  return new NextResponse(satmayanCsv(rapor, adlar), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="basoftbaby-satmayan-stok-${gun}-gun.csv"`,
      "cache-control": "no-store",
    },
  });
}
