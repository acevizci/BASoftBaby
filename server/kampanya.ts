/**
 * Kampanya ve indirim motoru.
 *
 * Tek kural: **indirimler üst üste binmez.** Bir sepete birden çok kampanya
 * uyuyorsa yalnızca en çok indiren uygulanır (docs/04-kararlar.md, K-02).
 * Kupon kodları da bu kurala tabi: yazılan kupon, kendiliğinden uygulanan bir
 * kampanyadan az indiriyorsa devreye girmez.
 *
 * Hesap her yerde aynı fonksiyondan geçer — sepette, ödeme ekranında ve
 * sipariş yazılırken — ki müşterinin gördüğü tutarla tahsil edilen tutar
 * ayrışmasın.
 */

import { db } from "@/server/veritabani";
import { ETIKETLER, paylasilanOnbellek } from "@/server/onbellek";
import type { Prisma } from "@/db/uretilen/client";
import { kapsamdaUrunMu, type Kapsam } from "@/server/kampanya-kapsam";

export type KampanyaKaydi = {
  id: string;
  ad: string;
  tip: string;
  deger: number;
  kapsam: string;
  categoryId: string | null;
  productId: string | null;
  /** Çoklu kapsam (K-171). */
  kategoriIdleri?: string[];
  urunIdleri?: string[];
  kuponKodu: string | null;
  enAzSepetKurus: number;
  /** "X al Y öde" (K-168); "N. ürüne %X"te (K-170) `alAdet` N. */
  alAdet?: number | null;
  odeAdet?: number | null;
  /** Kademeli sepet indirimi (K-170). */
  kademeler?: Kademe[] | null;
  /** İndirim tavanı (K-170). */
  enFazlaIndirimKurus?: number | null;
  /** Bitiş anı (ISO); vitrindeki "son 3 gün" notu için, yalnızca ürün indirimlerinde dolu. */
  bitis?: string | null;
};

/** İndirim hesabı için bir sepet satırından gereken en az bilgi. */
export type IndirimSatiri = {
  productId: string;
  categoryId: string;
  araToplamKurus: number;
  /** Satırdaki adet; "X al Y öde" birim fiyatları buradan çıkarıyor. Yoksa 1. */
  adet?: number;
};

/** Kademeli indirimin bir basamağı: kapsamdaki tutar `esikKurus`u geçince `indirimKurus`. */
export type Kademe = { esikKurus: number; indirimKurus: number };

export type UygulananKampanya = {
  id: string;
  ad: string;
  /** Ürünlerden düşülen indirim; kargo kampanyasında 0. */
  indirimKurus: number;
  kuponMu: boolean;
  /** Ücretsiz kargo kampanyası kazandı (K-170): kargo ücreti alınmıyor. */
  kargoBedava?: boolean;
};

/**
 * Kampanya türleri (K-170). "kargo" ürün indirimi değil, kargo ücretini
 * kaldırıyor; öteki kampanyalarla yarışırken değeri o sepetin kargo ücreti.
 */
export const KAMPANYA_TIPLERI = ["yuzde", "tutar", "al-ode", "nci-urun", "kademeli", "kargo"] as const;

export const KUPON_CEREZI = "kupon";

/** Tek bir sepette sayılacak en çok birim; bozuk bir adet döngüyü şişirmesin. */
const EN_COK_BIRIM = 1000;

export function kapsamdaMi(k: Kapsam, satir: IndirimSatiri): boolean {
  return kapsamdaUrunMu(k, satir);
}

/**
 * Tek bir kampanyanın indirimi. Kampanyanın kapsamına giren satırların
 * toplamı taban alınır; tutar indirimi bu tabanı aşamaz, yani indirim hiçbir
 * zaman sepeti eksiye düşürmez.
 */
export function kampanyaIndirimi(
  k: KampanyaKaydi,
  satirlar: IndirimSatiri[],
  araToplamKurus: number,
): number {
  if (araToplamKurus < k.enAzSepetKurus) return 0;

  const kapsamdakiler = satirlar.filter((s) => kapsamdaMi(k, s));
  const taban = kapsamdakiler.reduce((t, s) => t + s.araToplamKurus, 0);
  if (taban <= 0) return 0;

  const indirim = hamIndirim(k, kapsamdakiler, taban);
  // Tavan (K-170): "%20, en fazla 200 ₺".
  const tavan = k.enFazlaIndirimKurus ?? 0;
  return Math.min(tavan > 0 ? Math.min(indirim, tavan) : indirim, taban);
}

