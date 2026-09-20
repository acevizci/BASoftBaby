/**
 * Sepet — sunucu tarafı.
 *
 * Sepetin kendisi veritabanında durur; tarayıcıda yalnızca sepetin id'sini
 * taşıyan `sepet` çerezi vardır ve bu çerez httpOnly'dir. Yani sepeti sadece
 * sunucu değiştirebilir: müşteri fiyatı ya da adedi kurcalayamaz.
 *
 * Sepette fiyat saklanmaz. Fiyat her okumada üründen alınır, böylece panelden
 * yapılan bir fiyat değişikliği bekleyen sepetlere de yansır. Fiyat ancak
 * sipariş verildiği anda `OrderItem` içine kopyalanıp dondurulur.
 */

import { cookies } from "next/headers";
import { db } from "@/server/veritabani";
import {
  KUPON_CEREZI,
  enIyiKampanya,
  gecerliKampanyalar,
  type UygulananKampanya,
} from "@/server/kampanya";
import { RENK_ADLARI, type RenkAdi } from "@/ui/katalog-bicim";

const CEREZ = "sepet";
/** Sepet çerezi 30 gün yaşar. */
const CEREZ_OMRU = 60 * 60 * 24 * 30;

export type SepetSatiri = {
  variantId: string;
  productId: string;
  categoryId: string;
  slug: string;
  ad: string;
  beden: string;
  renk: string;
  renkAdi: string;
  gorsel: string;
  palet: string;
  adet: number;
  /** Birim fiyat, kuruş */
  fiyatKurus: number;
  araToplamKurus: number;
  /** Elde kalan adet; sepetteki adet bunu aşamaz */
  stok: number;
};

export type Sepet = {
  satirlar: SepetSatiri[];
  toplamAdet: number;
  araToplamKurus: number;
  /** Uygulanan kampanya; indirimler üst üste binmez, en çok indiren kazanır */
  kampanya?: UygulananKampanya;
  indirimKurus: number;
  /** Müşterinin yazdığı kupon kodu */
  kuponKodu?: string;
  /** Kod yazılmış ama geçerli bir kampanyaya denk gelmiyor */
  kuponGecersizMi: boolean;
  /** Kod geçerli ama başka bir kampanya daha çok indirdiği için uygulanmadı */
  kuponYetersizMi: boolean;
  kargoKurus: number;
  toplamKurus: number;
  /** Bedava kargoya kalan tutar; kargo zaten bedavaysa sıfır */
  bedavayaKalanKurus: number;
  /** Stoğu yetmeyen satır var mı — ödeme adımı bunu engeller */
  sorunluMu: boolean;
};

const BOS_SEPET: Sepet = {
  satirlar: [],
  toplamAdet: 0,
  araToplamKurus: 0,
  indirimKurus: 0,
  kuponGecersizMi: false,
  kuponYetersizMi: false,
  kargoKurus: 0,
  toplamKurus: 0,
  bedavayaKalanKurus: 0,
  sorunluMu: false,
};

/** Okuma amaçlı: çerez yoksa sepet yaratmaz, boş sepet döner. */
export async function sepetIdOku(): Promise<string | undefined> {
  const kavanoz = await cookies();
  return kavanoz.get(CEREZ)?.value;
}

/**
 * Yazma amaçlı: sepet yoksa oluşturur ve çerezi kurar. Yalnızca server
 * action içinden çağrılabilir, çünkü sayfa render'ı sırasında çerez yazılamaz.
 */
export async function sepetIdAlVeyaKur(): Promise<string> {
  const kavanoz = await cookies();
  const varOlan = kavanoz.get(CEREZ)?.value;
  if (varOlan) {
    const sepet = await db.cart.findUnique({ where: { id: varOlan }, select: { id: true } });
    if (sepet) return sepet.id;
  }

  const yeni = await db.cart.create({ data: {}, select: { id: true } });
  kavanoz.set(CEREZ, yeni.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CEREZ_OMRU,
  });
  return yeni.id;
}

export async function sepetiBosalt(): Promise<void> {
  const id = await sepetIdOku();
  if (id) await db.cartItem.deleteMany({ where: { cartId: id } });
}

function fiyatHesapla(urunFiyat: number, varyantFiyat: number | null): number {
  return varyantFiyat ?? urunFiyat;
}

export async function kuponOku(): Promise<string | undefined> {
  const kavanoz = await cookies();
  return kavanoz.get(KUPON_CEREZI)?.value || undefined;
}

