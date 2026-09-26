import "server-only";
import Iyzipay from "iyzipay";
import { db } from "@/server/veritabani";
import { odemeAcikMi } from "@/server/odeme";

/**
 * Kart iadesinin sağlayıcı tarafı.
 *
 * **Bu dosya denenmedi.** iyzico anahtarları henüz tanımlı değil (A-11'e
 * bağlı), yani kartla ödeme de kapalı. Kod yazıldı ve anahtarlar geldiğinde
 * çalışacak biçimde duruyor; o gün sandbox'ta denenmeli. Denenmemiş olması
 * bir şeyi bozmuyor: `odemeAcikMi()` false olduğu sürece hiç çağrılmıyor ve
 * iade kaydı elle tamamlanabiliyor (K-58).
 *
 * **iyzico'da iki ayrı işlem var ve ikisi aynı şey değil:**
 *
 * - **İptal (`cancel`)** — ödemenin aynı gün, tamamı için. Para hiç
 *   mahsuplaşmadan geri dönüyor, komisyon da geri alınıyor. Mümkünse bu
 *   tercih ediliyor.
 * - **İade (`refundV2`)** — sonraki günlerde ve kısmi tutarla. `paymentId`
 *   ve tutar yetiyor; eski `refund` ucunun istediği kalem bazlı
 *   `paymentTransactionId` gerekmiyor.
 *
 * Hangisinin seçileceğine ödemenin tarihi ve iade edilen tutar karar
 * veriyor.
 */

export type KartIadesi =
  | { tamam: true; saglayiciRef?: string }
  | { tamam: false; hata: string };

function istemci(): Iyzipay {
  const elle = process.env.IYZICO_TABAN_ADRES?.trim();
  const taban = elle
    ? elle.replace(/\/$/, "")
    : process.env.IYZICO_API_ANAHTARI?.startsWith("sandbox-")
      ? "https://sandbox-api.iyzipay.com"
      : "https://api.iyzipay.com";

  return new Iyzipay({
    apiKey: process.env.IYZICO_API_ANAHTARI ?? "",
    secretKey: process.env.IYZICO_GIZLI_ANAHTAR ?? "",
    uri: taban,
  });
}

function cagir(
  calistir: (geriCagri: (hata: unknown, sonuc: Record<string, unknown>) => void) => void,
): Promise<Record<string, unknown>> {
  return new Promise((coz, at) => {
    calistir((hata, sonuc) => (hata ? at(hata) : coz(sonuc)));
  });
}

function metin(deger: unknown): string {
  return typeof deger === "string" ? deger : "";
}

/** Aynı gün mü: iyzico iptali yalnızca ödeme günü kabul ediyor. */
function ayniGunMu(t: Date): boolean {
  const simdi = new Date();
  return (
    t.getFullYear() === simdi.getFullYear() &&
    t.getMonth() === simdi.getMonth() &&
    t.getDate() === simdi.getDate()
  );
}

/**
 * Kart ödemesini iyzico üzerinden iade eder.
 *
 * Başarısızlık burada **hata fırlatmıyor**: iade kaydı duruyor, sebebi
 * yazılıyor ve mağaza sahibi elle tamamlayabiliyor. Sağlayıcıya ulaşılamadı
 * diye müşterinin alacağının kaydını düşürmek en kötü sonuç olurdu.
 */
export async function kartIadesiYap(
  orderId: string,
  tutarKurus: number,
  ip: string,
): Promise<KartIadesi> {
  if (!odemeAcikMi()) {
    return { tamam: false, hata: "Kartla ödeme kapalı; iade elle yapılmalı." };
  }

  // Siparişin başarılı ödeme girişimi: iyzico kimliği orada.
  const odeme = await db.payment.findFirst({
    // Karttan para çekilmiş her girişim (K-167): tutarı tutmadığı için
    // "basarisiz" sayılan ödemenin de parası alınmış; iadesi buradan.
    where: { orderId, saglayiciRef: { not: null }, odenenKurus: { not: null } },
    orderBy: { olusturuldu: "desc" },
    select: {
      saglayiciRef: true,
      tutarKurus: true,
      odenenKurus: true,
      guncellendi: true,
      order: { select: { numara: true } },
    },
  });
  if (!odeme?.saglayiciRef) {
    return { tamam: false, hata: "Bu siparişin iyzico ödeme kaydı bulunamadı." };
  }

  const tamami = tutarKurus >= odeme.tutarKurus;
  // Tamamı iade ediliyorsa müşteri ödediğinin tamamını alıyor: taksitte
  // yansıtılan vade farkı da dahil (K-110).
  const iade = tamami ? Math.max(tutarKurus, odeme.odenenKurus ?? 0) : tutarKurus;
  const fiyat = (iade / 100).toFixed(2);

  try {
    const sonuc =
      tamami && ayniGunMu(odeme.guncellendi)
        ? await cagir((geriCagri) =>
            istemci().cancel.create(
              {
                locale: Iyzipay.LOCALE.TR,
                conversationId: odeme.order.numara,
                paymentId: odeme.saglayiciRef!,
                ip,
              },
              geriCagri,
            ),
          )
        : await cagir((geriCagri) =>
            istemci().refundV2.create(
              {
                locale: Iyzipay.LOCALE.TR,
                conversationId: odeme.order.numara,
                paymentId: odeme.saglayiciRef!,
                price: fiyat,
                currency: Iyzipay.CURRENCY.TRY,
                ip,
              },
              geriCagri,
            ),
          );

    if (sonuc.status !== "success") {
      return {
        tamam: false,
        hata: metin(sonuc.errorMessage) || "iyzico iadeyi kabul etmedi.",
      };
    }

    return { tamam: true, saglayiciRef: metin(sonuc.paymentId) || odeme.saglayiciRef };
  } catch (hata) {
    console.error("iyzico iadesi başarısız:", hata);
    return { tamam: false, hata: "Ödeme sağlayıcısına ulaşılamadı." };
  }
}
