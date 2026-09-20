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

  await db.shipment.update({ where: { id: gonderi.id }, data: { durum: yeniDurum } });

  const siparisDurumu = SIPARIS_DURUMU[yeniDurum];
  if (siparisDurumu && gonderi.order.durum !== siparisDurumu) {
    await db.order.update({
      where: { id: gonderi.order.id },
      data: { durum: siparisDurumu },
    });
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
