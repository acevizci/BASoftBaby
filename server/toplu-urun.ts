/**
 * Excel/CSV dosyasından toplu ürün yükleme.
 *
 * Elle ürün girmek mağazanın en çok vakit alan işi: her ürün için form, her
 * beden-renk için ayrı varyant satırı. Tedarikçiden gelen liste zaten bir
 * tabloda duruyor; buradaki iş o tabloyu okuyup kataloğa çevirmek.
 *
 * **Her satır bir varyant.** Aynı ürün adını taşıyan satırlar tek ürün olur,
 * her satır o ürünün bir beden-renk varyantı olur. Tabloda ürün bilgileri
 * tekrar eder; insanın kafasında kurması en kolay biçim bu.
 *
 * **Ya hepsi ya hiçbiri.** Bir satırda hata varsa hiçbir şey yazılmıyor.
 * Yarısı yazılmış bir katalogda neyin girdiğini neyin girmediğini anlamak
 * zor; dosyayı düzeltip yeniden yüklemek kolay.
 *
 * **Hiçbir şey silinmiyor.** Dosyada olmayan ürün ya da varyant olduğu gibi
 * kalıyor. Yükleme ekleme ve güncelleme yapıyor, temizlik yapmıyor — yanlış
 * dosyayla bütün katalog silinmesin.
 */

import ExcelJS from "exceljs";
import { db } from "@/server/veritabani";
import { slugYap } from "@/server/slug";
import { hareketYaz, type Yapan } from "@/server/stok-hareket";
import { maliyetiGecmiseYaz } from "@/server/maliyet";
import { stokBildirimleriniGonder } from "@/server/stok-bildirimi";
import { aramaMetinleriniTazele } from "@/server/arama";
import { normalle } from "@/server/arama-metin";
import { GORSEL_TIPLERI, type RenkAdi, type RenkSecenegi } from "@/ui/katalog-bicim";

/** Tablodaki bir satırın çözülmüş hâli. */
export type Satir = {
  satirNo: number;
  ad: string;
  kategori: string;
  fiyatKurus: number | null;
  eskiFiyatKurus: number | null;
  /** Alış fiyatı (K-108); boşsa var olan değer değişmiyor. */
  alisFiyatKurus: number | null;
  ozet: string;
  aciklama: string;
  kumasIcerigi: string;
  yikamaTalimati: string;
  ureticiBilgisi: string;
  ozellikler: string[];
  beden: string;
  renk: string;
  stok: number;
  sku: string;
  gorsel: string;
  palet: string;
  aktif: boolean;
};

export type Hata = { satirNo: number; sutun: string; mesaj: string };

export type UrunOzeti = {
  ad: string;
  slug: string;
  yeniMi: boolean;
  varyant: number;
  yeniVaryant: number;
};

/** Var olan bir beden-renkte stoğun ne olacağı; önizlemede gösteriliyor (K-102). */
export type StokDegisimi = { ad: string; beden: string; renk: string; simdi: number; yeni: number };

export type Plan = {
  satirlar: Satir[];
  hatalar: Hata[];
  urunler: UrunOzeti[];
  stokDegisimleri: StokDegisimi[];
};

/** Anlık stok haritasının anahtarı. */
export function stokAnahtari(slug: string, beden: string, renk: string): string {
  return `${slug}|${beden}|${renk}`;
}

/**
 * Dosyadaki var olan beden-renklerin şu anki stoğu.
 *
 * Önizlemede kaydediliyor: onay anında stok bundan farklıysa arada sipariş
 * gelmiş demek ve dosyadaki sayı o satışı geri getirir — o satır yazılmıyor
 * (K-102).
 */
export async function anlikStokAl(satirlar: Satir[]): Promise<Record<string, number>> {
  const sluglar = [...new Set(satirlar.map((s) => slugYap(s.ad)))];
  const varyantlar = await db.productVariant.findMany({
    where: { product: { slug: { in: sluglar } } },
    select: { beden: true, renk: true, stok: true, product: { select: { slug: true } } },
  });
  return Object.fromEntries(
    varyantlar.map((v) => [stokAnahtari(v.product.slug, v.beden, v.renk), v.stok]),
  );
}

