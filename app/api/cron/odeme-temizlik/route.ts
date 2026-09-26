import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/veritabani";
import {
  havaleHatirlatmalariniGonder,
  suresiDolanlariKapat,
} from "@/server/odeme-suresi";
import { eskiYuklemeleriTemizle } from "@/server/toplu-urun";
import { birakilanSepetleriHatirlat } from "@/server/sepet-hatirlatma";
import { favoriBildirimleriniGonder } from "@/server/favori-bildirimi";
import { sabahOzetiniGonder } from "@/server/sabah-ozeti";
import { yorumIstekleriniGonder } from "@/server/yorum-istegi";
import { listeBildirimleriniGonder } from "@/server/dogum-listesi";
import { buyumeHatirlatmalariniGonder } from "@/server/buyume";
import { tesvikleriGonder } from "@/server/tesvik";
import { davetOdulleriniVer } from "@/server/davet";
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
/**
 * İşler birbirinden bağımsız (K-165): eskiden biri hata verince sonrakilerin
 * hiçbiri çalışmıyordu — favori bildiriminde bir hata o günün sabah özetini
 * ve hatırlatmalarını da düşürüyordu. Hata günlüğe yazılıyor, sonuçta
 * "hata" olarak görünüyor, sıradaki iş çalışıyor.
 */
async function calistir<T>(ad: string, is: () => Promise<T>): Promise<T | "hata"> {
  try {
    return await is();
  } catch (hata) {
    console.error(`Zamanlanmış iş başarısız (${ad}):`, hata);
    return "hata";
  }
}

export async function GET(istek: NextRequest) {
  const sir = process.env.CRON_SECRET;
  if (sir && istek.headers.get("authorization") !== `Bearer ${sir}`) {
    return new NextResponse("Yetkisiz", { status: 401 });
  }

  // Yinelenen çalışma (K-166): Vercel çağrıyı yineleyebiliyor, uç elle de
  // çağrılabiliyor. İki çalışma üst üste binince hatırlatma, teşvik ve davet
  // işleri aynı müşteriye ikinci kez gidiyordu. 20 dakika içindeki ikinci
  // çağrı hiçbir şey yapmıyor; işaret koşullu, yalnızca bir çağrı alabiliyor.
  await db.storeSetting.upsert({ where: { id: "tek" }, create: { id: "tek" }, update: {} });
  const simdi = new Date();
  const kilit = await db.storeSetting.updateMany({
    where: {
      id: "tek",
      OR: [{ sonZamanliIs: null }, { sonZamanliIs: { lt: new Date(simdi.getTime() - 20 * 60_000) } }],
    },
    data: { sonZamanliIs: simdi },
  });
  if (kilit.count === 0) return NextResponse.json({ atlandi: "az önce çalıştı" });

  // Süresi dolan bekleyen siparişler: kartta dakikalar, havalede panelden
  // ayarlanan saat. Sipariş verilirken de fırsatçı olarak çalışıyor; burası
  // hiç sipariş gelmeyen günlerde de temizlensin diye (K-64).
  const temizlenen = await calistir("temizlenen", suresiDolanlariKapat);
  // Süresi dolmak üzere olan havale siparişlerine hatırlatma.
  const havaleHatirlatma = await calistir("havaleHatirlatma", havaleHatirlatmalariniGonder);
  // Onay ekranı için tutulan toplu yükleme kayıtları da burada süpürülüyor;
  // ayrı bir zamanlı iş açmaya değmez (Hobby paketinde günlük sınır var).
  const yukleme = await calistir("yukleme", eskiYuklemeleriTemizle);
  // Bırakılan sepet hatırlatması da burada: günde bir kez çalışması yeterli
  // ve Hobby paketinde ikinci bir zamanlı iş yok (K-27).
  const hatirlatma = await calistir("hatirlatma", birakilanSepetleriHatirlat);
  // Favorilerde indirim ya da yeniden stoğa giren beden (K-100).
  const favori = await calistir("favori", favoriBildirimleriniGonder);
  // Teslimden 5 gün sonra değerlendirme isteği, bir kez (K-141).
  const yorumIstegi = await calistir("yorumIstegi", yorumIstekleriniGonder);
  // Ödemesi alınan doğum listesi hediyeleri için liste sahibine haber (K-146).
  const listeHediyesi = await calistir("listeHediyesi", listeBildirimleriniGonder);
  // Bebek bir sonraki bedene geçmeden önce hatırlatma, beden başına bir kez (K-147).
  const buyume = await calistir("buyume", buyumeHatirlatmalariniGonder);
  // İlk siparişi teslim edilen üyeye kişiye özel ikinci sipariş kuponu (K-151).
  const tesvik = await calistir("tesvik", tesvikleriGonder);
  // Davet edilenin ilk siparişi cayma süresini geçince davet edene çek (K-152).
  const davet = await calistir("davet", davetOdulleriniVer);
  // Bir yıldır stoğa girmemiş ürünün bekleyen adresini tutmanın anlamı yok.
  const bildirim = await calistir("bildirim", eskiBildirimIsteklerimiTemizle);
  // Giriş sayaçları: sayaç için gereken şey adresin kendisi değil, aynı
  // yerden gelip gelmediği — bir gün sonra tutmanın anlamı yok (K-38).
  const girisSayaci = await calistir("girisSayaci", eskiGirisSayaclariniTemizle);
  // Süresi geçmiş panel oturumları ve harcanmış sıfırlama jetonları (K-48).
  const panel = await calistir("panel", eskiPanelKayitlariniTemizle);
  // Panel kullanıcılarına sabah özeti; en sonda, yukarıdaki temizlikten
  // sonraki durumu anlatsın (K-101). İş 03:00 UTC'de, Türkiye'de 06:00.
  const sabah = await calistir("sabah", sabahOzetiniGonder);
  return NextResponse.json({
    temizlenen,
    havaleHatirlatma,
    yukleme,
    hatirlatma,
    favori,
    yorumIstegi,
    listeHediyesi,
    buyume,
    tesvik,
    davet,
    bildirim,
    girisSayaci,
    panel,
    sabah,
  });
}
