import "server-only";

/**
 * Satış raporu.
 *
 * Panelin özet ekranı bugünü gösteriyor (K-32); burası bir dönemi gösteriyor:
 * ne kadar satıldı, neyden satıldı, nasıl ödendi.
 *
 * **İptaller hiçbir yere girmiyor.** İptal edilmiş sipariş ciro değil; sayılsa
 * iptallerle dolu bir ay iyi geçmiş görünürdü. Ama iptal **oranı** ayrıca
 * gösteriliyor — yükselen bir oran başlı başına bir haber.
 *
 * **İadeler ciroyu düşürmüyor, yanına yazılıyor.** İade edilmiş bir satış
 * ciro sayılmaya devam ederse ay iyi görünür; ciroyu doğrudan düşürmek ise
 * "ne kadar sattık" sorusunun cevabını kaybettiriyor — iade genelde satıştan
 * sonraki bir dönemde oluyor ve o dönemin cirosunu eksiye çekebiliyor. O
 * yüzden üç rakam birden veriliyor: **ciro**, **iade** ve **net** (K-61).
 * İade dönemi iadenin tamamlandığı güne göre sayılıyor, satışın gününe göre
 * değil: para o gün çıkıyor.
 *
 * **Her dönem bir öncekiyle karşılaştırılıyor.** Tek başına "42 sipariş" bir
 * şey söylemiyor; geçen ay 60'sa başka, 20'yse başka.
 */

import { db } from "@/server/veritabani";
import { RENK_ADLARI, type RenkAdi } from "@/ui/katalog-bicim";

export type Donem = { baslangic: Date; bitis: Date; ad: string };

export type Sutun = { etiket: string; deger: number };

export type SatirOzeti = { ad: string; adet: number; kurus: number };

export type Rapor = {
  donem: Donem;
  siparis: number;
  kurus: number;
  /** Dönemde tamamlanan para iadeleri (K-61). */
  iadeKurus: number;
  iadeAdedi: number;
  /** Ciro eksi iade. */
  netKurus: number;
  urunAdedi: number;
  ortalamaSepetKurus: number;
  /** Önceki eşit uzunluktaki dönem; karşılaştırma için. */
  oncekiSiparis: number;
  oncekiKurus: number;
  iptal: number;
  iptalOrani: number;
  gunluk: Sutun[];
  kategoriler: SatirOzeti[];
  urunler: SatirOzeti[];
  bedenler: SatirOzeti[];
  odeme: SatirOzeti[];
};

/** Hazır dönemler; adres satırında `donem=` ile seçiliyor. */
export const HAZIR_DONEMLER = ["bu-ay", "gecen-ay", "son-30", "son-12-ay"] as const;
export type HazirDonem = (typeof HAZIR_DONEMLER)[number];

export const DONEM_ADLARI: Record<HazirDonem, string> = {
  "bu-ay": "Bu ay",
  "gecen-ay": "Geçen ay",
  "son-30": "Son 30 gün",
  "son-12-ay": "Son 12 ay",
};

function gunBasi(t: Date): Date {
  const y = new Date(t);
  y.setHours(0, 0, 0, 0);
  return y;
}

function gunEkle(t: Date, gun: number): Date {
  const y = new Date(t);
  y.setDate(y.getDate() + gun);
  return y;
}

/** YYYY-MM-DD; geçersizse undefined. */
function gunCoz(deger: string | undefined): Date | undefined {
  if (!deger || !/^\d{4}-\d{2}-\d{2}$/.test(deger)) return undefined;
  const t = new Date(`${deger}T00:00:00`);
  return Number.isNaN(t.getTime()) ? undefined : t;
}