export async function sepetGetir(): Promise<Sepet> {
  const id = await sepetIdOku();
  if (!id) return BOS_SEPET;

  const kuponKodu = await kuponOku();

  const [satirlar, ayar] = await Promise.all([
    db.cartItem.findMany({
      where: { cartId: id },
      include: { variant: { include: { product: true } } },
      orderBy: { id: "asc" },
    }),
    ayarlariGetir(),
  ]);

  const cikti: SepetSatiri[] = satirlar
    // Ürün yayından kaldırıldıysa sepette görünmesin
    .filter((s) => s.variant.product.aktif)
    .map((s) => {
      const fiyat = fiyatHesapla(s.variant.product.fiyatKurus, s.variant.fiyatKurus);
      // Stok azaldıysa satırı stoğa çekip göster; müşteri şaşırmasın diye
      // kaydı silmiyoruz, ekranda uyarı çıkıyor.
      const adet = Math.min(s.adet, s.variant.stok);
      return {
        variantId: s.variantId,
        productId: s.variant.productId,
        categoryId: s.variant.product.categoryId,
        slug: s.variant.product.slug,
        ad: s.variant.product.ad,
        beden: s.variant.beden,
        renk: s.variant.renk,
        renkAdi: RENK_ADLARI[s.variant.renk as RenkAdi] ?? s.variant.renk,
        gorsel: s.variant.product.gorsel,
        palet: s.variant.product.palet,
        adet,
        fiyatKurus: fiyat,
        araToplamKurus: fiyat * adet,
        stok: s.variant.stok,
      };
    });

  const araToplamKurus = cikti.reduce((t, s) => t + s.araToplamKurus, 0);
  const toplamAdet = cikti.reduce((t, s) => t + s.adet, 0);

  const kampanyalar = await gecerliKampanyalar(kuponKodu);
  const kampanya = enIyiKampanya(kampanyalar, cikti, araToplamKurus);
  const indirimKurus = kampanya?.indirimKurus ?? 0;

  // Kupon yazılmışsa müşteriye ne olduğunu söyleyebilmek için iki durumu
  // ayırıyoruz: kod hiç tutmadı mı, yoksa tuttu da başka kampanya mı kazandı.
  const kuponVar = Boolean(kuponKodu);
  const kuponEslesti = kuponVar && kampanyalar.some((k) => k.kuponKodu);
  const kuponUygulandi = kampanya?.kuponMu ?? false;

  // Bedava kargo eşiği indirimden SONRAKİ tutara bakar.
  const indirimliAraToplam = araToplamKurus - indirimKurus;
  const kargoKurus = kargoHesapla(indirimliAraToplam, ayar, cikti.length > 0);
  const kalan = ayar.bedavaKargoEsigi - indirimliAraToplam;

  return {
    satirlar: cikti,
    toplamAdet,
    araToplamKurus,
    kampanya,
    indirimKurus,
    kuponKodu,
    kuponGecersizMi: kuponVar && !kuponEslesti,
    kuponYetersizMi: kuponEslesti && !kuponUygulandi,
    kargoKurus,
    toplamKurus: indirimliAraToplam + kargoKurus,
    bedavayaKalanKurus: kargoKurus > 0 && kalan > 0 ? kalan : 0,
    sorunluMu: cikti.some((s) => s.stok === 0 || s.adet === 0),
  };
}

export type SatisAyari = {
  kargoKurus: number;
  bedavaKargoEsigi: number;
  havaleBilgisi: string;
};

export async function ayarlariGetir(): Promise<SatisAyari> {
  const ayar = await db.storeSetting.findUnique({ where: { id: "tek" } });
  return {
    kargoKurus: ayar?.kargoKurus ?? 4990,
    bedavaKargoEsigi: ayar?.bedavaKargoEsigi ?? 75000,
    havaleBilgisi: ayar?.havaleBilgisi ?? "",
  };
}

/**
 * Kargo ücreti. Eşiğe indirimden SONRAKİ tutara bakılır.
 *
 * "Sepet boş mu" ayrı bir parametre, çünkü tutarın sıfır olması sepetin boş
 * olduğu anlamına gelmiyor: kupon sepetin tamamını karşılamış da olabilir. O
 * durumda ürün bedava, kargo yine de ücretli.
 */
export function kargoHesapla(
  indirimliAraToplamKurus: number,
  ayar: SatisAyari,
  sepetDoluMu: boolean,
): number {
  if (!sepetDoluMu) return 0;
  if (ayar.bedavaKargoEsigi > 0 && indirimliAraToplamKurus >= ayar.bedavaKargoEsigi) return 0;
  return ayar.kargoKurus;
}

/** Üst çubuktaki rozet için; sepetin tamamını kurmaya değmez. */
export async function sepetAdedi(): Promise<number> {
  const id = await sepetIdOku();
  if (!id) return 0;
  const satirlar = await db.cartItem.findMany({
    where: { cartId: id },
    select: { adet: true, variant: { select: { stok: true } } },
  });
  return satirlar.reduce((t, s) => t + Math.min(s.adet, s.variant.stok), 0);
}
