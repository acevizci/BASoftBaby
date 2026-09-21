"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { acikMi, type MenuGrubu, type MenuMaddesi } from "@/ui/panel-menu-bicim";

/**
 * Panel menüsü.
 *
 * **Neden istemci bileşeni.** Açık sayfanın yolu eskiden middleware'in
 * eklediği başlıktan okunuyordu (K-43). Çalışmıyordu: düzenler istemci
 * tarafı gezinmede **yeniden çizilmiyor** — Next.js'te düzenin varlık sebebi
 * bu. Menüden başka bir sayfaya tıklayınca adres değişiyor ama düzen ilk
 * açılışta çizildiği yerde kalıyordu, yani işaret hep ilk girilen sayfada
 * duruyordu. Sayfayı yenilemeden düzelmiyordu (K-51).
 *
 * `usePathname()` router durumuna abone; her gezinmede yeniden çalışıyor.
 * Sunucuda çizilirken de o anki yolu döndürüyor, yani ilk boyamada işaret
 * doğru ve JavaScript kapalı tarayıcıda da doğru (orada her tıklama zaten
 * tam sayfa yüklemesi).
 *
 * Menü yapısı ve sayaçlar sunucudan geliyor: veritabanına bakan hiçbir şey
 * tarayıcıya inmiyor.
 */
export default function PanelMenu({
  ozet,
  gruplar,
  yonetici,
  cikis,
}: {
  ozet: MenuMaddesi;
  gruplar: MenuGrubu[];
  yonetici: { adSoyad: string; eposta: string };
  /** Çıkış server action'ı; istemci bileşeninden de çağrılabiliyor. */
  cikis: () => Promise<void>;
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
    <details className="open-yok group">
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
          <span aria-hidden="true" className="transition group-open:rotate-180">
            ▾
          </span>
        </span>
      </summary>

      <nav aria-label="Yönetim menüsü" className="mt-2 flex flex-col gap-1 lg:mt-0">
        <p className="hidden px-3 pb-1 font-baslik text-base font-bold lg:block">Yönetim</p>

        <Madde madde={ozet} yol={yol} />

        {/* Grup başlığı hem koyulaştı hem ayırıcı çizgi aldı. Eskisi
            `metin-3` idi: zemine karşı 2,9:1, yani WCAG'nin 4,5 eşiğinin
            altında — küçük ve büyük harfli bir metin için özellikle zor
            okunuyordu. Çizgi de gerekli, çünkü renk farkı tek başına
            "buradan yeni bir grup başlıyor" demiyor (K-50). */}
        {gruplar.map((g) => (
          <div key={g.baslik} className="mt-4 flex flex-col gap-1 border-t border-cizgi pt-3">
            <p className="px-3 pb-0.5 text-[0.7rem] font-bold uppercase tracking-[0.09em] text-metin-2">
              {g.baslik}
            </p>
            {g.maddeler.map((m) => (
              <Madde key={m.yol} madde={m} yol={yol} />
            ))}
          </div>
        ))}

        {/* Grupların dışında: mağazaya çıkış bir ayar maddesi değil.
            Ayırıcı çizgi olmadan "Ayarlar"ın son maddesi gibi duruyordu. */}
        <div className="mt-4 border-t border-cizgi pt-3">
          <Link
            href="/"
            className="block rounded-full px-3 py-2 text-sm font-semibold text-mavi-koyu hover:underline"
          >
            Mağazayı gör
          </Link>
        </div>

        {/* Kimin girdiği yazıyor: ortak bir şifre yerine kişiye ait
            hesaplar olmasının görünen yanı bu (K-45). */}
        <div className="mt-4 border-t border-cizgi-soluk pt-3">
          <Link
            href="/yonetim/hesabim"
            aria-current={acikMi(yol, "/yonetim/hesabim") ? "page" : undefined}
            className="block rounded-marka px-3 py-1.5 hover:bg-yuzey-sicak"
          >
            <span className="block truncate text-sm font-bold text-metin">
              {yonetici.adSoyad}
            </span>
            <span className="block truncate text-xs text-metin-3">{yonetici.eposta}</span>
          </Link>
          <form action={cikis}>
            <button
              type="submit"
              className="mt-1 rounded-full px-3 py-1.5 text-sm font-semibold text-metin-2 hover:text-mercan-koyu"
            >
              Çıkış yap
            </button>
          </form>
        </div>
      </nav>
    </details>
  );
}

function Madde({ madde, yol }: { madde: MenuMaddesi; yol: string }) {
  const acik = acikMi(yol, madde.yol);

  return (
    <Link
      href={madde.yol}
      aria-current={acik ? "page" : undefined}
      // Açık sayfa: soluk mercan dolgu tek başına siliktı. Sol kenarı düz
      // ve kalın mercan çubuklu bir sekme oldu — yuvarlak kenarda çubuk
      // hilale dönüyor ve çubuk olduğu anlaşılmıyordu. Yazı kalın ve koyu:
      // mercan yazı soluk mercan dolgunun üstünde 4,39:1 veriyordu, eşik
      // 4,5. Kimliği zaten çubuk taşıyor, yazının okunur olması daha
      // önemli — koyu yazı 11,5:1 (K-50).
      className={`flex items-center justify-between gap-2 py-2 pr-3 text-sm transition ${
        acik
          ? "rounded-r-full border-l-[3px] border-mercan bg-mercan-soluk pl-[9px] font-bold text-metin"
          : "rounded-full pl-3 font-semibold text-metin-2 hover:bg-yuzey-sicak hover:text-metin"
      }`}
    >
      <span>{madde.ad}</span>
      {/* Rozet yalnızca bekleyen iş varken: her maddede sürekli duran bir
          rakam kısa sürede görünmez oluyor. Müşterinin beklediği işler dolu
          renkte, mağazanın kendi işleri sessiz — hepsi kırmızı olsaydı
          hiçbiri kırmızı olmazdı. */}
      {madde.rozet !== undefined && madde.rozet > 0 && (
        <span
          className={`rakam flex-none rounded-full px-2 py-0.5 text-xs font-bold ${
            madde.ton === "bekleyen"
              ? "bg-mercan text-white"
              : "border border-cizgi bg-yuzey text-metin-2"
          }`}
        >
          {madde.rozet}
          {/* Ekran okuyucuda "Siparişler 4" tek başına bir şey söylemiyor. */}
          <span className="sr-only"> bekleyen</span>
        </span>
      )}
    </Link>
  );
}
