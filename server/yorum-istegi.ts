import "server-only";
import { db } from "@/server/veritabani";
import { yorumIstegiEpostasi, type EpostaSonucu } from "@/server/eposta";
import { renkAdlari } from "@/server/renkler";

/**
 * Teslimden sonra değerlendirme isteği (K-141).
 *
 * Teslimden **5 gün** sonra: ürün yıkanmış, giyilmiş, beden belli olmuş olsun.
 * **30 günden** eski teslimlere gönderilmiyor; o kadar sonra gelen istek
 * hatırlanmaz, rahatsız eder. Değerlendirilecek ürünü kalmamış siparişe de
 * gitmiyor (hepsini zaten değerlendirmiş ya da ürünler silinmiş).
 *
 * Gönderilemeyen (e-posta servisi kapalı, geçici hata) işaretlenmiyor: ertesi
 * gün yeniden deneniyor, pencere kapanana kadar.
 */

export const BEKLEME_GUN = 5;
export const EN_COK_GUN = 30;

type Gonderici = typeof yorumIstegiEpostasi;

export async function yorumIstekleriniGonder(
  gonder: Gonderici = yorumIstegiEpostasi,
  simdi: Date = new Date(),
): Promise<{ bakilan: number; gonderilen: number }> {
  const gun = 24 * 60 * 60 * 1000;
  const siparisler = await db.order.findMany({
    where: {
      durum: "teslim",
      yorumIstendi: null,
      teslimTarihi: {
        lte: new Date(simdi.getTime() - BEKLEME_GUN * gun),
        gte: new Date(simdi.getTime() - EN_COK_GUN * gun),
      },
    },
    select: {
      id: true,
      numara: true,
      adSoyad: true,
      eposta: true,
      satirlar: {
        orderBy: { id: "asc" },
        select: {
          urunAd: true,
          beden: true,
          renk: true,
          yorum: { select: { id: true } },
          variant: { select: { productId: true } },
        },
      },
    },
    orderBy: { teslimTarihi: "asc" },
    take: 100,
  });

  const adlar = await renkAdlari();
  let gonderilen = 0;
  for (const s of siparisler) {
    const bekleyen = s.satirlar.filter((x) => !x.yorum && x.variant?.productId);
    if (bekleyen.length === 0) {
      // Değerlendirecek bir şey kalmamış: bir daha bakılmasın.
      await db.order.update({ where: { id: s.id }, data: { yorumIstendi: simdi } });
      continue;
    }
    const sonuc: EpostaSonucu = await gonder(s.eposta, {
      numara: s.numara,
      adSoyad: s.adSoyad,
      urunler: bekleyen.map((x) => `${x.urunAd} (${x.beden}, ${adlar[x.renk] ?? x.renk})`),
    });
    if (!sonuc.gonderildi) continue;
    await db.order.update({ where: { id: s.id }, data: { yorumIstendi: simdi } });
    gonderilen += 1;
  }
  return { bakilan: siparisler.length, gonderilen };
}
