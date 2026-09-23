import "server-only";

/**
 * Favori ürün bildirimleri (K-100).
 *
 * Favoriye konan ürün çoğu zaman "indirime girerse alırım" ya da "bedeni
 * gelince alırım" demek. Günlük iş favorileri tarıyor; bir ürünün fiyatı
 * düşmüşse ya da tükenmiş bir bedeni yeniden stoğa girmişse müşteriye
 * haber veriyor.
 *
 * - **Karşılaştırma son bakışla.** Her favori, son taramada görülen fiyatı
 *   ve stoktaki bedenleri taşıyor. Favoriye eklenirken de yazılıyor: ekleme
 *   ile ilk tarama arasındaki indirim kaçmasın. Hiç bakılmamış kayıtta
 *   (bu özellikten önce eklenenler) ilk tarama yalnızca yazıyor, e-posta
 *   göndermiyor — yoksa herkese bir anda "yeni" haber giderdi.
 * - **Yalnızca izin verene, doğrulanmış adrese** (sepet hatırlatmasıyla
 *   aynı kurallar, K-27). İzni olmayanın kaydı yine de güncelleniyor:
 *   sonradan izin verdiğinde aylar önceki indirim "yeni" diye gitmesin.
 * - **Günde tek e-posta.** Bir müşterinin bütün haberleri tek e-postada.
 *   Gönderilemezse o müşterinin kayıtları güncellenmiyor, ertesi gün
 *   yeniden deneniyor.
 * - **Fiyat yükselişi haber değil**, ama yeni fiyat kaydediliyor: sonra
 *   yeniden düşerse yine haber gidiyor.
 * - **Tükenmiş ürünün indirimi haber değil**: alınamayacak bir şey için
 *   e-posta gönderilmiyor. Vitrinde olmayan ürüne hiç bakılmıyor.
 *
 * Fiyat ürünün vitrindeki fiyatı; bedene özel fiyatlar karşılaştırmaya
 * girmiyor.
 */

import { db } from "@/server/veritabani";
import { favoriHaberiEpostasi, type FavoriHaberi, type EpostaSonucu } from "@/server/eposta";
import { jetonUret } from "@/server/uyelik";

export type UrunDurumu = { fiyatKurus: number; bedenler: string[] };

/** Ürünün bugünkü fiyatı ve stokta en az bir rengi olan bedenleri. */
export function urunDurumu(urun: {
  fiyatKurus: number;
  varyantlar: { beden: string; stok: number }[];
}): UrunDurumu {
  const bedenler = [...new Set(urun.varyantlar.filter((v) => v.stok > 0).map((v) => v.beden))];
  return { fiyatKurus: urun.fiyatKurus, bedenler };
}

/** Son bakıştan bu yana haber sayılacak değişiklik; yoksa `undefined`. */
export function favoriDegisimi(
  onceki: UrunDurumu,
  simdi: UrunDurumu,
): Pick<FavoriHaberi, "indirim" | "gelenBedenler"> | undefined {
  const gelenBedenler = simdi.bedenler.filter((b) => !onceki.bedenler.includes(b));
  // Stokta hiçbir şey yoksa indirim alınamaz; haber değil.
  const indirim =
    simdi.fiyatKurus < onceki.fiyatKurus && simdi.bedenler.length > 0
      ? { eskiKurus: onceki.fiyatKurus, yeniKurus: simdi.fiyatKurus }
      : undefined;
  if (!indirim && gelenBedenler.length === 0) return undefined;
  return { indirim, gelenBedenler };
}

type Gonderici = typeof favoriHaberiEpostasi;

export type FavoriBildirimSonucu = { bakilan: number; gonderilen: number };

export async function favoriBildirimleriniGonder(
  gonderici: Gonderici = favoriHaberiEpostasi,
): Promise<FavoriBildirimSonucu> {
  const favoriler = await db.favorite.findMany({
    where: { product: { aktif: true, category: { aktif: true } } },
    orderBy: { olusturuldu: "asc" },
    select: {
      id: true,
      bakilanFiyatKurus: true,
      stoktakiBedenler: true,
      customer: {
        select: {
          id: true,
          eposta: true,
          adSoyad: true,
          pazarlamaIzni: true,
          epostaDogrulandi: true,
        },
      },
      product: {
        select: {
          ad: true,
          slug: true,
          fiyatKurus: true,
          variants: { select: { beden: true, stok: true } },
        },
      },
    },
    take: 5000,
  });

  // Müşteri başına: güncellenecek kayıtlar ve haberler.
  type Grup = {
    musteri: (typeof favoriler)[number]["customer"];
    guncellemeler: { id: string; durum: UrunDurumu }[];
    haberler: FavoriHaberi[];
  };
  const gruplar = new Map<string, Grup>();

  for (const f of favoriler) {
    const simdi = urunDurumu({ fiyatKurus: f.product.fiyatKurus, varyantlar: f.product.variants });
    const grup = gruplar.get(f.customer.id) ?? {
      musteri: f.customer,
      guncellemeler: [],
      haberler: [],
    };
    gruplar.set(f.customer.id, grup);

    const degisim =
      f.bakilanFiyatKurus === null
        ? undefined
        : favoriDegisimi({ fiyatKurus: f.bakilanFiyatKurus, bedenler: f.stoktakiBedenler }, simdi);

    const ayni =
      f.bakilanFiyatKurus === simdi.fiyatKurus &&
      f.stoktakiBedenler.length === simdi.bedenler.length &&
      simdi.bedenler.every((b) => f.stoktakiBedenler.includes(b));
    if (!ayni) grup.guncellemeler.push({ id: f.id, durum: simdi });

    if (degisim) grup.haberler.push({ urunAd: f.product.ad, slug: f.product.slug, ...degisim });
  }

  let gonderilen = 0;
  for (const { musteri, guncellemeler, haberler } of gruplar.values()) {
    const izinli = musteri.pazarlamaIzni && musteri.epostaDogrulandi !== null;
    if (izinli && haberler.length > 0) {
      const jeton = await jetonUret(musteri.id, "pazarlama-iptal");
      const sonuc: EpostaSonucu = await gonderici(musteri.eposta, {
        adSoyad: musteri.adSoyad,
        haberler,
        iptalJetonu: jeton,
      });
      // Gönderilemediyse kayıtlar eski halinde kalıyor: yarın yeniden.
      if (!sonuc.gonderildi) continue;
      gonderilen += 1;
    }
    for (const g of guncellemeler) {
      await db.favorite.update({
        where: { id: g.id },
        data: { bakilanFiyatKurus: g.durum.fiyatKurus, stoktakiBedenler: g.durum.bedenler },
      });
    }
  }

  return { bakilan: favoriler.length, gonderilen };
}
