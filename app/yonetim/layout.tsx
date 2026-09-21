import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { acikMi, menuSayaclari, menuyuKur, type MenuMaddesi } from "@/server/panel-menu";

export const metadata: Metadata = {
  title: "Yönetim",
  robots: { index: false, follow: false },
};

/**
 * Panelin çerçevesi.
 *
 * Menü gruplu, açık sayfa işaretli ve bekleyen iş sayıları maddelerin yanında
 * duruyor. Küçük ekranda menü açılır hâle geliyor — on dört bağlantı her
 * sayfanın üstünü kaplamasın (K-43).
 *
 * Açık sayfanın yolu middleware'in eklediği başlıktan okunuyor: sunucu
 * bileşeninde adres satırına ulaşmanın başka yolu yok ve menüyü yalnızca
 * bunun için istemci bileşenine çevirmek gereksiz bir JavaScript yükü olurdu.
 */
export default async function YonetimDuzeni({ children }: LayoutProps<"/yonetim">) {
  const [baslik, sayaclar] = await Promise.all([headers(), menuSayaclari()]);
  const yol = baslik.get("x-yonetim-yol") ?? "/yonetim";
  const { ozet, gruplar } = menuyuKur(sayaclar);

  const maddeler = [ozet, ...gruplar.flatMap((g) => g.maddeler)];
  const acikSayfa = maddeler.find((m) => acikMi(yol, m.yol))?.ad ?? "Yönetim";

  // Telefonda menü kapalı duruyor; bekleyen iş varsa rozetler görünmüyor.
  // Kapalı başlığa müşterinin beklediği işlerin toplamı yazılıyor, yoksa
  // "bugün bakılacak bir şey var mı" sorusu menüyü açmadan cevapsız kalırdı.
  const bekleyen = maddeler.reduce(
    (t, m) => t + (m.ton === "bekleyen" ? (m.rozet ?? 0) : 0),
    0,
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[200px_1fr]">
      {/* Küçük ekranda açılır, geniş ekranda hep açık. `open-yok` sınıfı
          globals.css'te: tarayıcının kapalı `<details>` içeriğini gizleyen
          kuralını geniş ekranda etkisiz kılıyor. */}
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

          {gruplar.map((g) => (
            <div key={g.baslik} className="mt-3 flex flex-col gap-1">
              <p className="px-3 text-xs font-bold uppercase tracking-wide text-metin-3">
                {g.baslik}
              </p>
              {g.maddeler.map((m) => (
                <Madde key={m.yol} madde={m} yol={yol} />
              ))}
            </div>
          ))}

          <Link
            href="/"
            className="mt-4 rounded-full px-3 py-2 text-sm font-semibold text-mavi-koyu hover:underline"
          >
            Mağazayı gör
          </Link>
        </nav>
      </details>

      <main className="min-w-0">{children}</main>
    </div>
  );
}

function Madde({ madde, yol }: { madde: MenuMaddesi; yol: string }) {
  const acik = acikMi(yol, madde.yol);

  return (
    <Link
      href={madde.yol}
      aria-current={acik ? "page" : undefined}
      className={`flex items-center justify-between gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
        acik
          ? "bg-mercan-soluk text-mercan-koyu"
          : "text-metin-2 hover:bg-yuzey-sicak hover:text-metin"
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
