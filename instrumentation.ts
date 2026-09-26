import type { Instrumentation } from "next";

/**
 * Sunucunun saat dilimi İstanbul (K-165). Vercel'de süreç UTC çalışıyor ve
 * `TZ` ortam değişkeni orada ayrılmış, panelden verilemiyor. Oysa kod
 * günü, ayı ve yılı sunucunun yerel saatiyle hesaplıyor: "bugünün
 * siparişleri" İstanbul'da 03:00'te başlıyordu, gece yarısından sonraki üç
 * saat önceki güne yazılıyordu; 1 Ocak'ın ilk saatlerinde açılan sipariş
 * geçen yılın numarasını alıyordu. Node çalışırken `TZ` değişince saat
 * dilimini yeniden okuyor.
 */
export function register(): void {
  process.env.TZ = "Europe/Istanbul";
}

/**
 * Sunucuda yakalanmamış her hata buraya düşüyor (K-121): sayfa çizimi,
 * server action, API ucu. Next.js yönlendirme ve 404'ü (`redirect`,
 * `notFound`) hata saymıyor, buraya getirmiyor.
 *
 * Kayıt modülü yalnızca Node ortamında yükleniyor; Edge'de Prisma yok.
 */
export const onRequestError: Instrumentation.onRequestError = async (hata, istek, baglam) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { hataKaydet } = await import("./server/hata-kaydi");
  const h = hata instanceof Error ? hata : new Error(String(hata));
  const ozet = (h as Error & { digest?: unknown }).digest;
  await hataKaydet({
    kaynak: "sunucu",
    mesaj: `${h.name}: ${h.message}`,
    yigin: h.stack ?? "",
    // Form gönderimi (server action) ayrıca belirtiliyor: aynı adreste
    // sayfa çizimi mi patladı, gönderilen form mu, ayırt edilebilsin.
    adres: baglam.routeType === "action" ? `${istek.path} (form)` : istek.path,
    ozet: typeof ozet === "string" ? ozet : "",
  });
};
