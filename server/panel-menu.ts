import "server-only";

/**
 * Panel menüsünün yapısı ve rozet sayıları.
 *
 * **Menü gruplanıyor.** On dört madde düz bir liste olarak duruyordu; hangisi
 * günlük iş, hangisi ayda bir açılan bir ayar, hiçbir şey söylemiyordu.
 * Gruplar açılır kapanır değil, sadece başlıklı: her gün kullanılan bir
 * panelde bir şeyi görmek için önce açmak gerekmesin (K-43).
 *
 * **Bekleyen iş sayıları menüde.** Mağaza sahibi "bakılacak bir şey var mı"
 * sorusunun cevabını özet ekranına gitmeden görüyor. Sayı yalnızca sıfırdan
 * büyükken çıkıyor; her maddenin yanında sürekli duran bir rakam kısa sürede
 * görünmez oluyor.
 */

import { db } from "@/server/veritabani";
import { OLUMSUZ_PUAN } from "@/server/yorum";
import { AZALAN_ESIK } from "@/server/stok-ekrani";

// Tipler ve "hangi madde açık" kuralı saf modülde: menü istemci bileşeni
// olduğu için `server-only` işaretli bu dosyayı içeri alamıyor (K-51).
export {
  acikMi,
  type MenuGrubu,
  type MenuMaddesi,
} from "@/ui/panel-menu-bicim";
import type { MenuGrubu, MenuMaddesi } from "@/ui/panel-menu-bicim";

/** Rozet sayıları; menüdeki sırayla aynı adlarla. */
export type Sayaclar = {
  siparis: number;
  /** Ödemesi tamamlanmış, henüz kargoya verilmemiş: bugün hazırlanacaklar. */
  hazirlanacak: number;
  talep: number;
  /** Ödenmeyi bekleyen iadeler: mağazanın müşteriye borcu (K-58). */
  iade: number;
  yorum: number;
  fotografsiz: number;
  /** Biten ya da azalan bedeni olan yayındaki ürün adedi. */
  sorunluStok: number;
};

export async function menuSayaclari(): Promise<Sayaclar> {
  const [siparis, hazirlanacak, talep, iade, yorum, fotografsiz, sorunluStok] =
    await Promise.all([
    db.order.count({ where: { durum: { in: ["bekliyor", "hazirlaniyor"] } } }),
    db.order.count({
      where: { odemeDurumu: "odendi", durum: { in: ["bekliyor", "hazirlaniyor"] } },
    }),
    db.orderRequest.count({ where: { durum: "yeni" } }),
    db.refund.count({ where: { durum: { in: ["bekliyor", "basarisiz"] } } }),
    db.review.count({ where: { durum: "yayinda", yanit: "", puan: { lte: OLUMSUZ_PUAN } } }),
    db.product.count({ where: { aktif: true, images: { none: {} } } }),
    // Beden değil **ürün** sayılıyor: rozete tıklayınca açılan listede o
    // kadar satır çıksın. "13" yazıp yedi satır göstermek kafa karıştırıyordu
    // (K-44).
    db.product.count({ where: { aktif: true, variants: { some: { stok: { lte: AZALAN_ESIK } } } } }),
  ]);
  return { siparis, hazirlanacak, talep, iade, yorum, fotografsiz, sorunluStok };
}

/**
 * Menü yapısı.
 *
 * Özet grupların dışında ve en üstte: panelin ana sayfası, bir kategoriye
 * ait değil.
 */
export function menuyuKur(s: Sayaclar): { ozet: MenuMaddesi; gruplar: MenuGrubu[] } {
  return {
    ozet: { yol: "/yonetim", ad: "Özet", ikon: "ozet" },
    gruplar: [
      {
        baslik: "Satış",
        maddeler: [
          { yol: "/yonetim/gunluk", ad: "Günün işi", ikon: "gunluk", rozet: s.hazirlanacak, ton: "bekleyen" },
          { yol: "/yonetim/siparisler", ad: "Siparişler", ikon: "siparis", rozet: s.siparis, ton: "bekleyen" },
          { yol: "/yonetim/talepler", ad: "Talepler", ikon: "talep", rozet: s.talep, ton: "bekleyen" },
          { yol: "/yonetim/iadeler", ad: "İadeler", ikon: "iade", rozet: s.iade, ton: "bekleyen" },
          {
            yol: "/yonetim/yorumlar",
            ad: "Değerlendirmeler",
            ikon: "yorum",
            rozet: s.yorum,
            ton: "hatirlatma",
          },
          { yol: "/yonetim/musteriler", ad: "Müşteriler", ikon: "musteri" },
          { yol: "/yonetim/rapor", ad: "Satış raporu", ikon: "rapor" },
          { yol: "/yonetim/kar", ad: "Aylık kâr", ikon: "kar" },
        ],
      },
      {
        baslik: "Katalog",
        maddeler: [
          { yol: "/yonetim/urunler", ad: "Ürünler", ikon: "urun", rozet: s.fotografsiz, ton: "hatirlatma" },
          { yol: "/yonetim/kategoriler", ad: "Kategoriler", ikon: "kategori" },
          { yol: "/yonetim/bedenler", ad: "Bedenler", ikon: "beden" },
          { yol: "/yonetim/renkler", ad: "Renkler", ikon: "renk" },
          { yol: "/yonetim/stok", ad: "Stok", ikon: "stok", rozet: s.sorunluStok, ton: "hatirlatma" },
        ],
      },
      {
        baslik: "Vitrin",
        maddeler: [
          { yol: "/yonetim/kampanyalar", ad: "Kampanyalar", ikon: "kampanya" },
          { yol: "/yonetim/banner", ad: "Ana sayfa banner", ikon: "banner" },
          { yol: "/yonetim/duyuru", ad: "Duyuru şeridi", ikon: "duyuru" },
        ],
      },
      {
        baslik: "Ayarlar",
        maddeler: [
          { yol: "/yonetim/ayarlar", ad: "Satış ayarları", ikon: "ayar" },
          { yol: "/yonetim/yasal", ad: "Yasal metinler", ikon: "yasal" },
          // Bütün panel kullanıcıları aynı menüyü görüyor; rol yok (K-79).
          { yol: "/yonetim/kullanicilar", ad: "Kullanıcılar", ikon: "kullanici" },
          { yol: "/yonetim/hazirlik", ad: "Satışa hazırlık", ikon: "hazirlik" },
          { yol: "/yonetim/tani", ad: "Tanı", ikon: "tani" },
        ],
      },
    ],
  };
}
