import "server-only";

/**
 * Satış raporunun kâr bölümü (K-113).
 *
 * Siparişin kârı sipariş ekranındakiyle aynı işlevden (`siparisKari`, K-112);
 * rapor yalnızca topluyor ve kırıyor.
 *
 * **Yalnızca ödemesi alınmış siparişler.** Ciro kutusu bekleyen havaleleri de
 * sayıyor (ne kadar sipariş geldi sorusu); kâr ise gerçekleşmiş olanı
 * soruyor. Ödemesi beklenen havale kendiliğinden iptal olabilir.
 */

import { db } from "@/server/veritabani";
import { ayarlariGetir } from "@/server/sepet";
import { kdvHaric, type SiparisKari } from "@/server/kar";
import { KAR_SECIMI, giderAyari, kayittanKar } from "@/server/siparis-kari";
import type { Donem } from "@/server/rapor";
import { yontemAdi } from "@/ui/siparis-bicim";

export type KarKirilimi = {
  ad: string;
  adet: number;
  netSatisKurus: number;
  karKurus: number;
  marjYuzde: number | null;
};

export type KarRaporu = {
  siparis: number;
  netSatisKurus: number;
  vadeFarkiKurus: number;
  maliyetKurus: number;
  brutKarKurus: number;
  kargoKurus: number;
  paketKurus: number;
  komisyonKurus: number;
  iadeKargoKurus: number;
  katkiKurus: number;
  marjYuzde: number | null;
  oncekiKatkiKurus: number;
  /** Eksik bilgiyle hesaplanan sipariş sayısı ve sebepleri. */
  eksikSiparis: number;
  eksikSebepler: string[];
  tahminiSiparis: number;
  /** Ürün ve kategori: brüt kâr (satır net satışı − maliyet), maliyeti olanlar. */
  urunler: KarKirilimi[];
  kategoriler: KarKirilimi[];
  /** Ödeme yöntemi ve kampanya: katkı payı. */
  odeme: KarKirilimi[];
  kampanyalar: (KarKirilimi & { indirimKurus: number })[];
  zararEdenler: { numara: string; katkiKurus: number; sebep: string }[];
  kargo: { bedava: KargoGrubu; ucretli: KargoGrubu };
};

export type KargoGrubu = { siparis: number; katkiKurus: number; kargoGiderKurus: number };

const SECIM = {
  ...KAR_SECIMI,
  numara: true,
  kargoKurus: true,
  kampanyaAdi: true,
  indirimKurus: true,
  satirlar: {
    select: {
      ...KAR_SECIMI.satirlar.select,
      urunAd: true,
      fiyatKurus: true,
      indirimKurus: true,
      variant: { select: { product: { select: { category: { select: { ad: true } } } } } },
    },
  },
} as const;

function marj(kar: number, satis: number): number | null {
  return satis > 0 ? (kar / satis) * 100 : null;
}

function ekle(harita: Map<string, KarKirilimi>, ad: string, adet: number, satis: number, kar: number) {
  const k = harita.get(ad) ?? { ad, adet: 0, netSatisKurus: 0, karKurus: 0, marjYuzde: null };
  k.adet += adet;
  k.netSatisKurus += satis;
  k.karKurus += kar;
  harita.set(ad, k);
}

function liste(harita: Map<string, KarKirilimi>): KarKirilimi[] {
  return [...harita.values()]
    .map((k) => ({ ...k, marjYuzde: marj(k.karKurus, k.netSatisKurus) }))
    .sort((a, b) => b.karKurus - a.karKurus);
}

const odendi = { odemeDurumu: { not: "bekliyor" }, durum: { not: "iptal" } };