function hamIndirim(k: KampanyaKaydi, kapsamdakiler: IndirimSatiri[], taban: number): number {
  switch (k.tip) {
    case "al-ode":
      return alOdeIndirimi(k, kapsamdakiler);
    case "nci-urun":
      return nciUrunIndirimi(k, kapsamdakiler);
    case "kademeli":
      return kademeIndirimi(k.kademeler, taban);
    case "tutar":
      return Math.min(k.deger, taban);
    case "kargo":
      // Ürün indirimi yok; değeri `enIyiKampanya` kargo ücretinden hesaplıyor.
      return 0;
    default:
      if (k.deger <= 0) return 0;
      return Math.floor((taban * Math.min(k.deger, 100)) / 100);
  }
}

/** Kapsamdaki satırlar birim birim, ucuzdan pahalıya; satırın sırası da tutuluyor. */
function birimler(satirlar: IndirimSatiri[]): { i: number; birim: number }[] {
  const liste: { i: number; birim: number }[] = [];
  satirlar.forEach((s, i) => {
    const adet = Math.max(1, Math.floor(s.adet ?? 1));
    const birim = Math.floor(s.araToplamKurus / adet);
    for (let j = 0; j < adet && liste.length < EN_COK_BIRIM; j++) liste.push({ i, birim });
  });
  return liste.sort((a, b) => a.birim - b.birim);
}

/**
 * "N. ürüne %X" (K-170): "2. ürüne %50". Her N üründe bir tanesi indirimli;
 * indirimli olanlar kapsamdaki **en ucuz** ürünler (X al Y öde'deki gibi,
 * yaygın kural "ikinci ürün" = daha ucuz olan). 2. ürüne %50, 3 ürün: 1
 * ürüne; 4 ürün: 2 ürüne.
 */
export function nciUrunIndirimi(
  k: Pick<KampanyaKaydi, "alAdet" | "deger">,
  satirlar: IndirimSatiri[],
): number {
  const n = k.alAdet ?? 0;
  const yuzde = Math.min(Math.max(k.deger, 0), 100);
  if (!Number.isInteger(n) || n < 2 || yuzde <= 0) return 0;
  const liste = birimler(satirlar);
  const adet = Math.floor(liste.length / n);
  return liste.slice(0, adet).reduce((t, b) => t + Math.floor((b.birim * yuzde) / 100), 0);
}

/**
 * Kademeli indirim (K-170): tutarın geçtiği en yüksek basamak. 500 ₺'ye 50 ₺,
 * 1000 ₺'ye 150 ₺: 800 ₺'lik sepet 50 ₺, 1200 ₺'lik sepet 150 ₺.
 */
export function kademeIndirimi(kademeler: Kademe[] | null | undefined, tabanKurus: number): number {
  let indirim = 0;
  for (const k of kademeler ?? []) {
    if (tabanKurus >= k.esikKurus && k.indirimKurus > indirim) indirim = k.indirimKurus;
  }
  return Math.min(indirim, tabanKurus);
}

/** Bir sonraki basamak: sepete ne kadar eklenirse hangi indirim (sepet ipucu için). */
export function sonrakiKademe(
  kademeler: Kademe[] | null | undefined,
  tabanKurus: number,
): Kademe | undefined {
  return [...(kademeler ?? [])]
    .sort((a, b) => a.esikKurus - b.esikKurus)
    .find((k) => k.esikKurus > tabanKurus);
}


/**
 * "X al Y öde" indirimi (K-168).
 *
 * Kapsamdaki ürünler birim birim açılıyor ve ucuzdan pahalıya diziliyor;
 * her X birimde X − Y tanesi bedava ve bedava olanlar **en ucuzlar**.
 * Farklı fiyatlı ürünler karışabildiği için bu, mağazanın pahalı ürünü
 * bedava vermesini önlüyor ve sektördeki yaygın kural ("en ucuzu bizden").
 * 3 al 2 öde, 5 ürün: 5 / 3 = 1 grup, 1 bedava; 6 ürün: 2 bedava.
 *
 * Geçersiz tanım (Y ≥ X, Y < 1) hiç indirim vermiyor.
 */