export function gunYaz(t: Date): string {
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

/**
 * Adres satırındaki değerleri döneme çevirir.
 *
 * Elle girilen tarih hazır dönemi geçersiz kılıyor: insan tarih yazdıysa onu
 * istiyordur. Bitiş günü **dahil** — 21 Eylül seçildiğinde o günün akşamı da
 * giriyor.
 */
export function donemCoz(
  parametreler: Record<string, string | string[] | undefined>,
): Donem {
  const tek = (ad: string) => {
    const d = parametreler[ad];
    return typeof d === "string" && d.trim() !== "" ? d.trim() : undefined;
  };

  const elleBaslangic = gunCoz(tek("baslangic"));
  const elleBitis = gunCoz(tek("bitis"));
  if (elleBaslangic || elleBitis) {
    const bugun = gunBasi(new Date());
    const b = elleBaslangic ?? gunEkle(bugun, -30);
    const s = gunEkle(elleBitis ?? bugun, 1);
    return { baslangic: b, bitis: s, ad: "Seçilen aralık" };
  }

  const secilen = tek("donem");
  const kod: HazirDonem = (HAZIR_DONEMLER as readonly string[]).includes(secilen ?? "")
    ? (secilen as HazirDonem)
    : "bu-ay";

  const bugun = gunBasi(new Date());
  const yarin = gunEkle(bugun, 1);

  switch (kod) {
    case "gecen-ay": {
      const b = new Date(bugun.getFullYear(), bugun.getMonth() - 1, 1);
      const s = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
      return { baslangic: b, bitis: s, ad: DONEM_ADLARI[kod] };
    }
    case "son-30":
      return { baslangic: gunEkle(bugun, -29), bitis: yarin, ad: DONEM_ADLARI[kod] };
    case "son-12-ay": {
      const b = new Date(bugun.getFullYear(), bugun.getMonth() - 11, 1);
      return { baslangic: b, bitis: yarin, ad: DONEM_ADLARI[kod] };
    }
    default:
      return {
        baslangic: new Date(bugun.getFullYear(), bugun.getMonth(), 1),
        bitis: yarin,
        ad: DONEM_ADLARI["bu-ay"],
      };
  }
}

const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/**
 * Dönemi sütunlara böler.
 *
 * Altmış günden uzun dönem aya, kısası güne bölünüyor: bir yılı 365 sütunda
 * göstermek grafik değil duvar olurdu.
 */
function sutunlariKur(donem: Donem): { anahtar: (t: Date) => string; sutunlar: Sutun[] } {
  const gunSayisi = Math.round((donem.bitis.getTime() - donem.baslangic.getTime()) / 86_400_000);

  if (gunSayisi > 60) {
    const anahtar = (t: Date) => `${t.getFullYear()}-${t.getMonth()}`;
    const sutunlar: Sutun[] = [];
    const imlec = new Date(donem.baslangic.getFullYear(), donem.baslangic.getMonth(), 1);
    while (imlec < donem.bitis) {
      sutunlar.push({ etiket: AYLAR[imlec.getMonth()], deger: 0 });
      imlec.setMonth(imlec.getMonth() + 1);
    }
    return { anahtar, sutunlar };
  }

  const anahtar = (t: Date) => gunYaz(t);
  const sutunlar: Sutun[] = [];
  for (let i = 0; i < gunSayisi; i += 1) {
    const g = gunEkle(donem.baslangic, i);
    sutunlar.push({ etiket: String(g.getDate()), deger: 0 });
  }
  return { anahtar, sutunlar };
}

function sutunIndeksi(donem: Donem, t: Date, aylikMi: boolean): number {
  if (!aylikMi) {
    return Math.floor((gunBasi(t).getTime() - donem.baslangic.getTime()) / 86_400_000);
  }
  return (
    (t.getFullYear() - donem.baslangic.getFullYear()) * 12 +
    (t.getMonth() - donem.baslangic.getMonth())
  );
}

export async function raporGetir(donem: Donem): Promise<Rapor> {
  const uzunlukMs = donem.bitis.getTime() - donem.baslangic.getTime();
  const oncekiBaslangic = new Date(donem.baslangic.getTime() - uzunlukMs);

  const satilan = { durum: { not: "iptal" } };
  const aralik = { gte: donem.baslangic, lt: donem.bitis };

  const [siparisler, onceki, iptal, iadeler, satirlar] = await Promise.all([
    db.order.findMany({
      where: { ...satilan, olusturuldu: aralik },
      select: { toplamKurus: true, odemeYontemi: true, olusturuldu: true },
    }),
    db.order.aggregate({
      where: { ...satilan, olusturuldu: { gte: oncekiBaslangic, lt: donem.baslangic } },
      _count: true,
      _sum: { toplamKurus: true },
    }),
    db.order.count({ where: { durum: "iptal", olusturuldu: aralik } }),
    // İade dönemi tamamlandığı güne göre: para o gün çıkıyor.
    db.refund.aggregate({
      where: { durum: "tamamlandi", tamamlandi: aralik },
      _count: true,
      _sum: { tutarKurus: true },
    }),
    db.orderItem.findMany({
      where: { order: { ...satilan, olusturuldu: aralik } },
      select: {
        urunAd: true,
        beden: true,
        renk: true,
        adet: true,
        fiyatKurus: true,
        variant: { select: { product: { select: { category: { select: { ad: true } } } } } },
      },
    }),
  ]);

  const kurus = siparisler.reduce((t, s) => t + s.toplamKurus, 0);
  const iadeKurus = iadeler._sum.tutarKurus ?? 0;
  const urunAdedi = satirlar.reduce((t, s) => t + s.adet, 0);

  // Sütunlar
  const { sutunlar } = sutunlariKur(donem);
  const aylikMi = sutunlar.length > 0 && Number.isNaN(Number(sutunlar[0].etiket));
  for (const s of siparisler) {
    const i = sutunIndeksi(donem, s.olusturuldu, aylikMi);
    if (i >= 0 && i < sutunlar.length) sutunlar[i].deger += s.toplamKurus;
  }

  // Kırılımlar
  const topla = (anahtar: (s: (typeof satirlar)[number]) => string): SatirOzeti[] => {
    const harita = new Map<string, SatirOzeti>();
    for (const s of satirlar) {
      const ad = anahtar(s);
      const kayit = harita.get(ad) ?? { ad, adet: 0, kurus: 0 };
      kayit.adet += s.adet;
      kayit.kurus += s.adet * s.fiyatKurus;
      harita.set(ad, kayit);
    }
    return [...harita.values()].sort((a, b) => b.kurus - a.kurus);
  };

  const odeme = new Map<string, SatirOzeti>();
  for (const s of siparisler) {
    const ad = s.odemeYontemi === "kart" ? "Kart" : "Havale / EFT";
    const kayit = odeme.get(ad) ?? { ad, adet: 0, kurus: 0 };
    kayit.adet += 1;
    kayit.kurus += s.toplamKurus;
    odeme.set(ad, kayit);
  }

  return {
    donem,
    siparis: siparisler.length,
    kurus,
    iadeKurus,
    iadeAdedi: iadeler._count,
    netKurus: kurus - iadeKurus,
    urunAdedi,
    ortalamaSepetKurus: siparisler.length > 0 ? Math.round(kurus / siparisler.length) : 0,
    oncekiSiparis: onceki._count,
    oncekiKurus: onceki._sum.toplamKurus ?? 0,
    iptal,
    iptalOrani: siparisler.length + iptal > 0 ? iptal / (siparisler.length + iptal) : 0,
    gunluk: sutunlar,
    // Ürünü silinmiş satırın kategorisi bilinmiyor; "bilinmeyen" demek yerine
    // olduğu gibi yazılıyor.
    kategoriler: topla((s) => s.variant?.product.category.ad ?? "Kataloğdan kaldırılmış"),
    urunler: topla((s) => s.urunAd).slice(0, 10),
    bedenler: topla((s) => s.beden),
    odeme: [...odeme.values()].sort((a, b) => b.kurus - a.kurus),
  };
}

/** Muhasebeye ya da tabloya aktarmak için satır satır döküm. */
export async function raporCsv(donem: Donem): Promise<string> {
  const satirlar = await db.order.findMany({
    where: { durum: { not: "iptal" }, olusturuldu: { gte: donem.baslangic, lt: donem.bitis } },
    orderBy: { olusturuldu: "asc" },
    select: {
      numara: true, olusturuldu: true, durum: true, odemeYontemi: true, odemeDurumu: true,
      adSoyad: true, il: true, ilce: true,
      araToplamKurus: true, indirimKurus: true, kargoKurus: true, toplamKurus: true,
      satirlar: { select: { urunAd: true, beden: true, renk: true, adet: true, fiyatKurus: true } },
    },
  });

  const kacir = (d: string) => `"${d.replace(/"/g, '""')}"`;
  const tutar = (k: number) => (k / 100).toFixed(2).replace(".", ",");

  const basliklar = [
    "Sipariş no", "Tarih", "Durum", "Ödeme yöntemi", "Ödeme durumu",
    "Müşteri", "İl", "İlçe", "Ürün", "Beden", "Renk", "Adet", "Birim fiyat",
    "Satır tutarı", "Sipariş ara toplam", "Sipariş indirim", "Sipariş kargo", "Sipariş toplam",
  ];

  const govde = satirlar.flatMap((s) =>
    s.satirlar.map((u) =>
      [
        s.numara,
        s.olusturuldu.toLocaleString("tr-TR"),
        s.durum,
        s.odemeYontemi,
        s.odemeDurumu,
        s.adSoyad,
        s.il,
        s.ilce,
        u.urunAd,
        u.beden,
        RENK_ADLARI[u.renk as RenkAdi] ?? u.renk,
        String(u.adet),
        tutar(u.fiyatKurus),
        tutar(u.adet * u.fiyatKurus),
        tutar(s.araToplamKurus),
        tutar(s.indirimKurus),
        tutar(s.kargoKurus),
        tutar(s.toplamKurus),
      ].map(kacir).join(";"),
    ),
  );

  // Noktalı virgül ve BOM: Türkçe Excel dosyayı çift tıklayınca doğru açsın
  // (K-26'da CSV okurken de aynı gerçekle karşılaşmıştık).
  return `﻿${[basliklar.map(kacir).join(";"), ...govde].join("\r\n")}\r\n`;
}
