/**
 * Sayfalama: sayfa numarasının çözülmesi ve adreste taşınması.
 *
 * **Sayfa adres satırında.** Panelin geri kalanı gibi JavaScript'siz
 * çalışıyor: bağlantıya basmak sayfayı yeniden çiziyor, geri tuşu işliyor,
 * "üçüncü sayfadaki şu kayıt" diye bağlantı paylaşılabiliyor (K-67).
 *
 * **Sayfa boyu ekran başına.** Tek bir sabit hem 40 kutuluk ürün ızgarasına
 * hem de tek satırlık beden listesine uymuyordu; her ekran kendi boyunu
 * veriyor, buradaki değer yalnızca varsayılan.
 *
 * **Sınır aşılırsa son sayfa gösteriliyor, boş liste değil.** Üçüncü
 * sayfadayken kayıt silinince sayfa sayısı ikiye düşebiliyor; adreste kalan
 * `?sayfa=3` boş bir ekran yerine son sayfayı açıyor.
 */

export const SAYFA_BOYU = 20;

export type SayfaDurumu = {
  /** 1'den başlayan, sınırlara oturtulmuş sayfa numarası */
  sayfa: number;
  sonSayfa: number;
  /** Kaç kayıt atlanacak: `skip` ya da `slice` için */
  atla: number;
  boy: number;
  toplam: number;
};

/** Adres satırındaki ham değeri sayfa numarasına çevirir; geçersizse 1. */
export function sayfaNo(ham: unknown): number {
  const n = Number(typeof ham === "string" ? ham : "");
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function sayfaCoz(ham: unknown, toplam: number, boy = SAYFA_BOYU): SayfaDurumu {
  const sonSayfa = Math.max(1, Math.ceil(toplam / boy));
  const sayfa = Math.min(sayfaNo(ham), sonSayfa);
  return { sayfa, sonSayfa, atla: (sayfa - 1) * boy, boy, toplam };
}

/** Bellekteki bir listeyi sayfalar; sorgusu zaten yapılmış listeler için. */
export function dilimle<T>(liste: readonly T[], durum: SayfaDurumu): T[] {
  return liste.slice(durum.atla, durum.atla + durum.boy);
}

/**
 * Var olan adrese sayfa numarasını ekler; ilk sayfada hiç eklemiyor.
 *
 * Birinci sayfanın adresi `?sayfa=1` değil sade hâli oluyor: aynı listenin
 * iki farklı adresi olsun istemiyoruz — paylaşılan bağlantı da, arama
 * motorundaki kayıt da tek olmalı.
 */
export function sayfaAdresi(temel: string, sayfa: number, ad = "sayfa"): string {
  if (sayfa <= 1) return temel;
  const ayrac = temel.includes("?") ? "&" : "?";
  return `${temel}${ayrac}${ad}=${sayfa}`;
}

/**
 * Formdaki sayfa numarasını kaydetme sonrası adrese ekler.
 *
 * Sıralamayı değiştirince ya da bir kayıt silinince listenin başına atılmak,
 * kaldığın yeri her seferinde yeniden bulmak demekti.
 */
export function formSayfaEki(veri: FormData, ad = "sayfa"): string {
  const n = Number(String(veri.get(ad) ?? ""));
  return Number.isInteger(n) && n > 1 ? `&${ad}=${n}` : "";
}

/**
 * Taşınan kaydın **yeni** yerine denk gelen sayfayı verir.
 *
 * Sayfanın ilk kaydını yukarı taşımak onu bir önceki sayfaya gönderiyor;
 * kaldığın sayfaya dönülseydi kayıt gözden kaybolurdu — "ok çalışmadı" gibi
 * görünürdü. Form sayfa boyunu da taşıyor, hesap burada yapılıyor.
 */
export function tasimaSayfaEki(veri: FormData, yeniSira: number, ad = "sayfa"): string {
  const boy = Number(String(veri.get("boy") ?? ""));
  if (!Number.isInteger(boy) || boy < 1) return formSayfaEki(veri, ad);
  const sayfa = Math.floor(yeniSira / boy) + 1;
  return sayfa > 1 ? `&${ad}=${sayfa}` : "";
}
