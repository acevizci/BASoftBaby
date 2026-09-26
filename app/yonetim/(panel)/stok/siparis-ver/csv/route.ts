import { NextResponse, type NextRequest } from "next/server";
import { listeCsv, siparisListesi } from "@/server/satis-hizi";
import { renkAdlari } from "@/server/renkler";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { hedefCoz } from "../hedef";

/** Sipariş listesi dökümü, tedarikçiye gönderilecek (K-106). Oturumu kendi soruyor (K-45). */
export const dynamic = "force-dynamic";

export async function GET(istek: NextRequest): Promise<NextResponse> {
  await yoneticiGerekli();
  const hedef = hedefCoz(istek.nextUrl.searchParams.get("hedef"));
  const [satirlar, adlar] = await Promise.all([siparisListesi(hedef), renkAdlari()]);
  const gun = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  return new NextResponse(listeCsv(satirlar, adlar, hedef), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="basoftbaby-siparis-listesi-${gun}.csv"`,
      "cache-control": "no-store",
    },
  });
}
