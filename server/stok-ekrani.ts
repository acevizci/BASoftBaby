import "server-only";

/**
 * Stok ekranının araması, süzgeçleri ve sayfalaması.
 *
 * Ekran bugüne kadar **bütün ürünlerin bütün bedenlerini** tek forma
 * basıyordu. Sekiz ürünle bile telefonda altı ekran boyundaydı; iki yüz
 * ürünle yüz elli ekran ve tek gönderimde iki binden fazla alan olurdu.
 * Açılır kapanır bir liste bunu çözmezdi — iki yüz kapalı satırda aradığını
 * yine bulamazsın, üstelik tarayıcının kendi sayfa içi araması kapalı
 * içeriği bulamıyor. Çözüm listeyi kısaltmak: arama, süzgeç ve sayfalama
 * (K-44).
 *
 * **Varsayılan "sorunlular"**: günlük iş biten ve azalan bedenleri
 * düzeltmek, tam listeye ayda bir bakılıyor.
 *
 * Bütün süzgeçler adres satırında taşınıyor; form düz GET, yani JavaScript
 * kapalı tarayıcıda da çalışıyor ve sonuç adresi paylaşılabiliyor (K-31'deki
 * sipariş aramasıyla aynı yol).
 */

import { db } from "@/server/veritabani";
import { renkAdlari } from "@/server/renkler";
import { kelimeler } from "@/server/arama-metin";
import { hareketYaz, type Yapan } from "@/server/stok-hareket";

/** Bu sayı ve altı "azalıyor" sayılıyor; sıfır zaten "bitti". */
export const AZALAN_ESIK = 3;

/** Sayfada gösterilen ürün adedi. */
export const SAYFA_BOYU = 20;

export const STOK_DURUMLARI = ["sorunlu", "biten", "hepsi"] as const;
export type StokDurumu = (typeof STOK_DURUMLARI)[number];

export type StokSuzgeci = {
  ara: string;
  durum: StokDurumu;
  sayfa: number;
};

export type StokBedeni = {
  id: string;
  beden: string;
  renk: string;
  /** Rengin görünen adı; liste burada çözülüyor, ekran sorgu yapmasın (K-66). */
  renkAdi: string;
  stok: number;
};

export type StokUrunu = {
  id: string;
  slug: string;
  ad: string;
  aktif: boolean;
  toplam: number;
  bitenAdedi: number;
  azalanAdedi: number;
  bedenler: StokBedeni[];
};

export type StokSayfasi = {
  urunler: StokUrunu[];
  sayfa: number;
  sonSayfa: number;
  /** Süzgece uyan ürün adedi. */
  toplamAdet: number;
  /** Süzgeç düğmelerinin yanında yazan sayılar. */
  sayaclar: { sorunlu: number; biten: number; hepsi: number };
};

/** Adres satırındaki ham değerleri güvenli bir süzgece çevirir. */
export function suzgeciCoz(
  parametreler: Record<string, string | string[] | undefined>,
): StokSuzgeci {
  const tek = (ad: string): string | undefined => {
    const d = parametreler[ad];
    return typeof d === "string" && d.trim() !== "" ? d.trim() : undefined;
  };

  const durum = tek("durum");
  const sayfa = Number(tek("sayfa") ?? "1");

  return {
    ara: tek("ara") ?? "",
    durum: (STOK_DURUMLARI as readonly string[]).includes(durum ?? "")
      ? (durum as StokDurumu)
      : "sorunlu",
    sayfa: Number.isInteger(sayfa) && sayfa > 0 ? sayfa : 1,
  };
}

export function stokAdresi(s: Partial<StokSuzgeci>): string {
  const p = new URLSearchParams();
  if (s.ara) p.set("ara", s.ara);
  // "sorunlu" varsayılan; adrese yazmaya gerek yok.
  if (s.durum && s.durum !== "sorunlu") p.set("durum", s.durum);
  if (s.sayfa && s.sayfa > 1) p.set("sayfa", String(s.sayfa));
  const metin = p.toString();
  return metin ? `/yonetim/stok?${metin}` : "/yonetim/stok";
}

/**
 * Süzgecin ürün koşulu.
 *
 * Pasif ürünler "sorunlu" ve "biten" sayımlarının dışında: satışta olmayan
 * bir üründe biten beden bugünün işi değil. Tam listede görünüyorlar,
 * ekranda "pasif" diye işaretli.
 */
function durumKosulu(durum: StokDurumu): Record<string, unknown> {
  if (durum === "biten") return { aktif: true, variants: { some: { stok: 0 } } };
  if (durum === "sorunlu") {
    return { aktif: true, variants: { some: { stok: { lte: AZALAN_ESIK } } } };
  }
  return {};
}

function kosulYap(s: StokSuzgeci): Record<string, unknown> {
  const aranan = kelimeler(s.ara);
  return {
    ...durumKosulu(s.durum),
    // Her kelime ayrı aranıyor ve hepsi bulunmak zorunda (K-35).
    ...(aranan.length > 0
      ? { AND: aranan.map((k) => ({ aramaMetni: { contains: k } })) }
      : {}),
  };
}