export async function karRaporu(
  donem: Donem,
  /** Önceki dönemle karşılaştırma; ay ay döküm için gerekmiyor (K-115). */
  secenek: { onceki?: boolean } = {},
): Promise<KarRaporu> {
  const uzunluk = donem.bitis.getTime() - donem.baslangic.getTime();
  const oncekiIste = secenek.onceki ?? true;
  const [siparisler, oncekiler, ayar, gider] = await Promise.all([
    db.order.findMany({
      where: { ...odendi, olusturuldu: { gte: donem.baslangic, lt: donem.bitis } },
      select: SECIM,
    }),
    oncekiIste
      ? db.order.findMany({
          where: {
            ...odendi,
            olusturuldu: { gte: new Date(donem.baslangic.getTime() - uzunluk), lt: donem.baslangic },
          },
          select: KAR_SECIMI,
        })
      : Promise.resolve([]),
    ayarlariGetir(),
    giderAyari(),
  ]);

  const r: KarRaporu = {
    siparis: 0,
    netSatisKurus: 0,
    vadeFarkiKurus: 0,
    maliyetKurus: 0,
    brutKarKurus: 0,
    kargoKurus: 0,
    paketKurus: 0,
    komisyonKurus: 0,
    iadeKargoKurus: 0,
    katkiKurus: 0,
    marjYuzde: null,
    oncekiKatkiKurus: 0,
    eksikSiparis: 0,
    eksikSebepler: [],
    tahminiSiparis: 0,
    urunler: [],
    kategoriler: [],
    odeme: [],
    kampanyalar: [],
    zararEdenler: [],
    kargo: {
      bedava: { siparis: 0, katkiKurus: 0, kargoGiderKurus: 0 },
      ucretli: { siparis: 0, katkiKurus: 0, kargoGiderKurus: 0 },
    },
  };

  const sebepler = new Set<string>();
  const urunler = new Map<string, KarKirilimi>();
  const kategoriler = new Map<string, KarKirilimi>();
  const odeme = new Map<string, KarKirilimi>();
  const kampanyalar = new Map<string, KarKirilimi & { indirimKurus: number }>();

  for (const s of siparisler) {
    const k = kayittanKar(s, ayar.kdvOrani, gider) as SiparisKari;
    const kdv = s.fatura?.kdvOrani ?? ayar.kdvOrani;
    r.siparis += 1;
    r.netSatisKurus += k.netSatisKurus;
    r.vadeFarkiKurus += k.vadeFarkiKurus;
    r.maliyetKurus += k.maliyet.kurus ?? 0;
    r.brutKarKurus += k.brutKarKurus;
    r.kargoKurus += k.kargo.kurus ?? 0;
    r.paketKurus += k.paket.kurus ?? 0;
    r.komisyonKurus += k.komisyon.kurus ?? 0;
    r.iadeKargoKurus += k.iadeKargo.kurus ?? 0;
    r.katkiKurus += k.katkiKurus;
    if (k.eksikler.length > 0) {
      r.eksikSiparis += 1;
      for (const e of k.eksikler) sebepler.add(e.replace(/^\d+ ürünün/, "bazı ürünlerin"));
    }
    if (k.maliyet.tahmini || k.kargo.tahmini || k.komisyon.tahmini) r.tahminiSiparis += 1;

    const gelir = k.netSatisKurus + k.vadeFarkiKurus;
    ekle(odeme, yontemAdi(s.odemeYontemi), 1, gelir, k.katkiKurus);
    if (s.kampanyaAdi) {
      const kk = kampanyalar.get(s.kampanyaAdi) ?? {
        ad: s.kampanyaAdi, adet: 0, netSatisKurus: 0, karKurus: 0, marjYuzde: null, indirimKurus: 0,
      };
      kk.adet += 1;
      kk.netSatisKurus += gelir;
      kk.karKurus += k.katkiKurus;
      kk.indirimKurus += s.indirimKurus;
      kampanyalar.set(s.kampanyaAdi, kk);
    }
    if (k.katkiKurus < 0) {
      r.zararEdenler.push({
        numara: s.numara,
        katkiKurus: k.katkiKurus,
        sebep:
          k.brutKarKurus < 0
            ? "maliyetin altında satış"
            : (k.kargo.kurus ?? 0) > k.brutKarKurus / 2
              ? "kargo gideri"
              : "giderler",
      });
    }
    const grup = s.kargoKurus === 0 ? r.kargo.bedava : r.kargo.ucretli;
    grup.siparis += 1;
    grup.katkiKurus += k.katkiKurus;
    grup.kargoGiderKurus += k.kargo.kurus ?? 0;

    // Ürün ve kategori: satır bazında brüt kâr; maliyeti olmayan satır
    // kâra girmiyor (sıfır maliyetle kâr şişerdi).
    for (const x of s.satirlar) {
      const iade = x.talepSatirlari.reduce((t, q) => t + q.adet, 0);
      const kalan = Math.max(0, x.adet - iade);
      if (kalan === 0 || x.alisFiyatKurus === null) continue;
      const pay = x.indirimKurus === null ? 0 : Math.round((x.indirimKurus * kalan) / x.adet);
      const satis = kdvHaric(x.fiyatKurus * kalan - pay, kdv);
      const kar = satis - x.alisFiyatKurus * kalan;
      ekle(urunler, x.urunAd, kalan, satis, kar);
      ekle(kategoriler, x.variant?.product.category.ad ?? "Silinmiş ürün", kalan, satis, kar);
    }
  }

  for (const s of oncekiler) r.oncekiKatkiKurus += kayittanKar(s, ayar.kdvOrani, gider)?.katkiKurus ?? 0;

  r.marjYuzde = marj(r.katkiKurus, r.netSatisKurus + r.vadeFarkiKurus);
  r.eksikSebepler = [...sebepler];
  r.urunler = liste(urunler);
  r.kategoriler = liste(kategoriler);
  r.odeme = liste(odeme);
  r.kampanyalar = [...kampanyalar.values()]
    .map((k) => ({ ...k, marjYuzde: marj(k.karKurus, k.netSatisKurus) }))
    .sort((a, b) => b.adet - a.adet);
  r.zararEdenler.sort((a, b) => a.katkiKurus - b.katkiKurus);
  return r;
}
