import { NextResponse, type NextRequest } from "next/server";

/**
 * Panel isteklerinin ön kapısı.
 *
 * **Kimlik burada doğrulanmıyor.** Middleware Edge çalışma ortamında
 * çalışıyor; orada veritabanı bağlantısı yok, yani oturumun gerçekten
 * geçerli olup olmadığı burada bilinemiyor. Bu yüzden burada yalnızca iki iş
 * yapılıyor:
 *
 * 1. Çerez **hiç yoksa** giriş sayfasına yollamak (giriş ve şifre sıfırlama
 *    sayfaları hariç). Bu bir güvenlik önlemi değil, kullanıcıyı boşuna
 *    sayfa yüklemekten kurtaran bir kestirme.
 * Eskiden açık sayfanın yolunu da başlıkla geçiriyordu; menü onu okuyordu
 * (K-43). Çalışmıyordu — düzen istemci tarafı gezinmede yeniden çizilmediği
 * için yol ilk açılışta donuyordu. Menü artık `usePathname()` kullanıyor,
 * başlık kaldırıldı (K-51).
 *
 * Asıl kontrol `/yonetim` altındaki her sayfada, her route handler'da ve
 * her server action'da, veritabanına bakarak yapılıyor. Sahte bir çerez
 * buradan geçer, orada reddedilir (K-45).
 */

export const config = { matcher: "/yonetim/:path*" };

const CEREZ = "yonetim_oturum";

/**
 * Oturum gerektirmeyen panel sayfaları.
 *
 * Kendini koruyan bir giriş sayfası sonsuz yönlendirme olurdu; şifre
 * sıfırlama da tanımı gereği giriş yapamayan biri için (K-47).
 */
const ACIK_YOLLAR = [
  "/yonetim/giris",
  "/yonetim/sifremi-unuttum",
  "/yonetim/sifre-sifirla",
];

export function middleware(istek: NextRequest) {
  const yol = istek.nextUrl.pathname;

  if (!ACIK_YOLLAR.includes(yol) && !istek.cookies.has(CEREZ)) {
    const adres = istek.nextUrl.clone();
    adres.pathname = "/yonetim/giris";
    adres.search = "";
    adres.searchParams.set("nereye", yol);
    return NextResponse.redirect(adres);
  }

  return NextResponse.next();
}
