import { NextResponse, type NextRequest } from "next/server";
import { suresiGecenOdemeleriTemizle } from "@/server/odeme-akis";
import { eskiYuklemeleriTemizle } from "@/server/toplu-urun";

/**
 * Günlük temizlik: yarıda kalan kart ödemeleri ve eski toplu yükleme kayıtları.
 *
 * Ödeme ekranını kapatan müşterinin siparişi "ödeme bekliyor" durumunda kalıp
 * stoğu tutuyor. Bu uç 30 dakikayı geçen girişimleri iptal edip stoğu geri
 * veriyor (mimarideki 04. karar). Vercel bunu `vercel.json`daki takvime göre
 * çağırıyor.
 *
 * `CRON_SECRET` tanımlıysa Vercel çağrılarında `Authorization` başlığıyla
 * geliyor ve burada aranıyor: uç herkese açık olduğundan, sırrı bilmeyen
 * çağrı iş yapmadan dönüyor.
 */
export async function GET(istek: NextRequest) {
  const sir = process.env.CRON_SECRET;
  if (sir && istek.headers.get("authorization") !== `Bearer ${sir}`) {
    return new NextResponse("Yetkisiz", { status: 401 });
  }

  const temizlenen = await suresiGecenOdemeleriTemizle();
  // Onay ekranı için tutulan toplu yükleme kayıtları da burada süpürülüyor;
  // ayrı bir zamanlı iş açmaya değmez (Hobby paketinde günlük sınır var).
  const yukleme = await eskiYuklemeleriTemizle();
  return NextResponse.json({ temizlenen, yukleme });
}
