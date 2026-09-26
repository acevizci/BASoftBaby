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
  kampanyaIndirimi,
  kapsamdaMi,
  kuponEngeli as kuponEngeli_,
  sonrakiKademe,
  type KampanyaKaydi,
  type IndirimSatiri,
  type UygunlukEngeli,
  type UygulananKampanya,
} from "@/server/kampanya";
import { paletCoz, type Palet } from "@/ui/katalog-bicim";
import { renkAdlari, tumRenkSecenekleri } from "@/server/renkler";
import { ETIKETLER, paylasilanOnbellek } from "@/server/onbellek";
import { girisYapan } from "@/server/uyelik";

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
  /** Çizimin çözülmüş paleti; renk listesi artık veritabanında (K-66) */
  paletRenkleri: Palet;
  /** Yüklenmiş ilk fotoğraf; yoksa çizim gösterilir. */
  fotograf?: { id: string; yol: string; kucukYol: string; altMetin: string; genislik: number; yukseklik: number };
  adet: number;
  /** Birim fiyat, kuruş */
  fiyatKurus: number;
  araToplamKurus: number;
  /** Elde kalan adet; sepetteki adet bunu aşamaz */
  stok: number;
  /**
   * Stok azaldığı için adet bu okumada düşürüldüyse müşterinin koyduğu
   * adet (K-105). Düşürme kayda da yazıldığı için bir kez görünüyor.
   */
  azaltildi?: number;
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
  /**
   * Kod geçerli ama bu sepete uymuyor (K-168): alt sınırın altında (`kalanKurus`
   * kadar eksik) ya da kapsamındaki ürün sepette yok / "X al Y öde" için adet az.
   * Eskiden ikisinde de "daha çok indiren kampanya var" deniyordu.
   */
  kuponUymuyor?:
    | { sebep: "alt-sinir"; kalanKurus: number }
    | { sebep: "kapsam" }
    /** Ücretsiz kargo kuponu ama kargo zaten bedava. */
    | { sebep: "kargo-zaten" };
  /** Kod var ama bu müşteriye uygun değil (K-170). */
  kuponEngeli?: UygunlukEngeli;
  /** Biraz daha alışverişle kazanılacak kampanya (K-170). */
  firsat?: { ad: string; kalanKurus: number; kazancKurus?: number; kargo?: boolean };
  kargoKurus: number;
  toplamKurus: number;
  /** Bedava kargoya kalan tutar; kargo zaten bedavaysa sıfır */
  bedavayaKalanKurus: number;
  /** Stoğu yetmeyen satır var mı — ödeme adımı bunu engeller */
  sorunluMu: boolean;
  /** Satıştan kalktığı için bu okumada sepetten çıkarılan ürün sayısı (K-105). */
  cikarilan: number;
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
  cikarilan: 0,
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
    const sepet = await db.cart.findUnique({
      where: { id: varOlan },
      select: { id: true, customerId: true },
    });
    if (sepet) {
      if (!sepet.customerId) await sepetiUyeyeBagla(sepet.id);
      return sepet.id;
    }
  }

  const musteri = await girisYapan();
  const yeni = await db.cart.create({
    data: { customerId: musteri?.id ?? null },
    select: { id: true },
  });
  kavanoz.set(CEREZ, yeni.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CEREZ_OMRU,
  });
  return yeni.id;
}

/**
 * Sepeti giriş yapmış üyeye bağlar.
 *
 * Sepet çerezle taşınıyor, yani kime ait olduğu kendiliğinden bilinmiyor.
 * Bırakılan sepet hatırlatması ancak bu bağ kurulduysa gönderilebiliyor:
 * adresi olmayan birine e-posta atılamaz. Üyeliksiz sepetler bağsız kalıyor
 * ve hiçbir zaman hatırlatılmıyor.
 */
