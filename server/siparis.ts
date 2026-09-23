/**
 * Sipariş oluşturma ve okuma.
 *
 * Siparişin tamamı tek bir veritabanı işlemi içinde yazılır: stok düşer,
 * numara sayacı artar, sipariş ve satırları oluşur. Araya başka bir müşteri
 * girip son adedi alırsa stok düşümü tutmaz ve işlem tümüyle geri alınır —
 * yani yarım sipariş ya da eksiye düşmüş stok kalmaz.
 *
 * Ödeme henüz yok (iyzico 04. adımda). Sipariş "havale/EFT bekliyor" durumunda
 * açılır; parayı gördüğünde ödeme durumunu panelden sen işaretlersin.
 *
 * Sipariş üye olarak verildiyse hesaba bağlanır ve "Siparişlerim"de görünür.
 * Üyeliksiz sipariş eskisi gibi numara ve e-postayla sorgulanır.
 */

import { db } from "@/server/veritabani";
import { hareketYaz } from "@/server/stok-hareket";
import { kargoHesapla, kuponOku, sepetIdOku, type SatisAyari } from "@/server/sepet";
import { enIyiKampanya, gecerliKampanyalar, indirimiDagit } from "@/server/kampanya";
import { renkAdlari } from "@/server/renkler";
import { takipAdresi, tasiyiciAdi } from "@/server/kargo";
import { suresiDolanlariKapat } from "@/server/odeme-suresi";

/**
 * Onay sayfasını açan çerezin adı. Burada duruyor çünkü "use server" işaretli
 * bir dosya yalnızca async fonksiyon dışa aktarabilir, sabit aktaramaz.
 */
export const SON_SIPARIS_CEREZI = "son-siparis";

export type SiparisGirdisi = {
  /**
   * Ön bilgilendirme formu ile mesafeli satış sözleşmesinin onaylandığı an.
   * Onay kutusu işaretlenmeden sipariş formu buraya hiç gelmiyor; tarih
   * kayda geçiyor ki sonradan "onaylamadım" denemesin (mevzuat gereği).
   */
  sozlesmeOnayi: Date;
  adSoyad: string;
  eposta: string;
  telefon: string;
  adres: string;
  ilce: string;
  il: string;
  postaKodu: string;
  not: string;
  /** Hediye paketi ve paketin içine konacak not (K-98). */
  hediyePaketi: boolean;
  hediyeNotu: string;
};

export type SiparisSonucu =
  | { tamam: true; numara: string; toplamKurus: number }
  | { tamam: false; hata: string };

/** BA-2026-0001 */
function numaraYaz(sayac: number, tarih: Date): string {
  return `BA-${tarih.getFullYear()}-${String(sayac).padStart(4, "0")}`;
}

