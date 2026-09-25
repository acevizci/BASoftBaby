import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { DAVET_CEREZI, davetAyari, davetEdeniBul } from "@/server/davet";

/**
 * Davet bağlantısı (K-152): kodu 30 günlük çereze yazıp kayıt sayfasına
 * gönderiyor; üye olunca davet edene bağlanıyor. Program kapalıysa ya da kod
 * geçersizse ana sayfaya.
 */
export async function GET(istek: NextRequest, { params }: { params: Promise<{ kod: string }> }) {
  const { kod } = await params;
  const temiz = kod.toLowerCase();
  const acik = (await davetAyari()).odulKurus > 0;
  const eden = acik ? await davetEdeniBul(temiz) : undefined;
  if (!eden) return NextResponse.redirect(new URL("/", istek.url));

  (await cookies()).set(DAVET_CEREZI, temiz, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.redirect(new URL("/kayit?davet=1", istek.url));
}
