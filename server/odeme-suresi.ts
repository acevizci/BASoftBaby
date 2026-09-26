import "server-only";
import { tahsilat } from "@/server/hediye-ceki-bicim";
import { db } from "@/server/veritabani";
import { kartSiparisiniSonuclandir, siparisiIptalEtVeStoguIadeEt } from "@/server/odeme-akis";
import { havaleHatirlatmaEpostasi } from "@/server/eposta";

/**
 * Ödenmeyi bekleyen siparişlerin süresi.
 *
 * **Bulunan sorun.** Sipariş oluşturulurken stok hemen düşülüyor — doğrusu
 * bu, yoksa aynı son adedi iki kişi alır. Ama bekleyen siparişleri temizleyen
 * iş, siparişleri `Payment` kaydı üzerinden buluyordu ve `Payment` kaydı
 * yalnızca **kart** akışında oluşuyor. Yani havale siparişleri temizliğe hiç
 * girmiyordu: biri havaleyle sipariş verip parayı hiç göndermezse o stok,
 * mağaza sahibi fark edip elle iptal edene kadar kilitli kalıyordu. Havale
 * şu an tek ödeme yöntemi olduğu için bu istisna değil, varsayılan
 * durumdu (K-64).
 *
 * **İkinci katman:** temizlik işi Vercel'de günde bir kez çalışıyor (Hobby
 * paketinde ikinci bir zamanlı iş yok, K-27). Yani karttaki "30 dakika"
 * politikası pratikte 24 saate kadar çıkabiliyordu. Çözüm sıklığı artırmak
 * değil — paket buna izin vermiyor — **fırsatçı temizlik**: sipariş
 * verilmeden hemen önce süresi dolanlar kapatılıyor. Ucuz bir sorgu
 * (`durum` ve `olusturuldu` üzerinden dizinli) ve tam da stoğun önemli
 * olduğu anda çalışıyor.
 *
 * **Süre panelden ayarlanıyor.** Havalede varsayılan 72 saat: hafta sonuna
 * denk gelen bir siparişin parası pazartesi yatabiliyor. Sıfır verilirse
 * otomatik iptal kapanıyor — mağaza sahibi elle yönetmek isteyebilir.
 */

/** Kart ödemesi yarım kalınca stoğun bekleyeceği süre. */
export const KART_DAKIKA = 30;

export type SureAyari = { havaleSaat: number; hatirlatmaSaat: number };

export async function sureAyari(): Promise<SureAyari> {
  const ayar = await db.storeSetting.findUnique({
    where: { id: "tek" },
    select: { havaleSaat: true, havaleHatirlatmaSaat: true },
  });
  return {
    havaleSaat: ayar?.havaleSaat ?? 72,
    hatirlatmaSaat: ayar?.havaleHatirlatmaSaat ?? 24,
  };
}

/**
 * Süresi dolmuş bekleyen siparişleri iptal eder, stoğu geri verir.
 *
 * Kart ve havale ayrı ele alınıyor çünkü süreleri farklı: kartta yarım kalan
 * bir ödeme dakikalar içinde ölü sayılıyor, havalede günler tanınıyor.
 *
 * Dönen sayı iptal edilen sipariş adedi.
 */
export async function suresiDolanlariKapat(simdi: Date = new Date()): Promise<number> {
  const { havaleSaat } = await sureAyari();

  const kartSiniri = new Date(simdi.getTime() - KART_DAKIKA * 60_000);
  const kosullar: { odemeYontemi: string; olusturuldu: { lt: Date } }[] = [
    { odemeYontemi: "kart", olusturuldu: { lt: kartSiniri } },
  ];

  // Sıfır "otomatik iptal kapalı" demek.
  if (havaleSaat > 0) {
    kosullar.push({
      odemeYontemi: "havale",
      olusturuldu: { lt: new Date(simdi.getTime() - havaleSaat * 3_600_000) },
    });
  }

  const dolanlar = await db.order.findMany({
    where: {
      durum: "bekliyor",
      odemeDurumu: "bekliyor",
      OR: kosullar,
    },
    select: { id: true, odemeYontemi: true },
    take: 200,
  });

  // Kart siparişi iyzico'ya sorulmadan iptal edilmiyor: ödeme süre dolduktan
  // sonra tamamlanmış olabilir (K-165).
  let kapanan = 0;
  for (const s of dolanlar) {
    if (s.odemeYontemi === "kart") {
      if (await kartSiparisiniSonuclandir(s.id)) kapanan++;
    } else {
      await siparisiIptalEtVeStoguIadeEt(s.id);
      kapanan++;
    }
  }

  return kapanan;
}

/**
 * Süresi dolmak üzere olan havale siparişlerine hatırlatma gönderir.
 *
 * Bir kez gönderiliyor: `hatirlatildi` damgası bırakılıyor. İkinci e-posta
 * ısrar olurdu — aynı kural bırakılan sepet hatırlatmasında da var (K-27).
 */
export async function havaleHatirlatmalariniGonder(simdi: Date = new Date()): Promise<number> {
  const { havaleSaat, hatirlatmaSaat } = await sureAyari();
  if (havaleSaat <= 0 || hatirlatmaSaat <= 0) return 0;

  // Süresi `hatirlatmaSaat` içinde dolacaklar: yani yeterince beklemiş ama
  // henüz iptal olmamış olanlar.
  const enEski = new Date(simdi.getTime() - havaleSaat * 3_600_000);
  const esik = new Date(simdi.getTime() - (havaleSaat - hatirlatmaSaat) * 3_600_000);

  const siparisler = await db.order.findMany({
    where: {
      durum: "bekliyor",
      odemeDurumu: "bekliyor",
      odemeYontemi: "havale",
      hatirlatildi: null,
      olusturuldu: { lt: esik, gte: enEski },
    },
    select: {
      id: true,
      numara: true,
      adSoyad: true,
      eposta: true,
      toplamKurus: true,
      hediyeCekiKurus: true,
      olusturuldu: true,
    },
    take: 100,
  });

  for (const s of siparisler) {
    const sonTarih = new Date(s.olusturuldu.getTime() + havaleSaat * 3_600_000);
    await havaleHatirlatmaEpostasi(s.eposta, {
      numara: s.numara,
      adSoyad: s.adSoyad,
      // Havaleyle yatırılacak kısım: hediye çeki düşülmüş (K-137).
      toplamKurus: tahsilat(s),
      sonTarih,
    });
    await db.order.update({ where: { id: s.id }, data: { hatirlatildi: simdi } });
  }

  return siparisler.length;
}

/**
 * Siparişin ödeme süresinin bitiş anı; panelde gösteriliyor.
 *
 * Bekleyen havale siparişi dışında anlamı yok.
 */
export function odemeSonTarihi(
  siparis: { durum: string; odemeDurumu: string; odemeYontemi: string; olusturuldu: Date },
  havaleSaat: number,
): Date | undefined {
  if (havaleSaat <= 0) return undefined;
  if (siparis.odemeYontemi !== "havale") return undefined;
  if (siparis.durum !== "bekliyor" || siparis.odemeDurumu !== "bekliyor") return undefined;
  return new Date(siparis.olusturuldu.getTime() + havaleSaat * 3_600_000);
}
