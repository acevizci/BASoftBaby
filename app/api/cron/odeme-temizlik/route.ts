import { NextResponse, type NextRequest } from "next/server";
import { suresiGecenOdemeleriTemizle } from "@/server/odeme-akis";
import { eskiYuklemeleriTemizle } from "@/server/toplu-urun";
import { birakilanSepetleriHatirlat } from "@/server/sepet-hatirlatma";
import { eskiBildirimIsteklerimiTemizle } from "@/server/stok-bildirimi";
import { eskiGirisSayaclariniTemizle } from "@/server/giris-sinir";
import { eskiPanelKayitlariniTemizle } from "@/server/yonetim-kimlik";

/**
 * Günlük iş: yarıda kalan kart ödemeleri, eski toplu yükleme kayıtları ve
 * bırakılan sepet hatırlatmaları.
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
  // Bırakılan sepet hatırlatması da burada: günde bir kez çalışması yeterli
  // ve Hobby paketinde ikinci bir zamanlı iş yok (K-27).
  const hatirlatma = await birakilanSepetleriHatirlat();
  // Bir yıldır stoğa girmemiş ürünün bekleyen adresini tutmanın anlamı yok.
  const bildirim = await eskiBildirimIsteklerimiTemizle();
  // Giriş sayaçları: sayaç için gereken şey adresin kendisi değil, aynı
  // yerden gelip gelmediği — bir gün sonra tutmanın anlamı yok (K-38).
  const girisSayaci = await eskiGirisSayaclariniTemizle();
  // Süresi geçmiş panel oturumları ve harcanmış sıfırlama jetonları (K-48).
  const panel = await eskiPanelKayitlariniTemizle();
  return NextResponse.json({ temizlenen, yukleme, hatirlatma, bildirim, girisSayaci, panel });
}