export function alOdeIndirimi(
  k: Pick<KampanyaKaydi, "alAdet" | "odeAdet">,
  satirlar: IndirimSatiri[],
): number {
  const al = k.alAdet ?? 0;
  const ode = k.odeAdet ?? 0;
  if (!Number.isInteger(al) || !Number.isInteger(ode) || ode < 1 || ode >= al) return 0;

  const birimler: number[] = [];
  for (const s of satirlar) {
    const adet = Math.max(1, Math.floor(s.adet ?? 1));
    const birim = Math.floor(s.araToplamKurus / adet);
    for (let i = 0; i < adet && birimler.length < EN_COK_BIRIM; i++) birimler.push(birim);
  }
  birimler.sort((a, b) => a - b);
  const bedava = Math.floor(birimler.length / al) * (al - ode);
  return birimler.slice(0, bedava).reduce((t, b) => t + b, 0);
}

/** Kampanyanın panelde ve vitrinde okunan kısa adı: "%20", "50 ₺", "3 al 2 öde". */
export function alOdeEtiketi(k: Pick<KampanyaKaydi, "alAdet" | "odeAdet">): string {
  return `${k.alAdet ?? "?"} al ${k.odeAdet ?? "?"} öde`;
}

/** "2. ürüne %50" (K-170). */
export function nciUrunEtiketi(k: Pick<KampanyaKaydi, "alAdet" | "deger">): string {
  return `${k.alAdet ?? "?"}. ürüne %${k.deger}`;
}

/**
 * İndirimi satırlara dağıtır (K-109).
 *
 * Yalnızca kampanyanın kapsadığı satırlar pay alıyor, tutarlarıyla orantılı.
 * Kuruş yuvarlaması en büyük satıra ekleniyor: payların toplamı indirime
 * tam eşit. Sipariş anında her satıra yazılıyor; kısmi iade ve kâr hesabı
 * buradan okuyor. Eskiden iade indirimi bütün satırlara yayıyordu: yalnızca
 * bir ürüne uygulanan kampanyada indirimsiz ürünü iade eden eksik para
 * alıyordu.
 */
export function indirimiDagit(
  k:
    | (Kapsam &
        Partial<Pick<KampanyaKaydi, "tip" | "alAdet" | "odeAdet" | "deger">>)
    | undefined,
  satirlar: IndirimSatiri[],
  indirimKurus: number,
): number[] {
  const paylar = satirlar.map(() => 0);
  if (!k || indirimKurus <= 0) return paylar;

  // "X al Y öde"de indirim, bedava sayılan en ucuz birimlerin satırlarına
  // yazılıyor (K-168): orantılı dağıtılsaydı pahalı ürünü iade eden, bedava
  // gelen ucuz ürünün indirimini de geri ödemiş olurdu. "N. ürüne %X"te de
  // indirimli olanlar en ucuzlar; birim başına payları yüzde kadar (K-170).
  if (k.tip === "al-ode" || k.tip === "nci-urun") {
    const kapsamdakiIdler: number[] = [];
    const kapsamda = satirlar.filter((s, i) => {
      const var_ = kapsamdaMi(k as KampanyaKaydi, s);
      if (var_) kapsamdakiIdler.push(i);
      return var_;
    });
    const yuzde = k.tip === "nci-urun" ? Math.min(Math.max(k.deger ?? 0, 0), 100) : 100;
    let kalan = indirimKurus;
    for (const b of birimler(kapsamda)) {
      if (kalan <= 0) break;
      const pay = Math.min(Math.floor((b.birim * yuzde) / 100), kalan);
      paylar[kapsamdakiIdler[b.i]] += pay;
      kalan -= pay;
    }
    // Tavan ya da yuvarlama artığı en büyük kapsamdaki satıra.
    if (kalan > 0 && kapsamdakiIdler.length > 0) paylar[kapsamdakiIdler[0]] += kalan;
    return paylar;
  }

  const kapsanan = satirlar
    .map((s, i) => ({ i, tutar: s.araToplamKurus }))
    .filter(({ i }) => kapsamdaMi(k as KampanyaKaydi, satirlar[i]));
  const taban = kapsanan.reduce((t, s) => t + s.tutar, 0);
  if (taban <= 0) return paylar;

  let dagitilan = 0;
  for (const s of kapsanan) {
    paylar[s.i] = Math.floor((indirimKurus * s.tutar) / taban);
    dagitilan += paylar[s.i];
  }
  const enBuyuk = kapsanan.reduce((a, b) => (b.tutar > a.tutar ? b : a));
  paylar[enBuyuk.i] += indirimKurus - dagitilan;
  return paylar;
}

