"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PanelIkon from "@/ui/panel-ikon";
import { useState } from "react";
import {
  AYARLAR,
  BOLUMLER,
  BOLUM_CEREZI,
  bekleyenToplami,
  bolumOzeti,
  bolumSatiriEtkinMi,
  eslesir,
  etkinAdres,
  etkinBolum,
  sayfaAdi,
  type Bolum,
  type RozetTonu,
  type Sayaclar,
} from "@/ui/panel-menu-bicim";

/**
 * Panel menüsü.
 *
 * **Neden istemci bileşeni.** Açık sayfanın yolu eskiden middleware'in
 * eklediği başlıktan okunuyordu (K-43). Çalışmıyordu: düzenler istemci
 * tarafı gezinmede **yeniden çizilmiyor** — Next.js'te düzenin varlık sebebi
 * bu. Menüden başka bir sayfaya tıklayınca adres değişiyor ama düzen ilk
 * açılışta çizildiği yerde kalıyordu (K-51). `usePathname()` router durumuna
 * abone; her gezinmede yeniden çalışıyor ve sunucuda çizilirken de o anki
 * yolu döndürüyor, yani ilk boyamada işaret doğru.
 *
 * **Üç genişlik hâli var:**
 *
 * - **Telefon:** `<details>` ile açılır kapanır; kapalı başlıkta açık
 *   sayfanın adı ve bekleyen iş toplamı yazıyor.
 * - **Geniş ekran, açık:** ikon + ad + rozet.
 * - **Geniş ekran, dar:** yalnızca ikon; ad `sr-only` olarak duruyor ve
 *   `title` ile ipucu veriyor. Rozet küçük bir noktaya dönüşüyor — sayı
 *   64 piksele sığmıyor ama "bekleyen iş var" bilgisi kaybolmamalı (K-60).
 *
 * Dar/geniş tercihi çerezde (`server/panel-gorunum.ts`): sunucuda okunduğu
 * için ilk boyamada doğru genişlik çiziliyor, sayfalar arasında kalıyor ve
 * JavaScript kapalı tarayıcıda da çalışıyor — düğme bir form.
 *
 * Menü yapısı ve sayaçlar sunucudan geliyor: veritabanına bakan hiçbir şey
 * tarayıcıya inmiyor.
 *
 * **İki seviye, bağlamsal açılma (K-116).** Üst düzeyde yedi bölüm ve en
 * altta Ayarlar. Açık sayfanın bölümü her zaman açık, alt maddeleri altında.
 * Öteki bölümlerin yanındaki ok, gitmeden alt maddelere bakmak için; elle
 * açılanlar çerezde. Bölüm adı bir bağlantı, ok ayrı bir düğme
 * (WAI-ARIA disclosure): bağlantının içine düğme koymak ekran okuyucuda
 * iki işi tek öğeye yüklerdi.
 */
