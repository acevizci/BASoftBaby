"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PanelIkon from "@/ui/panel-ikon";
import HizliAtlama from "@/ui/hizli-atlama";
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
 * **İki seviye, bağlamsal açılma (K-116).** Üst düzeyde yedi bölüm ve en
 * altta Ayarlar. Açık sayfanın bölümü her zaman açık, alt maddeleri altında.
 * Öteki bölümlerin yanındaki ok, gitmeden alt maddelere bakmak için; elle
 * açılanlar çerezde. Bölüm adı bir bağlantı, ok ayrı bir düğme
 * (WAI-ARIA disclosure): bağlantının içine düğme koymak ekran okuyucuda
 * iki işi tek öğeye yüklerdi.
 *
 * **Üç genişlik hâli (K-118):**
 *
 * - **Telefon:** üstte ince bir çubuk (açık sayfanın adı, bekleyen iş
 *   toplamı); dokununca menü soldan kayan bir çekmece olarak açılıyor,
 *   arkası kararıyor. Esc, karartmaya dokunmak ya da bir sayfaya geçmek
 *   kapatıyor; açıkken Tab çekmecenin dışına çıkmıyor. JavaScript yoksa
 *   bugünkü gibi sayfanın içinde açılan bir kutu.
 * - **Geniş ekran:** ikon + ad + rozet, alt maddeler bölümün altında.
 * - **Geniş ekran, dar:** yalnızca ikon. Üzerine gelince ya da klavyeyle
 *   odaklanınca yanında bölümün adı ve alt sayfaları açılıyor (Stripe,
 *   Vercel kalıbı) — CSS ile, JavaScript gerekmeden. Rozet noktaya
 *   dönüşüyor, sayı ekran okuyucuda okunmaya devam ediyor (K-60).
 *
 * Dar tercihi yalnızca geniş ekranı etkiliyor: bütün "dar" sınıfları `lg:`
 * önekli. Eskiden telefonda da yalnızca ikonlar görünüyordu.
 *
 * Dar/geniş tercihi çerezde (`server/panel-gorunum.ts`): sunucuda okunduğu
 * için ilk boyamada doğru genişlik çiziliyor. Menü yapısı ve sayaçlar
 * sunucudan geliyor: veritabanına bakan hiçbir şey tarayıcıya inmiyor.
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
  const kutu = useRef<HTMLDetailsElement>(null);
  const baslik = useRef<HTMLElement>(null);
  const cekmece = useRef<HTMLElement>(null);
  // Çekmece yalnızca JavaScript varken: kapatmak için karartma ve Esc
  // gerekiyor. Sunucuda ve JavaScript'siz tarayıcıda eski satır içi kutu.
  const js = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const mac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false,
  );
  const [atlama, setAtlama] = useState(false);

  const cevir = (b: Bolum) => {
    const yeni = acik.includes(b.yol) ? acik.filter((y) => y !== b.yol) : [...acik, b.yol];
    setAcik(yeni);
    bolumCereziniYaz(yeni);
  };

  const kapat = () => {
    if (kutu.current?.open) {
      kutu.current.open = false;
      baslik.current?.focus();
    }
  };

  // Başka sayfaya geçince çekmece kapanıyor.
  useEffect(() => {
    if (kutu.current) kutu.current.open = false;
  }, [yol]);

  // ⌘K / Ctrl+K hızlı atlamayı açıp kapatıyor (K-119). Tarayıcının kendi
  // Ctrl+K'sı (adres çubuğunda arama) panelde bastırılıyor: yönetim
  // ekranlarının hepsinde (Shopify, Stripe, Linear) bu tuş bu iş için.
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAtlama((a) => !a);
      }
    };
    document.addEventListener("keydown", tus);
    return () => document.removeEventListener("keydown", tus);
  }, []);

  // Çekmeceden açılınca çekmece kapanıyor; pencere onun üstünde kalmasın.
  const atlamayiAc = () => {
    if (kutu.current?.open) kutu.current.open = false;
    setAtlama(true);
  };

  // Esc kapatıyor; Tab çekmecenin içinde dönüyor (odak tuzağı).
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      const k = kutu.current;
      if (!k?.open || window.matchMedia("(min-width: 1024px)").matches) return;
      if (e.key === "Escape") {
        e.preventDefault();
        kapat();
        return;
      }
      if (e.key !== "Tab" || !cekmece.current) return;
      const odaklar = [
        ...cekmece.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ].filter((el) => el.offsetParent !== null);
      if (odaklar.length === 0) return;
      const ilk = odaklar[0];
      const son = odaklar[odaklar.length - 1];
      if (e.shiftKey && document.activeElement === ilk) {
        e.preventDefault();
        son.focus();
      } else if (!e.shiftKey && document.activeElement === son) {
        e.preventDefault();
        ilk.focus();
      }
    };
    document.addEventListener("keydown", tus);
    return () => document.removeEventListener("keydown", tus);
  }, []);

  // Açılınca odak çekmecenin ilk bağlantısına, arkadaki sayfa kaymıyor.
  const acildi = () => {
    const acikMi = Boolean(kutu.current?.open) && !window.matchMedia("(min-width: 1024px)").matches;
    sayfaKaydirmasi(!acikMi);
    if (acikMi) cekmece.current?.querySelector<HTMLElement>("a[href]")?.focus();
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

  // Telefonda çekmece (yalnızca JavaScript varken); geniş ekranda hep
  // görünen yan menü.
  const cekmeceSinifi = js
    ? "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:mt-0 max-lg:w-[min(86vw,20rem)] max-lg:overflow-y-auto max-lg:rounded-none max-lg:rounded-r-marka max-lg:shadow-2xl motion-safe:max-lg:animate-[cekmece_180ms_ease-out]"
    : "mt-2";

  return (
    // Telefonda menü başlığı ile arama düğmesi yan yana. Geniş ekranda
    // sarmalayıcı yok sayılıyor (`contents`): `<details>` ızgaranın hücresi
    // olarak boyunu alıyor, yapışkan menü ona göre duruyor.
    <div className="flex gap-2 lg:contents">
      {/* Küçük ekranda açılır, geniş ekranda hep açık. `open-yok` sınıfı
        globals.css'te: tarayıcının kapalı `<details>` içeriğini gizleyen
        kuralını geniş ekranda etkisiz kılıyor. */}
      <details ref={kutu} className="open-yok group/menu min-w-0 flex-1" onToggle={acildi}>
        <summary
          ref={baslik}
          className="flex min-h-11 list-none items-center justify-between gap-3 rounded-marka border border-cizgi bg-yuzey px-4 py-2.5 text-sm font-bold text-metin-2 lg:hidden [&::-webkit-details-marker]:hidden"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden="true" className="text-base leading-none">
              ☰
            </span>
            <span className="truncate">
              <span className="sr-only">Menü · </span>
              <span className="text-metin">{sayfaAdi(yol)}</span>
            </span>
          </span>
          {bekleyen > 0 && (
            <span className="rakam flex-none rounded-full bg-dugme px-2 py-0.5 text-xs font-bold text-dugme-yazi">
              {bekleyen}
              <span className="sr-only"> bekleyen iş</span>
            </span>
          )}
        </summary>

        {/* Çekmecenin arkası: dokununca kapanıyor. */}
        {js && (
          <div
            aria-hidden="true"
            data-karartma
            onClick={kapat}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden motion-safe:animate-[karartma_180ms_ease-out]"
          />
        )}

        <nav
          ref={cekmece}
          aria-label="Yönetim menüsü"
          className={`flex flex-col gap-0.5 border border-cizgi bg-yuzey p-2 lg:sticky lg:top-6 lg:mt-0 lg:rounded-marka ${
            js ? cekmeceSinifi : "mt-2 rounded-marka"
          }`}
        >
          <div className="mb-1 flex min-h-9 items-center justify-between gap-2 px-1">
            <p className={`font-baslik text-base font-bold ${dar ? "lg:hidden" : ""}`}>Yönetim</p>
            {/* Daraltma yalnızca geniş ekranda anlamlı. */}
            <form action={gorunumuCevir} className="ml-auto hidden lg:block">
              <button
                type="submit"
                title={dar ? "Menüyü genişlet" : "Menüyü daralt"}
                className="flex h-8 w-8 items-center justify-center rounded-full text-metin-3 transition hover:bg-yuzey-sicak hover:text-metin"
              >
                <span aria-hidden="true" className="text-sm">
                  {dar ? "»" : "«"}
                </span>
                <span className="sr-only">{dar ? "Menüyü genişlet" : "Menüyü daralt"}</span>
              </button>
            </form>
            {js && (
              <button
                type="button"
                onClick={kapat}
                className="flex h-9 w-9 items-center justify-center rounded-full text-metin-2 transition hover:bg-yuzey-sicak hover:text-metin lg:hidden"
              >
                <span aria-hidden="true">✕</span>
                <span className="sr-only">Menüyü kapat</span>
              </button>
            )}
          </div>

          {/* Hızlı atlama (K-119). JavaScript'siz tarayıcıda işe yaramadığı
            için yalnızca sayfa canlanınca. */}
          {js && (
            <button
              type="button"
              onClick={atlamayiAc}
              title={dar ? `Ara (${mac ? "⌘K" : "Ctrl K"})` : undefined}
              aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
              className={`mb-1 flex min-h-10 items-center gap-2.5 rounded-full border border-cizgi px-2.5 py-2 text-sm text-metin-3 transition hover:border-metin-3 hover:text-metin ${
                dar ? "lg:justify-center lg:border-transparent lg:px-0" : ""
              }`}
            >
              <PanelIkon ad="ara" />
              <span className={`flex-1 text-left ${dar ? "lg:sr-only" : ""}`}>Ara…</span>
              <kbd
                className={`hidden rounded border border-cizgi px-1.5 text-[11px] lg:block ${dar ? "lg:hidden" : ""}`}
              >
                {mac ? "⌘K" : "Ctrl K"}
              </kbd>
            </button>
          )}

          {BOLUMLER.map(bolum)}

          {/* Ayarlar ana listeden ayrı, altta: nadiren açılıyor ama her zaman
            aynı yerde bulunmalı (K-116). */}
          <div className="mt-2 border-t border-cizgi pt-2">{bolum(AYARLAR)}</div>

          {/* Grupların dışında: mağazaya çıkış bir ayar maddesi değil. */}
          <div className="mt-2 border-t border-cizgi pt-2">
            <Link
              href="/"
              title={dar ? "Mağazayı gör" : undefined}
              className={`flex min-h-10 items-center gap-2.5 rounded-full px-2.5 py-2 text-sm font-semibold text-mavi-koyu transition hover:bg-mavi-soluk ${
                dar ? "lg:justify-center lg:px-0" : ""
              }`}
            >
              <span aria-hidden="true">↗</span>
              <span className={dar ? "lg:sr-only" : ""}>Mağazayı gör</span>
            </Link>
          </div>
          {/* Kimin girdiği yazıyor: ortak bir şifre yerine kişiye ait
            hesaplar olmasının görünen yanı bu (K-45). */}
          <div className="mt-2 border-t border-cizgi-soluk pt-2">
            <Link
              href="/yonetim/hesabim"
              aria-current={eslesir(yol, "/yonetim/hesabim") ? "page" : undefined}
              title={dar ? yonetici.adSoyad : undefined}
              className={`flex items-center gap-2.5 rounded-marka px-2.5 py-1.5 transition hover:bg-yuzey-sicak ${
                dar ? "lg:justify-center lg:px-0" : ""
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
              <span className={dar ? "min-w-0 lg:sr-only" : "min-w-0"}>
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
                className={`mt-1 flex min-h-10 w-full items-center gap-2.5 rounded-full px-2.5 py-1.5 text-sm font-semibold text-metin-2 transition hover:bg-yuzey-sicak hover:text-mercan-koyu ${
                  dar ? "lg:justify-center lg:px-0" : ""
                }`}
              >
                <span aria-hidden="true">⎋</span>
                <span className={dar ? "lg:sr-only" : ""}>Çıkış yap</span>
              </button>
            </form>
          </div>
        </nav>
      </details>

      {js && (
        <button
          type="button"
          onClick={atlamayiAc}
          className="flex min-h-11 w-11 flex-none items-center justify-center rounded-marka border border-cizgi bg-yuzey text-metin-2 lg:hidden"
        >
          <PanelIkon ad="ara" />
          <span className="sr-only">Hızlı atlama</span>
        </button>
      )}
      {atlama && <HizliAtlama onKapat={() => setAtlama(false)} />}
    </div>
  );
}

/** Sunucu bir sonraki sayfada aynı bölümleri açık çizsin (K-116). */
function bolumCereziniYaz(acik: string[]): void {
  document.cookie = `${BOLUM_CEREZI}=${encodeURIComponent(acik.join(","))}; path=/yonetim; max-age=31536000; samesite=lax`;
}

/** Çekmece açıkken arkadaki sayfa kaymasın (K-118). */
function sayfaKaydirmasi(serbest: boolean): void {
  document.documentElement.style.overflow = serbest ? "" : "hidden";
}

/** "Ayşe Yılmaz" → "AY"; tek kelimeyse ilk iki harf. */
function basHarfler(ad: string): string {
  const parcalar = ad.trim().split(/\s+/).filter(Boolean);
  if (parcalar.length === 0) return "?";
  if (parcalar.length === 1) return parcalar[0].slice(0, 2).toLocaleUpperCase("tr");
  return (parcalar[0][0] + parcalar[parcalar.length - 1][0]).toLocaleUpperCase("tr");
}

/** Rozet: sayı, ya da dar menüde nokta; ekran okuyucu her zaman sayıyı duyuyor. */
function Rozet({ sayi, ton, dar }: { sayi: number; ton: RozetTonu; dar?: boolean }) {
  if (sayi <= 0) return null;
  const renk =
    ton === "bekleyen" ? "bg-dugme text-dugme-yazi" : "border border-cizgi bg-yuzey text-metin-2";
  return (
    <>
      <span
        className={`rakam flex-none rounded-full px-2 py-0.5 text-xs font-bold ${renk} ${dar ? "lg:hidden" : ""}`}
      >
        {sayi}
        <span className="sr-only"> bekleyen</span>
      </span>
      {dar && (
        <span
          aria-hidden="true"
          className={`absolute right-1.5 top-1.5 hidden h-2 w-2 rounded-full lg:block ${
            ton === "bekleyen" ? "bg-mercan" : "bg-metin-3"
          }`}
        />
      )}
    </>
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
  const gorunur = acik && altVar;
  // Alt maddeler görünüyorsa rakamlar onlarda; başlıkta yalnızca bölümün
  // kendi rozeti. Kapalıysa bölümün toplamı başlıkta (K-116). Dar menüde alt
  // maddeler hiç görünmediği için orada hep toplam.
  const ozet = bolumOzeti(b, sayaclar);
  const kendi = {
    sayi: b.sayac ? sayaclar[b.sayac] : 0,
    ton: b.ton ?? "hatirlatma",
  };
  const baslikRozet = gorunur && !dar ? kendi : ozet;
  const listeId = `menu${b.yol.replaceAll("/", "-")}-${b.ad.length}`;
  const okVar = altVar && !etkin;

  return (
    // `group/bolum`: dar menüde üzerine gelince ya da odaklanınca yan panel.
    <div className="group/bolum relative flex flex-col">
      <div className="relative flex items-center">
        <Link
          href={b.yol}
          aria-current={satirEtkin ? "page" : undefined}
          className={`relative flex min-h-10 flex-1 items-center justify-between gap-2.5 py-2 pr-2.5 text-sm transition ${
            dar ? "lg:justify-center lg:pr-0" : ""
          } ${
            satirEtkin
              ? `${ETKIN} rounded-r-full pl-[calc(0.625rem-3px)] ${dar ? "lg:rounded-r-[10px]" : ""}`
              : `${etkin ? "font-bold text-metin" : "font-semibold text-metin-2"} rounded-full pl-2.5 hover:bg-yuzey-sicak hover:text-metin ${
                  dar ? "lg:rounded-[10px] lg:pl-0" : ""
                }`
          }`}
        >
          <span className={`flex min-w-0 items-center gap-2.5 ${dar ? "lg:justify-center" : ""}`}>
            <PanelIkon ad={b.ikon} />
            <span className={dar ? "truncate lg:sr-only" : "truncate"}>{b.ad}</span>
          </span>
          <Rozet sayi={baslikRozet.sayi} ton={baslikRozet.ton} dar={dar} />
        </Link>
        {/* Açık sayfanın bölümü hep açık: ok yok. Öteki bölümlerde ok,
            gitmeden alt maddelere bakmak için. */}
        {okVar && (
          <button
            type="button"
            onClick={cevir}
            aria-expanded={acik}
            aria-controls={listeId}
            className={`ml-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full text-metin-3 transition hover:bg-yuzey-sicak hover:text-metin ${
              dar ? "lg:hidden" : ""
            }`}
          >
            <span
              aria-hidden="true"
              className={`text-xs transition motion-reduce:transition-none ${acik ? "rotate-180" : ""}`}
            >
              ▾
            </span>
            <span className="sr-only">
              {b.ad} alt sayfalarını {acik ? "gizle" : "göster"}
            </span>
          </button>
        )}
        {/* Ok olmayan satırda da yeri ayrılıyor: rozetler alt alta hizalı kalsın. */}
        {!okVar && (
          <span aria-hidden="true" className={`ml-0.5 w-8 flex-none ${dar ? "lg:hidden" : ""}`} />
        )}
      </div>

      {gorunur && (
        <ul
          id={listeId}
          className={`mb-1 ml-[1.15rem] mt-0.5 flex flex-col gap-0.5 border-l border-cizgi pl-2 ${dar ? "lg:hidden" : ""}`}
        >
          {b.alt.map((a) => (
            <AltSatir
              key={a.yol + a.ad}
              ad={a.ad}
              yol={a.yol}
              secili={adres === a.yol}
              sayi={a.sayac ? sayaclar[a.sayac] : 0}
              ton={a.ton}
            />
          ))}
        </ul>
      )}

      {/* Dar menüde yan panel: bölümün adı ve alt sayfaları. Üzerine gelince
          ya da klavye odağı bölümün içindeyken görünüyor; boşluk padding'le,
          yoksa fare ikondan panele geçerken panel kaybolurdu. */}
      {dar && (
        <div className="absolute left-full top-0 z-50 hidden pl-2 lg:group-focus-within/bolum:block lg:group-hover/bolum:block">
          <div className="w-56 rounded-marka border border-cizgi bg-yuzey p-2 shadow-lg">
            <Link
              href={b.yol}
              className="flex min-h-9 items-center justify-between gap-2 rounded-full px-2.5 text-sm font-bold text-metin hover:bg-yuzey-sicak"
            >
              {b.ad}
              <Rozet sayi={kendi.sayi} ton={kendi.ton} />
            </Link>
            {altVar && (
              <ul className="mt-1 flex flex-col gap-0.5 border-t border-cizgi-soluk pt-1">
                {b.alt.map((a) => (
                  <AltSatir
                    key={a.yol + a.ad}
                    ad={a.ad}
                    yol={a.yol}
                    secili={adres === a.yol}
                    sayi={a.sayac ? sayaclar[a.sayac] : 0}
                    ton={a.ton}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AltSatir({
  ad,
  yol,
  secili,
  sayi,
  ton,
}: {
  ad: string;
  yol: string;
  secili: boolean;
  sayi: number;
  ton?: RozetTonu;
}) {
  return (
    <li>
      <Link
        href={yol}
        aria-current={secili ? "page" : undefined}
        className={`flex min-h-9 items-center justify-between gap-2 py-1.5 pr-2 text-sm transition ${
          secili
            ? `${ETKIN} rounded-r-full pl-[calc(0.625rem-3px)]`
            : "rounded-full pl-2.5 font-semibold text-metin-2 hover:bg-yuzey-sicak hover:text-metin"
        }`}
      >
        <span className="truncate">{ad}</span>
        <Rozet sayi={sayi} ton={ton ?? "hatirlatma"} />
      </Link>
    </li>
  );
}
