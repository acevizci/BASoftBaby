import Link from "next/link";
import { BILGI_SAYFALARI } from "@/app/(bilgi)/bilgi-bicim";
import { kunyeGetir, yasalSayfalariGetir } from "@/server/yasal";

/**
 * Alt bilgi. Üç sütun da gerçek sayfalara gidiyor: yasal metinler artık
 * veritabanında duruyor ve panelden düzenleniyor. Künye (unvan, vergi, ETBİS)
 * satış ayarlarından geliyor; şirket kurulana kadar alanlar boş kalıyor ve boş
 * satır ekrana hiç basılmıyor.
 */
const KATEGORILER = [
  { yol: "/yenidogan", ad: "Yenidoğan" },
  { yol: "/zibin-body", ad: "Zıbın & Body" },
  { yol: "/tulum", ad: "Tulum" },
  { yol: "/uyku", ad: "Uyku" },
  { yol: "/aksesuar", ad: "Aksesuar" },
];

const BAG = "text-metin-3 transition hover:text-metin hover:underline";

export default async function AltBilgi() {
  const [yasal, kunye] = await Promise.all([yasalSayfalariGetir(), kunyeGetir()]);

  return (
    <footer className="mt-auto border-t border-cizgi-soluk bg-yuzey-sicak">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <p className="font-baslik text-lg font-bold">BASoftbaby</p>
          <p className="text-sm text-metin-2">Minik bedenlere, yumuşacık kumaşlar.</p>
          <Link
            href="/siparis-takip"
            className="mt-1 text-sm font-bold text-mavi-koyu hover:underline"
          >
            Sipariş takibi
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">Alışveriş</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {KATEGORILER.map((k) => (
              <li key={k.yol}>
                <Link href={k.yol} className={BAG}>
                  {k.ad}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">Yardım</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {BILGI_SAYFALARI.map((s) => (
              <li key={s.yol}>
                <Link href={s.yol} className={BAG}>
                  {s.ad}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">Kurumsal</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {yasal.map((y) => (
              <li key={y.slug}>
                <Link href={`/yasal/${y.slug}`} className={BAG}>
                  {y.baslik}
                </Link>
              </li>
            ))}
          </ul>
          {kunye.unvan ? (
            <p className="mt-1 text-xs text-metin-3">
              {kunye.unvan}
              {kunye.sirketAdresi && <span className="block">{kunye.sirketAdresi}</span>}
              {kunye.destekEposta && <span className="block">{kunye.destekEposta}</span>}
            </p>
          ) : (
            <p className="text-xs text-metin-3">Şirket künyesi kayıt tamamlanınca eklenecek.</p>
          )}
        </div>
      </div>

      <div className="border-t border-cizgi-soluk">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-metin-3">
          <span>© {new Date().getFullYear()} BASoftBaby</span>
          <span className="rakam">
            {kunye.etbisNo ? `ETBİS: ${kunye.etbisNo}` : "ETBİS kaydı açılışta eklenecek"}
          </span>
        </div>
      </div>
    </footer>
  );
}