export default function PanelMenu({
  sayaclar,
  elleAcik,
  yonetici,
  dar,
  cikis,
  gorunumuCevir,
}: {
  sayaclar: Sayaclar;
  /** Çerezdeki elle açılmış bölümler. */
  elleAcik: string[];
  yonetici: { adSoyad: string; eposta: string };
  /** Geniş ekranda menü daraltılmış mı? */
  dar: boolean;
  /** Çıkış server action'ı; istemci bileşeninden de çağrılabiliyor. */
  cikis: () => Promise<void>;
  /** Daraltma server action'ı. */
  gorunumuCevir: () => Promise<void>;
}) {
  const yol = usePathname() ?? "/yonetim";
  const [acik, setAcik] = useState<string[]>(elleAcik);

  const cevir = (b: Bolum) => {
    const yeni = acik.includes(b.yol) ? acik.filter((y) => y !== b.yol) : [...acik, b.yol];
    setAcik(yeni);
    bolumCereziniYaz(yeni);
  };

  // Telefonda menü kapalı duruyor; bekleyen iş varsa rozetler görünmüyor.
  // Kapalı başlığa müşterinin beklediği işlerin toplamı yazılıyor, yoksa
  // "bugün bakılacak bir şey var mı" sorusu menüyü açmadan cevapsız kalırdı.
  const bekleyen = bekleyenToplami(sayaclar);
  const etkin = etkinBolum(yol);

  const bolum = (b: Bolum) => (
    <BolumSatiri
      key={b.yol + b.ad}
      b={b}
      yol={yol}
      dar={dar}
      sayaclar={sayaclar}
      etkin={etkin === b}
      acik={etkin === b || acik.includes(b.yol)}
      cevir={() => cevir(b)}
    />
  );

  return (
    // Küçük ekranda açılır, geniş ekranda hep açık. `open-yok` sınıfı
    // globals.css'te: tarayıcının kapalı `<details>` içeriğini gizleyen
    // kuralını geniş ekranda etkisiz kılıyor.
    <details className="open-yok group/menu">
      <summary className="flex list-none items-center justify-between rounded-marka border border-cizgi bg-yuzey px-4 py-2.5 text-sm font-bold text-metin-2 lg:hidden [&::-webkit-details-marker]:hidden">
        <span>
          Menü · <span className="text-metin">{sayfaAdi(yol)}</span>
        </span>
        <span className="flex items-center gap-2">
          {bekleyen > 0 && (
            <span className="rakam rounded-full bg-dugme px-2 py-0.5 text-xs font-bold text-dugme-yazi">
              {bekleyen}
              <span className="sr-only"> bekleyen iş</span>
            </span>
          )}
          <span aria-hidden="true" className="transition group-open/menu:rotate-180">
            ▾
          </span>
        </span>
      </summary>
      <nav
        aria-label="Yönetim menüsü"
        className="mt-2 flex flex-col gap-0.5 rounded-marka border border-cizgi bg-yuzey p-2 lg:mt-0 lg:sticky lg:top-6"
      >
        <div className="mb-1 flex items-center justify-between gap-2 px-1">
          {!dar && (
            <p className="hidden font-baslik text-base font-bold lg:block">Yönetim</p>
          )}
          {/* Daraltma yalnızca geniş ekranda anlamlı: telefonda menü zaten
              açılır kapanır. */}
          <form action={gorunumuCevir} className="ml-auto hidden lg:block">
            <button
              type="submit"
              title={dar ? "Menüyü genişlet" : "Menüyü daralt"}
              className="flex h-7 w-7 items-center justify-center rounded-full text-metin-3 transition hover:bg-yuzey-sicak hover:text-metin"
            >
              <span aria-hidden="true" className="text-sm">
                {dar ? "»" : "«"}
              </span>
              <span className="sr-only">{dar ? "Menüyü genişlet" : "Menüyü daralt"}</span>
            </button>
          </form>
        </div>

        {BOLUMLER.map(bolum)}

        {/* Ayarlar ana listeden ayrı, altta: nadiren açılıyor ama her zaman
            aynı yerde bulunmalı (K-116). */}
        <div className="mt-2 border-t border-cizgi pt-2">{bolum(AYARLAR)}</div>

        {/* Grupların dışında: mağazaya çıkış bir ayar maddesi değil. */}
        <div className="mt-2 border-t border-cizgi pt-2">
          <Link
            href="/"
            title={dar ? "Mağazayı gör" : undefined}
            className={`flex min-h-10 items-center gap-2.5 rounded-full py-2 text-sm font-semibold text-mavi-koyu transition hover:bg-mavi-soluk ${
              dar ? "justify-center px-0" : "px-2.5"
            }`}
          >
            <span aria-hidden="true">↗</span>
            <span className={dar ? "sr-only" : ""}>Mağazayı gör</span>
          </Link>
        </div>
        {/* Kimin girdiği yazıyor: ortak bir şifre yerine kişiye ait
            hesaplar olmasının görünen yanı bu (K-45). */}
        <div className="mt-2 border-t border-cizgi-soluk pt-2">
          <Link
            href="/yonetim/hesabim"
            aria-current={eslesir(yol, "/yonetim/hesabim") ? "page" : undefined}
            title={dar ? yonetici.adSoyad : undefined}
            className={`flex items-center gap-2.5 rounded-marka py-1.5 transition hover:bg-yuzey-sicak ${
              dar ? "justify-center px-0" : "px-2.5"
            }`}
          >
            {/* Dar menüde baş harfler: ad sığmıyor ama "kim girmiş"
                bilgisi tamamen kaybolmamalı. */}
            <span
              aria-hidden="true"
              className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-yuzey-sicak text-xs font-bold text-metin-2"
            >
              {basHarfler(yonetici.adSoyad)}
            </span>
            <span className={dar ? "sr-only" : "min-w-0"}>
              <span className="block truncate text-sm font-bold text-metin">
                {yonetici.adSoyad}
              </span>
              <span className="block truncate text-xs text-metin-3">{yonetici.eposta}</span>
            </span>
          </Link>
          <form action={cikis}>
            <button
              type="submit"
              title={dar ? "Çıkış yap" : undefined}
              className={`mt-1 flex w-full items-center gap-2.5 rounded-full py-1.5 text-sm font-semibold text-metin-2 transition hover:bg-yuzey-sicak hover:text-mercan-koyu ${
                dar ? "justify-center px-0" : "px-2.5"
              }`}
            >
              <span aria-hidden="true">⎋</span>
              <span className={dar ? "sr-only" : ""}>Çıkış yap</span>
            </button>
          </form>
        </div>
      </nav>
    </details>
  );
}

