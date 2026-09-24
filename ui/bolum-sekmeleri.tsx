"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { etkinAdres, etkinBolum } from "@/ui/panel-menu-bicim";

/**
 * Açık bölümün sayfaları, sekme olarak (K-116).
 *
 * Menü ağacından kendiliğinden çıkıyor; sayfalar tek tek eklemiyor. Eskiden
 * yalnızca stok ekranlarında elle yazılmış bir sekme satırı vardı (K-104).
 *
 * **Yalnızca alt maddeler yan menüde görünmüyorken:** telefonda (menü kapalı
 * bir kutu) ve menü daraltılmışken. Geniş ekranda aynı bağlantılar yan
 * menüde bölümün altında duruyor; ikinci kez göstermek gürültü olurdu.
 */
export default function BolumSekmeleri({ dar }: { dar: boolean }) {
  const yol = usePathname() ?? "/yonetim";
  const liste = useRef<HTMLElement>(null);
  // Seçili sekme dar ekranda sağda kalıyorsa ("Tanı") görünür alana gelsin.
  useEffect(() => {
    liste.current?.querySelector("[aria-current=page]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [yol]);
  const b = etkinBolum(yol);
  if (!b || b.alt.length === 0) return null;
  const adres = etkinAdres(yol);
  const sekmeler = [
    ...(b.alt.some((a) => a.yol === b.yol) ? [] : [{ yol: b.yol, ad: b.ad }]),
    ...b.alt,
  ];

  return (
    <nav
      ref={liste}
      aria-label={`${b.ad} sayfaları`}
      className={`-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] ${dar ? "" : "lg:hidden"}`}
    >
      <ul className="flex w-max gap-1 border-b border-cizgi">
        {sekmeler.map((s) => {
          const secili = adres === s.yol;
          return (
            <li key={s.yol + s.ad}>
              <Link
                href={s.yol}
                aria-current={secili ? "page" : undefined}
                className={`-mb-px flex min-h-10 items-center whitespace-nowrap border-b-2 px-3 text-sm font-bold transition ${
                  secili ? "border-mercan text-metin" : "border-transparent text-metin-2 hover:text-metin"
                }`}
              >
                {s.ad}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
