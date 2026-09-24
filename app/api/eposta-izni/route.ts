import { NextResponse, type NextRequest } from "next/server";
import { jetonHarca } from "@/server/uyelik";
import { pazarlamaIzniniKapat } from "@/server/sepet-hatirlatma";

/**
 * Tek tıkla listeden çıkma (RFC 8058, K-125).
 *
 * E-bültenin `List-Unsubscribe` başlığı buraya işaret ediyor: Gmail ve
 * Yahoo gelen kutusunda "Aboneliği iptal et" düğmesi gösteriyor, basılınca
 * bu adrese POST atıyor. 2024'ten beri toplu gönderenlerden bunu istiyorlar;
 * yoksa e-postalar spama düşüyor.
 *
 * GET ile açılırsa (bazı istemciler başlıktaki adresi tarayıcıda açıyor)
 * çıkış sayfasına yönlendiriyor; iş orada yapılıyor.
 */
export async function POST(istek: NextRequest): Promise<NextResponse> {
  const jeton = istek.nextUrl.searchParams.get("jeton") ?? "";
  const kayit = await jetonHarca(jeton, "pazarlama-iptal");
  if (kayit) await pazarlamaIzniniKapat(kayit.customerId);
  // Jeton geçersiz olsa da 200: istemci yeniden denemesin, adres sızmasın.
  return new NextResponse(null, { status: 200 });
}

export function GET(istek: NextRequest): NextResponse {
  const jeton = istek.nextUrl.searchParams.get("jeton") ?? "";
  return NextResponse.redirect(new URL(`/eposta-izni?jeton=${encodeURIComponent(jeton)}`, istek.url), 303);
}