/** Tabloda beklenen sütunlar. İlk ad şablonda yazan ad; ötekiler kabul edilen yazımlar. */
const SUTUNLAR = {
  ad: ["urun adi", "urun", "ad", "urun ismi"],
  kategori: ["kategori"],
  fiyat: ["fiyat", "satis fiyati"],
  eskiFiyat: ["eski fiyat", "liste fiyati"],
  alisFiyat: ["alis fiyati", "maliyet", "alis"],
  ozet: ["ozet", "kisa aciklama"],
  aciklama: ["aciklama"],
  kumasIcerigi: ["kumas icerigi", "kumas"],
  yikamaTalimati: ["yikama talimati", "yikama"],
  ureticiBilgisi: ["uretici", "uretici bilgisi"],
  ozellikler: ["ozellikler"],
  beden: ["beden"],
  renk: ["renk"],
  stok: ["stok", "adet"],
  sku: ["sku", "stok kodu"],
  gorsel: ["gorsel"],
  palet: ["palet"],
  aktif: ["aktif", "yayinda"],
} as const;

type SutunAdi = keyof typeof SUTUNLAR;

/**
 * Başlıkları ve değerleri karşılaştırırken büyük-küçük harf, Türkçe harf ve
 * noktalama fark etmesin. Aramanınkiyle aynı normalleştirme (K-35): iki ayrı
 * kopya er geç ayrışırdı.
 */
const anahtar = normalle;

/**
 * "249,90" → 24990. Virgül varsa nokta binlik ayracıdır ("1.249,90"),
 * yoksa nokta ondalıktır ("249.90"). İki yazım da Excel'den çıkıyor.
 */
export function kurusaCevir(ham: string): number | null {
  const metin = ham.trim().replace(/[\s₺TL]/gi, "");
  if (!metin) return null;
  const sayi = Number(metin.includes(",") ? metin.replace(/\./g, "").replace(",", ".") : metin);
  if (!Number.isFinite(sayi) || sayi < 0) return null;
  return Math.round(sayi * 100);
}

/**
 * Stok adedini okur; okunamayan her şeyde `null`.
 *
 * **Rakam dışı karakterleri silmek yanlıştı** (K-68): `"2,5"` yazan satır
 * `25 adet` oluyordu — iki kat değil, on iki kat fazla stok. Sessizce
 * oluyordu, üstelik toplu yükleme yüzlerce satırı tek seferde kataloğa
 * yazıyor. Stok tam sayı olmak zorunda: yarım zıbın diye bir şey yok.
 *
 * Binlik ayracı kabul ediliyor (`1.000`, `1 000`) çünkü Excel sayıyı öyle
 * biçimlendirip veriyor; **virgül kabul edilmiyor** çünkü Türkçede virgül
 * ondalık demek ve ondalık stok yok.
 */
function stokCoz(ham: string): number | null {
  const metin = ham.trim().replace(/\s/g, "");
  if (!metin) return null;
  // Ya düz tam sayı, ya da üçerli gruplanmış hâli.
  if (!/^-?\d+$/.test(metin) && !/^-?\d{1,3}(\.\d{3})+$/.test(metin)) return null;
  const sayi = Number(metin.replace(/\./g, ""));
  return Number.isInteger(sayi) ? sayi : null;
}

function evetMi(ham: string, varsayilan: boolean): boolean {
  const m = anahtar(ham);
  if (!m) return varsayilan;
  return ["evet", "e", "1", "x", "var", "true", "acik", "aktif", "yayinda"].includes(m);
}

/**
 * Renk hem kodla ("mint") hem görünen adıyla ("Nane") yazılabiliyor.
 *
 * Kabul edilen renkler bedenler gibi veritabanından geliyor ve çağıran
 * tarafından veriliyor: bu modül senkron kalsın diye (K-66).
 */
function renkCoz(ham: string, renkler: readonly RenkSecenegi[]): RenkAdi | null {
  const m = anahtar(ham);
  if (!m) return null;
  return renkler.find((r) => r.kod === m || anahtar(r.ad) === m)?.kod ?? null;
}

