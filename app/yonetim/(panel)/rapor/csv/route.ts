import { NextResponse, type NextRequest } from "next/server";
import { donemCoz, gunYaz, raporCsv } from "@/server/rapor";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

/**
 * Raporun satır satır dökümü.
 *
 * Her sipariş satırı ayrı bir satır: muhasebeye giderken ya da tabloda
 * çalışırken toplamlar değil kalemler gerekiyor. Noktalı virgül ve BOM,
 * Türkçe Excel'in dosyayı çift tıklayınca doğru açması için.
 *
 * **Oturum kontrolünü kendi yapıyor.** Route handler'lar düzenden geçmiyor,
 * yani `(panel)/layout.tsx`'teki kontrol buraya uğramıyor; olmasaydı rapor
 * dökümü panele girmeden indirilebilirdi (K-45).
 */
export const dynamic = "force-dynamic";

export async function GET(istek: NextRequest): Promise<NextResponse> {
  await yoneticiGerekli();

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
