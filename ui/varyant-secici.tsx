"use client";

import { useState } from "react";
import Link from "next/link";
import SepeteEkle from "@/ui/sepete-ekle";
import {
  BEDEN_OLCULERI,
  RENK_ADLARI,
  PALET,
  type Beden,
  type RenkAdi,
  type Varyant,
} from "@/ui/katalog-bicim";

/** Bir beden ve renk için stok; olmayan birleşim undefined döner. */
function bul(varyantlar: Varyant[], beden: string, renk: RenkAdi): Varyant | undefined {
  return varyantlar.find((v) => v.beden === beden && v.renk === renk);
}

export default function VaryantSecici({
  bedenler,
  renkler,
  varyantlar,
}: {
  bedenler: string[];
  renkler: RenkAdi[];
  varyantlar: Varyant[];
}) {
  const ilk = varyantlar.find((v) => v.stok > 0) ?? varyantlar[0];
  const [beden, setBeden] = useState<string>(ilk.beden);
  const [renk, setRenk] = useState<RenkAdi>(ilk.renk);

  const secili = bul(varyantlar, beden, renk);
  const stok = secili?.stok ?? 0;
  const olculer = BEDEN_OLCULERI[beden as Beden];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-bold">Beden</p>
          <Link href="/beden-rehberi" className="text-xs font-bold text-mavi-koyu hover:underline">
            Beden rehberi
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {bedenler.map((b) => {
            const bedendeStok = varyantlar.some((v) => v.beden === b && v.stok > 0);
            return (
              <button
                key={b}
                type="button"
                onClick={() => setBeden(b)}
                aria-pressed={beden === b}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  beden === b
                    ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                    : bedendeStok
                      ? "border-cizgi bg-yuzey text-metin-2 hover:border-metin-3"
                      : "border-cizgi-soluk bg-yuzey-sicak text-metin-3 line-through"
                }`}
              >
                {b}
              </button>
            );
          })}
        </div>
        {/* Seçili bedenin boy-kilo karşılığı: bebek bedenlerinde ay aralığı
            yalnızca bir işaret, asıl ölçü boy. İadelerin çoğu buradan. */}
        {olculer && (
          <p className="mt-2 text-xs text-metin-3">
            {beden} ≈ boy {olculer.boy} · kilo {olculer.kilo}
          </p>
        )}
      </div>

      <div>
        <p className="text-sm font-bold">Renk · {RENK_ADLARI[renk]}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {renkler.map((r) => {
            const v = bul(varyantlar, beden, r);
            const yok = !v || v.stok === 0;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRenk(r)}
                aria-pressed={renk === r}
                aria-label={RENK_ADLARI[r]}
                title={yok ? `${RENK_ADLARI[r]} · bu bedende yok` : RENK_ADLARI[r]}
                className={`h-9 w-9 rounded-full ring-2 transition ${
                  renk === r ? "ring-mercan" : "ring-cizgi hover:ring-metin-3"
                } ${yok ? "opacity-40" : ""}`}
                style={{ background: PALET[r].c1 }}
              />
            );
          })}
        </div>
      </div>

      <p className="text-sm font-semibold">
        {stok === 0 ? (
          <span className="text-metin-3">Bu seçim tükendi — başka beden ya da renk seç</span>
        ) : stok <= 3 ? (
          <span className="text-mercan-koyu">Son {stok} adet</span>
        ) : (
          <span className="text-nane-koyu">Stokta</span>
        )}
      </p>

      <SepeteEkle variantId={secili?.id} devreDisi={stok === 0} tamGenislik />
    </div>
  );
}
