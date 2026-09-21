import "server-only";
import { db } from "@/server/veritabani";

/**
 * Sevk irsaliyesi.
 *
 * **Faturadan ayrı bir belge ve ayrı bir işi var.** Fatura satışın belgesi,
 * muhasebeye gider; irsaliye malın belgesi, kutunun yanında gider. Malın
 * kimden kime, ne zaman fiilen sevk edildiğini gösteriyor (K-59).
 *
 * **Fiyat taşımıyor.** Zorunlu olmadığı gibi, taşımaması daha doğru: kutuyu
 * açan kargo görevlisinin ya da hediye alıcısının tutarı görmesi gerekmiyor.
 * Bebek kıyafetinde hediye siparişi az değil.
 *
 * Zorunlu alanlar: kendi seri-sıra numarası (faturadan ayrı seri), düzenleme
 * tarih-saati ve **fiili sevk tarih-saati**. Son ikisi farklı olabiliyor:
 * akşam hazırlanıp sabah kargoya verilen paket. Sevk anı boşken belge
 * "henüz sevk edilmedi" diyor; kargo kaydedilince doluyor.
 *
 * Numara sayacı faturadaki gibi tek işlem içinde artıyor: aynı anda iki
 * irsaliye kesilse bile numaralar çakışmıyor.
 */

export type Irsaliye = {
  numara: string;
  tarih: Date;
  sevk: Date | null;
  tasiyici: string;
  takipNo: string;
};

/** BA-I-2026-0001 */
function numaraYaz(sayac: number, tarih: Date): string {
  return `BA-I-${tarih.getFullYear()}-${String(sayac).padStart(4, "0")}`;
}

export async function irsaliyeGetir(numara: string): Promise<Irsaliye | undefined> {
  const kayit = await db.waybill.findFirst({
    where: { order: { numara: numara.trim().toUpperCase() } },
    select: { numara: true, tarih: true, sevk: true, tasiyici: true, takipNo: true },
  });
  return kayit ?? undefined;
}

/** Siparişin irsaliyesini oluşturur; zaten varsa var olanı döndürür. */
export async function irsaliyeOlustur(numara: string): Promise<Irsaliye | undefined> {
  const temiz = numara.trim().toUpperCase();
  const siparis = await db.order.findUnique({
    where: { numara: temiz },
    select: {
      id: true,
      gonderiler: {
        orderBy: { olusturuldu: "desc" },
        take: 1,
        select: { tasiyici: true, takipNo: true, olusturuldu: true },
      },
    },
  });
  if (!siparis) return undefined;

  const varOlan = await irsaliyeGetir(temiz);
  if (varOlan) return varOlan;

  const gonderi = siparis.gonderiler[0];
  const simdi = new Date();

  return db.$transaction(async (islem) => {
    const ayar = await islem.storeSetting.upsert({
      where: { id: "tek" },
      update: { sonIrsaliyeNo: { increment: 1 } },
      create: { id: "tek", sonIrsaliyeNo: 1 },
      select: { sonIrsaliyeNo: true },
    });

    return islem.waybill.create({
      data: {
        orderId: siparis.id,
        numara: numaraYaz(ayar.sonIrsaliyeNo, simdi),
        tarih: simdi,
        // Kargo kaydı varsa mal çıkmış demektir; sevk anı o kaydın açıldığı an.
        sevk: gonderi?.olusturuldu ?? null,
        tasiyici: gonderi?.tasiyici ?? "",
        takipNo: gonderi?.takipNo ?? "",
      },
      select: { numara: true, tarih: true, sevk: true, tasiyici: true, takipNo: true },
    });
  });
}

/**
 * Kargo kaydedildiğinde irsaliyenin sevk bilgisi doluyor.
 *
 * İrsaliye kargo girilmeden kesilmiş olabiliyor (paket akşam hazırlanır,
 * sabah verilir). O yüzden sevk anı sonradan yazılıyor — ama **bir kez**:
 * ikinci bir kargo kaydı belgeyi geriye dönük değiştirmemeli.
 */
export async function irsaliyeSevkiniYaz(
  orderId: string,
  gonderi: { tasiyici: string; takipNo: string },
): Promise<void> {
  await db.waybill.updateMany({
    where: { orderId, sevk: null },
    data: { sevk: new Date(), tasiyici: gonderi.tasiyici, takipNo: gonderi.takipNo },
  });
}
