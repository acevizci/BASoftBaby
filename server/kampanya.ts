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

export type KampanyaKaydi = {
  id: string;
  ad: string;
  tip: string;
  deger: number;
  kapsam: string;
  categoryId: string | null;
  productId: string | null;
  kuponKodu: string | null;
  enAzSepetKurus: number;
  /** "X al Y öde" (K-168); yalnızca tip "al-ode" iken dolu. */
  alAdet?: number | null;
  odeAdet?: number | null;
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

export type UygulananKampanya = {
  id: string;
  ad: string;
  indirimKurus: number;
  kuponMu: boolean;
};

export const KUPON_CEREZI = "kupon";

export function kapsamdaMi(
  k: Pick<KampanyaKaydi, "kapsam" | "categoryId" | "productId">,
  satir: IndirimSatiri,
): boolean {
  if (k.kapsam === "urun") return k.productId === satir.productId;
  if (k.kapsam === "kategori") return k.categoryId === satir.categoryId;
  return true;
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

  const taban = satirlar
    .filter((s) => kapsamdaMi(k, s))
    .reduce((t, s) => t + s.araToplamKurus, 0);
  if (taban <= 0) return 0;

  if (k.tip === "al-ode") return alOdeIndirimi(k, satirlar.filter((s) => kapsamdaMi(k, s)));
  if (k.tip === "tutar") return Math.min(k.deger, taban);
  if (k.deger <= 0) return 0;
  return Math.floor((taban * Math.min(k.deger, 100)) / 100);
}

/** Tek bir sepette sayılacak en çok birim; bozuk bir adet döngüyü şişirmesin. */
const EN_COK_BIRIM = 1000;

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
    | (Pick<KampanyaKaydi, "kapsam" | "categoryId" | "productId"> &
        Partial<Pick<KampanyaKaydi, "tip" | "alAdet" | "odeAdet">>)
    | undefined,
  satirlar: IndirimSatiri[],
  indirimKurus: number,
): number[] {
  const paylar = satirlar.map(() => 0);
  if (!k || indirimKurus <= 0) return paylar;

  // "X al Y öde"de indirim, bedava sayılan en ucuz birimlerin satırlarına
  // yazılıyor (K-168): orantılı dağıtılsaydı pahalı ürünü iade eden, bedava
  // gelen ucuz ürünün indirimini de geri ödemiş olurdu.
  if (k.tip === "al-ode") {
    const birimler: { i: number; birim: number }[] = [];
    satirlar.forEach((s, i) => {
      if (!kapsamdaMi(k as KampanyaKaydi, s)) return;
      const adet = Math.max(1, Math.floor(s.adet ?? 1));
      const birim = Math.floor(s.araToplamKurus / adet);
      for (let j = 0; j < adet && birimler.length < EN_COK_BIRIM; j++) birimler.push({ i, birim });
    });
    birimler.sort((a, b) => a.birim - b.birim);
    let kalan = indirimKurus;
    for (const b of birimler) {
      if (kalan <= 0) break;
      const pay = Math.min(b.birim, kalan);
      paylar[b.i] += pay;
      kalan -= pay;
    }
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
): UygulananKampanya | undefined {
  let enIyi: UygulananKampanya | undefined;

  for (const k of kampanyalar) {
    const indirimKurus = kampanyaIndirimi(k, satirlar, araToplamKurus);
    if (indirimKurus <= 0) continue;
    if (!enIyi || indirimKurus > enIyi.indirimKurus) {
      enIyi = { id: k.id, ad: k.ad, indirimKurus, kuponMu: Boolean(k.kuponKodu) };
    }
  }

  return enIyi;
}

const SECIM = {
  id: true,
  ad: true,
  tip: true,
  deger: true,
  kapsam: true,
  categoryId: true,
  productId: true,
  kuponKodu: true,
  enAzSepetKurus: true,
  alAdet: true,
  odeAdet: true,
} as const;

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
    select: { ...SECIM, kullanim: true, enFazlaKullanim: true },
    orderBy: { olusturuldu: "asc" },
  });
  return kayitlar
    .filter((k) => k.enFazlaKullanim === null || k.kullanim < k.enFazlaKullanim)
    .map((k) => ({
      id: k.id,
      ad: k.ad,
      tip: k.tip,
      deger: k.deger,
      kapsam: k.kapsam,
      categoryId: k.categoryId,
      productId: k.productId,
      kuponKodu: k.kuponKodu,
      enAzSepetKurus: k.enAzSepetKurus,
      alAdet: k.alAdet,
      odeAdet: k.odeAdet,
    }));
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
    where: { ...tarihSuzgeci(simdi), kuponKodu: null, enAzSepetKurus: 0 },
    select: { ...SECIM, bitis: true },
    orderBy: { olusturuldu: "asc" },
  });
  // Tarih metin olarak taşınıyor: önbellekten dönen değer zaten metin.
  return kayitlar.map((k) => ({ ...k, bitis: k.bitis?.toISOString() ?? null }));
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