/**
 * "0-3" ya da "0-3 ay" gibi yazımları listedeki bedene oturtur.
 *
 * Kabul edilen bedenler artık veritabanından geliyor ve çağıran tarafından
 * veriliyor: bu modül senkron kalsın diye (K-56).
 */
function bedenCoz(ham: string, bedenler: readonly string[]): string | null {
  const m = anahtar(ham);
  if (!m) return null;
  return (
    bedenler.find((b) => anahtar(b) === m) ??
    bedenler.find((b) => anahtar(b) === `${m} ay`) ??
    null
  );
}

// ── Dosya okuma ────────────────────────────────────────────────────────────

/** exceljs hücresi: sayı, tarih, formül sonucu, zengin metin — hepsi metne. */
function hucreMetni(deger: unknown): string {
  if (deger === null || deger === undefined) return "";
  if (typeof deger === "string") return deger.trim();
  if (typeof deger === "number" || typeof deger === "boolean") return String(deger);
  if (deger instanceof Date) return deger.toISOString().slice(0, 10);
  const n = deger as { result?: unknown; text?: string; richText?: { text: string }[] };
  if (n.richText) return n.richText.map((p) => p.text).join("").trim();
  if (n.text !== undefined) return String(n.text).trim();
  if (n.result !== undefined) return hucreMetni(n.result);
  return "";
}

/**
 * CSV ayrıştırıcı.
 *
 * Türkçe Excel CSV'yi noktalı virgülle yazıyor, İngilizcesi virgülle; ayraç
 * ilk satıra bakılarak seçiliyor. Tırnak içindeki ayraç ve satır sonu
 * metindir; iki tırnak bir tırnak demektir.
 */
export function csvCoz(ham: string): string[][] {
  const metin = ham.replace(/^﻿/, "");
  const ilkSatir = metin.slice(0, metin.indexOf("\n") + 1 || undefined);
  const ayrac = (ilkSatir.match(/;/g)?.length ?? 0) > (ilkSatir.match(/,/g)?.length ?? 0) ? ";" : ",";

  const satirlar: string[][] = [];
  let satir: string[] = [];
  let hucre = "";
  let tirnakta = false;

  for (let i = 0; i < metin.length; i += 1) {
    const h = metin[i];
    if (tirnakta) {
      if (h === '"') {
        if (metin[i + 1] === '"') { hucre += '"'; i += 1; } else tirnakta = false;
      } else hucre += h;
      continue;
    }
    if (h === '"') { tirnakta = true; continue; }
    if (h === ayrac) { satir.push(hucre); hucre = ""; continue; }
    if (h === "\r") continue;
    if (h === "\n") { satir.push(hucre); satirlar.push(satir); satir = []; hucre = ""; continue; }
    hucre += h;
  }
  if (hucre !== "" || satir.length > 0) { satir.push(hucre); satirlar.push(satir); }

  return satirlar.filter((s) => s.some((h) => h.trim() !== ""));
}

/** Dosyayı başlık + satırlara çevirir. Hangi biçim olduğu uzantıdan anlaşılıyor. */
export async function tabloyuOku(
  dosyaAdi: string,
  icerik: ArrayBuffer,
): Promise<{ basliklar: string[]; satirlar: string[][] }> {
  const csvMi = dosyaAdi.toLowerCase().endsWith(".csv") || dosyaAdi.toLowerCase().endsWith(".txt");

  let hepsi: string[][];
  if (csvMi) {
    hepsi = csvCoz(new TextDecoder("utf-8").decode(icerik));
  } else {
    const kitap = new ExcelJS.Workbook();
    await kitap.xlsx.load(icerik);
    const sayfa = kitap.worksheets[0];
    if (!sayfa) throw new Error("Dosyada okunabilecek bir sayfa yok.");
    hepsi = [];
    sayfa.eachRow((satir) => {
      const hucreler: string[] = [];
      // `values` bire indeksli; sıfırıncı boş geliyor.
      const degerler = satir.values as unknown[];
      for (let i = 1; i < degerler.length; i += 1) hucreler.push(hucreMetni(degerler[i]));
      if (hucreler.some((h) => h !== "")) hepsi.push(hucreler);
    });
  }

  const [basliklar, ...geri] = hepsi;
  if (!basliklar) throw new Error("Dosya boş görünüyor.");
  return { basliklar, satirlar: geri };
}

