import "server-only";

/**
 * Halka açık form işlemlerine hız sınırı.
 *
 * Giriş denemelerinin sınırı vardı (K-38) ama kimlik istemeyen öteki
 * işlemlerin hiçbirinde yoktu: **sipariş oluşturma**, değerlendirme gönderme,
 * iade talebi ve "gelince haber ver". Dördü de bir betikle tekrar tekrar
 * çağrılabiliyordu (K-64).
 *
 * En ağırı sipariş: sipariş açılırken stok **hemen** düşülüyor. Yüz sipariş
 * açan bir betik bütün stoğu kilitleyebilirdi. Ödeme süresi (bu kararın öteki
 * yarısı) bunu zamanla çözüyor, ama sınır saldırıyı baştan kesiyor.
 *
 * **Giriş sayacıyla aynı tabloyu kullanıyor** (`LoginThrottle`), çünkü ihtiyaç
 * aynı: anahtar başına sayaç, pencere ve kilit. Anahtarın ön eki işlemi
 * ayırıyor, yani sipariş sayacı giriş sayacını etkilemiyor.
 *
 * **Bu sayaç başarısızlığı değil denemeyi sayıyor.** Girişte ölçüt hatalı
 * denemeydi; burada kötüye kullanım hacmin kendisi — başarılı yüz sipariş de
 * sorun.
 *
 * **Hata olursa geçiyor, engellemiyor.** Sayaç veritabanına yazamazsa
 * müşterinin siparişi düşmemeli: sınır bir koruma, satışın önkoşulu değil.
 */

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/server/veritabani";

export type IslemTuru = "siparis" | "yorum" | "talep" | "stok-bildirimi" | "hata";

/**
 * İşlem başına sınırlar.
 *
 * Sipariş sınırı kasten yüksek: gerçek müşteriyi engellemek, betiği
 * engellemekten daha pahalı. Aynı evden ya da iş yerinden birden çok kişi
 * aynı adresle çıkabiliyor.
 */
const SINIRLAR: Record<IslemTuru, { adet: number; pencereDk: number }> = {
  siparis: { adet: 15, pencereDk: 60 },
  yorum: { adet: 5, pencereDk: 60 },
  talep: { adet: 10, pencereDk: 60 },
  "stok-bildirimi": { adet: 10, pencereDk: 60 },
  // Tarayıcı hata bildirimi (K-121): bir sayfada birkaç hata olabilir, ama
  // saatte yirmiden fazlası ya bozuk bir tarayıcı ya da kaydı doldurmaya
  // çalışan biri.
  hata: { adet: 20, pencereDk: 60 },
};

function ozet(deger: string): string {
  return createHash("sha256").update(deger).digest("hex").slice(0, 32);
}

/** İsteğin geldiği adres; bulunamazsa sınır uygulanmıyor. */
async function adres(): Promise<string | undefined> {
  const basliklar = await headers();
  const ham =
    basliklar.get("x-forwarded-for")?.split(",")[0]?.trim() || basliklar.get("x-real-ip");
  return ham || undefined;
}

export type SinirSonucu = { izin: true } | { izin: false; kalanDk: number };

/**
 * İşlemi sayar ve sınırı aşıp aşmadığını söyler.
 *
 * Sayma ve kontrol birlikte: ayrı olsalardı aynı anda gelen iki istek ikisi
 * de "izin var" cevabını alabilirdi.
 */
export async function islemSinirla(tur: IslemTuru): Promise<SinirSonucu> {
  const ip = await adres();
  // Yerelde ya da başlık olmayan bir ortamda sınır uygulanmıyor: kimliği
  // olmayan isteği ayırt edemiyoruz ve herkesi tek sayaca toplamak bütün
  // mağazayı kilitlerdi.
  if (!ip) return { izin: true };

  const { adet, pencereDk } = SINIRLAR[tur];
  const anahtar = `${tur}:${ozet(ip)}`;
  const simdi = new Date();
  const pencereBasi = new Date(simdi.getTime() - pencereDk * 60_000);

  try {
    const kayit = await db.loginThrottle.findUnique({ where: { id: anahtar } });

    // Pencere kapandıysa sayaç sıfırdan başlıyor.
    if (!kayit || kayit.ilkDeneme < pencereBasi) {
      await db.loginThrottle.upsert({
        where: { id: anahtar },
        update: { sayac: 1, ilkDeneme: simdi, kilitBitis: null },
        create: { id: anahtar, sayac: 1, ilkDeneme: simdi },
      });
      return { izin: true };
    }

    if (kayit.sayac >= adet) {
      const bitis = new Date(kayit.ilkDeneme.getTime() + pencereDk * 60_000);
      const kalanDk = Math.max(1, Math.ceil((bitis.getTime() - simdi.getTime()) / 60_000));
      return { izin: false, kalanDk };
    }

    await db.loginThrottle.update({
      where: { id: anahtar },
      data: { sayac: { increment: 1 } },
    });
    return { izin: true };
  } catch (hata) {
    // Sayaç yazılamadı: müşteriyi engelleme.
    console.error("İstek sınırı sayacı çalışmadı:", hata);
    return { izin: true };
  }
}
