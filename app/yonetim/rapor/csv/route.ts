import { NextResponse, type NextRequest } from "next/server";
import { donemCoz, gunYaz, raporCsv } from "@/server/rapor";

/**
 * Raporun satır satır dökümü.
 *
 * Her sipariş satırı ayrı bir satır: muhasebeye giderken ya da tabloda
 * çalışırken toplamlar değil kalemler gerekiyor. Noktalı virgül ve BOM,
 * Türkçe Excel'in dosyayı çift tıklayınca doğru açması için.
 *
 * Panelin altında olduğu için şifreyle korunuyor.
 */
export const dynamic = "force-dynamic";

export async function GET(istek: NextRequest): Promise<NextResponse> {
  const p = istek.nextUrl.searchParams;
  const donem = donemCoz(Object.fromEntries(p.entries()));
  const csv = await raporCsv(donem);

  const bitisGunu = new Date(donem.bitis.getTime() - 86_400_000);
  const ad = `basoftbaby-satis-${gunYaz(donem.baslangic)}_${gunYaz(bitisGunu)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${ad}"`,
      "cache-control": "no-store",
    },
  });
}