// ── Satırları çözme ────────────────────────────────────────────────────────

/** Başlık satırından "hangi sütun kaçıncı sırada" haritası. */
function sutunHaritasi(basliklar: string[]): Partial<Record<SutunAdi, number>> {
  const harita: Partial<Record<SutunAdi, number>> = {};
  basliklar.forEach((b, i) => {
    const a = anahtar(b);
    for (const [ad, yazimlar] of Object.entries(SUTUNLAR) as [SutunAdi, readonly string[]][]) {
      if (harita[ad] === undefined && yazimlar.includes(a)) harita[ad] = i;
    }
  });
  return harita;
}

/**
 * Ham tabloyu çözülmüş satırlara çevirir ve biçim hatalarını toplar.
 *
 * Burada yalnızca dosyanın kendi içinden görülebilen hatalar yakalanıyor
 * (eksik sütun, okunamayan fiyat, listede olmayan beden). Veritabanına bağlı
 * olanlar — kategori var mı, ürün yeni mi — `planYap` içinde.
 */
export function satirlariCoz(
  basliklar: string[],
  ham: string[][],
  /** Kabul edilen bedenler, sırasıyla (bkz. server/bedenler.ts). */
  bedenler: readonly string[],
  /** Kabul edilen renkler, sırasıyla (bkz. server/renkler.ts). */
  renkler: readonly RenkSecenegi[],
): { satirlar: Satir[]; hatalar: Hata[] } {
  const harita = sutunHaritasi(basliklar);
  const hatalar: Hata[] = [];

  for (const gerekli of ["ad", "kategori", "beden", "renk", "stok"] as SutunAdi[]) {
    if (harita[gerekli] === undefined) {
      hatalar.push({
        satirNo: 1,
        sutun: SUTUNLAR[gerekli][0],
        mesaj: `Başlık satırında "${SUTUNLAR[gerekli][0]}" sütunu bulunamadı.`,
      });
    }
  }
  if (hatalar.length > 0) return { satirlar: [], hatalar };

  const al = (satir: string[], ad: SutunAdi): string => {
    const i = harita[ad];
    return i === undefined ? "" : (satir[i] ?? "").trim();
  };

  const satirlar: Satir[] = [];
  const gorulen = new Set<string>();

  ham.forEach((h, sira) => {
    // Başlık birinci satır; tabloda görünen numara bu.
    const satirNo = sira + 2;
    const ad = al(h, "ad");
    if (!ad) return; // Tamamen boş satırlar zaten elenmişti; adı olmayan atlanıyor.

    const fiyatHam = al(h, "fiyat");
    const fiyatKurus = fiyatHam ? kurusaCevir(fiyatHam) : null;
    if (fiyatHam && fiyatKurus === null) {
      hatalar.push({ satirNo, sutun: "Fiyat", mesaj: `"${fiyatHam}" fiyat olarak okunamadı.` });
    }

    const eskiHam = al(h, "eskiFiyat");
    const eskiFiyatKurus = eskiHam ? kurusaCevir(eskiHam) : null;
    if (eskiHam && eskiFiyatKurus === null) {
      hatalar.push({ satirNo, sutun: "Eski fiyat", mesaj: `"${eskiHam}" fiyat olarak okunamadı.` });
    }

    const alisHam = al(h, "alisFiyat");
    const alisFiyatKurus = alisHam ? kurusaCevir(alisHam) : null;
    if (alisHam && alisFiyatKurus === null) {
      hatalar.push({ satirNo, sutun: "Alış fiyatı", mesaj: `"${alisHam}" fiyat olarak okunamadı.` });
    }

    const bedenHam = al(h, "beden");
    const beden = bedenCoz(bedenHam, bedenler);
    if (!beden) {
      hatalar.push({
        satirNo,
        sutun: "Beden",
        mesaj: `"${bedenHam}" tanınmadı. Kabul edilenler: ${bedenler.join(", ")}.`,
      });
    }

    const renkHam = al(h, "renk");
    const renk = renkCoz(renkHam, renkler);
    if (!renk) {
      const secenekler = renkler.map((r) => `${r.ad} (${r.kod})`);
      hatalar.push({
        satirNo,
        sutun: "Renk",
        mesaj: `"${renkHam}" tanınmadı. Kabul edilenler: ${secenekler.join(", ")}.`,
      });
    }

    const stokHam = al(h, "stok");
    const stokCozulen = stokCoz(stokHam);
    const stok = stokCozulen ?? 0;
    if (stokCozulen === null || stokCozulen < 0) {
      hatalar.push({
        satirNo,
        sutun: "Stok",
        mesaj: `"${stokHam}" adet olarak okunamadı. Stok tam sayı olmalı; ondalık kabul edilmiyor.`,
      });
    }

    const gorselHam = anahtar(al(h, "gorsel"));
    const gorsel = gorselHam || "zibin";
    if (!(GORSEL_TIPLERI as readonly string[]).includes(gorsel)) {
      hatalar.push({
        satirNo,
        sutun: "Görsel",
        mesaj: `"${gorselHam}" tanınmadı. Kabul edilenler: ${GORSEL_TIPLERI.join(", ")}.`,
      });
    }

    const paletHam = al(h, "palet");
    const palet = paletHam ? renkCoz(paletHam, renkler) : (renkler[0]?.kod ?? "");
    if (!palet) {
      hatalar.push({ satirNo, sutun: "Palet", mesaj: `"${paletHam}" tanınmadı.` });
    }

    if (beden && renk) {
      const imza = `${anahtar(ad)}|${beden}|${renk}`;
      if (gorulen.has(imza)) {
        hatalar.push({
          satirNo,
          sutun: "Beden/Renk",
          mesaj: `"${ad}" için ${beden} ${renkler.find((r) => r.kod === renk)?.ad ?? renk} dosyada birden çok kez var.`,
        });
      }
      gorulen.add(imza);
    }

    satirlar.push({
      satirNo,
      ad,
      kategori: al(h, "kategori"),
      fiyatKurus,
      eskiFiyatKurus,
      alisFiyatKurus,
      ozet: al(h, "ozet"),
      aciklama: al(h, "aciklama"),
      kumasIcerigi: al(h, "kumasIcerigi"),
      yikamaTalimati: al(h, "yikamaTalimati"),
      ureticiBilgisi: al(h, "ureticiBilgisi"),
      ozellikler: al(h, "ozellikler").split(/[|\n]/).map((s) => s.trim()).filter(Boolean),
      beden: beden ?? bedenHam,
      renk: renk ?? renkHam,
      stok: Number.isInteger(stok) && stok >= 0 ? stok : 0,
      sku: al(h, "sku"),
      gorsel,
      palet: palet ?? "mint",
      aktif: evetMi(al(h, "aktif"), true),
    });
  });

  if (satirlar.length === 0 && hatalar.length === 0) {
    hatalar.push({ satirNo: 1, sutun: "Ürün adı", mesaj: "Dosyada ürün satırı bulunamadı." });
  }

  return { satirlar, hatalar };
}

