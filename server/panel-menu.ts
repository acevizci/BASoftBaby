import "server-only";

/**
 * Panel menüsünün yapısı ve rozet sayıları.
 *
 * **Menü iki seviyeli** (K-116): yapı `ui/panel-menu-bicim.ts`'te, burada
 * yalnızca sayaçlar. Eskiden gruplar başlıklı ama hep açıktı (K-43); madde
 * sayısı 22'ye çıkınca menü sayfa boyunu aştı.
 *
 * **Bekleyen iş sayıları menüde.** Mağaza sahibi "bakılacak bir şey var mı"
 * sorusunun cevabını özet ekranına gitmeden görüyor. Sayı yalnızca sıfırdan
 * büyükken çıkıyor; her maddenin yanında sürekli duran bir rakam kısa sürede
 * görünmez oluyor.
 */

import { db } from "@/server/veritabani";
import { OLUMSUZ_PUAN } from "@/server/yorum";
import { AZALAN_ESIK } from "@/server/stok-ekrani";

import type { Sayaclar } from "@/ui/panel-menu-bicim";
export type { Sayaclar } from "@/ui/panel-menu-bicim";

export async function menuSayaclari(): Promise<Sayaclar> {
  const [siparis, hazirlanacak, talep, iade, yorum, fotografsiz, sorunluStok, hata] =
    await Promise.all([
    db.order.count({ where: { durum: { in: ["bekliyor", "hazirlaniyor"] } } }),
    db.order.count({
      where: { odemeDurumu: "odendi", durum: { in: ["bekliyor", "hazirlaniyor"] } },
    }),
    db.orderRequest.count({ where: { durum: "yeni" } }),
    db.refund.count({ where: { durum: { in: ["bekliyor", "basarisiz"] } } }),
    // Yanıt bekleyen olumsuz yorumlar ve onay bekleyen müşteri fotoğrafları (K-134).
    Promise.all([
      db.review.count({ where: { durum: "yayinda", yanit: "", puan: { lte: OLUMSUZ_PUAN } } }),
      db.reviewPhoto.count({ where: { onayli: false } }),
    ]).then(([a, b]) => a + b),
    db.product.count({ where: { aktif: true, images: { none: {} } } }),
    // Beden değil **ürün** sayılıyor: rozete tıklayınca açılan listede o
    // kadar satır çıksın. "13" yazıp yedi satır göstermek kafa karıştırıyordu
    // (K-44).
    db.product.count({ where: { aktif: true, variants: { some: { stok: { lte: AZALAN_ESIK } } } } }),
    db.errorLog.count({ where: { cozuldu: false } }),
  ]);
  return { siparis, hazirlanacak, talep, iade, yorum, fotografsiz, sorunluStok, hata };
}
