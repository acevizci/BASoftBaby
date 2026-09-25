import "server-only";
import { db } from "@/server/veritabani";
import { belgeBasilabilirMi } from "@/server/siparis-belge";

/**
 * Günün işi.
 *
 * Panelde her şey ayrı ayrı vardı — sipariş listesi, süzgeçler, toplu etiket
 * — ama "bugün ne hazırlayacağım" sorusunun tek bir cevabı yoktu. Mağaza
 * sahibi listeyi süzüyor, siparişleri tek tek açıyor, hangi üründen kaç adet
 * toplayacağını kâğıda yazıyordu (K-59).
 *
 * Bu ekran iki şeyi yan yana koyuyor:
 *
 * 1. **Ödemesi tamamlanmış siparişler** — hazırlanacak olanlar. Ödemesi
 *    gelmemiş sipariş listede yok: onun için raftan ürün toplamak, parayı
 *    hiç almadan malı ayırmak demek.
 * 2. **Toplama listesi** — bütün siparişlerin ürünleri birleştirilmiş hâli.
 *    Beş siparişte geçen aynı bedeni beş kez rafa gitmek yerine bir kez
 *    alıyorsun.
 *
 * Gün sınırı **ödeme anına göre değil sipariş anına göre** çizilmiyor: havale
 * dün gelen siparişin parası bugün onaylanmış olabiliyor. O yüzden ölçüt
 * "bugün ödendi" değil, "şu an ödenmiş ve henüz kargoya verilmemiş" —
 * yapılacak iş bu.
 *
 * **Bu ekran kasten sayfalanmıyor** (K-67). Panelin bütün listeleri sayfalı
 * ama burası liste değil, iş emri: depoda dolaşırken elinde "1/3" yazan bir
 * toplama listesi olması, üç turda toplamak ya da bir sayfayı atlamak demek.
 * Liste zaten kendiliğinden sınırlı — kargoya verilmemiş ödenmiş siparişler
 * kadar. Uzarsa sorun sayfalama değil, siparişlerin hazırlanmamış olması.
 */

export type GunlukSatir = {
  numara: string;
  adSoyad: string;
  il: string;
  ilce: string;
  durum: string;
  odemeYontemi: string;
  toplamKurus: number;
  olusturuldu: Date;
  urunAdedi: number;
  /** Paketlerken atlanmasın diye listede işaretli (K-98). */
  hediyePaketi: boolean;
  /** Doğum listesi sahibinin adresine gidiyor (K-149): teslim alan başka biri. */
  listeAdresi: boolean;
  teslimAlan: string;
};

export type ToplamaSatiri = {
  urunAd: string;
  beden: string;
  renk: string;
  adet: number;
  /** Bu üründen kaç ayrı siparişte var. */
  siparisAdedi: number;
};

export type Gunluk = {
  gun: Date;
  siparisler: GunlukSatir[];
  toplama: ToplamaSatiri[];
  toplamKurus: number;
  toplamUrun: number;
  /** Bugün ödemesi onaylanan ama bu listeye girmeyenler (kargoya verilmiş). */
  bugunOdenen: number;
};

function gunBasi(t: Date): Date {
  const y = new Date(t);
  y.setHours(0, 0, 0, 0);
  return y;
}

/**
 * Hazırlanacak siparişler ve birleştirilmiş toplama listesi.
 *
 * `belgeBasilabilirMi` ile aynı ölçüt kullanılıyor: ödemesi tamamlanmamış ya
 * da iptal edilmiş sipariş ne belgelenebiliyor ne hazırlanıyor. Kuralın iki
 * yerde ayrı yazılması, birinin ötekini atlamasıyla biterdi (K-54).
 */
export async function gunlukListe(simdi: Date = new Date()): Promise<Gunluk> {
  const bugun = gunBasi(simdi);

  const kayitlar = await db.order.findMany({
    where: {
      odemeDurumu: "odendi",
      durum: { in: ["bekliyor", "hazirlaniyor"] },
    },
    orderBy: { olusturuldu: "asc" },
    select: {
      numara: true,
      adSoyad: true,
      il: true,
      ilce: true,
      durum: true,
      odemeDurumu: true,
      odemeYontemi: true,
      toplamKurus: true,
      olusturuldu: true,
      hediyePaketi: true,
      listeAdresi: true,
      teslimAlan: true,
      satirlar: {
        orderBy: { id: "asc" },
        select: { urunAd: true, beden: true, renk: true, adet: true },
      },
    },
  });

  const hazirlanacak = kayitlar.filter((k) => belgeBasilabilirMi(k).basilabilir);

  // Toplama listesi: ürün + beden + renk aynıysa tek satır.
  const birlesik = new Map<string, ToplamaSatiri>();
  for (const k of hazirlanacak) {
    for (const s of k.satirlar) {
      const anahtar = `${s.urunAd}|${s.beden}|${s.renk}`;
      const mevcut = birlesik.get(anahtar);
      if (mevcut) {
        mevcut.adet += s.adet;
        mevcut.siparisAdedi += 1;
      } else {
        birlesik.set(anahtar, {
          urunAd: s.urunAd,
          beden: s.beden,
          renk: s.renk,
          adet: s.adet,
          siparisAdedi: 1,
        });
      }
    }
  }

  const toplama = [...birlesik.values()].sort(
    (a, b) => a.urunAd.localeCompare(b.urunAd, "tr") || a.beden.localeCompare(b.beden, "tr"),
  );

  const bugunOdenen = await db.order.count({
    where: { odemeDurumu: "odendi", guncellendi: { gte: bugun } },
  });

  return {
    gun: bugun,
    siparisler: hazirlanacak.map((k) => ({
      numara: k.numara,
      adSoyad: k.adSoyad,
      il: k.il,
      ilce: k.ilce,
      durum: k.durum,
      odemeYontemi: k.odemeYontemi,
      toplamKurus: k.toplamKurus,
      olusturuldu: k.olusturuldu,
      urunAdedi: k.satirlar.reduce((t, s) => t + s.adet, 0),
      hediyePaketi: k.hediyePaketi,
      listeAdresi: k.listeAdresi,
      teslimAlan: k.teslimAlan,
    })),
    toplama,
    toplamKurus: hazirlanacak.reduce((t, k) => t + k.toplamKurus, 0),
    toplamUrun: toplama.reduce((t, s) => t + s.adet, 0),
    bugunOdenen,
  };
}
