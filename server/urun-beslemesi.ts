/**
 * Google Merchant Center ürün beslemesi (K-123).
 *
 * Ürünler Google Alışveriş sekmesinde ve aramadaki ürün kutularında ücretsiz
 * listelenebiliyor; bunun için Google'ın okuyacağı bir ürün listesi gerekiyor.
 * Liste `/google-urunler.xml` adresinde, saatte bir yenileniyor. Merchant
 * Center'da bu adres "zamanlanmış getirme" olarak bir kez tanımlanıyor.
 *
 * **Her beden-renk ayrı ürün** (Google'ın giyim kuralı): aynı ürünün
 * varyantları `item_group_id` ile bağlanıyor; bedeni, rengi, stoğu ayrı.
 *
 * **Fiyat ürün sayfasıyla aynı kuraldan.** Kampanya varsa indirimli fiyat
 * `sale_price`, liste fiyatı `price`; kampanya yoksa elle girilmiş eski
 * fiyat üstü çizili olan. Google sayfadaki fiyatla beslemedekini
 * karşılaştırıyor, ayrışırsa ürünü reddediyor.
 *
 * **Fotoğrafı olmayan ürün beslemeye girmiyor.** Google resim istiyor; çizim
 * (fotoğraf gelene kadarki SVG) kabul edilmiyor.
 *
 * **Meta (Instagram/Facebook) kataloğu da aynı liste** (K-142):
 * `/meta-urunler.xml`. Meta, Google'ın biçimini okuyor; tek fark stok
 * durumunun yazımı ("in stock"). Fiyat, fotoğraf ve varyant grubu ortak, iki
 * kanal aynı ürünü aynı fiyatla gösteriyor.
 *
 * Saf modül: adres üretimi dışarıdan veriliyor, testler doğrudan çağırıyor.
 */

export type Hedef = "google" | "meta";

import { normalle } from "@/server/arama-metin";
import { renginFotograflari, type Urun } from "@/ui/katalog-bicim";

export const MARKA = "BASoftBaby";

/** Google ürün kategorisi: Giyim ve Aksesuar > Giyim > Bebek ve Küçük Çocuk Giyimi. */
const GOOGLE_KATEGORISI = "182";

/** Google'ın yaş grupları; bedenden çıkıyor. */
export type YasGrubu = "newborn" | "infant" | "toddler" | "kids";

/**
 * "0-3 ay" → newborn, "6-9 ay" → infant, "18-24 ay" / "2-3 yaş" → toddler.
 * Aralığın üst ucuna bakılıyor: Google'ın sınırları 3 ay, 12 ay ve 5 yaş.
 */
export function yasGrubu(beden: string): YasGrubu {
  const m = /(\d+)\s*(?:-\s*(\d+))?\s*(ay|yas|yaş)/i.exec(beden);
  if (!m) return "infant";
  const ust = Number(m[2] ?? m[1]);
  const ay = /ay/i.test(m[3]) ? ust : ust * 12;
  if (ay <= 3) return "newborn";
  if (ay <= 12) return "infant";
  if (ay <= 60) return "toddler";
  return "kids";
}

/** Kategori adından cinsiyet; belirtmeyen kategori "unisex". */
export function cinsiyet(kategori: string): "male" | "female" | "unisex" {
  const k = normalle(kategori);
  if (/\berkek\b/.test(k)) return "male";
  if (/\bkiz\b/.test(k)) return "female";
  return "unisex";
}

function tl(kurus: number): string {
  return `${(kurus / 100).toFixed(2)} TRY`;
}

