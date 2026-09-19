"use client";

import { useEffect, useRef, useState } from "react";
import { sepeteEkle, type SepetSatiri } from "@/ui/sepet-durumu";

export default function SepeteEkle({
  urun,
  tamGenislik = false,
  kucuk = false,
  devreDisi = false,
}: {
  urun: Omit<SepetSatiri, "adet">;
  tamGenislik?: boolean;
  kucuk?: boolean;
  devreDisi?: boolean;
}) {
  const [eklendi, setEklendi] = useState(false);
  const sayac = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (sayac.current) clearTimeout(sayac.current); }, []);

  function basildi() {
    sepeteEkle(urun);
    setEklendi(true);
    if (sayac.current) clearTimeout(sayac.current);
    sayac.current = setTimeout(() => setEklendi(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={basildi}
      disabled={devreDisi}
      className={[
        "rounded-full font-bold transition",
        kucuk ? "px-4 py-2 text-sm" : "px-6 py-3 text-base",
        tamGenislik ? "w-full" : "",
        devreDisi
          ? "cursor-not-allowed bg-cizgi-soluk text-metin-3"
          : eklendi
            ? "bg-nane-soluk text-nane-koyu"
            : "bg-mercan text-white hover:brightness-95",
      ].join(" ")}
    >
      {devreDisi ? "Tükendi" : eklendi ? "✓ Sepete eklendi" : "Sepete ekle"}
    </button>
  );
}