export async function sepetiUyeyeBagla(sepetId?: string): Promise<void> {
  const id = sepetId ?? (await sepetIdOku());
  if (!id) return;

  const musteri = await girisYapan();
  if (!musteri) return;

  // Sahipsiz sepet bağlanıyor; başkasına bağlı sepete dokunulmuyor.
  await db.cart.updateMany({
    where: { id, customerId: null },
    data: { customerId: musteri.id },
  });
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

  const [satirlar, ayar, adlar, renkSecenekleri] = await Promise.all([
    db.cartItem.findMany({
      where: { cartId: id },
      include: {
        variant: {
          include: { product: { include: { images: { orderBy: { sira: "asc" }, take: 1 } } } },
        },
      },
      orderBy: { id: "asc" },
    }),
    ayarlariGetir(),
    renkAdlari(),
    tumRenkSecenekleri(),
  ]);

  // Yayından kalkan ürün sepetten çıkarılıyor ve bir kez söyleniyor.
  // Eskiden yalnızca gizleniyordu: müşteri ürünün nereye gittiğini
  // bilmiyordu, kayıt da sepette sonsuza kadar kalıyordu (K-105).
  const pasifler = satirlar.filter((s) => !s.variant.product.aktif).map((s) => s.id);
  if (pasifler.length > 0) await db.cartItem.deleteMany({ where: { id: { in: pasifler } } });

  // Stok sepetteki adedin altına düştüyse adet **kayıtta da** düşürülüyor.
  // Eskiden yalnızca ekranda düşüyordu: sepet "1" gösterirken kayıtta 3
  // kalıyor, ödeme "elde 1 adet kaldı, adedi düşür" diye reddediyordu —
  // müşteri ekranda zaten 1 görüyordu (K-105).
  const azalanlar = satirlar.filter(
    (s) => s.variant.product.aktif && s.variant.stok > 0 && s.adet > s.variant.stok,
  );
  for (const s of azalanlar) {
    await db.cartItem.update({ where: { id: s.id }, data: { adet: s.variant.stok } });
  }

  const cikti: SepetSatiri[] = satirlar
    .filter((s) => s.variant.product.aktif)
    .map((s) => {
      const fiyat = fiyatHesapla(s.variant.product.fiyatKurus, s.variant.fiyatKurus);
      // Tükenen satır sepette kalıyor, ekranda "tükendi" yazıyor: müşteri
      // ne olduğunu görsün, kendisi çıkarsın.
      const adet = Math.min(s.adet, s.variant.stok);
      return {
        variantId: s.variantId,
        productId: s.variant.productId,
        categoryId: s.variant.product.categoryId,
        slug: s.variant.product.slug,
        ad: s.variant.product.ad,
        beden: s.variant.beden,
        renk: s.variant.renk,
        renkAdi: adlar[s.variant.renk] ?? s.variant.renk,
        gorsel: s.variant.product.gorsel,
        palet: s.variant.product.palet,
        paletRenkleri: paletCoz(renkSecenekleri, s.variant.product.palet),
        fotograf: s.variant.product.images[0]
          ? {
              id: s.variant.product.images[0].id,
              yol: s.variant.product.images[0].yol,
              kucukYol: s.variant.product.images[0].kucukYol || s.variant.product.images[0].yol,
              altMetin: s.variant.product.images[0].altMetin || s.variant.product.ad,
              genislik: s.variant.product.images[0].genislik,
              yukseklik: s.variant.product.images[0].yukseklik,
            }
          : undefined,
        adet,
        fiyatKurus: fiyat,
        araToplamKurus: fiyat * adet,
        stok: s.variant.stok,
        azaltildi: s.variant.stok > 0 && s.adet > s.variant.stok ? s.adet : undefined,
      };
    });

  const araToplamKurus = cikti.reduce((t, s) => t + s.araToplamKurus, 0);
  const toplamAdet = cikti.reduce((t, s) => t + s.adet, 0);

  // Kişiye özel kupon yalnızca sahibine (K-151); üyelere özel, ilk sipariş ve
  // kişi başı sınırlı kampanyalar da üyeye göre (K-170).
  const uye = await girisYapan();
  const kampanyalar = await gecerliKampanyalar(kuponKodu, undefined, uye?.id);
  // Ücretsiz kargo kampanyası öteki indirimlerle kampanyasız kargo ücretiyle
  // yarışıyor (K-170).
  const dolu = cikti.length > 0;
  const kargoHam = kargoHesapla(araToplamKurus, ayar, dolu);
  const kampanya = enIyiKampanya(kampanyalar, cikti, araToplamKurus, kargoHam);
  const indirimKurus = kampanya?.indirimKurus ?? 0;

  // Kupon yazılmışsa müşteriye ne olduğunu söyleyebilmek için iki durumu
  // ayırıyoruz: kod hiç tutmadı mı, yoksa tuttu da başka kampanya mı kazandı.
  const kuponVar = Boolean(kuponKodu);
  const kuponEslesti = kuponVar && kampanyalar.some((k) => k.kuponKodu);
  const kuponUygulandi = kampanya?.kuponMu ?? false;
  // Kupon neden uygulanmadı: sepete uymuyor mu, yoksa başka kampanya mı kazandı.
  const kuponKampanyasi = kampanyalar.find((k) => k.kuponKodu);
  const kuponUymuyor: Sepet["kuponUymuyor"] =
    kuponKampanyasi && !kuponUygulandi
      ? araToplamKurus < kuponKampanyasi.enAzSepetKurus
        ? { sebep: "alt-sinir", kalanKurus: kuponKampanyasi.enAzSepetKurus - araToplamKurus }
        : kuponKampanyasi.tip === "kargo"
          ? kargoHam === 0
            ? { sebep: "kargo-zaten" }
            : undefined
          : kampanyaIndirimi(kuponKampanyasi, cikti, araToplamKurus) <= 0
            ? { sebep: "kapsam" }
            : undefined
      : undefined;
  // Kod var ama uygun değil (K-170): üye girişi, ilk sipariş, kişi başı hak.
  const kuponEngeli =
    kuponVar && !kuponEslesti ? await kuponEngeli_(kuponKodu!, uye?.id) : undefined;

  // Bedava kargo eşiği indirimden SONRAKİ tutara bakar; ücretsiz kargo
  // kampanyası kazandıysa kargo yok.
  const indirimliAraToplam = araToplamKurus - indirimKurus;
  const kargoKurus = kampanya?.kargoBedava ? 0 : kargoHesapla(indirimliAraToplam, ayar, dolu);
  const kalan = ayar.bedavaKargoEsigi - indirimliAraToplam;

  // "Sepete X ₺ daha ekle, indirim kazan" (K-170): kendiliğinden uygulanan
  // kampanyalardan alt sınırı ya da sonraki basamağı en yakın olan.
  const firsat = dolu
    ? sonrakiFirsat(kampanyalar, cikti, araToplamKurus, indirimKurus, kargoKurus)
    : undefined;

  return {
    satirlar: cikti,
    toplamAdet,
    araToplamKurus,
    kampanya,
    indirimKurus,
    kuponKodu,
    kuponGecersizMi: kuponVar && !kuponEslesti,
    kuponYetersizMi: kuponEslesti && !kuponUygulandi && !kuponUymuyor,
    kuponUymuyor,
    kuponEngeli,
    firsat,
    kargoKurus,
    toplamKurus: indirimliAraToplam + kargoKurus,
    bedavayaKalanKurus: kargoKurus > 0 && kalan > 0 ? kalan : 0,
    sorunluMu: cikti.some((s) => s.stok === 0 || s.adet === 0),
    cikarilan: pasifler.length,
  };
}