function kacis(metin: string): string {
  return metin
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // XML'de geçersiz denetim karakterleri (panelden yapıştırılan metinde
    // görülebiliyor) beslemenin tamamını bozuyor.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

export type BeslemeOgesi = {
  id: string;
  grup: string;
  baslik: string;
  aciklama: string;
  link: string;
  resim: string;
  ekResimler: string[];
  stokta: boolean;
  fiyat: string;
  indirimliFiyat?: string;
  kategori: string;
  renk: string;
  beden: string;
  yas: YasGrubu;
  cinsiyet: "male" | "female" | "unisex";
};

/** Bir ürünün besleme satırları: fotoğrafı olan her varyant için bir tane. */
export function urunOgeleri(
  u: Urun,
  adres: (yol: string) => string,
  kategoriAdlari: ReadonlyMap<string, string> = new Map(),
): BeslemeOgesi[] {
  if (u.fotograflar.length === 0) return [];
  const satis = u.kampanya ? u.kampanya.indirimliFiyatKurus : u.fiyatKurus;
  const ustuCizili = u.kampanya ? u.fiyatKurus : u.eskiFiyatKurus;
  const indirimli = ustuCizili !== undefined && ustuCizili > satis;
  const renkAdi = new Map(u.renkler.map((r) => [r.kod, r.ad]));
  // `kategori` ürünün kategori adresi ("kiz-cocuk"); beslemede adı.
  const kategori = kategoriAdlari.get(u.kategori) ?? u.kategori;

  return u.varyantlar.map((v) => {
    const fotolar = renginFotograflari(u.fotograflar, v.renk);
    const renk = renkAdi.get(v.renk) ?? v.renk;
    return {
      id: v.id,
      grup: u.id,
      baslik: `${u.ad} - ${renk} - ${v.beden}`.slice(0, 150),
      aciklama: [u.ozet, u.kumasIcerigi, ...u.ozellikler].filter(Boolean).join(". ").slice(0, 5000),
      link: adres(`/urun/${u.slug}?renk=${encodeURIComponent(v.renk)}`),
      resim: adres(fotolar[0].yol),
      ekResimler: fotolar.slice(1, 11).map((f) => adres(f.yol)),
      stokta: v.stok > 0,
      fiyat: tl(indirimli ? ustuCizili : satis),
      indirimliFiyat: indirimli ? tl(satis) : undefined,
      kategori,
      renk,
      beden: v.beden,
      yas: yasGrubu(v.beden),
      cinsiyet: cinsiyet(kategori),
    };
  });
}

function ogeXml(o: BeslemeOgesi, hedef: Hedef): string {
  const alan = (ad: string, deger: string) => `      <g:${ad}>${kacis(deger)}</g:${ad}>`;
  return [
    "    <item>",
    alan("id", o.id),
    alan("item_group_id", o.grup),
    alan("title", o.baslik),
    alan("description", o.aciklama),
    alan("link", o.link),
    alan("image_link", o.resim),
    ...o.ekResimler.map((r) => alan("additional_image_link", r)),
    alan(
      "availability",
      hedef === "meta"
        ? o.stokta ? "in stock" : "out of stock"
        : o.stokta ? "in_stock" : "out_of_stock",
    ),
    alan("price", o.fiyat),
    ...(o.indirimliFiyat ? [alan("sale_price", o.indirimliFiyat)] : []),
    alan("brand", MARKA),
    alan("condition", "new"),
    // Kendi markamız, barkodlar iç numara (K-107): GTIN yok.
    alan("identifier_exists", "no"),
    alan("google_product_category", GOOGLE_KATEGORISI),
    alan("product_type", o.kategori),
    alan("color", o.renk),
    alan("size", o.beden),
    alan("age_group", o.yas),
    alan("gender", o.cinsiyet),
    "    </item>",
  ].join("\n");
}

export function beslemeXml(
  urunler: Urun[],
  adres: (yol: string) => string,
  kategoriAdlari: ReadonlyMap<string, string> = new Map(),
  hedef: Hedef = "google",
): string {
  const ogeler = urunler.flatMap((u) => urunOgeleri(u, adres, kategoriAdlari));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    `    <title>${kacis(MARKA)}</title>`,
    `    <link>${kacis(adres("/"))}</link>`,
    "    <description>Bebek ve çocuk giyimi</description>",
    ...ogeler.map((o) => ogeXml(o, hedef)),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
