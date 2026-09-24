"use client";

import { createContext, useContext, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { favoriCevir } from "@/server/favori-islem";
import { useZiyaretci } from "@/ui/ziyaretci";

/**
 * Favoriler (K-94): mağaza düzeninin okuduğu liste ve kalp düğmesi.
 *
 * Liste bir kez okunuyor (tarayıcıda, K-131) ve bağlamla bütün kartlara
 * dağılıyor; her kart ayrı ayrı sormuyor. `null` "giriş yok" demek: kalp o zaman giriş
 * sayfasına götürüyor ve dönüşte aynı sayfaya geri geliyor.
 */
type FavoriBaglami = {
  girisli: boolean;
  favoriMi: (id: string) => boolean;
  cevir: (id: string) => Promise<void>;
};

const Baglam = createContext<FavoriBaglami>({
  girisli: false,
  favoriMi: () => false,
  cevir: async () => {},
});

export function FavoriSaglayici({ children }: { children: React.ReactNode }) {
  // Liste tarayıcıda okunuyor (K-131); üstüne bu sayfada yapılan
  // değişiklikler biniyor, liste yeniden okununca onlar zaten içinde.
  const { durum } = useZiyaretci();
  const [degisenler, setDegisenler] = useState<Map<string, boolean>>(new Map());
  const listede = new Set(durum?.favoriler ?? []);
  const favoriMi = (id: string) => degisenler.get(id) ?? listede.has(id);

  async function cevir(id: string) {
    // İyimser: kalp hemen doluyor, sunucu reddederse geri dönüyor.
    const onceki = favoriMi(id);
    setDegisenler((m) => new Map(m).set(id, !onceki));
    const sonuc = await favoriCevir(id).catch(() => undefined);
    if (!sonuc?.tamam) setDegisenler((m) => new Map(m).set(id, onceki));
  }

  return (
    <Baglam.Provider value={{ girisli: durum?.girisli ?? false, favoriMi, cevir }}>
      {children}
    </Baglam.Provider>
  );
}

function Kalp({ dolu }: { dolu: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z"
        fill={dolu ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Kalp düğmesi. `yuzen`: kartın fotoğrafının köşesinde, beyaz yuvarlak
 * zeminde; yoksa ürün sayfasındaki gibi yazılı düğme.
 */
export function FavoriDugmesi({
  urunId,
  urunAd,
  yuzen = false,
}: {
  urunId: string;
  urunAd: string;
  yuzen?: boolean;
}) {
  const { girisli, favoriMi, cevir } = useContext(Baglam);
  const yol = usePathname() ?? "/";
  const [bekliyor, basla] = useTransition();
  const dolu = favoriMi(urunId);

  const sinif = yuzen
    ? `grid h-9 w-9 place-items-center rounded-full bg-yuzey/90 shadow-sm ring-1 ring-black/5 transition hover:scale-105 ${
        dolu ? "text-mercan-koyu" : "text-metin-2 hover:text-mercan-koyu"
      }`
    : `flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
        dolu
          ? "border-mercan bg-mercan-soluk text-mercan-koyu"
          : "border-cizgi bg-yuzey text-metin-2 hover:border-mercan hover:text-mercan-koyu"
      }`;
  const yazi = dolu ? "Favorilerde" : "Favorilere ekle";

  // Giriş yoksa kalp giriş sayfasına götürüyor; dönüşte aynı sayfa.
  if (!girisli) {
    return (
      <Link
        href={`/giris?nereye=${encodeURIComponent(yol)}`}
        className={sinif}
        aria-label={`${urunAd}: favorilere eklemek için giriş yap`}
        title="Favorilere eklemek için giriş yap"
      >
        <Kalp dolu={false} />
        {!yuzen && <span>Favorilere ekle</span>}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => basla(() => cevir(urunId))}
      aria-pressed={dolu}
      aria-label={yuzen ? `${urunAd}: ${yazi.toLowerCase()}` : undefined}
      title={yazi}
      disabled={bekliyor}
      className={sinif}
    >
      <Kalp dolu={dolu} />
      {!yuzen && <span>{yazi}</span>}
    </button>
  );
}
