"use client";

import { useState, useSyncExternalStore } from "react";
import { bedenOner, urundeKarsilik, type BebekOlcusu, type Olculer } from "@/ui/beden-onerici-bicim";

/**
 * "Hangi beden olur?" (K-136). Bebeğin boyu, kilosu ya da doğum tarihi
 * girilince mağazanın beden tablosundan öneri. Bilgiler yalnızca bu
 * tarayıcıda (localStorage) saklanıyor: sonraki ürünlerde öneri hazır
 * geliyor, sunucuya hiçbir şey gitmiyor.
 */

const ANAHTAR = "bebek-olcu";
const OLAY = "bebek-olcu";

function oku(): string {
  try {
    return localStorage.getItem(ANAHTAR) ?? "";
  } catch {
    return "";
  }
}

function abone(bildir: () => void): () => void {
  window.addEventListener(OLAY, bildir);
  window.addEventListener("storage", bildir);
  return () => {
    window.removeEventListener(OLAY, bildir);
    window.removeEventListener("storage", bildir);
  };
}

/** Saklanan ölçü; sunucuda ve ilk çizimde boş. */
export function useBebekOlcusu(): BebekOlcusu | null {
  const ham = useSyncExternalStore(abone, oku, () => "");
  if (!ham) return null;
  try {
    return JSON.parse(ham) as BebekOlcusu;
  } catch {
    return null;
  }
}

function kaydet(o: BebekOlcusu | null) {
  try {
    if (o) localStorage.setItem(ANAHTAR, JSON.stringify(o));
    else localStorage.removeItem(ANAHTAR);
  } catch {
    // Depolama kapalı: öneri yine bu sayfada gösteriliyor.
  }
  window.dispatchEvent(new Event(OLAY));
}

const NEYE_GORE = { boy: "boya", kilo: "kiloya", yaş: "yaşa" } as const;

const GIRDI =
  "w-full rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-2.5 py-1.5 text-sm text-metin outline-none focus:border-mercan";

export default function BedenOnerici({
  olculer,
  urunBedenleri,
  onSec,
}: {
  olculer: Olculer;
  urunBedenleri: string[];
  onSec: (beden: string) => void;
}) {
  const kayitli = useBebekOlcusu();
  // Depolama kapalıysa bu sayfalık hâl.
  const [yerel, setYerel] = useState<BebekOlcusu | null>(null);
  const olcu = kayitli ?? yerel;
  const oneri = olcu ? bedenOner(olculer, olcu) : null;
  const karsilik = oneri ? urundeKarsilik(olculer, urunBedenleri, oneri) : null;

  function gonder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const sayi = (ad: string) => {
      const n = Number(String(f.get(ad) ?? "").replace(",", "."));
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const yeni: BebekOlcusu = {
      boyCm: sayi("boy"),
      kiloKg: sayi("kilo"),
      dogum: String(f.get("dogum") ?? "") || undefined,
    };
    setYerel(yeni);
    kaydet(yeni);
  }

  return (
    <details className="mt-3 rounded-marka border border-cizgi bg-yuzey p-3 text-sm" open={Boolean(olcu)}>
      <summary className="cursor-pointer font-bold text-mavi-koyu">Hangi beden olur?</summary>

      {karsilik && oneri ? (
        <div className="mt-2">
          <p>
            Önerimiz: <strong>{karsilik.beden}</strong>
            <span className="text-metin-3">
              {" "}
              ({NEYE_GORE[oneri.neyeGore]} göre{karsilik.tam ? "" : `; ${oneri.beden} bu üründe yok, en yakını`})
            </span>
          </p>
          {karsilik.sonraki && (
            <p className="mt-1 text-xs text-metin-2">
              Bebeğin bu bedenin üst sınırına yakın; <strong>{karsilik.sonraki}</strong> daha uzun
              giyilir.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSec(karsilik.beden)}
              className="rounded-full bg-dugme px-3 py-1.5 text-xs font-bold text-dugme-yazi"
            >
              {karsilik.beden} seç
            </button>
            {karsilik.sonraki && (
              <button
                type="button"
                onClick={() => onSec(karsilik.sonraki!)}
                className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2"
              >
                {karsilik.sonraki} seç
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setYerel(null);
                kaydet(null);
              }}
              className="text-xs font-bold text-metin-3 hover:text-metin"
            >
              Ölçüleri değiştir
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={gonder} className="mt-2 flex flex-col gap-2">
          <p className="text-xs text-metin-3">Birini doldurman yeter; boy en doğru sonucu veriyor.</p>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1 text-xs font-bold text-metin-2">
              Boy (cm)
              <input name="boy" inputMode="decimal" defaultValue={olcu?.boyCm ?? ""} className={GIRDI} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-metin-2">
              Kilo (kg)
              <input name="kilo" inputMode="decimal" defaultValue={olcu?.kiloKg ?? ""} className={GIRDI} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-metin-2">
              Doğum tarihi
              <input name="dogum" type="date" defaultValue={olcu?.dogum ?? ""} className={GIRDI} />
            </label>
          </div>
          {olcu && !oneri && <p className="text-xs text-mercan-koyu">Bu ölçülerle öneri çıkmadı; birini kontrol et.</p>}
          <button type="submit" className="self-start rounded-full bg-dugme px-4 py-1.5 text-xs font-bold text-dugme-yazi">
            Beden öner
          </button>
          <p className="text-xs text-metin-3">Bilgiler yalnızca bu cihazda saklanıyor.</p>
        </form>
      )}
    </details>
  );
}
