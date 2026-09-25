import "server-only";
import { db } from "@/server/veritabani";
import { alinanlariIsle } from "@/server/dogum-listesi";
import { puaniTazele } from "@/server/yorum";

/**
 * Deneme siparişlerini kalıcı olarak silme (K-163). Satışa başlamadan önce
 * denemek için verilen siparişler raporları, kâr hesabını, sipariş
 * numaralarını ve stoğu kirletiyordu.
 *
 * Sipariş satırıyla birlikte ödemeler, gönderiler, talepler, iadeler,
 * fatura, irsaliye ve değerlendirmeler de gidiyor (şemada `Cascade`).
 * Siparişin **yan etkileri geri alınıyor**, her sipariş kendi işleminde:
 *
 * - **Stok:** siparişin bütün stok hareketleri (satış, iptal, iade,
 *   değişim) ters çevriliyor ve hareketler siliniyor; net etki sıfırlanıyor.
 *   Hareket kaydından önceki eski siparişte (K-103) iptal edilmemişse
 *   satırların adedi stoğa ekleniyor.
 * - **Doğum listesi:** alınan adet, iade edilmemiş kısım kadar düşüyor.
 * - **Hediye çeki:** siparişte harcanıp geri verilmemiş tutar bakiyeye dönüyor.
 * - **Puanlar:** silinen değerlendirmelerin ürünlerinde yeniden hesaplanıyor.
 *
 * Sonunda sipariş, fatura ve irsaliye sayaçları kalan en büyük numaraya
 * çekiliyor: bütün deneme siparişleri silinince ilk gerçek sipariş
 * BA-…-0001 oluyor.
 *
 * Kampanya kullanım sayısı (yalnızca raporlama) ve tek kullanımlık kişisel
 * kupon geri alınmıyor.
 */

const SON_EK = /-(\d+)$/;

function sayac(numaralar: string[]): number {
  return numaralar.reduce((en, n) => Math.max(en, Number(SON_EK.exec(n)?.[1] ?? 0)), 0);
}

export async function siparisleriSil(
  numaralar: string[],
): Promise<{ silinen: string[]; bulunamayan: string[] }> {
  const silinen: string[] = [];
  const bulunamayan: string[] = [];
  const urunler = new Set<string>();

  for (const numara of [...new Set(numaralar)]) {
    const yapildi = await db.$transaction(async (islem) => {
      const s = await islem.order.findUnique({
        where: { numara },
        select: {
          id: true,
          numara: true,
          durum: true,
          giftCardId: true,
          satirlar: {
            select: {
              id: true,
              adet: true,
              variantId: true,
              giftListItemId: true,
              yorum: { select: { productId: true } },
            },
          },
          talepler: {
            where: { tur: "iade", durum: "tamamlandi" },
            select: { satirlar: { select: { orderItemId: true, adet: true } } },
          },
        },
      });
      if (!s) return false;
      const iptal = s.durum === "iptal";

      // Stok: hareketlerin net etkisi ters çevriliyor.
      const hareketler = await islem.stockMovement.findMany({
        where: { siparisNo: s.numara },
        select: { variantId: true, degisim: true },
      });
      const net = new Map<string, number>();
      if (hareketler.length > 0) {
        for (const h of hareketler) {
          if (h.variantId) net.set(h.variantId, (net.get(h.variantId) ?? 0) + h.degisim);
        }
      } else if (!iptal) {
        // Hareket kaydı olmayan eski sipariş: satılan adet geri.
        for (const x of s.satirlar) {
          if (x.variantId) net.set(x.variantId, (net.get(x.variantId) ?? 0) - x.adet);
        }
      }
      for (const [variantId, degisim] of net) {
        if (degisim !== 0) {
          await islem.productVariant.updateMany({
            where: { id: variantId },
            data: { stok: { increment: -degisim } },
          });
        }
      }
      await islem.stockMovement.deleteMany({ where: { siparisNo: s.numara } });

      // Doğum listesi: iptal edilmemişse iade edilmemiş kısım kadar düşüyor.
      if (!iptal) {
        const iade = new Map<string, number>();
        for (const t of s.talepler) {
          for (const x of t.satirlar)
            iade.set(x.orderItemId, (iade.get(x.orderItemId) ?? 0) + x.adet);
        }
        await alinanlariIsle(
          islem,
          s.satirlar.map((x) => ({
            giftListItemId: x.giftListItemId,
            adet: Math.max(0, x.adet - (iade.get(x.id) ?? 0)),
          })),
          -1,
        );
      }

      // Hediye çeki: harcanıp geri verilmemiş tutar bakiyeye.
      const kullanimlar = await islem.giftCardUse.findMany({
        where: { siparisNo: s.numara },
        select: { giftCardId: true, tutarKurus: true },
      });
      const cekNet = new Map<string, number>();
      for (const k of kullanimlar) {
        cekNet.set(k.giftCardId, (cekNet.get(k.giftCardId) ?? 0) + k.tutarKurus);
      }
      for (const [giftCardId, tutar] of cekNet) {
        if (tutar > 0) {
          await islem.giftCard.update({
            where: { id: giftCardId },
            data: { bakiyeKurus: { increment: tutar } },
          });
        }
      }
      await islem.giftCardUse.deleteMany({ where: { siparisNo: s.numara } });

      for (const x of s.satirlar) if (x.yorum) urunler.add(x.yorum.productId);
      await islem.order.delete({ where: { id: s.id } });
      return true;
    });
    (yapildi ? silinen : bulunamayan).push(numara);
  }

  for (const productId of urunler) await puaniTazele(productId);

  if (silinen.length > 0) {
    const [siparisler, faturalar, irsaliyeler] = await Promise.all([
      db.order.findMany({ select: { numara: true } }),
      db.invoice.findMany({ select: { numara: true } }),
      db.waybill.findMany({ select: { numara: true } }),
    ]);
    await db.storeSetting.updateMany({
      where: { id: "tek" },
      data: {
        sonSiparisNo: sayac(siparisler.map((x) => x.numara)),
        sonFaturaNo: sayac(faturalar.map((x) => x.numara)),
        sonIrsaliyeNo: sayac(irsaliyeler.map((x) => x.numara)),
      },
    });
  }

  return { silinen, bulunamayan };
}
