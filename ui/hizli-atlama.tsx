"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PanelIkon from "@/ui/panel-ikon";
import { GRUP_ADLARI, sonuclar, type Sonuc } from "@/ui/hizli-atlama-bicim";

/**
 * Hızlı atlama penceresi (K-119): ⌘K / Ctrl+K ya da menüdeki "Ara…".
 *
 * Yerel `<dialog>` modal olarak açılıyor: arkadaki sayfa etkisiz, odak
 * pencerede kalıyor, Esc kapatıyor, kapanınca odak açan düğmeye dönüyor —
 * hepsi tarayıcıdan, elle odak tuzağı yazmadan.
 *
 * Arama kutusu ARIA "combobox" kalıbında: odak hep kutuda kalıyor, oklar
 * listedeki seçili satırı değiştiriyor (`aria-activedescendant`), Enter
 * açıyor. ⌘/Ctrl+Enter yeni sekmede açıyor.
 *
 * Bileşen yalnızca açıkken çiziliyor; her açılışta arama boş başlıyor.
 */
export default function HizliAtlama({ onKapat }: { onKapat: () => void }) {
  const router = useRouter();
  const kutu = useRef<HTMLDialogElement>(null);
  const [sorgu, setSorgu] = useState("");
  const [secili, setSecili] = useState(0);
  const liste = useMemo(() => sonuclar(sorgu), [sorgu]);
  const aktif = Math.min(secili, liste.length - 1);

  useEffect(() => {
    const d = kutu.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Oklarla gezerken seçili satır görünür alanda kalsın.
  useEffect(() => {
    document.getElementById(`hizli-${aktif}`)?.scrollIntoView({ block: "nearest" });
  }, [aktif]);

  const git = (s: Sonuc, yeniSekme = false) => {
    if (yeniSekme) {
      window.open(s.yol, "_blank", "noopener");
      return;
    }
    kutu.current?.close();
    router.push(s.yol);
  };

  const tus = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = liste.length;
    if (n === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setSecili((aktif + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
    } else if (e.key === "Enter") {
      e.preventDefault();
      git(liste[aktif], e.metaKey || e.ctrlKey);
    }
  };

  // Ardışık aynı türdeki sonuçlar bir grup.
  const gruplar: { tur: Sonuc["tur"]; ogeler: { s: Sonuc; i: number }[] }[] = [];
  liste.forEach((s, i) => {
    const son = gruplar[gruplar.length - 1];
    if (son && son.tur === s.tur) son.ogeler.push({ s, i });
    else gruplar.push({ tur: s.tur, ogeler: [{ s, i }] });
  });

  return (
    <dialog
      ref={kutu}
      aria-label="Hızlı atlama"
      onClose={onKapat}
      // Karartmaya tıklamak kapatıyor: tıklanan pencerenin kendisi (içeriği
      // değil) ise tıklama ::backdrop'a düşmüş demektir.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="hizli-atlama mx-auto mt-[10vh] w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-marka border border-cizgi bg-yuzey p-0 text-metin shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-center gap-2 border-b border-cizgi px-4">
        <span className="text-metin-3">
          <PanelIkon ad="ara" />
        </span>
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls="hizli-liste"
          aria-autocomplete="list"
          aria-activedescendant={aktif >= 0 ? `hizli-${aktif}` : undefined}
          aria-label="Sayfa, eylem ya da sipariş numarası"
          placeholder="Sayfa, eylem ya da BA-… numarası"
          value={sorgu}
          onChange={(e) => {
            setSorgu(e.target.value);
            setSecili(0);
          }}
          onKeyDown={tus}
          autoComplete="off"
          spellCheck={false}
          className="min-h-12 flex-1 bg-transparent text-base outline-none placeholder:text-metin-3"
        />
        <kbd className="hidden rounded border border-cizgi px-1.5 py-0.5 text-[11px] text-metin-3 sm:block">
          Esc
        </kbd>
      </div>

      <div
        id="hizli-liste"
        role="listbox"
        aria-label="Sonuçlar"
        className="max-h-[min(60vh,26rem)] overflow-y-auto p-2"
      >
        {gruplar.map((g, gi) => (
          <div key={`${g.tur}-${gi}`} role="group" aria-labelledby={`hizli-grup-${gi}`}>
            <p
              id={`hizli-grup-${gi}`}
              role="presentation"
              className="px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-metin-3"
            >
              {GRUP_ADLARI[g.tur]}
            </p>
            {g.ogeler.map(({ s, i }) => (
              <div
                key={`${s.tur}-${s.yol}`}
                id={`hizli-${i}`}
                role="option"
                aria-selected={i === aktif}
                // Fare üzerinden geçerken seçiliyor; kaydırmayla altına giren
                // satır seçimi çalmasın diye `mousemove`.
                onMouseMove={() => i !== aktif && setSecili(i)}
                // Odak arama kutusunda kalsın.
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => git(s, e.metaKey || e.ctrlKey)}
                className={`flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-[10px] px-2.5 py-2 text-sm ${
                  i === aktif ? "bg-yuzey-sicak text-metin" : "text-metin-2"
                }`}
              >
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{s.baslik}</span>
                  {s.ek && <span className="text-metin-3"> · {s.ek}</span>}
                </span>
                {i === aktif && (
                  <span aria-hidden="true" className="flex-none text-xs text-metin-3">
                    ↵
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
        {liste.length === 0 && (
          <p className="px-2.5 py-6 text-center text-sm text-metin-3">Sonuç yok.</p>
        )}
      </div>

      <p className="hidden border-t border-cizgi px-4 py-2 text-xs text-metin-3 sm:block">
        ↑↓ gez · Enter aç · ⌘/Ctrl+Enter yeni sekmede · Esc kapat
      </p>
      <p aria-live="polite" className="sr-only">
        {liste.length} sonuç
      </p>
    </dialog>
  );
}
