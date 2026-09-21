"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PanelIkon from "@/ui/panel-ikon";
import { acikMi, type MenuGrubu, type MenuMaddesi } from "@/ui/panel-menu-bicim";

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
 */
export default function PanelMenu({
  ozet,
  gruplar,
  yonetici,
  dar,
  cikis,
  gorunumuCevir,
}: {
  ozet: MenuMaddesi;
  gruplar: MenuGrubu[];
  yonetici: { adSoyad: string; eposta: string };
  /** Geniş ekranda menü daraltılmış mı? */
  dar: boolean;
  /** Çıkış server action'ı; istemci bileşeninden de çağrılabiliyor. */
  cikis: () => Promise<void>;
  /** Daraltma server action'ı. */
  gorunumuCevir: () => Promise<void>;
}) {
  const yol = usePathname() ?? "/yonetim";

  const maddeler = [ozet, ...gruplar.flatMap((g) => g.maddeler)];
  const acikSayfa = maddeler.find((m) => acikMi(yol, m.yol))?.ad ?? "Yönetim";

  // Telefonda menü kapalı duruyor; bekleyen iş varsa rozetler görünmüyor.
  // Kapalı başlığa müşterinin beklediği işlerin toplamı yazılıyor, yoksa
  // "bugün bakılacak bir şey var mı" sorusu menüyü açmadan cevapsız kalırdı.
  const bekleyen = maddeler.reduce((t, m) => t + (m.ton === "bekleyen" ? (m.rozet ?? 0) : 0), 0);

  return (
    // Küçük ekranda açılır, geniş ekranda hep açık. `open-yok` sınıfı
    // globals.css'te: tarayıcının kapalı `<details>` içeriğini gizleyen
    // kuralını geniş ekranda etkisiz kılıyor.
    <details className="open-yok group/menu">
      <summary className="flex list-none items-center justify-between rounded-marka border border-cizgi bg-yuzey px-4 py-2.5 text-sm font-bold text-metin-2 lg:hidden [&::-webkit-details-marker]:hidden">
        <span>
          Menü · <span className="text-metin">{acikSayfa}</span>
        </span>
        <span className="flex items-center gap-2">
          {bekleyen > 0 && (
            <span className="rakam rounded-full bg-mercan px-2 py-0.5 text-xs font-bold text-white">
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
        className="mt-2 flex flex-col gap-1 rounded-marka border border-cizgi bg-yuzey p-2 lg:mt-0 lg:sticky lg:top-6"
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

        <Madde madde={ozet} yol={yol} dar={dar} />

        {gruplar.map((g) => (
          <div key={g.baslik} className="mt-3 flex flex-col gap-0.5 border-t border-cizgi pt-2">
            {/* Grup başlığı dar menüde yer kaplamasın diye kalkıyor; ayırıcı
                çizgi duruyor, gruplama kaybolmuyor. Başlık `metin-2`:
                eskisi 2,9:1 ile WCAG eşiğinin altındaydı (K-50). */}
            {!dar && (
              <p className="px-2 pb-0.5 text-[0.7rem] font-bold uppercase tracking-[0.09em] text-metin-2 lg:block">
                {g.baslik}
              </p>
            )}
            {g.maddeler.map((m) => (
              <Madde key={m.yol} madde={m} yol={yol} dar={dar} />
            ))}
          </div>
        ))}

        {/* Grupların dışında: mağazaya çıkış bir ayar maddesi değil. */}
        <div className="mt-3 border-t border-cizgi pt-2">
          <Link
            href="/"
            title={dar ? "Mağazayı gör" : undefined}
            className={`flex items-center gap-2.5 rounded-full py-2 text-sm font-semibold text-mavi-koyu transition hover:bg-mavi-soluk ${
              dar ? "justify-center px-0" : "px-2.5"
            }`}
          >
            <span aria-hidden="true">↗</span>
            <span className={dar ? "sr-only" : ""}>Mağazayı gör</span>
          </Link>
        </div>

        {/* Kimin girdiği yazıyor: ortak bir şifre yerine kişiye ait
            hesaplar olmasının görünen yanı bu (K-45). */}
        <div className="mt-3 border-t border-cizgi-soluk pt-2">
          <Link
            href="/yonetim/hesabim"
            aria-current={acikMi(yol, "/yonetim/hesabim") ? "page" : undefined}
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

function Madde({ madde, yol, dar }: { madde: MenuMaddesi; yol: string; dar: boolean }) {
  const acik = acikMi(yol, madde.yol);
  const rozetVar = madde.rozet !== undefined && madde.rozet > 0;

  return (
    <Link
      href={madde.yol}
      aria-current={acik ? "page" : undefined}
      title={dar ? madde.ad : undefined}
      // Açık sayfa: sol kenarı düz ve kalın mercan çubuklu bir sekme —
      // yuvarlak kenarda çubuk hilale dönüyor ve çubuk olduğu
      // anlaşılmıyordu. Yazı kalın ve koyu: mercan yazı soluk mercan
      // dolgunun üstünde 4,39:1 veriyordu, eşik 4,5. Kimliği zaten çubuk
      // taşıyor, yazının okunur olması daha önemli (K-50).
      className={`relative flex items-center gap-2.5 py-2 text-sm transition ${
        dar ? "justify-center pr-0" : "justify-between pr-2.5"
      } ${
        acik
          ? `border-l-[3px] border-mercan bg-mercan-soluk font-bold text-metin ${
              dar ? "rounded-r-[10px] pl-[calc(0.625rem-3px)]" : "rounded-r-full pl-[calc(0.625rem-3px)]"
            }`
          : `font-semibold text-metin-2 hover:bg-yuzey-sicak hover:text-metin ${
              dar ? "rounded-[10px] pl-0" : "rounded-full pl-2.5"
            }`
      }`}
    >
      <span className={`flex min-w-0 items-center gap-2.5 ${dar ? "justify-center" : ""}`}>
        <PanelIkon ad={madde.ikon} />
        <span className={dar ? "sr-only" : "truncate"}>{madde.ad}</span>
      </span>

      {/* Rozet yalnızca bekleyen iş varken: her maddede sürekli duran bir
          rakam kısa sürede görünmez oluyor. Müşterinin beklediği işler dolu
          renkte, mağazanın kendi işleri sessiz — hepsi kırmızı olsaydı
          hiçbiri kırmızı olmazdı. */}
      {rozetVar &&
        (dar ? (
          // Dar menüde sayı sığmıyor; nokta "bekleyen iş var" diyor ve
          // sayı ekran okuyucuda okunmaya devam ediyor.
          <span
            className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${
              madde.ton === "bekleyen" ? "bg-mercan" : "bg-metin-3"
            }`}
          >
            <span className="sr-only">{madde.rozet} bekleyen</span>
          </span>
        ) : (
          <span
            className={`rakam flex-none rounded-full px-2 py-0.5 text-xs font-bold ${
              madde.ton === "bekleyen"
                ? "bg-mercan text-white"
                : "border border-cizgi bg-yuzey text-metin-2"
            }`}
          >
            {madde.rozet}
            <span className="sr-only"> bekleyen</span>
          </span>
        ))}
    </Link>
  );
}