export async function siparisOlustur(
  girdi: SiparisGirdisi,
  ayar: SatisAyari,
  /** Sipariş üye olarak veriliyorsa hesabın id'si; üyeliksizse boş. */
  customerId?: string,
  /** havale · kart. Kartta sipariş açılıyor, ödeme ekranı sonra geliyor. */
  odemeYontemi: "havale" | "kart" = "havale",
): Promise<SiparisSonucu> {
  // Süresi dolmuş bekleyen siparişlerin tuttuğu stok, yeni sipariş açılmadan
  // hemen önce serbest bırakılıyor. Zamanlı iş de aynı işi yapıyor ama günde
  // bir çalışıyor; son adet bedenler bunu bekleyemez.
  //
  // Eskiden buradaki çağrı yalnızca **kart** siparişlerini kapsıyordu; havale
  // siparişleri hiçbir temizliğe girmediği için stoğu süresiz tutuyordu
  // (K-64). Temizlik başarısız olursa sipariş yine de alınıyor: stok
  // serbest bırakılamaması müşteriyi satın almaktan alıkoymamalı.
  try {
    await suresiDolanlariKapat();
  } catch (hata) {
    console.error("Süresi dolan siparişler kapatılamadı:", hata);
  }

  const cartId = await sepetIdOku();
  if (!cartId) return { tamam: false, hata: "Sepetin boş görünüyor." };

  const satirlar = await db.cartItem.findMany({
    where: { cartId },
    include: { variant: { include: { product: true } } },
    orderBy: { id: "asc" },
  });

  const gecerli = satirlar.filter((s) => s.variant.product.aktif && s.variant.stok > 0);
  if (gecerli.length === 0) return { tamam: false, hata: "Sepetin boş görünüyor." };

  const yetersiz = gecerli.find((s) => s.adet > s.variant.stok);
  if (yetersiz) {
    return {
      tamam: false,
      hata: `${yetersiz.variant.product.ad} (${yetersiz.variant.beden}) için elde ${yetersiz.variant.stok} adet kaldı. Sepetteki adedi düşürüp tekrar dene.`,
    };
  }

  const kalemler = gecerli.map((s) => {
    const fiyatKurus = s.variant.fiyatKurus ?? s.variant.product.fiyatKurus;
    return {
      variantId: s.variantId,
      urunAd: s.variant.product.ad,
      slug: s.variant.product.slug,
      beden: s.variant.beden,
      renk: s.variant.renk,
      adet: s.adet,
      fiyatKurus,
    };
  });

  const araToplamKurus = kalemler.reduce((t, k) => t + k.fiyatKurus * k.adet, 0);

  // İndirim sepetteki hesabın aynısından geçer; müşterinin gördüğü tutarla
  // yazılan tutar ayrışmasın.
  const indirimSatirlari = gecerli.map((s) => ({
    productId: s.variant.productId,
    categoryId: s.variant.product.categoryId,
    araToplamKurus: (s.variant.fiyatKurus ?? s.variant.product.fiyatKurus) * s.adet,
  }));
  const kampanyalar = await gecerliKampanyalar(await kuponOku());
  const kampanya = enIyiKampanya(kampanyalar, indirimSatirlari, araToplamKurus);
  const indirimKurus = kampanya?.indirimKurus ?? 0;
  // Her satırın indirim payı; yalnızca kampanyanın kapsadığı satırlara (K-109).
  const paylar = indirimiDagit(
    kampanyalar.find((k) => k.id === kampanya?.id),
    indirimSatirlari,
    indirimKurus,
  );

  const kargoKurus = kargoHesapla(araToplamKurus - indirimKurus, ayar, true);
  const simdi = new Date();

  try {
    const numara = await db.$transaction(async (islem) => {
      for (const k of kalemler) {
        // Koşullu düşüm: stok yetmiyorsa hiçbir satır güncellenmez.
        const sonuc = await islem.productVariant.updateMany({
          where: { id: k.variantId, stok: { gte: k.adet } },
          data: { stok: { decrement: k.adet } },
        });
        if (sonuc.count !== 1) throw new Error("STOK");
      }

      const ayarSatiri = await islem.storeSetting.upsert({
        where: { id: "tek" },
        update: { sonSiparisNo: { increment: 1 } },
        create: { id: "tek", sonSiparisNo: 1 },
        select: { sonSiparisNo: true },
      });

      const siparis = await islem.order.create({
        data: {
          numara: numaraYaz(ayarSatiri.sonSiparisNo, simdi),
          customerId: customerId ?? null,
          odemeYontemi,
          sozlesmeOnayi: girdi.sozlesmeOnayi,
          adSoyad: girdi.adSoyad,
          eposta: girdi.eposta,
          telefon: girdi.telefon,
          adres: girdi.adres,
          ilce: girdi.ilce,
          il: girdi.il,
          postaKodu: girdi.postaKodu,
          not: girdi.not,
          hediyePaketi: girdi.hediyePaketi,
          hediyeNotu: girdi.hediyePaketi ? girdi.hediyeNotu : "",
          araToplamKurus,
          indirimKurus,
          kampanyaAdi: kampanya?.ad ?? null,
          kargoKurus,
          toplamKurus: araToplamKurus - indirimKurus + kargoKurus,
          satirlar: { create: kalemler.map((k, i) => ({ ...k, indirimKurus: paylar[i] })) },
        },
        select: { numara: true },
      });

      if (kampanya) {
        await islem.campaign.update({
          where: { id: kampanya.id },
          data: { kullanim: { increment: 1 } },
        });
      }

      // Stok hareketi siparişle aynı işlemde (K-103).
      await hareketYaz(
        islem,
        kalemler.map((k) => ({
          variantId: k.variantId,
          degisim: -k.adet,
          sebep: "siparis" as const,
          siparisNo: siparis.numara,
        })),
      );

      await islem.cartItem.deleteMany({ where: { cartId } });
      return siparis.numara;
    });

    return { tamam: true, numara, toplamKurus: araToplamKurus - indirimKurus + kargoKurus };
  } catch (hata) {
    if (hata instanceof Error && hata.message === "STOK") {
      return {
        tamam: false,
        hata: "Sepetindeki ürünlerden biri sen ödeme sayfasındayken tükendi. Sepetini bir kontrol et.",
      };
    }
    throw hata;
  }
}

export type SiparisSatiri = {
  urunAd: string;
  slug: string;
  beden: string;
  renk: string;
  renkAdi: string;
  adet: number;
  fiyatKurus: number;
  araToplamKurus: number;
};