/**
 * Uyan kampanyalar içinden en çok indireni seçer. Eşitlik olursa listede önce
 * gelen kazanır; çağıranlar listeyi oluşturma tarihine göre sıralı verir, yani
 * sonuç her seferinde aynıdır.
 */
export function enIyiKampanya(
  kampanyalar: KampanyaKaydi[],
  satirlar: IndirimSatiri[],
  araToplamKurus: number,
  /**
   * Kampanyasız ödenecek kargo ücreti (K-170): ücretsiz kargo kampanyası
   * öteki indirimlerle bu değerle yarışıyor. Verilmezse kargo kampanyası
   * hiç kazanmıyor (ürün kartı gibi kargonun olmadığı yerler).
   */
  kargoKurus = 0,
): UygulananKampanya | undefined {
  let enIyi: (UygulananKampanya & { kazanc: number }) | undefined;

  for (const k of kampanyalar) {
    const kargoMu = k.tip === "kargo";
    const kazanc = kargoMu
      ? kargoKazanci(k, satirlar, araToplamKurus, kargoKurus)
      : kampanyaIndirimi(k, satirlar, araToplamKurus);
    if (kazanc <= 0) continue;
    if (!enIyi || kazanc > enIyi.kazanc) {
      enIyi = {
        id: k.id,
        ad: k.ad,
        indirimKurus: kargoMu ? 0 : kazanc,
        kuponMu: Boolean(k.kuponKodu),
        ...(kargoMu ? { kargoBedava: true } : {}),
        kazanc,
      };
    }
  }

  if (!enIyi) return undefined;
  const { kazanc: _kazanc, ...sonuc } = enIyi;
  void _kazanc;
  return sonuc;
}

/**
 * Ücretsiz kargo kampanyasının değeri (K-170): alt sınır tutuyor ve sepette
 * kapsamdan en az bir ürün varsa o sepetin kargo ücreti; yoksa 0.
 */
function kargoKazanci(
  k: KampanyaKaydi,
  satirlar: IndirimSatiri[],
  araToplamKurus: number,
  kargoKurus: number,
): number {
  if (kargoKurus <= 0 || araToplamKurus < k.enAzSepetKurus) return 0;
  return satirlar.some((s) => kapsamdaMi(k, s)) ? kargoKurus : 0;
}

const SECIM = {
  id: true,
  ad: true,
  tip: true,
  deger: true,
  kapsam: true,
  categoryId: true,
  productId: true,
  kategoriIdleri: true,
  urunIdleri: true,
  kuponKodu: true,
  enAzSepetKurus: true,
  alAdet: true,
  odeAdet: true,
  kademeler: true,
  enFazlaIndirimKurus: true,
} as const;

/** Veritabanındaki kaydın motorun beklediği biçimi (kademeler JSON'dan). */
function kayitCevir<T extends { kademeler: Prisma.JsonValue }>(k: T): Omit<T, "kademeler"> & { kademeler: Kademe[] | null } {
  return { ...k, kademeler: kademeCoz(k.kademeler) };
}

