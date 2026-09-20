import "server-only";
import { db } from "@/server/veritabani";

/**
 * Fatura.
 *
 * **Sağlayıcı henüz bağlı değil.** Otomatik e-arşiv faturası için Paraşüt ya
 * da Bizim Hesap hesabı ve vergi kaydı gerekiyor; ikisi de şirket kuruluşuna
 * bağlı. Bu adımda sağlayıcıdan bağımsız olan her şey yapıldı: fatura kaydı,
 * KDV ayrıştırması, numara sayacı ve panelden yazdırılabilen fatura. Mağaza
 * bugün faturayı buradan yazdırıp kesiyor; resmî fatura dışarıda kesildiyse
 * numarası ve belgesi kayda yazılabiliyor.
 *
 * Sağlayıcı bağlanınca değişecek tek yer, kaydı oluşturduktan sonra
 * sağlayıcıya gönderen bir çağrı olacak; kayıt düzeni aynı kalacak (K-20).
 *
 * **Tutarlar siparişten kopyalanıyor.** Fatura kesildikten sonra panelden KDV
 * oranı değişse bile eski fatura olduğu gibi kalıyor: kesilmiş bir belgenin
 * içeriği sonradan değişmemeli.
 */

export type Fatura = {
  numara: string;
  tarih: Date;
  kdvOrani: number;
  matrahKurus: number;
  kdvKurus: number;
  toplamKurus: number;
  durum: string;
  saglayiciRef: string | null;
  pdfAdresi: string | null;
};

/**
 * Fiyatlar KDV dahil girildiği için matrah geriye doğru hesaplanıyor.
 * Kuruş tam sayı kaldığından KDV, toplamdan matrah çıkarılarak bulunuyor:
 * iki ayrı yuvarlama yapılsaydı matrah + KDV toplamı tutmayabilirdi.
 */
export function kdvAyristir(
  toplamKurus: number,
  kdvOrani: number,
): { matrahKurus: number; kdvKurus: number } {
  const matrahKurus = Math.round(toplamKurus / (1 + kdvOrani / 100));
  return { matrahKurus, kdvKurus: toplamKurus - matrahKurus };
}

/** BA-F-2026-0001 */
function numaraYaz(sayac: number, tarih: Date): string {
  return `BA-F-${tarih.getFullYear()}-${String(sayac).padStart(4, "0")}`;
}

export async function faturaGetir(numara: string): Promise<Fatura | undefined> {
  const kayit = await db.invoice.findFirst({
    where: { order: { numara } },
    select: {
      numara: true,
      tarih: true,
      kdvOrani: true,
      matrahKurus: true,
      kdvKurus: true,
      toplamKurus: true,
      durum: true,
      saglayiciRef: true,
      pdfAdresi: true,
    },
  });
  return kayit ?? undefined;
}

/**
 * Siparişin faturasını oluşturur; zaten varsa var olanı döndürür.
 *
 * Numara sayacı sipariş numarasında olduğu gibi tek işlem içinde artıyor, yani
 * aynı anda iki fatura kesilse bile numaralar çakışmıyor.
 */
export async function faturaOlustur(numara: string): Promise<Fatura | undefined> {
  const siparis = await db.order.findUnique({
    where: { numara },
    select: { id: true, toplamKurus: true },
  });
  if (!siparis) return undefined;

  const varOlan = await faturaGetir(numara);
  if (varOlan) return varOlan;

  const simdi = new Date();

  return db.$transaction(async (islem) => {
    const ayar = await islem.storeSetting.upsert({
      where: { id: "tek" },
      update: { sonFaturaNo: { increment: 1 } },
      create: { id: "tek", sonFaturaNo: 1 },
      select: { sonFaturaNo: true, kdvOrani: true },
    });

    const { matrahKurus, kdvKurus } = kdvAyristir(siparis.toplamKurus, ayar.kdvOrani);

    return islem.invoice.create({
      data: {
        orderId: siparis.id,
        numara: numaraYaz(ayar.sonFaturaNo, simdi),
        tarih: simdi,
        kdvOrani: ayar.kdvOrani,
        matrahKurus,
        kdvKurus,
        toplamKurus: siparis.toplamKurus,
      },
      select: {
        numara: true,
        tarih: true,
        kdvOrani: true,
        matrahKurus: true,
        kdvKurus: true,
        toplamKurus: true,
        durum: true,
        saglayiciRef: true,
        pdfAdresi: true,
      },
    });
  });
}

/** Sağlayıcı bağlandığında bu iş ona devredilecek (K-20). */
export function faturaSaglayiciAcikMi(): boolean {
  return Boolean(process.env.FATURA_API_ANAHTARI);
}
