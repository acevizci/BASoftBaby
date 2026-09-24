import { indexNowAnahtari } from "@/server/arama-motoru";

/**
 * IndexNow anahtar dosyası (K-129): Bing ve Yandex bildirimi yapanın
 * sitenin sahibi olduğunu bu dosyadaki anahtarla doğruluyor.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return new Response(await indexNowAnahtari(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
