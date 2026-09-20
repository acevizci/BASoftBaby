import { NextResponse, type NextRequest } from "next/server";

/**
 * Yönetim panelini korur.
 *
 * Şifre `YONETIM_SIFRE` ortam değişkeninde durur, koda yazılmaz. Değişken
 * tanımlı değilse panel hiç açılmaz — sayfa yokmuş gibi davranır. Böylece
 * ayar unutulursa panel açıkta kalmaz; yanlış tarafa düşen hata güvenli
 * tarafa düşer.
 *
 * Tarayıcının kendi şifre kutusunu kullanıyoruz (HTTP Basic). Müşteri üyeliği
 * (server/uyelik.ts) buraya karışmıyor: o mağaza tarafının kimliği, burası
 * mağaza sahibinin. Panel, yönetici rolleri gelene kadar şifreyle duruyor.
 */

export const config = { matcher: "/yonetim/:path*" };

export function middleware(istek: NextRequest) {
  const sifre = process.env.YONETIM_SIFRE;

  if (!sifre) {
    return new NextResponse(null, { status: 404 });
  }

  const baslik = istek.headers.get("authorization");
  if (baslik?.startsWith("Basic ")) {
    const cozulmus = atob(baslik.slice(6));
    const verilen = cozulmus.slice(cozulmus.indexOf(":") + 1);
    if (esitMi(verilen, sifre)) return NextResponse.next();
  }

  return new NextResponse("Yönetim paneli", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="BASoftBaby yonetim"' },
  });
}

/**
 * Sabit süreli karşılaştırma: yanlış şifrenin kaçıncı harfte tutmadığı
 * cevabın gelme süresinden anlaşılmasın.
 */
function esitMi(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}
