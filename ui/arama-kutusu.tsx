"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Oneri = { slug: string; ad: string; kategori: string; fiyat: string };

/**
 * Arama kutusu ve altındaki öneriler.
 *
 * **Temelde düz bir GET formu:** JavaScript kapalıyken de yazıp Enter'a
 * basınca `/arama` sayfasına gidiyor. Öneriler bunun üstüne eklenen kolaylık;
 * kapalıyken hiçbir şey kaybolmuyor.
 *
 * Yazarken her harfte istek atılmıyor: yazmaya ara verilene kadar bekleniyor
 * ve önceki istek iptal ediliyor. Hızlı yazan birinde sunucuya bir istek
 * gidiyor, on değil.
 *
 * Klavye: ok tuşlarıyla öneriler arasında geziliyor, Enter seçiyor, Esc
 * kapatıyor. Sonuç sayısı `aria-live` ile okunuyor.
 */
export default function AramaKutusu({
  baslangic = "",
  otomatikOdak = false,
}: {
  baslangic?: string;
  otomatikOdak?: boolean;
}) {
  const router = useRouter();
  const [metin, setMetin] = useState(baslangic);
  const [oneriler, setOneriler] = useState<Oneri[]>([]);
  const [acik, setAcik] = useState(false);
  const [secili, setSecili] = useState(-1);
  const sarmal = useRef<HTMLDivElement>(null);
  const listeId = useId();

  const sorgu = metin.trim();
  // Kısa metinde öneri gösterilmiyor. Diziyi boşaltmak yerine türetiliyor:
  // efekt içinde senkron setState çağırmak gereksiz bir tur render demek.
  const gosterilen = sorgu.length >= 2 ? oneriler : [];

  // Yazmaya ara verilince ara; her tuşta değil.
  useEffect(() => {
    const sorgu = metin.trim();
    if (sorgu.length < 2) return;

    const kontrol = new AbortController();
    const zaman = setTimeout(async () => {
      try {
        const cevap = await fetch(`/api/arama?q=${encodeURIComponent(sorgu)}`, {
          signal: kontrol.signal,
        });
        if (!cevap.ok) return;
        const veri = (await cevap.json()) as { urunler: Oneri[] };
        setOneriler(veri.urunler ?? []);
        setAcik(true);
        setSecili(-1);
      } catch {
        // İptal edilen ya da başarısız istek sessizce geçiyor: arama kutusu
        // ağ yüzünden bozulmuş görünmemeli, form zaten çalışıyor.
      }
    }, 220);

    return () => {
      clearTimeout(zaman);
      kontrol.abort();
    };
  }, [metin]);

  // Dışarı tıklayınca kapansın.
  useEffect(() => {
    function disari(olay: MouseEvent) {
      if (!sarmal.current?.contains(olay.target as Node)) setAcik(false);
    }
    document.addEventListener("mousedown", disari);
    return () => document.removeEventListener("mousedown", disari);
  }, []);

  function tusla(olay: React.KeyboardEvent<HTMLInputElement>) {
    if (!acik || gosterilen.length === 0) return;
    if (olay.key === "ArrowDown") {
      olay.preventDefault();
      setSecili((s) => (s + 1) % gosterilen.length);
    } else if (olay.key === "ArrowUp") {
      olay.preventDefault();
      setSecili((s) => (s <= 0 ? gosterilen.length - 1 : s - 1));
    } else if (olay.key === "Escape") {
      setAcik(false);
    } else if (olay.key === "Enter" && secili >= 0) {
      olay.preventDefault();
      router.push(`/urun/${gosterilen[secili].slug}`);
      setAcik(false);
    }
  }

  return (
    <div ref={sarmal} className="relative">
      <form action="/arama" method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          onFocus={() => gosterilen.length > 0 && setAcik(true)}
          onKeyDown={tusla}
          autoFocus={otomatikOdak}
          placeholder="Ürün ara"
          aria-label="Ürün ara"
          aria-describedby={listeId}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-full border-[1.5px] border-cizgi bg-yuzey px-4 py-2 text-sm text-metin outline-none focus:border-mercan"
        />
        <button
          type="submit"
          className="flex-none rounded-full bg-dugme px-4 py-2 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Ara
        </button>
      </form>

      {/* Tam bir combobox iddiasında bulunulmuyor: öneriler gerçek bağlantı
          olarak kalsın istiyoruz (yeni sekmede açılabilsinler). Bunun yerine
          sonuç sayısı sesli okunuyor. */}
      <p id={listeId} aria-live="polite" className="sr-only">
        {sorgu.length >= 2 ? `${gosterilen.length} öneri bulundu` : ""}
      </p>

      {acik && gosterilen.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-marka border border-cizgi bg-yuzey shadow-lg"
        >
          {gosterilen.map((o, i) => (
            <li key={o.slug}>
              <a
                href={`/urun/${o.slug}`}
                onMouseEnter={() => setSecili(i)}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                  secili === i ? "bg-mercan-soluk" : "hover:bg-zemin-2"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{o.ad}</span>
                  <span className="block text-xs text-metin-3">{o.kategori}</span>
                </span>
                <span className="rakam flex-none font-semibold">{o.fiyat}</span>
              </a>
            </li>
          ))}
          <li className="border-t border-cizgi-soluk">
            <button
              type="button"
              onClick={() => router.push(`/arama?q=${encodeURIComponent(sorgu)}`)}
              className="w-full px-4 py-2.5 text-left text-xs font-bold text-mavi-koyu hover:bg-zemin-2"
            >
              Bütün sonuçları gör →
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
