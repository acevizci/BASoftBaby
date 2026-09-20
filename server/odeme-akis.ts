import "server-only";
import { db } from "@/server/veritabani";
import { odemeSorgula } from "@/server/odeme";
import { odemeAlindiEpostasi } from "@/server/eposta";

/**
 * Ödeme akışının sipariş tarafı: girişim kaydı, dönüşün işlenmesi, ödeme
 * tutmazsa stoğun geri verilmesi.
 *
 * **Aynı dönüş iki kez işlenmiyor** (K-06). iyzico dönüş çağrısını
 * tekrarlayabiliyor, müşteri de "geri" tuşuna basabiliyor. Girişim kaydı
 * jetonla tekil; kayıt "baslatildi" durumundan çıktıysa ikinci çağrı hiçbir
 * şeyi değiştirmeden aynı sonucu döndürüyor.
 *
 * **Stok sipariş açılırken düşüyor**, yani ödeme süresince rezerve. Ödeme
 * tutmazsa aynı işlem içinde geri veriliyor ve sipariş iptal oluyor
 * (mimarideki 04. karar).
 */

export type DonusSonucu =
  | { durum: "basarili"; numara: string }
  | { durum: "basarisiz"; numara: string; hata: string }
  | { durum: "bulunamadi" };

export async function odemeGirisimiKaydet(
  orderId: string,
  jeton: string,
  tutarKurus: number,
): Promise<void> {
  await db.payment.create({ data: { orderId, jeton, tutarKurus } });
}

/**
 * Sipariş iptal edilip stok geri veriliyor.
 *
 * Koşul olarak siparişin durumu da veriliyor: iki dönüş çağrısı yarışırsa
 * stok iki kez geri verilmesin. Ürünü silinmiş satırın (variantId boş)
 * stoğu geri verilemiyor, sipariş kaydı yine de iptal oluyor.
 */
export async function siparisiIptalEtVeStoguIadeEt(orderId: string): Promise<void> {
  await db.$transaction(async (islem) => {
    const iptal = await islem.order.updateMany({
      where: { id: orderId, durum: { not: "iptal" } },
      data: { durum: "iptal", odemeDurumu: "bekliyor" },
    });
    if (iptal.count === 0) return;

    const satirlar = await islem.orderItem.findMany({
      where: { orderId },
      select: { variantId: true, adet: true },
    });

    for (const satir of satirlar) {
      if (!satir.variantId) continue;
      await islem.productVariant.update({
        where: { id: satir.variantId },
        data: { stok: { increment: satir.adet } },
      });
    }
  });
}

/**
 * İptal olan siparişin ürünlerini sepete geri koyar.
 *
 * Sipariş açılırken sepet boşalıyor. Ödeme tutmazsa müşteri elinde boş sepetle
 * kalmasın diye satırlar geri yazılıyor; stok o sırada zaten iade edilmiş
 * oluyor, yine de adet eldeki stokla sınırlanıyor.
 *
 * Sepeti olmayan (çerezi silinmiş) müşteri için hiçbir şey yapılmıyor: bu
 * adım kolaylık, siparişin doğruluğuna etkisi yok.
 */
export async function sepetiSiparistenDoldur(
  cartId: string | undefined,
  numara: string,
): Promise<void> {
  if (!cartId) return;

  const sepet = await db.cart.findUnique({ where: { id: cartId }, select: { id: true } });
  if (!sepet) return;

  const satirlar = await db.orderItem.findMany({
    where: { order: { numara } },
    select: { variantId: true, adet: true, variant: { select: { stok: true } } },
  });

  for (const satir of satirlar) {
    if (!satir.variantId) continue;
    const adet = Math.min(satir.adet, satir.variant?.stok ?? 0);
    if (adet <= 0) continue;
    await db.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId: satir.variantId } },
      update: { adet },
      create: { cartId, variantId: satir.variantId, adet },
    });
  }
}

/**
 * iyzico'dan dönen jetonu işler.
 *
 * Sıra önemli: önce iyzico'ya sorulur, sonra tutar siparişle karşılaştırılır,
 * sonra kayıt güncellenir. Dönüş çağrısının gövdesindeki hiçbir bilgiye
 * güvenilmiyor — jeton dışında oradan bir şey okunmuyor.
 */
