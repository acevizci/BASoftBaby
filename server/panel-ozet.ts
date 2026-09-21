import "server-only";

/**
 * Panelin özet ekranının verisi.
 *
 * Bu ekranın sorusu "kaç ürünüm var" değil, **"bugün ne yapmam gerekiyor"**.
 * O yüzden sayılar başlı başına amaç değil: her biri bir işe ve o işin
 * süzülmüş listesine bağlanıyor. Sıfır olan iş sessiz duruyor, bekleyen iş
 * öne çıkıyor.
 *
 * Sayı çokluğuna rağmen tek bir `Promise.all` turu: sorgular birbirini
 * beklemiyor. Ekran zaten `force-dynamic` ve yalnızca mağaza sahibi açıyor.
 */

import { db } from "@/server/veritabani";
import { epostaAcikMi } from "@/server/eposta";
import { ayarlariGetir } from "@/server/sepet";
import { kunyeGetir } from "@/server/yasal";

/** Bu adedin altına düşen beden "azalan" sayılıyor. */
export const KRITIK_STOK = 3;

/** Kargoya verileli bu kadar gün geçtiyse takip edilmesi gerekiyor olabilir. */
const KARGO_GECIKME_GUN = 7;

export type Is = {
  ad: string;
  adet: number;
  adres: string;
  /** Bekleyen iş vurgulanıyor; sıfır olan sessiz duruyor. */
  acil: boolean;
  aciklama: string;
};

export type AzalanStok = {
  id: string;
  urunAd: string;
  slug: string;
  beden: string;
  renk: string;
  stok: number;
};

export type Bekleyen = {
  urunAd: string;
  slug: string;
  beden: string;
  renk: string;
  kisi: number;
};

export type Eksik = { ad: string; aciklama: string; adres: string };

export type PanelOzeti = {
  bugunAdet: number;
  bugunKurus: number;
  dunAdet: number;
  ayAdet: number;
  ayKurus: number;
  isler: Is[];
  azalanlar: AzalanStok[];
  bekleyenler: Bekleyen[];
  eksikler: Eksik[];
};

function gunBasi(kaymaGun = 0): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() - kaymaGun);
  return t;
}

