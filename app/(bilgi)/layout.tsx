import Link from "next/link";
import { BILGI_SAYFALARI } from "./bilgi-bicim";

/**
 * Yardım sayfalarının ortak çerçevesi: başlığın üstünde birbirine geçiş
 * bağlantıları var, böylece müşteri alt bilgiye geri dönmek zorunda kalmıyor.
 */
export default function BilgiDuzeni({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Yardım sayfaları" className="flex flex-wrap gap-2">
        {BILGI_SAYFALARI.map((s) => (
          <Link
            key={s.yol}
            href={s.yol}
            className="rounded-full border border-cizgi bg-yuzey px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
          >
            {s.ad}
          </Link>
        ))}
      </nav>

      {children}

      <p className="mt-10 border-t border-cizgi-soluk pt-5 text-sm text-metin-3">
        Aradığını bulamadıysan{" "}
        <Link href="/siparis-takip" className="font-bold text-mavi-koyu hover:underline">
          sipariş takibi
        </Link>{" "}
        sayfasından siparişinin durumunu görebilir ya da bize yazabilirsin.
      </p>
    </div>
  );
}