/** JSON'daki kademeleri sınayarak okur; bozuk basamak atlanıyor. */
export function kademeCoz(ham: unknown): Kademe[] | null {
  if (!Array.isArray(ham)) return null;
  const liste = ham.flatMap((x) =>
    x &&
    typeof x === "object" &&
    Number.isInteger((x as Kademe).esikKurus) &&
    Number.isInteger((x as Kademe).indirimKurus) &&
    (x as Kademe).indirimKurus > 0
      ? [{ esikKurus: (x as Kademe).esikKurus, indirimKurus: (x as Kademe).indirimKurus }]
      : [],
  );
  return liste.length > 0 ? liste.sort((a, b) => a.esikKurus - b.esikKurus) : null;
}

/** Üyelik kuralı olan kampanya: yalnızca giriş yapmış üyeye (K-170). */
const UYELIK_KOSULU = [{ uyelereOzel: true }, { ilkSiparis: true }, { kisiBasiSinir: { not: null } }];

export type UygunlukEngeli = "uye" | "ilk" | "kisi";

/**
 * Üyenin kampanyayı kullanıp kullanamayacağı (K-170). Sipariş sayısı
 * iptal edilmemiş siparişlerden; üyeliksiz verilmiş eski siparişler de
 * e-posta adresinden sayılıyor, yoksa "ilk sipariş" kuponu hesap açarak
 * yeniden kullanılırdı.
 */