export async function panelOzetiGetir(): Promise<PanelOzeti> {
  const bugun = gunBasi();
  const dun = gunBasi(1);
  const ayBasi = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
  const kargoSiniri = gunBasi(KARGO_GECIKME_GUN);

  // İptal edilen sipariş ciroya girmiyor; sayılırsa gün "iyi geçmiş" görünür.
  const satilan = { durum: { not: "iptal" } };

  const [
    bugunku,
    dunku,
    ayki,
    havaleBekleyen,
    hazirlanacak,
    gecikenKargo,
    tukenenBeden,
    azalanSatirlar,
    bekleyenGruplar,
    ayar,
    kunye,
    taslakYasal,
  ] = await Promise.all([
    db.order.aggregate({
      where: { ...satilan, olusturuldu: { gte: bugun } },
      _count: true,
      _sum: { toplamKurus: true },
    }),
    db.order.count({ where: { ...satilan, olusturuldu: { gte: dun, lt: bugun } } }),
    db.order.aggregate({
      where: { ...satilan, olusturuldu: { gte: ayBasi } },
      _count: true,
      _sum: { toplamKurus: true },
    }),
    db.order.count({ where: { durum: "bekliyor", odemeYontemi: "havale" } }),
    db.order.count({ where: { durum: "hazirlaniyor" } }),
    db.order.count({ where: { durum: "kargoda", guncellendi: { lt: kargoSiniri } } }),
    db.productVariant.count({ where: { stok: 0 } }),
    db.productVariant.findMany({
      where: { stok: { gt: 0, lte: KRITIK_STOK } },
      orderBy: { stok: "asc" },
      take: 10,
      select: {
        id: true,
        beden: true,
        renk: true,
        stok: true,
        product: { select: { ad: true, slug: true } },
      },
    }),
    // "Gelince haber ver" diyenler: hangi bedeni kaç kişi bekliyor. Neyin
    // önce sipariş edileceği sorusunun en doğrudan cevabı (K-28).
    db.stockAlert.groupBy({
      by: ["variantId"],
      _count: { _all: true },
      orderBy: { _count: { variantId: "desc" } },
      take: 8,
    }),
    ayarlariGetir(),
    kunyeGetir(),
    db.legalPage.count({ where: { taslakMi: true } }),
  ]);

  const bekleyenVaryantlar =
    bekleyenGruplar.length > 0
      ? await db.productVariant.findMany({
          where: { id: { in: bekleyenGruplar.map((g) => g.variantId) } },
          select: {
            id: true,
            beden: true,
            renk: true,
            product: { select: { ad: true, slug: true } },
          },
        })
      : [];

  const bekleyenler: Bekleyen[] = bekleyenGruplar
    .map((g) => {
      const v = bekleyenVaryantlar.find((b) => b.id === g.variantId);
      if (!v) return null;
      return {
        urunAd: v.product.ad,
        slug: v.product.slug,
        beden: v.beden,
        renk: v.renk,
        kisi: g._count._all,
      };
    })
    .filter((b): b is Bekleyen => b !== null);

  const isler: Is[] = [
    {
      ad: "Havale onayı bekliyor",
      adet: havaleBekleyen,
      adres: "/yonetim/siparisler?durum=bekliyor&yontem=havale",
      acil: havaleBekleyen > 0,
      aciklama: "Hesaba geçti mi diye bakılıp ödendi işaretlenecek.",
    },
    {
      ad: "Hazırlanacak",
      adet: hazirlanacak,
      adres: "/yonetim/siparisler?durum=hazirlaniyor",
      acil: hazirlanacak > 0,
      aciklama: "Ödemesi alınmış, paketlenip kargoya verilecek.",
    },
    {
      ad: `Kargoda ${KARGO_GECIKME_GUN} günden uzun`,
      adet: gecikenKargo,
      adres: "/yonetim/siparisler?durum=kargoda",
      acil: gecikenKargo > 0,
      aciklama: "Teslim görünmüyor; takip numarasından sorulabilir.",
    },
    {
      ad: "Tükenen beden",
      adet: tukenenBeden,
      adres: "/yonetim/stok",
      acil: tukenenBeden > 0,
      aciklama: "Stoğu sıfır olan beden-renk; vitrinde satın alınamıyor.",
    },
  ];

  // Kurulum eksikleri: mağazanın çalışmasını engelleyen ya da yasal olarak
  // gereken, ama panelde başka hiçbir yerde görünmeyen şeyler.
  const eksikler: Eksik[] = [];
  if (!ayar.havaleBilgisi.trim()) {
    eksikler.push({
      ad: "Havale bilgisi girilmemiş",
      aciklama:
        "Banka bilgisi boş olduğu için havale/EFT müşteriye hiç sunulmuyor; yalnızca kartla ödenebiliyor.",
      adres: "/yonetim/ayarlar",
    });
  }
  if (!kunye.unvan.trim() || !kunye.vergiNo.trim()) {
    eksikler.push({
      ad: "Satıcı künyesi eksik",
      aciklama:
        "Unvan ve vergi numarası mesafeli satışta müşteriye gösterilmesi zorunlu bilgiler.",
      adres: "/yonetim/ayarlar",
    });
  }
  if (taslakYasal > 0) {
    eksikler.push({
      ad: `${taslakYasal} yasal metin taslak durumda`,
      aciklama:
        "Sayfaların tepesinde taslak uyarısı görünüyor. Avukat onayı gelince taslak işareti kaldırılmalı.",
      adres: "/yonetim/yasal",
    });
  }
  if (!epostaAcikMi()) {
    eksikler.push({
      ad: "E-posta gönderimi kapalı",
      aciklama:
        "RESEND_ANAHTARI tanımlı değil: sipariş onayı, kargo bildirimi, şifre sıfırlama ve stok haberi gönderilmiyor. Akışlar çalışıyor, yalnızca e-posta atlanıyor.",
      adres: "/yonetim/tani",
    });
  }

  return {
    bugunAdet: bugunku._count,
    bugunKurus: bugunku._sum.toplamKurus ?? 0,
    dunAdet: dunku,
    ayAdet: ayki._count,
    ayKurus: ayki._sum.toplamKurus ?? 0,
    isler,
    azalanlar: azalanSatirlar.map((v) => ({
      id: v.id,
      urunAd: v.product.ad,
      slug: v.product.slug,
      beden: v.beden,
      renk: v.renk,
      stok: v.stok,
    })),
    bekleyenler,
    eksikler,
  };
}
