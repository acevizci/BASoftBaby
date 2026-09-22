/**
 * Panel listelerinin araması — hesap kısmı.
 *
 * **Neden gerekti.** Arama kutusu yalnızca stok ve siparişlerde vardı. Geri
 * kalan listeler sayfalandıktan sonra (K-67) bir kaydı bulmak sayfa çevirmek
 * demeye başladı: yüz ürünün içinden "fitilli tulum"u aramak beş sayfa
 * gezmek oluyordu (K-69).
 *
 * **Türkçe klavyeye takılmıyor.** Arama metni de aranan da aynı biçime
 * indiriliyor: "zibin" yazan kişi "Zıbın"ı buluyor. Kural `normalle` ile tek
 * yerde, mağaza aramasıyla aynı (K-35).
 *
 * **Her kelime ayrı aranıyor ve hepsi bulunmak zorunda.** "mavi tulum" yazan
 * kişi mavi **ve** tulum arıyor.
 */

import { kelimeler, normalle } from "@/server/arama-metin";

/** Adres satırındaki ham değeri arama metnine çevirir. */
export function aramaCoz(ham: unknown): string {
  return typeof ham === "string" ? ham.trim().slice(0, 100) : "";
}

/**
 * Bellekteki bir kaydın aramaya uyup uymadığı.
 *
 * Veritabanı sorgusu olmayan listeler (kategoriler, bedenler, renkler,
 * kullanıcılar) bunu kullanıyor: listeler zaten önbellekte ve küçük, ayrıca
 * bir sorgu açmanın anlamı yok.
 */
export function aramayaUyuyorMu(parcalar: (string | null | undefined)[], ara: string): boolean {
  const metin = normalle(parcalar.filter(Boolean).join(" "));
  const aranan = kelimeler(ara);

  // Tek harflik parçalar atılıyor (neredeyse her kayda uyuyorlar) ama
  // panelde aranan şeylerin çoğu kısa kod: "0-3", "6-9", "S". Hepsi
  // atılırsa arama sessizce tüm listeyi döndürürdü — hiç aramamakla aynı
  // şey, üstelik kullanıcı süzdüğünü sanır. O yüzden geriye kelime
  // kalmadığında metnin kendisi aranıyor (K-69).
  if (aranan.length === 0) {
    const ham = normalle(ara);
    return ham === "" || metin.includes(ham);
  }

  return aranan.every((k) => metin.includes(k));
}

/** Bellekteki listeyi arama metnine göre süzer. */
export function aramayaGoreSuz<T>(
  liste: readonly T[],
  ara: string,
  parcalar: (kayit: T) => (string | null | undefined)[],
): T[] {
  if (!ara) return [...liste];
  return liste.filter((k) => aramayaUyuyorMu(parcalar(k), ara));
}

/**
 * Prisma koşulu: `aramaMetni` sütunu olan tablolar için.
 *
 * Ürünlerde bu sütun zaten var ve her kayıtta tazeleniyor (K-35); stok
 * ekranının aramasıyla birebir aynı koşul.
 */
export function aramaKosulu(ara: string): Record<string, unknown> {
  const aranan = kelimeler(ara);
  if (aranan.length > 0) {
    return { AND: aranan.map((k) => ({ aramaMetni: { contains: k } })) };
  }
  // Kısa kodlar için aynı yedek: "0-3" yazan kişi tüm kataloğu değil o
  // bedeni görmeli.
  const ham = normalle(ara);
  return ham ? { aramaMetni: { contains: ham } } : {};
}

/**
 * Prisma koşulu: `aramaMetni` sütunu **olmayan** tablolar için.
 *
 * Yorum, talep, kampanya ve iade kayıtlarında böyle bir sütun yok; arama
 * doğrudan alanların üstünde yapılıyor. Türkçe harf katlaması burada
 * çalışmıyor — Postgres `ı` ile `i`yi ayrı harf sayıyor — o yüzden
 * büyük-küçük harf duyarsız `contains` ile yetiniliyor ve kullanıcının
 * yazdığı metin olduğu gibi aranıyor. Aranan alanlar zaten sipariş numarası,
 * ad ve kupon kodu gibi çoğunlukla ASCII şeyler.
 */
export function alanAramasi(ara: string, alanlar: string[]): Record<string, unknown> {
  const metin = ara.trim();
  if (!metin) return {};
  return {
    OR: alanlar.map((alan) => {
      const parcalar = alan.split(".");
      return parcalar.reduceRight<Record<string, unknown>>(
        (ic, ad) => ({ [ad]: ic }),
        { contains: metin, mode: "insensitive" } as unknown as Record<string, unknown>,
      );
    }),
  };
}

/**
 * Formdaki arama metnini kaydetme sonrası adrese ekler.
 *
 * Sayfa numarasıyla aynı gerekçe (K-67): aradığın listede bir kaydı
 * kapatınca tam listeye atılmak, aramayı yeniden yazmak demekti.
 */
export function formAramaEki(veri: FormData, ad = "ara"): string {
  const metin = String(veri.get(ad) ?? "").trim().slice(0, 100);
  return metin ? `&${ad}=${encodeURIComponent(metin)}` : "";
}
