import "server-only";
import { db } from "@/server/veritabani";
import { alanAramasi } from "@/ui/panel-arama-bicim";

/**
 * Müşteriler — panelin okuma tarafı.
 *
 * **Neden gerekti.** `Customer` tablosu vardı ama panelde hiçbir yerde
 * görünmüyordu (K-70). Mağaza sahibi "bu müşteri kaç sipariş verdi, toplam ne
 * harcadı, adresi ne" sorusuna bakamıyor, sipariş listesinde adı tek tek
 * arıyordu. KVKK tarafında da boşluk vardı: üye kendi verisini indirip
 * hesabını silebiliyordu (K-39) ama telefonla arayıp "verilerimi silin"
 * diyen biri için panelde bir yol yoktu.
 *
 * **Harcama yalnızca ödenmiş siparişlerden.** İptal edilmiş ya da parası
 * hiç gelmemiş sipariş "bu müşteri 12.000 ₺ harcadı" demez; öyle sayılsaydı
 * en değerli müşteri, en çok sipariş açıp ödemeyen kişi olurdu.
 *
 * **Üyeliksiz siparişler burada yok.** Bu ekran hesapların listesi; üyeliksiz
 * sipariş bir hesaba bağlı değil, sipariş ekranından aranıyor.
 */

export type MusteriSatiri = {
  id: string;
  eposta: string;
  adSoyad: string;
  telefon: string;
  epostaDogrulandi: Date | null;
  pazarlamaIzni: boolean;
  olusturuldu: Date;
  /** Ödenmiş sipariş adedi */
  siparisAdedi: number;
  /** Ödenmiş siparişlerin toplamı, kuruş */
  harcamaKurus: number;
  sonSiparis: Date | null;
};

const ODENMIS = { odemeDurumu: "odendi" } as const;

function kosulYap(ara: string): Record<string, unknown> {
  return alanAramasi(ara, ["eposta", "adSoyad", "telefon"]);
}

export async function musteriAdedi(ara = ""): Promise<number> {
  return db.customer.count({ where: kosulYap(ara) });
}

/**
 * Müşteri listesi, sayfalı.
 *
 * Harcama toplamı tek bir gruplama sorgusuyla geliyor, müşteri başına ayrı
 * sorgu açılmıyor: yirmi satırlık bir sayfa yirmi bir sorgu demek olurdu.
 */
export async function musteriler(atla = 0, adet = 20, ara = ""): Promise<MusteriSatiri[]> {
  const satirlar = await db.customer.findMany({
    where: kosulYap(ara),
    orderBy: { olusturuldu: "desc" },
    skip: atla,
    take: adet,
    select: {
      id: true,
      eposta: true,
      adSoyad: true,
      telefon: true,
      epostaDogrulandi: true,
      pazarlamaIzni: true,
      olusturuldu: true,
    },
  });
  if (satirlar.length === 0) return [];

  const ozetler = await db.order.groupBy({
    by: ["customerId"],
    where: { ...ODENMIS, customerId: { in: satirlar.map((m) => m.id) } },
    _count: { _all: true },
    _sum: { toplamKurus: true },
    _max: { olusturuldu: true },
  });
  const harita = new Map(ozetler.map((o) => [o.customerId, o]));

  return satirlar.map((m) => {
    const o = harita.get(m.id);
    return {
      ...m,
      siparisAdedi: o?._count._all ?? 0,
      harcamaKurus: o?._sum.toplamKurus ?? 0,
      sonSiparis: o?._max.olusturuldu ?? null,
    };
  });
}

export type MusteriKarti = {
  id: string;
  eposta: string;
  adSoyad: string;
  telefon: string;
  epostaDogrulandi: Date | null;
  pazarlamaIzni: boolean;
  pazarlamaIzniTarihi: Date | null;
  olusturuldu: Date;
  adresler: {
    id: string;
    baslik: string;
    adSoyad: string;
    telefon: string;
    adres: string;
    ilce: string;
    il: string;
    postaKodu: string;
    varsayilan: boolean;
  }[];
  siparisler: {
    numara: string;
    durum: string;
    odemeDurumu: string;
    toplamKurus: number;
    olusturuldu: Date;
    kalemAdedi: number;
  }[];
  /** Ödenmiş siparişlerin adedi ve toplamı */
  odenmisAdet: number;
  harcamaKurus: number;
  yorumAdedi: number;
  acikOturum: number;
};

/** Tek müşterinin kartı: siparişleri, adresleri ve izinleri. */
export async function musteriKarti(id: string): Promise<MusteriKarti | undefined> {
  const m = await db.customer.findUnique({
    where: { id },
    select: {
      id: true,
      eposta: true,
      adSoyad: true,
      telefon: true,
      epostaDogrulandi: true,
      pazarlamaIzni: true,
      pazarlamaIzniTarihi: true,
      olusturuldu: true,
      adresler: {
        orderBy: [{ varsayilan: "desc" }, { olusturuldu: "asc" }],
        select: {
          id: true,
          baslik: true,
          adSoyad: true,
          telefon: true,
          adres: true,
          ilce: true,
          il: true,
          postaKodu: true,
          varsayilan: true,
        },
      },
      siparisler: {
        orderBy: { olusturuldu: "desc" },
        select: {
          numara: true,
          durum: true,
          odemeDurumu: true,
          toplamKurus: true,
          olusturuldu: true,
          satirlar: { select: { adet: true } },
        },
      },
    },
  });
  if (!m) return undefined;

  const [ozet, yorumAdedi, acikOturum] = await Promise.all([
    db.order.aggregate({
      where: { ...ODENMIS, customerId: id },
      _count: { _all: true },
      _sum: { toplamKurus: true },
    }),
    db.review.count({ where: { orderItem: { order: { customerId: id } } } }),
    db.customerSession.count({ where: { customerId: id, biter: { gt: new Date() } } }),
  ]);

  return {
    ...m,
    siparisler: m.siparisler.map((s) => ({
      numara: s.numara,
      durum: s.durum,
      odemeDurumu: s.odemeDurumu,
      toplamKurus: s.toplamKurus,
      olusturuldu: s.olusturuldu,
      kalemAdedi: s.satirlar.reduce((t, k) => t + k.adet, 0),
    })),
    odenmisAdet: ozet._count._all,
    harcamaKurus: ozet._sum.toplamKurus ?? 0,
    yorumAdedi,
    acikOturum,
  };
}
