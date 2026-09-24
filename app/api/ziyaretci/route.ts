import { NextResponse } from "next/server";
import { favoriIdleri } from "@/server/favori";
import { sepetAdedi } from "@/server/sepet";

/**
 * Ziyaretçiye özel üst çubuk bilgisi (K-131): giriş durumu, sepetteki adet,
 * favoriler.
 *
 * Bunlar eskiden mağaza düzeninde okunuyordu ve düzen çerez okuduğu için
 * **bütün** mağaza sayfaları her istekte baştan çiziliyordu; ana sayfa bile
 * önbellekten verilemiyordu. Artık düzen herkes için aynı, bu kısım
 * tarayıcıdan bu uçla dolduruluyor.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const [favoriler, adet] = await Promise.all([favoriIdleri(), sepetAdedi()]);
  return NextResponse.json(
    { girisli: favoriler !== null, sepetAdedi: adet, favoriler: favoriler ?? [] },
    { headers: { "cache-control": "private, no-store" } },
  );
}
