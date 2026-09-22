import "server-only";

/**
 * "Stoka girince haber ver".
 *
 * Tükenmiş bir beden-renk gören müşteri adresini bırakıyor; o birleşim yeniden
 * stoğa girdiğinde tek bir e-posta gidiyor.
 *
 * **Pazarlama izni aranmıyor** — sepet hatırlatmasının tersine (K-27). Bu ileti
 * müşterinin kendi isteği üzerine, istediği tek bir olay için gönderiliyor;
 * tanıtım değil, sorulan sorunun cevabı. Bu yüzden de tek seferlik: bildirim
 * gittikten sonra kayıt siliniyor, adres elimizde kalmıyor.
 *
 * Bildirim, stoğun arttığı her yerden tetikleniyor: panelden stok girişi,
 * varyant ekleme, Excel'den toplu yükleme ve iptal olan siparişin stoğu geri
 * vermesi. Tek bir kapıdan geçmesi için hepsi aynı işlevi çağırıyor.
 */

import { db } from "@/server/veritabani";
import { stokBildirimEpostasi } from "@/server/eposta";
import { renkAdlari } from "@/server/renkler";

/** Aynı adres aynı varyanta iki kez yazılmıyor; ikinci istek sessizce geçiyor. */
export async function bildirimIste(variantId: string, eposta: string): Promise<boolean> {
  const varyant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, stok: true },
  });
  if (!varyant) return false;

  // Zaten stokta olan bir şey için bildirim beklemek anlamsız.
  if (varyant.stok > 0) return false;

  await db.stockAlert.upsert({
    where: { variantId_eposta: { variantId, eposta } },
    update: {},
    create: { variantId, eposta },
  });
  return true;
}

/**
 * Verilen varyantlardan stoğa girmiş olanların bekleyenlerine haber verir.
 *
 * Stok yazan her yerden çağrılıyor. Gönderilemeyen kayıt silinmiyor: stok bir
 * daha değiştiğinde yeniden denenecek.
 */
export async function stokBildirimleriniGonder(variantIdler: string[]): Promise<number> {
  if (variantIdler.length === 0) return 0;

  const bekleyenler = await db.stockAlert.findMany({
    where: { variantId: { in: variantIdler }, variant: { stok: { gt: 0 } } },
    select: {
      id: true,
      eposta: true,
      variant: {
        select: {
          beden: true,
          renk: true,
          stok: true,
          product: { select: { ad: true, slug: true } },
        },
      },
    },
    take: 500,
  });

  let gonderilen = 0;

  const adlar = await renkAdlari();
  for (const kayit of bekleyenler) {
    const v = kayit.variant;
    const sonuc = await stokBildirimEpostasi(kayit.eposta, {
      urunAd: v.product.ad,
      slug: v.product.slug,
      beden: v.beden,
      renk: adlar[v.renk] ?? v.renk,
    });
    if (!sonuc.gonderildi) continue;

    // Adres yalnızca bu bildirim için tutuluyordu; haber verildi, siliniyor.
    await db.stockAlert.delete({ where: { id: kayit.id } });
    gonderilen += 1;
  }

  return gonderilen;
}

/**
 * Yılı aşan istekleri siler.
 *
 * Bir yıl stoğa girmemiş ürün için bekleyen adresi tutmanın anlamı yok;
 * isteyen yeniden bırakır.
 */
export async function eskiBildirimIsteklerimiTemizle(): Promise<number> {
  const sinir = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const { count } = await db.stockAlert.deleteMany({
    where: { olusturuldu: { lt: sinir } },
  });
  return count;
}
