import { NextResponse } from "next/server";
import { db } from "@/server/veritabani";

/**
 * Uyanık tutma ucu.
 *
 * İki şey uyuyor ve ikisinin de uyanması pahalı:
 *
 * - **Sunucu işlevi.** Bir süre istek gelmezse Vercel örneği kapatıyor;
 *   sonraki ziyaretçi Next.js'in açılışını bekliyor.
 * - **Neon.** Kullanılmayan veritabanını uyutuyor; uyanması saniye alıyor.
 *
 * Az ziyaretçili bir mağazada gelen her müşteri neredeyse her seferinde bu
 * bedeli ödüyor — ölçülen 1,26 saniyelik ilk açılışın kaynağı bu. Bu uç
 * dışarıdan birkaç dakikada bir çağrıldığında ikisi de uyanık kalıyor.
 *
 * Sorgu kasten en ucuzu: `select 1`. Uç herkese açık ama yaptığı iş bir
 * satırlık; sır ya da veri döndürmüyor.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const basla = performance.now();
  let veritabani = false;

  try {
    await db.$queryRaw`select 1`;
    veritabani = true;
  } catch {
    // Uyanık tutma ucu veritabanı yüzünden hata vermiyor: izleme servisi
    // siteyi "çökmüş" saymasın. Durum cevabın içinde yazıyor.
  }

  return NextResponse.json(
    { tamam: true, veritabani, ms: Math.round(performance.now() - basla) },
    { headers: { "cache-control": "no-store" } },
  );
}