export type Siparis = {
  numara: string;
  durum: string;
  odemeYontemi: string;
  odemeDurumu: string;
  adSoyad: string;
  eposta: string;
  telefon: string;
  adres: string;
  ilce: string;
  il: string;
  postaKodu: string;
  not: string;
  hediyePaketi: boolean;
  hediyeNotu: string;
  araToplamKurus: number;
  indirimKurus: number;
  kampanyaAdi: string | null;
  kargoKurus: number;
  toplamKurus: number;
  kargoTakipNo: string | null;
  sozlesmeOnayi: Date | null;
  /** Kartla ödemede son denemenin hatası; müşteriye sebebi gösterebilmek için. */
  sonOdemeHatasi?: string;
  /** Başarılı kart ödemesinin iyzico kimliği ve taksidi; panelde görünüyor. */
  odemeRef?: string;
  taksit?: number;
  /** Kargo gönderisi varsa taşıyıcının adı ve sorgulama adresi. */
  tasiyiciAdi?: string;
  takipAdresi?: string;
  olusturuldu: Date;
  satirlar: SiparisSatiri[];
};

type GonderiKaydi = {
  tasiyici: string;
  takipNo: string;
};

type OdemeKaydi = {
  durum: string;
  hata: string | null;
  saglayiciRef: string | null;
  taksit: number;
};

/** Sipariş kaydındaki ödeme girişimlerini ekranda görünen alanlara çevirir. */
function odemeOzeti(odemeler: OdemeKaydi[]): Pick<Siparis, "sonOdemeHatasi" | "odemeRef" | "taksit"> {
  const basarili = odemeler.find((o) => o.durum === "basarili");
  if (basarili) {
    return { odemeRef: basarili.saglayiciRef ?? undefined, taksit: basarili.taksit };
  }
  // En son deneme neden tutmadı: müşteriye de panele de aynı sebep gösteriliyor.
  const sonHata = odemeler.filter((o) => o.durum === "basarisiz").at(-1);
  return { sonOdemeHatasi: sonHata?.hata ?? undefined };
}

type SiparisSatiriKaydi = {
  urunAd: string;
  slug: string;
  beden: string;
  renk: string;
  adet: number;
  fiyatKurus: number;
};

/**
 * Renk adları dışarıdan veriliyor: renk listesi artık veritabanında (K-66)
 * ama bu işlev senkron kalsın diye çağıran okuyup geçiriyor.
 */
function siparisYap(
  adlar: Record<string, string>,
  s: Omit<
    Siparis,
    "satirlar" | "sonOdemeHatasi" | "odemeRef" | "taksit" | "tasiyiciAdi" | "takipAdresi"
  > & {
    satirlar: SiparisSatiriKaydi[];
    odemeler: OdemeKaydi[];
    gonderiler: GonderiKaydi[];
  },
): Siparis {
  const { odemeler, gonderiler, ...kalan } = s;
  const gonderi = gonderiler[0];

  return {
    ...kalan,
    ...odemeOzeti(odemeler),
    tasiyiciAdi: gonderi ? tasiyiciAdi(gonderi.tasiyici) : undefined,
    takipAdresi: gonderi ? takipAdresi(gonderi.tasiyici, gonderi.takipNo) : undefined,
    satirlar: s.satirlar.map((k) => ({
      ...k,
      renkAdi: adlar[k.renk] ?? k.renk,
      araToplamKurus: k.fiyatKurus * k.adet,
    })),
  };
}

/**
 * Sipariş takibi. Numara tek başına yetmez: e-posta da tutmalı, yoksa numara
 * deneyerek başkasının adresi görülebilirdi.
 */
export async function siparisGetir(numara: string, eposta: string): Promise<Siparis | undefined> {
  const kayit = await db.order.findUnique({
    where: { numara: numara.trim().toUpperCase() },
    include: {
      satirlar: { orderBy: { id: "asc" } },
      odemeler: { orderBy: { olusturuldu: "asc" } },
      gonderiler: { orderBy: { olusturuldu: "desc" }, take: 1 },
    },
  });
  if (!kayit) return undefined;
  // E-posta da kimlik: Türkçe yerelde küçültmek "I" harfini "ı" yapıp
  // eşleşmeyi bozar.
  if (kayit.eposta.toLowerCase() !== eposta.trim().toLowerCase()) {
    return undefined;
  }
  return siparisYap(await renkAdlari(), kayit);
}

/** Panel için: e-posta doğrulaması aranmaz, panel zaten şifreli. */
export async function siparisGetirPanel(numara: string): Promise<Siparis | undefined> {
  const kayit = await db.order.findUnique({
    where: { numara: numara.trim().toUpperCase() },
    include: {
      satirlar: { orderBy: { id: "asc" } },
      odemeler: { orderBy: { olusturuldu: "asc" } },
      gonderiler: { orderBy: { olusturuldu: "desc" }, take: 1 },
    },
  });
  return kayit ? siparisYap(await renkAdlari(), kayit) : undefined;
}