async function uyelikBilgisi(
  customerId: string,
  kampanyaIdleri: string[],
): Promise<{ siparisSayisi: number; kullanim: Map<string, number> }> {
  const musteri = await db.customer.findUnique({
    where: { id: customerId },
    select: { eposta: true },
  });
  const kim = { OR: [{ customerId }, ...(musteri ? [{ eposta: musteri.eposta }] : [])] };
  const [siparisSayisi, gruplar] = await Promise.all([
    db.order.count({ where: { ...kim, durum: { not: "iptal" } } }),
    kampanyaIdleri.length > 0
      ? db.order.groupBy({
          by: ["kampanyaId"],
          where: { ...kim, durum: { not: "iptal" }, kampanyaId: { in: kampanyaIdleri } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);
  return {
    siparisSayisi,
    kullanim: new Map(gruplar.map((g) => [g.kampanyaId ?? "", g._count._all])),
  };
}

function uygunlukEngeli(
  k: { id: string; uyelereOzel: boolean; ilkSiparis: boolean; kisiBasiSinir: number | null },
  uyelik: { siparisSayisi: number; kullanim: Map<string, number> } | undefined,
): UygunlukEngeli | undefined {
  const kural = k.uyelereOzel || k.ilkSiparis || k.kisiBasiSinir !== null;
  if (!kural) return undefined;
  if (!uyelik) return "uye";
  if (k.ilkSiparis && uyelik.siparisSayisi > 0) return "ilk";
  if (k.kisiBasiSinir !== null && (uyelik.kullanim.get(k.id) ?? 0) >= k.kisiBasiSinir) return "kisi";
  return undefined;
}

function tarihSuzgeci(simdi: Date) {
  return {
    aktif: true,
    AND: [
      { OR: [{ baslangic: null }, { baslangic: { lte: simdi } }] },
      { OR: [{ bitis: null }, { bitis: { gte: simdi } }] },
    ],
  };
}

/**
 * O an geçerli kampanyalar. Kuponlu olanlar yalnızca doğru kod yazıldıysa
 * listeye girer; kod büyük-küçük harfe duyarlı değildir.
 *
 * Kişiye özel kupon (K-151) yalnızca sahibi giriş yapmışken, kullanım
 * sınırı dolmuş kupon hiç listeye girmiyor. Sınır sipariş anında işlemin
 * içinde yeniden sınanıyor (`kuponKullan`).
 */
export async function gecerliKampanyalar(
  kuponKodu?: string,
  simdi: Date = new Date(),
  customerId?: string,
): Promise<KampanyaKaydi[]> {
  // Kod bir kimlik; Türkçe yerelde büyütmek "i" harfini bozar.
  const kod = kuponKodu?.trim().toUpperCase();
  const tarih = tarihSuzgeci(simdi);

  const kayitlar = await db.campaign.findMany({
    where: {
      ...tarih,
      AND: [
        ...tarih.AND,
        { OR: [{ kuponKodu: null }, ...(kod ? [{ kuponKodu: kod }] : [])] },
        { OR: [{ customerId: null }, ...(customerId ? [{ customerId }] : [])] },
      ],
    },
    select: {
      ...SECIM,
      kullanim: true,
      enFazlaKullanim: true,
      uyelereOzel: true,
      ilkSiparis: true,
      kisiBasiSinir: true,
    },
    orderBy: { olusturuldu: "asc" },
  });
  // Üyelik kuralı olan kampanya varsa üyenin geçmişi bir kez okunuyor (K-170).
  const kurallilar = kayitlar.filter((k) => k.uyelereOzel || k.ilkSiparis || k.kisiBasiSinir !== null);
  const uyelik =
    customerId && kurallilar.length > 0
      ? await uyelikBilgisi(customerId, kurallilar.map((k) => k.id))
      : undefined;
  return kayitlar
    .filter((k) => k.enFazlaKullanim === null || k.kullanim < k.enFazlaKullanim)
    .filter((k) => !uygunlukEngeli(k, uyelik))
    .map((k) => ({
      id: k.id,
      ad: k.ad,
      tip: k.tip,
      deger: k.deger,
      kapsam: k.kapsam,
      categoryId: k.categoryId,
      productId: k.productId,
      kategoriIdleri: k.kategoriIdleri,
      urunIdleri: k.urunIdleri,
      kuponKodu: k.kuponKodu,
      enAzSepetKurus: k.enAzSepetKurus,
      alAdet: k.alAdet,
      odeAdet: k.odeAdet,
      kademeler: kademeCoz(k.kademeler),
      enFazlaIndirimKurus: k.enFazlaIndirimKurus,
    }));
}

/**
 * Sipariş işleminin içinde, sipariş yazıldıktan sonra (K-170): kampanyanın
 * ilk sipariş ve kişi başı kuralı bu siparişle birlikte hâlâ tutuyor mu?
 * Üyenin satırı kilitleniyor; aynı üyenin eşzamanlı ikinci siparişi bekliyor
 * ve ilkini görüyor.
 */
export async function uyeKurallariTutuyor(
  islem: Prisma.TransactionClient,
  kampanyaId: string,
  customerId: string,
  buSiparisNo: string,
): Promise<boolean> {
  const k = await islem.campaign.findUnique({
    where: { id: kampanyaId },
    select: { ilkSiparis: true, kisiBasiSinir: true },
  });
  if (!k || (!k.ilkSiparis && k.kisiBasiSinir === null)) return true;
  await islem.$queryRaw`select id from "Customer" where id = ${customerId} for update`;
  const musteri = await islem.customer.findUnique({ where: { id: customerId }, select: { eposta: true } });
  const kim = { OR: [{ customerId }, ...(musteri ? [{ eposta: musteri.eposta }] : [])] };
  const oncekiler = { ...kim, durum: { not: "iptal" }, numara: { not: buSiparisNo } };
  if (k.ilkSiparis && (await islem.order.count({ where: oncekiler })) > 0) return false;
  if (
    k.kisiBasiSinir !== null &&
    (await islem.order.count({ where: { ...oncekiler, kampanyaId } })) >= k.kisiBasiSinir
  ) {
    return false;
  }
  return true;
}

/**
 * Yazılan kupon neden uygulanamıyor (K-170): üye girişi gerekiyor, ilk
 * siparişe özel ya da kişi başı hakkı dolmuş. Sepet ekranı sebebi yazıyor;
 * kod geçersizse ya da engel yoksa boş.
 */
export async function kuponEngeli(
  kuponKodu: string,
  customerId?: string,
  simdi: Date = new Date(),
): Promise<UygunlukEngeli | undefined> {
  const k = await db.campaign.findFirst({
    where: { ...tarihSuzgeci(simdi), kuponKodu: kuponKodu.trim().toUpperCase() },
    select: { id: true, uyelereOzel: true, ilkSiparis: true, kisiBasiSinir: true },
  });
  if (!k) return undefined;
  const uyelik = customerId ? await uyelikBilgisi(customerId, [k.id]) : undefined;
  return uygunlukEngeli(k, uyelik);
}

/**
 * Kampanyanın kullanımını sipariş işleminin içinde bir artırır; kullanım
 * sınırı dolmuşsa artırmaz ve `false` döner (iki sekmeden aynı anda verilen
 * sipariş tek kullanımlık kuponu iki kez harcamasın).
 */
export async function kuponKullan(
  islem: Prisma.TransactionClient,
  kampanyaId: string,
): Promise<boolean> {
  const n = await islem.$executeRaw`
    update "Campaign" set kullanim = kullanim + 1
     where id = ${kampanyaId}
       and ("enFazlaKullanim" is null or kullanim < "enFazlaKullanim")`;
  return n === 1;
}

/**
 * Ürün kartında ve ürün sayfasında gösterilecek indirim.
 *
 * Yalnızca kendiliğinden uygulanan ve sepet alt sınırı olmayan kampanyalar
 * buraya girer: "500 TL üzerine %10" gibi bir kampanyayı tek ürünün fiyatında
 * göstermek müşteriyi yanıltır, o indirim sepette çıkar.
 */
export async function urunIndirimleri(simdi?: Date): Promise<KampanyaKaydi[]> {
  // Tarih verilmeden çağrılan hâli (vitrinin tamamı böyle çağırıyor)
  // önbellekten geliyor; ürün kartlarının her biri için ayrı sorgu gitmiyor.
  if (!simdi) return indirimleriOku();
  return indirimSorgusu(simdi);
}

async function indirimSorgusu(simdi: Date): Promise<KampanyaKaydi[]> {
  const kayitlar = await db.campaign.findMany({
    where: {
      ...tarihSuzgeci(simdi),
      kuponKodu: null,
      enAzSepetKurus: 0,
      // Kişiye göre değişen kampanya herkese gösterilen fiyata yansımaz (K-170).
      NOT: { OR: UYELIK_KOSULU },
    },
    select: { ...SECIM, bitis: true },
    orderBy: { olusturuldu: "asc" },
  });
  // Tarih metin olarak taşınıyor: önbellekten dönen değer zaten metin.
  return kayitlar.map((k) => ({ ...kayitCevir(k), bitis: k.bitis?.toISOString() ?? null }));
}

/**
 * Kampanya listesi tarihe bağlı olduğu için önbellek bir dakikayla
 * sınırlanıyor: panelden yapılan değişiklik zaten etiketle anında düşüyor,
 * bu süre yalnızca "saat 14:00'te başlayan kampanya" gibi durumlar için.
 */
const indirimleriOku = paylasilanOnbellek(
  () => indirimSorgusu(new Date()),
  ["urun-indirimleri"],
  [ETIKETLER.kampanya],
  60,
);

/**
 * Ürün fiyatında gösterilebilen kampanyalar: yalnızca yüzde indirimleri
 * (K-165). Tutar indirimi sepete bir kez uygulanıyor; birim fiyattan düşülünce
 * 80 ₺'lik ürün "100 ₺ indirim" kampanyasında kartta 0,00 ₺ görünüyor, iki
 * adet alan müşteri de iki kez indirim bekliyordu. O indirim sepette çıkıyor.
 */
export function urunFiyatinaYansiyanlar(kampanyalar: KampanyaKaydi[]): KampanyaKaydi[] {
  return kampanyalar.filter((k) => k.tip === "yuzde");
}

/** Bir ürünün kartında görünecek indirimli fiyat; indirim yoksa undefined. */
export function urunKampanyasi(
  kampanyalar: KampanyaKaydi[],
  urun: { productId: string; categoryId: string; fiyatKurus: number },
): { ad: string; indirimliFiyatKurus: number; bitis?: string } | undefined {
  const satir: IndirimSatiri = {
    productId: urun.productId,
    categoryId: urun.categoryId,
    araToplamKurus: urun.fiyatKurus,
  };
  const enIyi = enIyiKampanya(urunFiyatinaYansiyanlar(kampanyalar), [satir], urun.fiyatKurus);
  if (!enIyi) return undefined;

  const bitis = kampanyalar.find((k) => k.id === enIyi.id)?.bitis ?? undefined;
  return {
    ad: enIyi.ad,
    indirimliFiyatKurus: urun.fiyatKurus - enIyi.indirimKurus,
    ...(bitis ? { bitis } : {}),
  };
}
