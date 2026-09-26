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
import { Prisma } from "@/db/uretilen/client";
import { hareketYaz } from "@/server/stok-hareket";
import { kargoHesapla, kuponOku, sepetIdOku, type SatisAyari } from "@/server/sepet";
import {
  enIyiKampanya,
  gecerliKampanyalar,
  indirimiDagit,
  kapsamdaMi,
  kuponKullan,
  uyeKurallariTutuyor,
} from "@/server/kampanya";
import { renkAdlari } from "@/server/renkler";
import { takipAdresi, tasiyiciAdi } from "@/server/kargo";
import { suresiDolanlariKapat } from "@/server/odeme-suresi";
import { cekHarca, hediyeCekiOku } from "@/server/hediye-ceki";
import { tahsilat } from "@/server/hediye-ceki-bicim";
import { alinanlariIsle, listeAdresiBul } from "@/server/dogum-listesi";

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
  /** Doğum listesi hediyesi (K-146): liste sahibine görünecek ad ve not. */
  listeGonderen?: string;
  listeNotu?: string;
  /**
   * Liste sahibinin adresine gönder (K-149). Adres alanları boş gelebilir;
   * sunucu sahibin seçtiği kayıtlı adresi yazıyor, formdan geleni değil.
   */
  listeAdresine?: boolean;
  /** Ödeme formunun bir kerelik anahtarı (K-166); aynı anahtarla ikinci sipariş açılmıyor. */
  istekAnahtari?: string;
};