export async function odemeDonusunuIsle(jeton: string): Promise<DonusSonucu> {
  if (!jeton) return { durum: "bulunamadi" };

  const girisim = await db.payment.findUnique({
    where: { jeton },
    select: {
      id: true,
      durum: true,
      hata: true,
      order: {
        select: {
          id: true,
          numara: true,
          toplamKurus: true,
          durum: true,
          adSoyad: true,
          eposta: true,
        },
      },
    },
  });
  if (!girisim) return { durum: "bulunamadi" };

  // Daha önce işlenmiş: aynı cevabı ver, hiçbir şeye dokunma.
  if (girisim.durum === "basarili") {
    return { durum: "basarili", numara: girisim.order.numara };
  }
  if (girisim.durum === "basarisiz") {
    return {
      durum: "basarisiz",
      numara: girisim.order.numara,
      hata: girisim.hata ?? "Ödeme tamamlanamadı.",
    };
  }

  const sonuc = await odemeSorgula(jeton);

  // Tutar tutmuyorsa ödeme başarılı sayılmıyor: eksik çekilmiş bir ödemeyle
  // sipariş hazırlanmaya başlamamalı. Elle bakmak için günlüğe yazılıyor.
  const tutarTutuyor = sonuc.odenenKurus === girisim.order.toplamKurus;
  if (sonuc.basarili && !tutarTutuyor) {
    console.error(
      `Ödeme tutarı siparişle uyuşmuyor: ${girisim.order.numara} bekleniyordu ${girisim.order.toplamKurus}, geldi ${sonuc.odenenKurus}`,
    );
  }

  const basarili = sonuc.basarili && tutarTutuyor;
  const hata = basarili
    ? null
    : (sonuc.hata ?? (tutarTutuyor ? "Ödeme onaylanmadı." : "Ödeme tutarı siparişle uyuşmadı."));

  await db.payment.update({
    where: { id: girisim.id },
    data: {
      durum: basarili ? "basarili" : "basarisiz",
      saglayiciRef: sonuc.saglayiciRef ?? null,
      taksit: sonuc.taksit,
      hata,
      hamYanit: sonuc.ham || null,
    },
  });

  if (!basarili) {
    await siparisiIptalEtVeStoguIadeEt(girisim.order.id);
    return {
      durum: "basarisiz",
      numara: girisim.order.numara,
      hata: hata ?? "Ödeme tamamlanamadı.",
    };
  }

  await db.order.update({
    where: { id: girisim.order.id },
    data: { odemeDurumu: "odendi", durum: "hazirlaniyor" },
  });

  // Kartta onay e-postası burada gidiyor: ödeme belli olmadan "siparişin
  // alındı" demek, tutmayan ödemede yanlış bilgi vermek olurdu. Aynı dönüş
  // ikinci kez gelse bu satıra ulaşılmıyor, yani e-posta bir kez gidiyor.
  await odemeAlindiEpostasi({
    numara: girisim.order.numara,
    adSoyad: girisim.order.adSoyad,
    eposta: girisim.order.eposta,
    toplamKurus: girisim.order.toplamKurus,
    odemeYontemi: "kart",
  });

  return { durum: "basarili", numara: girisim.order.numara };
}

/**
 * Yarıda kalan kart ödemelerini temizler.
 *
 * Müşteri ödeme ekranını kapatırsa dönüş çağrısı hiç gelmiyor ve sipariş
 * "ödeme bekliyor" durumunda kalıyor — stoğu da tutmaya devam ediyor. Son
 * adet bedenler bebek ürünlerinde sık olduğu için bu stok başka müşteriye
 * açılmalı. Zamanlı iş bunu yapıyor (app/api/cron).
 */
export async function suresiGecenOdemeleriTemizle(dakika = 30): Promise<number> {
  const sinir = new Date(Date.now() - dakika * 60 * 1000);

  const girisimler = await db.payment.findMany({
    where: {
      durum: "baslatildi",
      olusturuldu: { lt: sinir },
      order: { durum: "bekliyor", odemeDurumu: "bekliyor" },
    },
    select: { id: true, orderId: true },
  });

  for (const girisim of girisimler) {
    await db.payment.update({
      where: { id: girisim.id },
      data: { durum: "basarisiz", hata: "Ödeme süresi doldu." },
    });
    await siparisiIptalEtVeStoguIadeEt(girisim.orderId);
  }

  return girisimler.length;
}
