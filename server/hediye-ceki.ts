import "server-only";
import { cookies } from "next/headers";
import { db } from "@/server/veritabani";
import type { Prisma } from "@/db/uretilen/client";
import { kodCoz, kullanilacak } from "@/server/hediye-ceki-bicim";

/**
 * Hediye çeki (K-137).
 *
 * **İndirim değil, ödeme yolu.** Siparişin toplamı değişmiyor; çekten
 * düşülen kısım `Order.hediyeCekiKurus`'a yazılıyor, kalan kart ya da
 * havaleyle tahsil ediliyor. Bu yüzden kampanya ve kuponla birlikte
 * kullanılabiliyor, kargo eşiği de çekten etkilenmiyor.
 *
 * **Bakiye tek yerde düşüyor:** sipariş işleminin içinde, koşullu
 * güncellemeyle (`bakiyeKurus >= tutar`). Aynı çek iki sekmede aynı anda
 * kullanılırsa ikincisi tutmuyor ve sipariş hiç açılmıyor.
 *
 * **Geri dönüş:** ödenmeden iptal olan siparişte (kart tutmadı, havale
 * gelmedi) çekten düşülen tutarın tamamı; ödenmiş siparişin iadesinde
 * sipariş hangi oranda çekle ödendiyse o oranda (`iadeBolustur`).
 */

export const HEDIYE_CEKI_CEREZI = "hediye_ceki";

type Istemci = Prisma.TransactionClient | typeof db;

export type CekDurumu =
  | { gecerli: true; id: string; kod: string; bakiyeKurus: number; sonKullanma: string | null }
  | { gecerli: false; kod?: string; sebep: "yok" | "pasif" | "suresi" | "bos" };

export async function cekDurumu(ham: string, istemci: Istemci = db): Promise<CekDurumu> {
  const kod = kodCoz(ham);
  if (!kod) return { gecerli: false, sebep: "yok" };
  const cek = await istemci.giftCard.findUnique({
    where: { kod },
    select: { id: true, aktif: true, bakiyeKurus: true, sonKullanma: true },
  });
  if (!cek) return { gecerli: false, kod, sebep: "yok" };
  if (!cek.aktif) return { gecerli: false, kod, sebep: "pasif" };
  if (cek.sonKullanma && cek.sonKullanma < new Date())
    return { gecerli: false, kod, sebep: "suresi" };
  if (cek.bakiyeKurus <= 0) return { gecerli: false, kod, sebep: "bos" };
  return {
    gecerli: true,
    id: cek.id,
    kod,
    bakiyeKurus: cek.bakiyeKurus,
    sonKullanma: cek.sonKullanma?.toISOString() ?? null,
  };
}

/** Ödeme sayfasında yazılmış kod; yoksa boş. */
export async function hediyeCekiOku(): Promise<string | undefined> {
  const kavanoz = await cookies();
  return kavanoz.get(HEDIYE_CEKI_CEREZI)?.value || undefined;
}

/**
 * Siparişte çekten harcar; harcanan tutarı döndürür.
 *
 * Sipariş işleminin içinden çağrılıyor. Çek geçersizleştiyse ya da bakiye
 * arada azaldıysa `CEK` hatası atıyor: işlem tümüyle geri alınıyor,
 * müşteri ödeme sayfasına sebebiyle dönüyor. Sessizce çeksiz devam etmek,
 * müşterinin beklemediği bir tutarı kartından çekmek olurdu.
 */
export async function cekHarca(
  islem: Prisma.TransactionClient,
  kod: string,
  toplamKurus: number,
  siparisNo: string,
): Promise<{ id: string; tutarKurus: number }> {
  const durum = await cekDurumu(kod, islem);
  if (!durum.gecerli) throw new Error("CEK");
  const tutar = kullanilacak(durum.bakiyeKurus, toplamKurus);
  if (tutar <= 0) throw new Error("CEK");

  const sonuc = await islem.giftCard.updateMany({
    where: { id: durum.id, aktif: true, bakiyeKurus: { gte: tutar } },
    data: { bakiyeKurus: { decrement: tutar } },
  });
  if (sonuc.count !== 1) throw new Error("CEK");

  await islem.giftCardUse.create({
    data: { giftCardId: durum.id, siparisNo, tutarKurus: tutar, sebep: "siparis" },
  });
  return { id: durum.id, tutarKurus: tutar };
}

/**
 * Tutarı siparişin çekine geri yükler. Çek sonradan pasifleştirilmiş ya da
 * süresi geçmiş olsa da bakiye dönüyor: müşterinin hakkı; kullanıp
 * kullanamayacağı çekin kendi durumuna bağlı.
 */
export async function cekeIadeEt(
  islem: Istemci,
  orderId: string,
  tutarKurus: number,
  sebep: "iptal" | "iade",
): Promise<number> {
  if (tutarKurus <= 0) return 0;
  const siparis = await islem.order.findUnique({
    where: { id: orderId },
    select: { numara: true, giftCardId: true },
  });
  if (!siparis?.giftCardId) return 0;
  await islem.giftCard.update({
    where: { id: siparis.giftCardId },
    data: { bakiyeKurus: { increment: tutarKurus } },
  });
  await islem.giftCardUse.create({
    data: {
      giftCardId: siparis.giftCardId,
      siparisNo: siparis.numara,
      tutarKurus: -tutarKurus,
      sebep,
    },
  });
  return tutarKurus;
}

/** Ödeme sayfasının özeti için: geçerli çekten bu sepette kullanılacak tutar. */
export async function sepetteCek(
  toplamKurus: number,
): Promise<
  | { kod: string; kullanilanKurus: number; kalanBakiyeKurus: number }
  | { kod: string; hata: Exclude<CekDurumu, { gecerli: true }>["sebep"] }
  | undefined
> {
  const kod = await hediyeCekiOku();
  if (!kod) return undefined;
  const durum = await cekDurumu(kod);
  if (!durum.gecerli) return { kod, hata: durum.sebep };
  const kullanilanKurus = kullanilacak(durum.bakiyeKurus, toplamKurus);
  return { kod: durum.kod, kullanilanKurus, kalanBakiyeKurus: durum.bakiyeKurus - kullanilanKurus };
}
