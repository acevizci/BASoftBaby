import { PALET, type GorselTipi, type RenkAdi } from "@/ui/katalog-bicim";

/**
 * Ürün görselleri henüz çizim. Gerçek fotoğraflar çekilip yüklendiğinde bu
 * bileşenin yerine fotoğraf gelecek; çağıran sayfalar değişmeyecek.
 *
 * Renkler ürünün paletinden geliyor: c1 vurgu, c2 gövde, c3 çizgi.
 */

type CizimOzellik = { c1: string; c2: string; c3: string; zemin: string };

function Zibin({ c1, c2, c3 }: CizimOzellik) {
  return (
    <>
      <path d="M34 31 L21 36a4.5 4.5 0 0 0-2.4 5.6l2.6 6.4a3.4 3.4 0 0 0 4.5 1.8L36 47Z" fill={c2} stroke={c3} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M66 31 L79 36a4.5 4.5 0 0 1 2.4 5.6l-2.6 6.4a3.4 3.4 0 0 1-4.5 1.8L64 47Z" fill={c2} stroke={c3} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M36 29h28a6 6 0 0 1 6 6v29a8 8 0 0 1-5.2 7.5l-11.4 4.2a4 4 0 0 1-2.8 0l-11.4-4.2A8 8 0 0 1 30 64V35a6 6 0 0 1 6-6Z" fill={c2} stroke={c3} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M38 30 Q50 39.5 62 30" fill="none" stroke={c1} strokeWidth="4.6" strokeLinecap="round" />
      <circle cx="43.6" cy="46.5" r="3.5" fill={c1} />
      <circle cx="56.4" cy="46.5" r="3.5" fill={c1} />
      <circle cx="50" cy="52.5" r="8.4" fill={c1} />
      <ellipse cx="50" cy="55" rx="4" ry="3.1" fill={c2} />
      <circle cx="46.8" cy="50" r="1.15" fill={c3} />
      <circle cx="53.2" cy="50" r="1.15" fill={c3} />
      <circle cx="44" cy="69.6" r="1.9" fill={c1} />
      <circle cx="50" cy="71.2" r="1.9" fill={c1} />
      <circle cx="56" cy="69.6" r="1.9" fill={c1} />
    </>
  );
}

function Tulum({ c1, c2, c3 }: CizimOzellik) {
  return (
    <>
      <path d="M35 27 L24 32a4 4 0 0 0-2.1 5l2.3 5.6a3 3 0 0 0 4 1.6L37 41Z" fill={c2} stroke={c3} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M65 27 L76 32a4 4 0 0 1 2.1 5l-2.3 5.6a3 3 0 0 1-4 1.6L63 41Z" fill={c2} stroke={c3} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M37 25h26a7 7 0 0 1 7 7v20a6 6 0 0 1-4.4 5.8l-1.2 15.6a5 5 0 0 1-5 4.6h-5.6a4.4 4.4 0 0 1-4.4-4.2l-.9-13.4-.9 13.4a4.4 4.4 0 0 1-4.4 4.2h-5.6a5 5 0 0 1-5-4.6l-1.2-15.6A6 6 0 0 1 30 52V32a7 7 0 0 1 7-7Z" fill={c2} stroke={c3} strokeWidth="1.9" strokeLinejoin="round" />
      <rect x="32.6" y="69" width="14.4" height="8.4" rx="4.2" fill={c1} />
      <rect x="53" y="69" width="14.4" height="8.4" rx="4.2" fill={c1} />
      <path d="M50 29v27" stroke={c1} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="50" cy="28.5" r="2.7" fill={c1} />
      <path d="M41.5 35v15M58.5 35v15" stroke={c1} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".65" />
    </>
  );
}

function Battaniye({ c1, c2, c3 }: CizimOzellik) {
  return (
    <>
      <rect x="20" y="24" width="60" height="54" rx="10" fill={c2} />
      <path d="M20 62h60v6a10 10 0 0 1-10 10H30a10 10 0 0 1-10-10Z" fill={c1} />
      <path d="M30 36h16M30 46h24M54 36h16" stroke={c3} strokeWidth="3" strokeLinecap="round" fill="none" />
    </>
  );
}

function Patik({ c1, c2, c3 }: CizimOzellik) {
  return (
    <>
      <path d="M22 40h16a4 4 0 0 1 4 4v10c0 6-4 10-11 10H26a6 6 0 0 1-6-6V44a4 4 0 0 1 2-4Z" fill={c2} />
      <path d="M20 58h22v4a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6Z" fill={c1} />
      <path d="M58 40h16a4 4 0 0 1 4 4v10c0 6-4 10-11 10H62a6 6 0 0 1-6-6V44a4 4 0 0 1 2-4Z" fill={c2} />
      <path d="M56 58h22v4a6 6 0 0 1-6 6H62a6 6 0 0 1-6-6Z" fill={c1} />
      <path d="M26 44h10M62 44h10" stroke={c3} strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </>
  );
}

function Sapka({ c1, c2, c3 }: CizimOzellik) {
  return (
    <>
      <path d="M26 58a24 24 0 0 1 48 0Z" fill={c2} />
      <rect x="18" y="56" width="64" height="11" rx="5.5" fill={c1} />
      <circle cx="50" cy="30" r="7" fill={c3} />
      <path d="M50 37v-2" stroke={c3} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Onluk({ c1, c2, c3, zemin }: CizimOzellik) {
  return (
    <>
      <path d="M50 24c8.5 0 12.5 3.6 12.5 3.6L69 31a19.5 19.5 0 0 1 7.5 16.5C76.5 62.5 64.6 73.5 50 73.5S23.5 62.5 23.5 47.5A19.5 19.5 0 0 1 31 31l6.5-3.4S41.5 24 50 24Z" fill={c2} stroke={c3} strokeWidth="1.9" strokeLinejoin="round" />
      {/* boyun oyuğu panelin zemin rengiyle doldurulur, yoksa yüz gibi okunuyor */}
      <path d="M37.6 26.8a12.4 12.4 0 0 0 24.8 0" fill={zemin} stroke={c3} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M33 60q17 7 34 0" fill="none" stroke={c1} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="44.5" cy="45" r="3" fill={c1} />
      <circle cx="55.5" cy="45" r="3" fill={c1} />
      <path d="M44 52q6 4.5 12 0" fill="none" stroke={c1} strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

const CIZIMLER: Record<GorselTipi, (o: CizimOzellik) => React.ReactElement> = {
  zibin: Zibin,
  tulum: Tulum,
  battaniye: Battaniye,
  patik: Patik,
  sapka: Sapka,
  onluk: Onluk,
};

export default function UrunGorseli({
  tip,
  palet,
  className = "",
}: {
  tip: GorselTipi;
  palet: RenkAdi;
  className?: string;
}) {
  const p = PALET[palet];
  const Cizim = CIZIMLER[tip];
  return (
    <div
      className={`grid place-items-center rounded-marka ${className}`}
      style={{ background: p.zemin }}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true" className="h-3/5 w-3/5">
        <Cizim c1={p.c1} c2={p.c2} c3={p.c3} zemin={p.zemin} />
      </svg>
    </div>
  );
}
