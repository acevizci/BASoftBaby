import "server-only";

/**
 * Bırakılan sepet hatırlatması.
 *
 * Sepetine ürün koyup sipariş vermeden ayrılan müşteriye bir e-posta.
 * Mağazacılıkta karşılığı en yüksek e-postalardan biri; ama Türkiye'de
 * ticari elektronik ileti sayıldığı için kuralları var ve burada o kurallar
 * koda gömülü (K-27):
 *
 * - **Yalnızca izin verene.** Kayıt formundaki kutu işaretsiz geliyor;
 *   işaretlenmemişse e-posta hiç gönderilmiyor.
 * - **Yalnızca doğrulanmış adrese.** Doğrulanmamış adres o kutunun sahibi
 *   olunduğunun kanıtı değil; başkasının adresini yazan biri ona
 *   e-posta gönderttirebilirdi.
 * - **Sepete bir kez.** `hatirlatildi` dolduktan sonra ikinci e-posta yok;
 *   ısrar hatırlatma olmaktan çıkar.
 * - **Çıkmak tek tık.** Her e-postanın altında listeden çıkma bağlantısı var.
 *
 * Üyeliksiz sepetler hiç hatırlatılmıyor: sahibinin adresi bilinmiyor.
 */

import { db } from "@/server/veritabani";
import { sepetHatirlatmaEpostasi } from "@/server/eposta";
import { jetonUret } from "@/server/uyelik";
import { RENK_ADLARI, type RenkAdi } from "@/ui/katalog-bicim";

/**
 * Sepet bu kadar süre dokunulmadan kaldıysa bırakılmış sayılıyor.
 *
 * Bir saat sonra göndermek daha çok satış getirir ama günde bir kez çalışan
 * bir işle bu yapılamıyor (Vercel Hobby'de günlük bir zamanlı iş var, K-22).
 * Bir gün, alışverişi ertesi güne bırakmış birine doğal geliyor.
 */
const EN_AZ_SAAT = 24;

/** Bu kadar eskimiş sepeti hatırlatmanın anlamı yok; fiyat da stok da değişmiştir. */
const EN_COK_GUN = 7;

export type HatirlatmaSonucu = { bakilan: number; gonderilen: number };

export async function birakilanSepetleriHatirlat(): Promise<HatirlatmaSonucu> {
  const simdi = Date.now();

  const sepetler = await db.cart.findMany({
    where: {
      hatirlatildi: null,
      guncellendi: {
        lt: new Date(simdi - EN_AZ_SAAT * 60 * 60 * 1000),
        gt: new Date(simdi - EN_COK_GUN * 24 * 60 * 60 * 1000),
      },
      satirlar: { some: {} },
      customer: {
        pazarlamaIzni: true,
        // Doğrulanmamış adrese gönderilmiyor (K-14 ile aynı gerekçe).
        epostaDogrulandi: { not: null },
      },
    },
    select: {
      id: true,
      customer: { select: { id: true, eposta: true, adSoyad: true } },
      satirlar: {
        select: {
          adet: true,
          variant: { select: { beden: true, renk: true, product: { select: { ad: true } } } },
        },
      },
    },
    take: 200,
  });

  let gonderilen = 0;

  for (const sepet of sepetler) {
    const musteri = sepet.customer;
    if (!musteri) continue;

    const jeton = await jetonUret(musteri.id, "pazarlama-iptal");

    const sonuc = await sepetHatirlatmaEpostasi(musteri.eposta, {
      adSoyad: musteri.adSoyad,
      satirlar: sepet.satirlar.map((s) => ({
        ad: s.variant.product.ad,
        beden: s.variant.beden,
        renk: RENK_ADLARI[s.variant.renk as RenkAdi] ?? s.variant.renk,
        adet: s.adet,
      })),
      iptalJetonu: jeton,
    });

    // Gönderilemeyen sepet işaretlenmiyor: yarın yeniden denenecek.
    if (!sonuc.gonderildi) continue;

    // Ham SQL seçiliyor: `guncellendi` alanı `@updatedAt` olduğu için
    // Prisma'nın update'i sepeti "az önce dokunulmuş" gösterir ve müşteri
    // sepete hiç dokunmamışken pencere kayar.
    await db.$executeRaw`update "Cart" set "hatirlatildi" = now() where id = ${sepet.id}`;
    gonderilen += 1;
  }

  return { bakilan: sepetler.length, gonderilen };
}

/** Listeden çıkma: jeton geçerliyse izni kapatır. */
export async function pazarlamaIzniniKapat(customerId: string): Promise<void> {
  await db.customer.update({
    where: { id: customerId },
    data: { pazarlamaIzni: false, pazarlamaIzniTarihi: null },
  });
}
