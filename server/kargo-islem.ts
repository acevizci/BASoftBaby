import "server-only";
import { db } from "@/server/veritabani";
import { GONDERI_DURUMLARI, type GonderiDurumu } from "@/server/kargo";
import { teslimEdildiEpostasi } from "@/server/eposta";

/**
 * Taşıyıcıdan gelen durum bildiriminin işlenmesi.
 *
 * Gönderi durumu ilerledikçe sipariş de ilerliyor: yolda → kargoda, teslim →
 * teslim edildi. Teslimde müşteriye e-posta gidiyor; iade hakkı bu tarihten
 * işlediği için bildirim önemli.
 *
 * **Aynı bildirim iki kez gelirse ikincisi bir şey yapmıyor** (K-06): durum
 * zaten oradaysa güncelleme de e-posta da atlanıyor. Taşıyıcılar bildirimi
 * tekrarlıyor.
 */

export type DurumSonucu =
  | { tamam: true; numara: string; durum: GonderiDurumu }
  | { tamam: false; hata: string };

/** Gönderi durumunun siparişe yansıması. */
const SIPARIS_DURUMU: Partial<Record<GonderiDurumu, string>> = {
  verildi: "kargoda",
  yolda: "kargoda",
  teslim: "teslim",
};

export async function gonderiDurumunuIsle(
  takipNo: string,
  durum: string,
): Promise<DurumSonucu> {
  const temizTakip = takipNo.trim();
  if (!temizTakip) return { tamam: false, hata: "Takip numarası boş." };

  if (!(GONDERI_DURUMLARI as readonly string[]).includes(durum)) {
    return { tamam: false, hata: "Bilinmeyen durum." };
  }
  const yeniDurum = durum as GonderiDurumu;

  const gonderi = await db.shipment.findFirst({
    where: { takipNo: temizTakip },
    orderBy: { olusturuldu: "desc" },
    select: {
      id: true,
      durum: true,
      order: {
        select: {
          id: true,
          numara: true,
          durum: true,
          adSoyad: true,
          eposta: true,
          toplamKurus: true,
          odemeYontemi: true,
        },
      },
    },
  });
  if (!gonderi) return { tamam: false, hata: "Bu takip numarasıyla gönderi yok." };

  // Aynı bildirim tekrar geldiyse hiçbir şeye dokunulmuyor.
  if (gonderi.durum === yeniDurum) {
    return { tamam: true, numara: gonderi.order.numara, durum: yeniDurum };
  }

  // Koşullu (K-166): aynı bildirim aynı anda iki kez gelirse yalnızca biri
  // işliyor; müşteriye iki "teslim edildi" e-postası gitmiyor.
  const { count } = await db.shipment.updateMany({
    where: { id: gonderi.id, durum: { not: yeniDurum } },
    data: { durum: yeniDurum },
  });
  if (count === 0) return { tamam: true, numara: gonderi.order.numara, durum: yeniDurum };

  // İptal edilmiş sipariş taşıyıcı bildirimiyle yeniden açılmıyor (K-166):
  // stoğu geri verilmiş sipariş "kargoda"ya dönerse aynı ürün iki kez satılmış
  // görünürdü. Gönderi kaydı güncelleniyor, sipariş olduğu gibi kalıyor.
  const siparisDurumu = SIPARIS_DURUMU[yeniDurum];
  if (siparisDurumu && gonderi.order.durum !== siparisDurumu && gonderi.order.durum !== "iptal") {
    await db.order.update({
      where: { id: gonderi.order.id },
      data: { durum: siparisDurumu },
    });
    // Teslim anı bir kez (K-33): cayma hakkının 14 günü buradan sayılıyor;
    // yinelenen bildirim süreyi baştan başlatmasın.
    if (siparisDurumu === "teslim") {
      await db.order.updateMany({
        where: { id: gonderi.order.id, teslimTarihi: null },
        data: { teslimTarihi: new Date() },
      });
    }
  }
  if (gonderi.order.durum === "iptal") {
    return { tamam: true, numara: gonderi.order.numara, durum: yeniDurum };
  }

  if (yeniDurum === "teslim") {
    await teslimEdildiEpostasi({
      numara: gonderi.order.numara,
      adSoyad: gonderi.order.adSoyad,
      eposta: gonderi.order.eposta,
      toplamKurus: gonderi.order.toplamKurus,
      odemeYontemi: gonderi.order.odemeYontemi,
    });
  }

  return { tamam: true, numara: gonderi.order.numara, durum: yeniDurum };
}
