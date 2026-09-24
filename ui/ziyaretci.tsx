"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Ziyaretçiye özel bilgiler (K-131): giriş durumu, sepet adedi, favoriler.
 *
 * Mağaza düzeni herkes için aynı olsun diye (önbellekten verilebilsin) bu
 * bilgiler sunucuda değil, tarayıcıda `/api/ziyaretci`'den okunuyor. Her
 * sayfa geçişinde yenileniyor: sepete ekleme ve giriş gibi işlemler hep
 * başka bir sayfaya yönlendiriyor.
 *
 * **JavaScript'siz de çalışıyor:** üst çubukta "Giriş" (girişliyken giriş
 * sayfası hesaba yönlendiriyor) ve sayısız "Sepet" bağlantısı kalıyor.
 */
export type Ziyaretci = { girisli: boolean; sepetAdedi: number; favoriler: string[] };

type Baglam = {
  /** Henüz okunmadıysa `undefined`. */
  durum?: Ziyaretci;
  sepetAdediniYaz: (adet: number) => void;
};

const ZiyaretciBaglami = createContext<Baglam>({ sepetAdediniYaz: () => {} });

export function useZiyaretci(): Baglam {
  return useContext(ZiyaretciBaglami);
}

export function ZiyaretciSaglayici({ children }: { children: React.ReactNode }) {
  const yol = usePathname();
  const [durum, setDurum] = useState<Ziyaretci>();

  useEffect(() => {
    let iptal = false;
    fetch("/api/ziyaretci", { cache: "no-store" })
      .then((c) => (c.ok ? (c.json() as Promise<Ziyaretci>) : undefined))
      .then((d) => {
        if (d && !iptal) setDurum(d);
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, [yol]);

  const sepetAdediniYaz = useCallback(
    (adet: number) => setDurum((d) => (d ? { ...d, sepetAdedi: adet } : d)),
    [],
  );

  return (
    <ZiyaretciBaglami.Provider value={{ durum, sepetAdediniYaz }}>{children}</ZiyaretciBaglami.Provider>
  );
}

/** Üst çubuktaki sepet bağlantısı. */
export function SepetSayaci() {
  const adet = useZiyaretci().durum?.sepetAdedi ?? 0;
  return (
    <Link
      href="/sepet"
      className="rounded-full bg-mercan-soluk px-3 py-1.5 text-xs font-bold text-mercan-koyu transition hover:brightness-95"
    >
      Sepet{adet > 0 ? ` · ${adet}` : ""}
    </Link>
  );
}

/** Üst çubuktaki hesap bağlantısı: giriş yapılmışsa hesabım, değilse giriş. */
export function HesapBaglantisi() {
  const girisli = useZiyaretci().durum?.girisli ?? false;
  return (
    <Link
      href={girisli ? "/hesabim" : "/giris"}
      className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
    >
      {girisli ? "Hesabım" : "Giriş"}
    </Link>
  );
}

/**
 * Sepet sayfası kendi adedini üst çubuğa bildiriyor: sepette adet değişince
 * sayfa değişmiyor, yeniden okuma tetiklenmiyordu.
 */
export function SepetAdediBildir({ adet }: { adet: number }) {
  const { sepetAdediniYaz } = useZiyaretci();
  useEffect(() => sepetAdediniYaz(adet), [adet, sepetAdediniYaz]);
  return null;
}