/** "Ayşe Yılmaz" → "AY"; tek kelimeyse ilk iki harf. */
function basHarfler(ad: string): string {
  const parcalar = ad.trim().split(/\s+/).filter(Boolean);
  if (parcalar.length === 0) return "?";
  if (parcalar.length === 1) return parcalar[0].slice(0, 2).toLocaleUpperCase("tr");
  return (parcalar[0][0] + parcalar[parcalar.length - 1][0]).toLocaleUpperCase("tr");
}

/** Sunucu bir sonraki sayfada aynı bölümleri açık çizsin (K-116). */
function bolumCereziniYaz(acik: string[]): void {
  document.cookie = `${BOLUM_CEREZI}=${encodeURIComponent(acik.join(","))}; path=/yonetim; max-age=31536000; samesite=lax`;
}

/** Rozet: sayı ya da dar menüde nokta; ekran okuyucu her zaman sayıyı duyuyor. */
function Rozet({ sayi, ton, nokta }: { sayi: number; ton: RozetTonu; nokta?: boolean }) {
  if (sayi <= 0) return null;
  if (nokta) {
    return (
      <span
        className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${ton === "bekleyen" ? "bg-mercan" : "bg-metin-3"}`}
      >
        <span className="sr-only">{sayi} bekleyen</span>
      </span>
    );
  }
  return (
    <span
      className={`rakam flex-none rounded-full px-2 py-0.5 text-xs font-bold ${
        ton === "bekleyen" ? "bg-dugme text-dugme-yazi" : "border border-cizgi bg-yuzey text-metin-2"
      }`}
    >
      {sayi}
      <span className="sr-only"> bekleyen</span>
    </span>
  );
}

// Açık sayfa: sol kenarı düz ve kalın mercan çubuklu bir sekme. Yazı kalın
// ve koyu: mercan yazı soluk mercan dolgunun üstünde 4,39:1 veriyordu, eşik
// 4,5 (K-50).
const ETKIN = "border-l-[3px] border-mercan bg-mercan-soluk font-bold text-metin";

function BolumSatiri({
  b,
  yol,
  dar,
  sayaclar,
  etkin,
  acik,
  cevir,
}: {
  b: Bolum;
  yol: string;
  dar: boolean;
  sayaclar: Sayaclar;
  /** Açık sayfa bu bölümde mi? */
  etkin: boolean;
  /** Alt maddeler görünüyor mu (etkin ya da elle açılmış)? */
  acik: boolean;
  cevir: () => void;
}) {
  const satirEtkin = bolumSatiriEtkinMi(yol, b);
  const adres = etkinAdres(yol);
  const altVar = b.alt.length > 0;
  const gorunur = acik && altVar && !dar;
  // Alt maddeler görünüyorsa rakamlar onlarda; başlıkta yalnızca bölümün
  // kendi rozeti. Kapalıysa bölümün toplamı başlıkta (K-116).
  const ozet = bolumOzeti(b, sayaclar);
  const baslikRozet = gorunur
    ? { sayi: b.sayac ? sayaclar[b.sayac] : 0, ton: b.ton ?? "hatirlatma" }
    : ozet;
  const listeId = `menu-${b.yol.replaceAll("/", "-")}-${b.ad.length}`;

  return (
    <div className="flex flex-col">
      <div className="relative flex items-center">
        <Link
          href={b.yol}
          aria-current={satirEtkin ? "page" : undefined}
          title={dar ? b.ad : undefined}
          className={`relative flex min-h-10 flex-1 items-center gap-2.5 py-2 text-sm transition ${
            dar ? "justify-center pr-0" : "justify-between pr-2.5"
          } ${
            satirEtkin
              ? `${ETKIN} ${dar ? "rounded-r-[10px]" : "rounded-r-full"} pl-[calc(0.625rem-3px)]`
              : `${etkin ? "font-bold text-metin" : "font-semibold text-metin-2"} hover:bg-yuzey-sicak hover:text-metin ${
                  dar ? "rounded-[10px] pl-0" : "rounded-full pl-2.5"
                }`
          }`}
        >
          <span className={`flex min-w-0 items-center gap-2.5 ${dar ? "justify-center" : ""}`}>
            <PanelIkon ad={b.ikon} />
            <span className={dar ? "sr-only" : "truncate"}>{b.ad}</span>
          </span>
          <Rozet sayi={baslikRozet.sayi} ton={baslikRozet.ton} nokta={dar} />
        </Link>
        {/* Açık sayfanın bölümü hep açık: ok yok. Öteki bölümlerde ok,
            gitmeden alt maddelere bakmak için. */}
        {altVar && !dar && !etkin && (
          <button
            type="button"
            onClick={cevir}
            aria-expanded={acik}
            aria-controls={listeId}
            className="ml-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full text-metin-3 transition hover:bg-yuzey-sicak hover:text-metin"
          >
            <span aria-hidden="true" className={`text-xs transition motion-reduce:transition-none ${acik ? "rotate-180" : ""}`}>
              ▾
            </span>
            <span className="sr-only">
              {b.ad} alt sayfalarını {acik ? "gizle" : "göster"}
            </span>
          </button>
        )}
        {/* Ok olmayan satırda da yeri ayrılıyor: rozetler alt alta hizalı kalsın. */}
        {!dar && !(altVar && !etkin) && <span aria-hidden="true" className="ml-0.5 w-8 flex-none" />}
      </div>

      {gorunur && (
        <ul id={listeId} className="mb-1 ml-[1.15rem] mt-0.5 flex flex-col gap-0.5 border-l border-cizgi pl-2">
          {b.alt.map((a) => {
            const secili = adres === a.yol;
            const sayi = a.sayac ? sayaclar[a.sayac] : 0;
            return (
              <li key={a.yol + a.ad}>
                <Link
                  href={a.yol}
                  aria-current={secili ? "page" : undefined}
                  className={`flex min-h-9 items-center justify-between gap-2 py-1.5 pr-2 text-sm transition ${
                    secili
                      ? `${ETKIN} rounded-r-full pl-[calc(0.625rem-3px)]`
                      : "rounded-full pl-2.5 font-semibold text-metin-2 hover:bg-yuzey-sicak hover:text-metin"
                  }`}
                >
                  <span className="truncate">{a.ad}</span>
                  <Rozet sayi={sayi} ton={a.ton ?? "hatirlatma"} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