// ── Plan ───────────────────────────────────────────────────────────────────

/** Aynı ürünün satırlarında ürün bilgisi çelişirse hangi alan olduğu yazılsın. */
const URUN_ALANLARI = [
  ["kategori", "Kategori"],
  ["fiyatKurus", "Fiyat"],
  ["ozet", "Özet"],
  ["kumasIcerigi", "Kumaş içeriği"],
  ["yikamaTalimati", "Yıkama talimatı"],
] as const;

/**
 * Çözülmüş satırlardan "ne olacak" planını çıkarır.
 *
 * Veritabanına bakması gereken denetimler burada: kategori var mı, ürün yeni
 * mi. Yeni üründe kumaş içeriği ve yıkama talimatı zorunlu (bebek tekstilinde
 * yasal zorunluluk), ama var olan üründe boş bırakılabiliyor — böylece aynı
 * dosya düzeni yalnızca stok güncellemek için de kullanılabiliyor.
 */
export async function planYap(satirlar: Satir[]): Promise<Plan> {
  const hatalar: Hata[] = [];

  const kategoriler = await db.category.findMany({ select: { id: true, slug: true, ad: true } });
  const kategoriBul = (ham: string) =>
    kategoriler.find((k) => anahtar(k.ad) === anahtar(ham) || k.slug === slugYap(ham));

  // Ürün adına göre grupla; sıra dosyadaki sıra.
  const gruplar = new Map<string, Satir[]>();
  for (const s of satirlar) {
    const k = slugYap(s.ad);
    const liste = gruplar.get(k);
    if (liste) liste.push(s);
    else gruplar.set(k, [s]);
  }

  const sluglar = [...gruplar.keys()];
  const varOlanlar = await db.product.findMany({
    where: { slug: { in: sluglar } },
    select: {
      id: true,
      slug: true,
      variants: { select: { beden: true, renk: true, stok: true } },
    },
  });
  const varOlan = new Map(varOlanlar.map((u) => [u.slug, u]));

  const urunler: UrunOzeti[] = [];
  const stokDegisimleri: StokDegisimi[] = [];

  for (const [slug, grup] of gruplar) {
    const ilk = grup[0];
    const mevcut = varOlan.get(slug);
    const yeniMi = !mevcut;

    // Ürün bilgisi satırdan satıra değişiyorsa hangi değerin geçerli olduğu
    // belirsiz kalır; dosya düzeltilsin diye hata sayılıyor.
    for (const [alan, baslik] of URUN_ALANLARI) {
      const degerler = new Set(grup.map((s) => String(s[alan] ?? "")).filter((d) => d !== ""));
      if (degerler.size > 1) {
        hatalar.push({
          satirNo: grup[1]?.satirNo ?? ilk.satirNo,
          sutun: baslik,
          mesaj: `"${ilk.ad}" satırlarında ${baslik.toLocaleLowerCase("tr")} farklı yazılmış: ${[...degerler].join(" / ")}`,
        });
      }
    }

    const kategoriHam = grup.map((s) => s.kategori).find(Boolean) ?? "";
    const kategori = kategoriBul(kategoriHam);
    if (!kategori && (yeniMi || kategoriHam)) {
      hatalar.push({
        satirNo: ilk.satirNo,
        sutun: "Kategori",
        mesaj: kategoriHam
          ? `"${kategoriHam}" diye bir kategori yok. Önce panelden açılmalı.`
          : `"${ilk.ad}" yeni bir ürün, kategorisi yazılmalı.`,
      });
    }

    if (yeniMi) {
      const fiyat = grup.map((s) => s.fiyatKurus).find((f) => f !== null);
      if (fiyat === undefined) {
        hatalar.push({
          satirNo: ilk.satirNo,
          sutun: "Fiyat",
          mesaj: `"${ilk.ad}" yeni bir ürün, fiyatı yazılmalı.`,
        });
      }
      for (const [alan, baslik] of [
        ["kumasIcerigi", "Kumaş içeriği"],
        ["yikamaTalimati", "Yıkama talimatı"],
      ] as const) {
        if (!grup.some((s) => s[alan])) {
          hatalar.push({
            satirNo: ilk.satirNo,
            sutun: baslik,
            mesaj: `"${ilk.ad}" yeni bir ürün, ${baslik.toLocaleLowerCase("tr")} yazılmalı (bebek tekstilinde zorunlu).`,
          });
        }
      }
    }

    const eskiVaryantlar = new Set(
      (mevcut?.variants ?? []).map((v) => `${v.beden}|${v.renk}`),
    );
    const yeniVaryant = grup.filter((s) => !eskiVaryantlar.has(`${s.beden}|${s.renk}`)).length;

    for (const s of grup) {
      const v = mevcut?.variants.find((v) => v.beden === s.beden && v.renk === s.renk);
      if (v && v.stok !== s.stok) {
        stokDegisimleri.push({ ad: ilk.ad, beden: s.beden, renk: s.renk, simdi: v.stok, yeni: s.stok });
      }
    }

    urunler.push({ ad: ilk.ad, slug, yeniMi, varyant: grup.length, yeniVaryant });
  }

  hatalar.sort((a, b) => a.satirNo - b.satirNo);
  return { satirlar, hatalar, urunler, stokDegisimleri };
}

