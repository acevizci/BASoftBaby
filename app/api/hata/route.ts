import { NextResponse, type NextRequest } from "next/server";
import { hataKaydet } from "@/server/hata-kaydi";
import { gurultuMu, SINIR } from "@/server/hata-bicim";
import { islemSinirla } from "@/server/istek-siniri";

/**
 * Tarayıcıda olan hatanın bildirimi (K-121). `ui/hata-dinleyici.tsx` ve hata
 * ekranı `sendBeacon` ile gönderiyor; cevap beklenmiyor, hep 204.
 *
 * Herkese açık bir uç olduğu için:
 * - yalnızca kendi sayfalarımızdan (`Origin` bizim alan adımız),
 * - gövde en çok 8 KB,
 * - adres başına saatte 20 bildirim (K-64'teki sayaç),
 * - tarayıcı eklentilerinin ve ağ kesintisinin hataları atılıyor.
 */
export const dynamic = "force-dynamic";

const bos = () => new NextResponse(null, { status: 204 });

function metin(v: unknown, sinir: number): string {
  return typeof v === "string" ? v.slice(0, sinir) : "";
}

export async function POST(istek: NextRequest): Promise<NextResponse> {
  // Bazı tarayıcılar "Origin: null" gönderiyor; `new URL` onda hata atıyor,
  // uç 500 dönüp hata kaydına kendi hatasını yazıyordu (K-165).
  const koken = istek.headers.get("origin");
  let kokenHost: string | undefined;
  try {
    kokenHost = koken ? new URL(koken).host : undefined;
  } catch {
    kokenHost = undefined;
  }
  if (!kokenHost || kokenHost !== istek.nextUrl.host) return bos();

  const ham = await istek.text();
  if (ham.length > 8_000) return bos();
  let veri: Record<string, unknown>;
  try {
    veri = JSON.parse(ham);
  } catch {
    return bos();
  }

  const mesaj = metin(veri.mesaj, SINIR.mesaj);
  if (!mesaj || gurultuMu(mesaj)) return bos();
  if (!(await islemSinirla("hata")).izin) return bos();

  await hataKaydet({
    kaynak: "tarayici",
    mesaj,
    yigin: metin(veri.yigin, SINIR.yigin),
    adres: metin(veri.adres, SINIR.adres),
    ozet: metin(veri.ozet, SINIR.ozet),
  });
  return bos();
}