/**
 * En yakın fırsat (K-170): kendiliğinden uygulanan (kuponsuz) kampanyalardan
 * alt sınırına ya da sonraki basamağına en az tutar kalan. Şu an uygulanan
 * indirimden fazlasını kazandırmayan fırsat gösterilmiyor.
 */
function sonrakiFirsat(
  kampanyalar: KampanyaKaydi[],
  satirlar: IndirimSatiri[],
  araToplamKurus: number,
  simdikiIndirim: number,
  /** Şu an ödenecek kargo; sıfırsa kargo fırsatı anlamsız. */
  kargoKurus: number,
): Sepet["firsat"] {
  let en: Sepet["firsat"];
  for (const k of kampanyalar) {
    if (k.kuponKodu) continue;
    if (k.tip === "kargo" && kargoKurus === 0) continue;
    const taban = satirlar
      .filter((x) => kapsamdaMi(k, x))
      .reduce((t, x) => t + x.araToplamKurus, 0);
    if (taban <= 0) continue;
    let kalanKurus = 0;
    let kazancKurus: number | undefined;
    if (k.tip === "kademeli") {
      const sonraki = sonrakiKademe(k.kademeler, taban);
      if (!sonraki) continue;
      kalanKurus = Math.max(sonraki.esikKurus - taban, k.enAzSepetKurus - araToplamKurus);
      kazancKurus = sonraki.indirimKurus;
    } else if (araToplamKurus < k.enAzSepetKurus) {
      kalanKurus = k.enAzSepetKurus - araToplamKurus;
      if (k.tip === "tutar") kazancKurus = k.deger;
    } else continue;
    if (kazancKurus !== undefined && kazancKurus <= simdikiIndirim) continue;
    if (!en || kalanKurus < en.kalanKurus) {
      en = { ad: k.ad, kalanKurus, kazancKurus, ...(k.tip === "kargo" ? { kargo: true } : {}) };
    }
  }
  return en;
}

export type SatisAyari = {
  kargoKurus: number;
  bedavaKargoEsigi: number;
  havaleBilgisi: string;
  /** Havale siparişine tanınan ödeme süresi (saat); 0 ise otomatik iptal kapalı (K-64). */
  havaleSaat: number;
  /** Süre bitmesine kaç saat kala hatırlatma gönderileceği; 0 ise gönderilmiyor. */
  havaleHatirlatmaSaat: number;
  /** Faturada kullanılan KDV oranı (yüzde). */
  kdvOrani: number;
  /** Panelde kargo alanına önceden seçili gelen taşıyıcı. */
  varsayilanTasiyici: string;
};

export const ayarlariGetir = paylasilanOnbellek(async function ayarlariGetir(): Promise<SatisAyari> {
  const ayar = await db.storeSetting.findUnique({ where: { id: "tek" } });
  return {
    kargoKurus: ayar?.kargoKurus ?? 4990,
    bedavaKargoEsigi: ayar?.bedavaKargoEsigi ?? 75000,
    havaleBilgisi: ayar?.havaleBilgisi ?? "",
    havaleSaat: ayar?.havaleSaat ?? 72,
    havaleHatirlatmaSaat: ayar?.havaleHatirlatmaSaat ?? 24,
    kdvOrani: ayar?.kdvOrani ?? 10,
    varsayilanTasiyici: ayar?.varsayilanTasiyici ?? "yurtici",
  };
}, ["satis-ayari"], [ETIKETLER.ayarlar]);

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