// ── Uygulama ───────────────────────────────────────────────────────────────

/**
 * Planı veritabanına yazar. Tek işlem: bir yerde patlarsa hiçbiri yazılmıyor.
 *
 * Boş bırakılan alanlar var olan ürünün değerini silmiyor, olduğu gibi
 * bırakıyor: yalnızca stok yazılmış bir dosya ürünün açıklamasını
 * süpürmesin.
 */
export type UygulamaSonucu = {
  urun: number;
  varyant: number;
  /** Önizlemeden sonra stoğu değiştiği için stoğu yazılmayan satırlar (K-102). */
  atlanan: { ad: string; beden: string; renk: string }[];
};

export async function planiUygula(
  satirlar: Satir[],
  anlikStok?: Record<string, number> | null,
  yapan?: Yapan,
): Promise<UygulamaSonucu> {
  const plan = await planYap(satirlar);
  if (plan.hatalar.length > 0) {
    throw new Error("Dosyada düzeltilmemiş hata var; hiçbir şey yazılmadı.");
  }

  const kategoriler = await db.category.findMany({ select: { id: true, slug: true, ad: true } });

  const gruplar = new Map<string, Satir[]>();
  for (const s of satirlar) {
    const k = slugYap(s.ad);
    const liste = gruplar.get(k);
    if (liste) liste.push(s);
    else gruplar.set(k, [s]);
  }

  let varyantSayisi = 0;
  const atlanan: UygulamaSonucu["atlanan"] = [];
  const yazilanVaryantlar: string[] = [];
  const yazilanUrunler = new Set<string>();

  await db.$transaction(
    async (islem) => {
      for (const [slug, grup] of gruplar) {
        const ilk = grup[0];
        const ilkDolu = <A extends keyof Satir>(alan: A): Satir[A] | undefined =>
          grup.map((s) => s[alan]).find((d) => d !== "" && d !== null && d !== undefined);

        const kategoriHam = grup.map((s) => s.kategori).find(Boolean) ?? "";
        const kategori = kategoriler.find(
          (k) => anahtar(k.ad) === anahtar(kategoriHam) || k.slug === slugYap(kategoriHam),
        );

        const ozellikler = grup.map((s) => s.ozellikler).find((o) => o.length > 0);

        // Boş hücre "değiştirme" demek; tanımsız alanlar update'e hiç girmiyor.
        const alanlar = {
          ad: ilk.ad,
          categoryId: kategori?.id,
          fiyatKurus: ilkDolu("fiyatKurus") ?? undefined,
          eskiFiyatKurus: grup.map((s) => s.eskiFiyatKurus).find((f) => f !== null) ?? undefined,
          alisFiyatKurus: grup.map((s) => s.alisFiyatKurus).find((f) => f !== null) ?? undefined,
          ozet: ilkDolu("ozet"),
          aciklama: ilkDolu("aciklama"),
          kumasIcerigi: ilkDolu("kumasIcerigi"),
          yikamaTalimati: ilkDolu("yikamaTalimati"),
          ureticiBilgisi: ilkDolu("ureticiBilgisi"),
          ozellikler,
          gorsel: ilkDolu("gorsel"),
          palet: ilkDolu("palet"),
          aktif: ilk.aktif,
        };

        // Var olan ürün güncelleniyor, yenisi yaratılıyor. `upsert` burada
        // işe yaramıyor: create gövdesi kullanılmayacak olsa bile kuruluyor
        // ve yalnızca stok yazılı bir dosyada zorunlu alanlar boş kalıyor.
        const eski = await islem.product.findUnique({ where: { slug }, select: { id: true } });

        const urun = eski
          ? await islem.product.update({
              where: { id: eski.id },
              data: Object.fromEntries(
                Object.entries(alanlar).filter(([, d]) => d !== undefined),
              ),
              select: { id: true },
            })
          : await islem.product.create({
              data: {
                slug,
                ad: ilk.ad,
                categoryId: kategori!.id,
                fiyatKurus: alanlar.fiyatKurus!,
                eskiFiyatKurus: alanlar.eskiFiyatKurus ?? null,
                alisFiyatKurus: alanlar.alisFiyatKurus ?? null,
                ozet: alanlar.ozet ?? "",
                aciklama: alanlar.aciklama || null,
                kumasIcerigi: alanlar.kumasIcerigi!,
                yikamaTalimati: alanlar.yikamaTalimati!,
                ureticiBilgisi: alanlar.ureticiBilgisi || null,
                ozellikler: ozellikler ?? [],
                gorsel: alanlar.gorsel ?? "zibin",
                palet: alanlar.palet ?? "mint",
                aktif: ilk.aktif,
              },
              select: { id: true },
            });

        // İlk kez girilen alış fiyatı eski satışlara tahmini olarak (K-111).
        if (eski) await maliyetiGecmiseYaz(urun.id, alanlar.alisFiyatKurus, islem);

        for (const s of grup) {
          // SKU boşsa üretiliyor; var olan varyantın kendi kodu korunuyor.
          const sku = s.sku || `${slug}-${s.beden.replace(/\s/g, "")}-${s.renk}`;
          const anahtar_ = { productId: urun.id, beden: s.beden, renk: s.renk };
          const eskiVaryant = await islem.productVariant.findUnique({
            where: { productId_beden_renk: anahtar_ },
            select: { id: true, stok: true },
          });
          if (!eskiVaryant) {
            const yeni = await islem.productVariant.create({
              data: { ...anahtar_, stok: s.stok, sku },
              select: { id: true },
            });
            await hareketYaz(islem, [{ variantId: yeni.id, degisim: s.stok, sebep: "toplu", yapan }]);
          } else {
            // Önizlemede görülen stok değiştiyse arada satış olmuş: dosyadaki
            // sayı o satışı geri getirir. Stok yazılmıyor, SKU yine yazılıyor.
            const gorulen = anlikStok?.[stokAnahtari(slug, s.beden, s.renk)];
            const degismis = gorulen !== undefined && gorulen !== eskiVaryant.stok;
            if (degismis) atlanan.push({ ad: ilk.ad, beden: s.beden, renk: s.renk });
            await islem.productVariant.update({
              where: { id: eskiVaryant.id },
              data: { ...(degismis ? {} : { stok: s.stok }), ...(s.sku ? { sku } : {}) },
            });
            if (!degismis) {
              await hareketYaz(islem, [
                { variantId: eskiVaryant.id, degisim: s.stok - eskiVaryant.stok, sebep: "toplu", yapan },
              ]);
            }
          }
          varyantSayisi += 1;
          yazilanUrunler.add(urun.id);
          yazilanVaryantlar.push(
            `${urun.id}|${s.beden}|${s.renk}`,
          );
        }
      }
    },
    { timeout: 120_000, maxWait: 20_000 },
  );

  // Arama metinleri işlemin dışında tazeleniyor: uzun işlemi daha da
  // uzatmanın anlamı yok, arama birkaç saniye sonra güncellense de olur.
  await aramaMetinleriniTazele([...yazilanUrunler]);

  // Toplu yükleme tükenmiş bir bedene stok girmiş olabilir; bekleyenlere
  // haber veriliyor. İşlemin dışında: e-posta işlemi uzatmamalı.
  const idler = await db.productVariant.findMany({
    where: {
      OR: yazilanVaryantlar.map((a) => {
        const [productId, beden, renk] = a.split("|");
        return { productId, beden, renk };
      }),
      stok: { gt: 0 },
    },
    select: { id: true },
  });
  await stokBildirimleriniGonder(idler.map((v) => v.id));

  return { urun: gruplar.size, varyant: varyantSayisi, atlanan };
}

/**
 * Eski yükleme kayıtlarını siler.
 *
 * Onaylanan kayıt da onaylanmadan unutulan da yalnızca onay ekranı için
 * duruyor; bir günden eskisinin kimseye faydası yok.
 */
export async function eskiYuklemeleriTemizle(): Promise<number> {
  const sinir = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await db.productImport.deleteMany({
    where: { olusturuldu: { lt: sinir } },
  });
  return count;
}