export type SiparisSonucu =
  | {
      tamam: true;
      numara: string;
      toplamKurus: number;
      /** Hediye çekiyle ödenen ve kalan, tahsil edilecek kısım (K-137). */
      hediyeCekiKurus: number;
      tahsilatKurus: number;
    }
  | {
      tamam: false;
      hata: string;
      sebep?: "cek" | "liste-adres" | "kupon" | "tekrar" | "sepet-degisti" | "liste-alindi";
    };

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
  cekSecenegi: {
    /**
     * Kart ve havale kapalıyken sipariş yalnızca çek tamamını karşılıyorsa
     * açılabiliyor (K-137). Bakiye kontrolle işlem arasında azalırsa sipariş
     * ödenemeyecek bir havale siparişi olarak açılmasın.
     */
    yalnizCek?: boolean;
    /**
     * Ödeme sayfasında müşteriye gösterilen çek tutarı. 0 ise çek
     * kullanılmıyor (ekranda geçersiz görünmüştü); başka bir tutar çıkarsa
     * sipariş açılmıyor: müşteri gördüğünden farklı bir tutar ödememeli.
     * Verilmezse çekten ne düşerse o.
     */
    beklenenKurus?: number;
  } = {},
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
      // Satış anındaki maliyet; sonradan değişse de bu kalıyor (K-111).
      alisFiyatKurus: s.variant.product.alisFiyatKurus,
      // Doğum listesinden eklendiyse o kalem (K-144).
      giftListItemId: s.giftListItemId,
    };
  });

  // Liste sahibinin adresi (K-149): sepetteki bütün ürünler aynı, açık ve
  // adres seçmiş listeden olmalı. Karışık sepetin bir kısmı başka adrese
  // gidemez; öyleyse müşteri kendi adresini yazıyor.
  let teslimat = {
    adSoyad: "",
    telefon: "",
    adres: girdi.adres,
    ilce: girdi.ilce,
    il: girdi.il,
    postaKodu: girdi.postaKodu,
  };
  if (girdi.listeAdresine) {
    const listeAdresi = await listeAdresiBul(gecerli.map((s) => s.giftListItemId));
    if (!listeAdresi) {
      return {
        tamam: false,
        sebep: "liste-adres",
        hata: "Liste sahibinin adresine gönderim bu sepette kullanılamıyor.",
      };
    }
    teslimat = listeAdresi;
  }

  const araToplamKurus = kalemler.reduce((t, k) => t + k.fiyatKurus * k.adet, 0);

  // İndirim sepetteki hesabın aynısından geçer; müşterinin gördüğü tutarla
  // yazılan tutar ayrışmasın.
  const indirimSatirlari = gecerli.map((s) => ({
    productId: s.variant.productId,
    categoryId: s.variant.product.categoryId,
    araToplamKurus: (s.variant.fiyatKurus ?? s.variant.product.fiyatKurus) * s.adet,
    adet: s.adet,
  }));
  const kampanyalar = await gecerliKampanyalar(await kuponOku(), undefined, customerId);
  // Ücretsiz kargo kampanyası kampanyasız kargo ücretiyle yarışıyor (K-170).
  const kargoHam = kargoHesapla(araToplamKurus, ayar, true);
  const kampanya = enIyiKampanya(kampanyalar, indirimSatirlari, araToplamKurus, kargoHam);
  const indirimKurus = kampanya?.indirimKurus ?? 0;
  // Her satırın indirim payı; yalnızca kampanyanın kapsadığı satırlara (K-109).
  const uygulanan = kampanyalar.find((k) => k.id === kampanya?.id);
  const paylar = indirimiDagit(uygulanan, indirimSatirlari, indirimKurus);
  // Kapsamdaki satırlar ve "X al Y öde"nin X/Y'si siparişe yazılıyor (K-169):
  // kısmi iadede kampanya kalan ürünlere yeniden uygulanıyor.
  const kapsamda = indirimSatirlari.map((x) => (uygulanan ? kapsamdaMi(uygulanan, x) : false));
  const alOde = uygulanan?.tip === "al-ode" ? uygulanan : undefined;

  const kargoKurus = kampanya?.kargoBedava
    ? 0
    : kargoHesapla(araToplamKurus - indirimKurus, ayar, true);
  // Kısmi iadede yeniden hesap için kampanyanın o anki tanımı (K-170).
  const kampanyaAnlik = uygulanan
    ? {
        tip: uygulanan.tip,
        deger: uygulanan.deger,
        alAdet: uygulanan.alAdet ?? null,
        odeAdet: uygulanan.odeAdet ?? null,
        kademeler: uygulanan.kademeler ?? null,
        enFazlaIndirimKurus: uygulanan.enFazlaIndirimKurus ?? null,
        enAzSepetKurus: uygulanan.enAzSepetKurus,
      }
    : undefined;
  const toplamKurus = araToplamKurus - indirimKurus + kargoKurus;
  const simdi = new Date();
  // Hediye çeki (K-137): bakiye işlemin içinde düşülüyor.
  const cekKodu = cekSecenegi.beklenenKurus === 0 ? undefined : await hediyeCekiOku();

  try {
    const yazilan = await db.$transaction(async (islem) => {
      // Sepet kilitlenip işlemin içinde yeniden okunuyor (K-166). Sepet
      // işlemin dışında okunduğu için aynı anda gelen iki gönderim (iki
      // sekme, çift tıklama) ikisi de dolu sepeti görüp iki sipariş
      // açabiliyordu. İkincisi kilidi bekliyor, sonra boşalmış sepeti
      // görüp duruyor; sepet arada değiştiyse de müşterinin onayladığı
      // tutar geçersiz, sipariş açılmıyor.
      await islem.$queryRaw`select id from "Cart" where id = ${cartId} for update`;
      const simdiki = await islem.cartItem.findMany({
        where: { cartId },
        select: { id: true, variantId: true, adet: true },
      });
      if (simdiki.length === 0) throw new Error("BOS");
      const okunan = new Map(satirlar.map((x) => [x.id, `${x.variantId}:${x.adet}`]));
      if (
        simdiki.length !== satirlar.length ||
        simdiki.some((x) => okunan.get(x.id) !== `${x.variantId}:${x.adet}`)
      ) {
        throw new Error("SEPET");
      }

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

      const numara = numaraYaz(ayarSatiri.sonSiparisNo, simdi);
      const cek = cekKodu ? await cekHarca(islem, cekKodu, toplamKurus, numara) : undefined;
      const hediyeCekiKurus = cek?.tutarKurus ?? 0;
      // Çek tamamını karşıladıysa ödenecek bir şey yok: sipariş ödenmiş açılıyor.
      const cekleOdendi = hediyeCekiKurus >= toplamKurus;
      if (cekSecenegi.yalnizCek && !cekleOdendi) throw new Error("CEK");
      if (
        cekSecenegi.beklenenKurus !== undefined &&
        hediyeCekiKurus !== cekSecenegi.beklenenKurus
      ) {
        throw new Error("CEK");
      }

      const siparis = await islem.order.create({
        data: {
          numara,
          istekAnahtari: girdi.istekAnahtari ?? null,
          customerId: customerId ?? null,
          odemeYontemi: cekleOdendi ? "hediye-ceki" : odemeYontemi,
          ...(cekleOdendi ? { odemeDurumu: "odendi", durum: "hazirlaniyor" } : {}),
          hediyeCekiKurus,
          giftCardId: cek?.id ?? null,
          sozlesmeOnayi: girdi.sozlesmeOnayi,
          adSoyad: girdi.adSoyad,
          eposta: girdi.eposta,
          telefon: girdi.telefon,
          adres: teslimat.adres,
          ilce: teslimat.ilce,
          il: teslimat.il,
          postaKodu: teslimat.postaKodu,
          ...(girdi.listeAdresine
            ? { listeAdresi: true, teslimAlan: teslimat.adSoyad, teslimTelefon: teslimat.telefon }
            : {}),
          not: girdi.not,
          hediyePaketi: girdi.hediyePaketi,
          hediyeNotu: girdi.hediyePaketi ? girdi.hediyeNotu : "",
          // Yalnızca listeden ürün varsa anlamlı; yoksa boş kalıyor.
          ...(kalemler.some((k) => k.giftListItemId)
            ? { listeGonderen: girdi.listeGonderen ?? "", listeNotu: girdi.listeNotu ?? "" }
            : {}),
          araToplamKurus,
          indirimKurus,
          kampanyaAdi: kampanya?.ad ?? null,
          kampanyaId: kampanya?.id ?? null,
          ...(kampanyaAnlik ? { kampanyaAnlik } : {}),
          kampanyaAlAdet: alOde?.alAdet ?? null,
          kampanyaOdeAdet: alOde?.odeAdet ?? null,
          kargoKurus,
          toplamKurus,
          satirlar: {
            create: kalemler.map((k, i) => ({
              ...k,
              indirimKurus: paylar[i],
              kampanyada: kapsamda[i],
            })),
          },
        },
        select: { numara: true },
      });

      // Doğum listesinden alınanlar işaretleniyor; aynı hediye iki kez alınmasın.
      await alinanlariIsle(islem, kalemler, 1);

      // Kullanım sınırı işlemin içinde sınanıyor (K-151).
      if (kampanya && !(await kuponKullan(islem, kampanya.id))) throw new Error("KUPON");
      // İlk sipariş ve kişi başı sınır da işlemin içinde (K-170): iki cihazdan
      // aynı anda verilen sipariş kuralı ikisinde de geçmiş görmesin.
      if (kampanya && customerId && !(await uyeKurallariTutuyor(islem, kampanya.id, customerId, siparis.numara))) {
        throw new Error("KUPON");
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
      return { numara: siparis.numara, hediyeCekiKurus };
    });

    return {
      tamam: true,
      numara: yazilan.numara,
      toplamKurus,
      hediyeCekiKurus: yazilan.hediyeCekiKurus,
      tahsilatKurus: tahsilat({ toplamKurus, hediyeCekiKurus: yazilan.hediyeCekiKurus }),
    };
  } catch (hata) {
    if (hata instanceof Error && hata.message === "CEK") {
      return {
        tamam: false,
        sebep: "cek",
        hata: "Hediye çekin artık kullanılamıyor ya da bakiyesi değişti.",
      };
    }
    if (hata instanceof Error && hata.message === "KUPON") {
      return { tamam: false, sebep: "kupon", hata: "Kuponun kullanım hakkı bu arada doldu." };
    }
    if (hata instanceof Error && hata.message === "LISTE") {
      return {
        tamam: false,
        sebep: "liste-alindi",
        hata: "Listeden seçtiğin hediye bu sırada başka biri tarafından alındı.",
      };
    }
    if (hata instanceof Error && hata.message === "BOS") {
      return { tamam: false, hata: "Sepetin boş görünüyor." };
    }
    if (hata instanceof Error && hata.message === "SEPET") {
      return { tamam: false, sebep: "sepet-degisti", hata: "Sepetin bu sırada değişti." };
    }
    // Aynı form anahtarıyla sipariş zaten açılmış (eşzamanlı ikinci gönderim).
    // Hangi alanın çakıştığı sürücüye göre ayrıntıda yazmayabiliyor; çağıran
    // anahtarla ilk siparişi arıyor, bulamazsa genel hata gösteriyor.
    if (
      girdi.istekAnahtari &&
      hata instanceof Prisma.PrismaClientKnownRequestError &&
      hata.code === "P2002"
    ) {
      return { tamam: false, sebep: "tekrar", hata: "Bu sipariş zaten alındı." };
    }
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
  /** Liste sahibinin adresine gidiyor (K-149); teslim alanın adı ve telefonu. */
  listeAdresi: boolean;
  teslimAlan: string;
  teslimTelefon: string;
  not: string;
  hediyePaketi: boolean;
  hediyeNotu: string;
  araToplamKurus: number;
  indirimKurus: number;
  kampanyaAdi: string | null;
  kargoKurus: number;
  toplamKurus: number;
  /** Hediye çekiyle ödenen kısım (K-137). */
  hediyeCekiKurus: number;
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
  return aliciyaGoster(siparisYap(await renkAdlari(), kayit));
}

/**
 * Siparişi veren kişinin gördüğü hâli (K-149): liste sahibinin adresine
 * gidiyorsa adres ve teslim alanın bilgileri boşaltılıyor. Onay sayfası,
 * sipariş takibi ve Siparişlerim bundan geçiyor; panel geçmiyor.
 */
export function aliciyaGoster(s: Siparis): Siparis {
  if (!s.listeAdresi) return s;
  return { ...s, adres: "", ilce: "", il: "", postaKodu: "", teslimAlan: "", teslimTelefon: "" };
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
