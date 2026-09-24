/**
 * Hızlı atlama (⌘K / Ctrl+K) — hesap kısmı (K-119).
 *
 * Yazılan metinden sonuç listesi çıkarıyor: sipariş numarası, sayfalar,
 * eylemler ve "şunu siparişlerde ara" kısayolları. Sayfalar menü ağacından
 * (K-116) geliyor; menüye eklenen her sayfa burada da kendiliğinden
 * bulunuyor. Veritabanına bakmıyor: sonuçlar tuşa basar basmaz çıkıyor,
 * kayıt araması ilgili listenin kendi aramasına bırakılıyor.
 */

import { kelimeler, normalle } from "@/server/arama-metin";
import { TUM_BOLUMLER } from "@/ui/panel-menu-bicim";

export type SonucTuru = "siparis" | "sayfa" | "eylem" | "ara";

export type Sonuc = {
  tur: SonucTuru;
  baslik: string;
  /** Başlığın yanında soluk yazılan bağlam: bölüm adı gibi. */
  ek?: string;
  yol: string;
};

type Aday = Sonuc & { ad: string; metin: string };

function aday(tur: SonucTuru, baslik: string, yol: string, ek?: string, anahtar?: string): Aday {
  return {
    tur,
    baslik,
    ek,
    yol,
    ad: normalle(baslik),
    metin: normalle([baslik, ek, anahtar].filter(Boolean).join(" ")),
  };
}

/**
 * Menüdeki her sayfa bir kez. Bölümle aynı adresteki alt madde bölümün
 * yerine geçiyor: "Vitrin" değil "Kampanyalar · Vitrin".
 */
function sayfalar(): Aday[] {
  const liste: Aday[] = [];
  for (const b of TUM_BOLUMLER) {
    if (!b.alt.some((a) => a.yol === b.yol))
      liste.push(aday("sayfa", b.ad, b.yol, undefined, b.anahtar));
    for (const a of b.alt) liste.push(aday("sayfa", a.ad, a.yol, b.ad, a.anahtar));
  }
  return liste;
}

const EYLEMLER: Aday[] = [
  aday("eylem", "Yeni ürün ekle", "/yonetim/urunler/yeni", undefined, "urun olustur"),
  aday("eylem", "Stok etiketi bas", "/yonetim/stok/etiketler", undefined, "barkod yazdir"),
  aday("eylem", "Hesabım", "/yonetim/hesabim", undefined, "sifre degistir profil"),
  aday("eylem", "Mağazayı aç", "/", undefined, "site"),
];

const SAYFALAR = sayfalar();

/** Arama kısayolları: kayıt adları burada bilinmiyor, listenin araması buluyor. */
const ARAMALAR: { yol: string; baslik: (m: string) => string }[] = [
  { yol: "/yonetim/siparisler", baslik: (m) => `“${m}” siparişlerde ara` },
  { yol: "/yonetim/urunler", baslik: (m) => `“${m}” ürünlerde ara` },
  { yol: "/yonetim/stok", baslik: (m) => `“${m}” stokta ara (barkod da olur)` },
  { yol: "/yonetim/musteriler", baslik: (m) => `“${m}” müşterilerde ara` },
];

/**
 * "BA-2026-0012", "ba 2026 12", "BA20260012" → "BA-2026-0012".
 * Numara biçimi `server/siparis.ts`'teki `siparisNumarasi` ile aynı.
 */
export function siparisNumarasi(sorgu: string): string | null {
  const m = /^ba[\s-]*(\d{4})[\s-]*(\d{1,6})$/i.exec(sorgu.trim());
  if (!m) return null;
  return `BA-${m[1]}-${m[2].padStart(4, "0")}`;
}

/**
 * Adayın aramaya uyma derecesi; 0 uymuyor. Her kelime metindeki bir
 * kelimenin başına uymalı ("sip" Siparişler'i bulur, "par" bulmaz: kelime
 * ortası eşleşmeleri listeyi gürültüyle dolduruyordu).
 */
function derece(a: Aday, aranan: string[]): number {
  const sozcukler = a.metin.split(" ");
  if (!aranan.every((k) => sozcukler.some((s) => s.startsWith(k)))) return 0;
  const tam = aranan.join(" ");
  if (a.ad.startsWith(tam)) return 3;
  const adSozcukleri = a.ad.split(" ");
  if (aranan.every((k) => adSozcukleri.some((s) => s.startsWith(k)))) return 2;
  return 1;
}

const SIRA: Record<SonucTuru, number> = {
  siparis: 0,
  sayfa: 1,
  eylem: 2,
  ara: 3,
};

/** En çok kaç sayfa/eylem gösteriliyor; kalan yer arama kısayollarının. */
const EN_COK = 8;

/**
 * Yazılan metnin sonuçları, gösterilecek sırayla.
 *
 * Boşken bütün eylemler ve sayfalar (menüyü klavyeyle gezmek için). Doluyken
 * önce sipariş numarası, sonra uyan sayfa ve eylemler (adı yazılanla
 * başlayanlar önde), en sonda arama kısayolları.
 */
export function sonuclar(sorgu: string): Sonuc[] {
  const temiz = sorgu.trim().replace(/\s+/g, " ").slice(0, 100);
  const sadelestir = ({ tur, baslik, ek, yol }: Aday): Sonuc => ({
    tur,
    baslik,
    ek,
    yol,
  });
  if (!temiz) return [...EYLEMLER, ...SAYFALAR].map(sadelestir);

  const liste: Sonuc[] = [];
  const numara = siparisNumarasi(temiz);
  if (numara) {
    liste.push({
      tur: "siparis",
      baslik: `${numara} siparişini aç`,
      yol: `/yonetim/siparisler/${numara}`,
    });
  }

  // `kelimeler` tek harfleri atıyor; tek harf yazan kişi yine de bir şey
  // görmeli, o yüzden o durumda metnin kendisi aranıyor.
  const aranan = kelimeler(temiz);
  const parcalar = aranan.length > 0 ? aranan : [normalle(temiz)].filter(Boolean);
  if (parcalar.length > 0) {
    const uyanlar = [...SAYFALAR, ...EYLEMLER]
      .map((a, sira) => ({ a, sira, d: derece(a, parcalar) }))
      .filter((x) => x.d > 0)
      // Gruplar karışmasın diye önce tür, sonra uyma derecesi.
      .sort((x, y) => SIRA[x.a.tur] - SIRA[y.a.tur] || y.d - x.d || x.sira - y.sira)
      .slice(0, EN_COK)
      .map((x) => sadelestir(x.a));
    liste.push(...uyanlar);
  }

  const ara = encodeURIComponent(temiz);
  for (const k of ARAMALAR) {
    liste.push({
      tur: "ara",
      baslik: k.baslik(temiz),
      yol: `${k.yol}?ara=${ara}`,
    });
  }
  return liste;
}

/** Sonuç gruplarının başlıkları, listede göründükleri sırayla. */
export const GRUP_ADLARI: Record<SonucTuru, string> = {
  siparis: "Sipariş",
  sayfa: "Sayfalar",
  eylem: "Eylemler",
  ara: "Ara",
};
