/**
 * Canlıdaki hataların kaydı (K-121).
 *
 * Müşteri hata ekranı gördüğünde mağaza sahibinin haberi olmuyordu: hata
 * yalnızca Vercel'in günlüğünde, birkaç gün sonra siliniyordu. Artık sunucu
 * hataları (`instrumentation.ts`) ve tarayıcıda olan hatalar (`/api/hata`)
 * burada toplanıyor; panelde Ayarlar › Hata kaydı'nda ve sabah özetinde
 * görünüyor.
 *
 * Hazır bir servis (Sentry gibi) kullanılmadı: bir hesap, bir anahtar ve
 * sayfaya inen fazladan bir betik demekti; bu mağazanın ihtiyacı "ne oldu,
 * kaç kez, nerede" sorusunun cevabı.
 *
 * `server-only` işareti yok: `instrumentation.ts` bu modülü React'in sunucu
 * ortamı dışında yüklüyor ve işaret orada hata atıyor. Tarayıcıya giden bir
 * dosya bunu içeri almıyor.
 *
 * **Kayıt hiçbir zaman hata atmıyor.** Hatayı kaydederken çıkan hata
 * (veritabanı kapalı gibi) asıl hatanın yerine geçmesin; yalnızca günlüğe
 * yazılıyor.
 */

import { db } from "@/server/veritabani";
import { hataHazirla, type HataGirdisi } from "@/server/hata-bicim";

/** En çok bu kadar farklı hata tutuluyor; fazlası en eski görülenden siliniyor. */
const EN_COK_SATIR = 500;
/** Bu kadar gündür görülmeyen hata siliniyor. */
const SAKLAMA_GUN = 90;

export async function hataKaydet(g: HataGirdisi): Promise<void> {
  try {
    const h = hataHazirla(g);
    if (!h) return;
    const simdi = new Date();
    const kayit = await db.errorLog.upsert({
      where: { parmakIzi: h.parmakIzi },
      create: { ...h, ilk: simdi, son: simdi },
      update: { adet: { increment: 1 }, son: simdi, cozuldu: false },
      select: { adet: true },
    });
    if (kayit.adet === 1) await budama(simdi);
  } catch (e) {
    console.error("[hata-kaydi] kaydedilemedi", e);
  }
}

/** Yeni bir hata eklendiğinde: eskileri ve sınırı aşanları sil. */
async function budama(simdi: Date): Promise<void> {
  await db.errorLog.deleteMany({
    where: { son: { lt: new Date(simdi.getTime() - SAKLAMA_GUN * 24 * 60 * 60 * 1000) } },
  });
  const fazla = await db.errorLog.findMany({
    orderBy: { son: "desc" },
    skip: EN_COK_SATIR,
    select: { id: true },
  });
  if (fazla.length > 0)
    await db.errorLog.deleteMany({ where: { id: { in: fazla.map((f) => f.id) } } });
}
