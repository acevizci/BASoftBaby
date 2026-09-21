import Link from "next/link";
import { headers } from "next/headers";
import { acikMi, menuSayaclari, menuyuKur, type MenuMaddesi } from "@/server/panel-menu";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { yonetimCikisi } from "@/server/yonetim-kimlik-islem";

/**
 * Panelin çerçevesi.
 *
 * **Oturum burada doğrulanıyor.** Middleware yalnızca çerez hiç yoksa giriş
 * sayfasına yolluyor; Edge çalışma ortamında veritabanı olmadığı için asıl
 * kontrol burada. Bu düzen `/yonetim` altındaki bütün **sayfaları** sarıyor;
 * route handler'lar düzenden geçmediği için onlar `yoneticiGerekli()`yi
 * kendileri çağırıyor (K-45).
 *
 * Menü gruplu, açık sayfa işaretli ve bekleyen iş sayıları maddelerin yanında
 * duruyor. Küçük ekranda menü açılır hâle geliyor — bağlantılar her sayfanın
 * üstünü kaplamasın (K-43).
 *
 * Açık sayfanın yolu middleware'in eklediği başlıktan okunuyor: sunucu
 * bileşeninde adres satırına ulaşmanın başka yolu yok ve menüyü yalnızca
 * bunun için istemci bileşenine çevirmek gereksiz bir JavaScript yükü olurdu.
 */
export default async function YonetimDuzeni({ children }: LayoutProps<"/yonetim">) {
  const baslik = await headers();
  const yol = baslik.get("x-yonetim-yol") ?? "/yonetim";

  // Yetkisiz istek daha sayaçlar sorgulanmadan giriş sayfasına gidiyor.
  const yonetici = await yoneticiGerekli(yol);

  const sayaclar = await menuSayaclari();
  const { ozet, gruplar } = menuyuKur(sayaclar, yonetici.rol);

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
            <form action={yonetimCikisi}>
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