export async function stokSayfasi(s: StokSuzgeci): Promise<StokSayfasi> {
  const kosul = kosulYap(s);

  const [toplamAdet, sorunlu, biten, hepsi] = await Promise.all([
    db.product.count({ where: kosul }),
    db.product.count({ where: durumKosulu("sorunlu") }),
    db.product.count({ where: durumKosulu("biten") }),
    db.product.count(),
  ]);

  const sonSayfa = Math.max(1, Math.ceil(toplamAdet / SAYFA_BOYU));
  const sayfa = Math.min(Math.max(1, s.sayfa), sonSayfa);

  const satirlar = await db.product.findMany({
    where: kosul,
    include: { variants: true },
    orderBy: { ad: "asc" },
    skip: (sayfa - 1) * SAYFA_BOYU,
    take: SAYFA_BOYU,
  });

  const adlar = await renkAdlari();
  const urunler: StokUrunu[] = satirlar.map((u) => ({
    id: u.id,
    slug: u.slug,
    ad: u.ad,
    aktif: u.aktif,
    toplam: u.variants.reduce((t, v) => t + v.stok, 0),
    bitenAdedi: u.variants.filter((v) => v.stok === 0).length,
    azalanAdedi: u.variants.filter((v) => v.stok > 0 && v.stok <= AZALAN_ESIK).length,
    bedenler: u.variants.map((v) => ({
      id: v.id,
      beden: v.beden,
      renk: v.renk,
      renkAdi: adlar[v.renk] ?? v.renk,
      stok: v.stok,
    })),
  }));

  return { urunler, sayfa, sonSayfa, toplamAdet, sayaclar: { sorunlu, biten, hepsi } };
}

// ── Kaydetme ──────────────────────────────────────────────────────────────

/**
 * Stok formundan tek bir bedenin değişikliği.
 *
 * `onceki` ekran açıldığında görülen değer. Stok bu değerle **koşullu**
 * yazılıyor: arada sipariş gelip stok düştüyse satır yazılmıyor. Yoksa
 * ekran açıkken satılan ürün "Kaydet"le geri geliyor ve olmayan mal
 * satılıyordu (K-102).
 */
export type StokDegisikligi = { id: string; onceki: number; yeni: number };

/**
 * Formdan yalnızca **değiştirilen** bedenleri çıkarır.
 *
 * Dokunulmayan satır hiç yazılmıyor: ekrandaki yirmi bedenden birini
 * düzelten kişi ötekilerin o arada değişen stoğunu ezmesin. Geçersiz sayı
 * ya da önceki değeri olmayan satır atlanıyor.
 */
export function stokDegisiklikleri(girdiler: Iterable<[string, unknown]>): StokDegisikligi[] {
  const degerler = new Map<string, string>();
  for (const [ad, deger] of girdiler) degerler.set(ad, String(deger));

  const sonuc: StokDegisikligi[] = [];
  for (const [ad, ham] of degerler) {
    if (!ad.startsWith("stok-")) continue;
    const id = ad.slice(5);
    const oncekiHam = degerler.get(`once-${id}`);
    if (oncekiHam === undefined || ham.trim() === "") continue;
    const yeni = Number(ham);
    const onceki = Number(oncekiHam);
    if (!Number.isInteger(yeni) || yeni < 0 || !Number.isInteger(onceki)) continue;
    if (yeni === onceki) continue;
    sonuc.push({ id, onceki, yeni });
  }
  return sonuc;
}

/**
 * Değişiklikleri koşullu yazar: stok hâlâ ekranda görülen değerdeyse.
 * Tutmayanlar yazılmıyor, çakışma olarak dönüyor.
 */
export async function stoklariYaz(
  degisiklikler: StokDegisikligi[],
  yapan?: Yapan,
): Promise<{ yazilan: string[]; cakisan: StokCakismasi[] }> {
  const yazilan: string[] = [];
  const cakisan: StokCakismasi[] = [];
  await db.$transaction(async (islem) => {
    for (const d of degisiklikler) {
      const { count } = await islem.productVariant.updateMany({
        where: { id: d.id, stok: d.onceki },
        data: { stok: d.yeni },
      });
      if (count === 1) yazilan.push(d.id);
      else cakisan.push(d);
    }
    // Stok hareketi aynı işlemde (K-103).
    await hareketYaz(
      islem,
      degisiklikler
        .filter((d) => yazilan.includes(d.id))
        .map((d) => ({ variantId: d.id, degisim: d.yeni - d.onceki, sebep: "duzeltme" as const, yapan })),
    );
  });
  return { yazilan, cakisan };
}

/** Yazılamayan satır: kişinin yazdığı ve ekranda gördüğü değer. */
export type StokCakismasi = { id: string; onceki: number; yeni: number };

/** Çakışmalar adres satırında taşınıyor: `id:önceki:yeni` virgülle. */
export function cakismaAdresi(c: StokCakismasi[]): string {
  return c
    .slice(0, 50)
    .map((x) => `${x.id}:${x.onceki}:${x.yeni}`)
    .join(",");
}

export function cakismalariCoz(ham: unknown): StokCakismasi[] {
  if (typeof ham !== "string" || ham === "") return [];
  return ham
    .split(",")
    .slice(0, 50)
    .map((p) => p.split(":"))
    .filter((p) => p.length === 3 && /^[\w-]+$/.test(p[0]))
    .map(([id, o, y]) => ({ id, onceki: Number(o), yeni: Number(y) }))
    .filter((x) => Number.isInteger(x.onceki) && Number.isInteger(x.yeni));
}

/** Çakışan satırların bugünkü hâli, ekranda uyarı için. */
export async function cakismaAyrintisi(
  c: StokCakismasi[],
): Promise<(StokCakismasi & { ad: string; beden: string; renkAdi: string; simdi: number })[]> {
  if (c.length === 0) return [];
  const [varyantlar, adlar] = await Promise.all([
    db.productVariant.findMany({
      where: { id: { in: c.map((x) => x.id) } },
      select: { id: true, beden: true, renk: true, stok: true, product: { select: { ad: true } } },
    }),
    renkAdlari(),
  ]);
  return c.flatMap((x) => {
    const v = varyantlar.find((v) => v.id === x.id);
    if (!v) return [];
    return [
      { ...x, ad: v.product.ad, beden: v.beden, renkAdi: adlar[v.renk] ?? v.renk, simdi: v.stok },
    ];
  });
}
