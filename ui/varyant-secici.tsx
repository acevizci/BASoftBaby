"use client";

import { useState } from "react";
import Link from "next/link";
import SepeteEkle from "@/ui/sepete-ekle";
import StokBildirimi from "@/ui/stok-bildirimi";
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
  seciliRenk,
  varyantlar,
  slug,
  bildirimDurumu,
}: {
  bedenler: string[];
  renkler: RenkAdi[];
  /** Adres satırından gelen renk; galeri de buna göre süzülüyor (K-48). */
  seciliRenk: RenkAdi;
  varyantlar: Varyant[];
  slug: string;
  bildirimDurumu?: string;
}) {
  const ilk = varyantlar.find((v) => v.stok > 0) ?? varyantlar[0];
  const [beden, setBeden] = useState<string>(ilk.beden);

  // Renk istemci durumunda değil adreste: seçim JavaScript kapalıyken de
  // çalışıyor, galeri sunucuda süzülüyor ve "mavisi" diye bağlantı
  // paylaşılabiliyor. Beden fotoğrafı değiştirmediği için yerinde kaldı.
  const renk = seciliRenk;

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
              <Link
                key={r}
                href={`/urun/${slug}?renk=${r}#galeri`}
                aria-current={renk === r ? "true" : undefined}
                aria-label={RENK_ADLARI[r]}
                title={yok ? `${RENK_ADLARI[r]} · bu bedende yok` : RENK_ADLARI[r]}
                className={`block h-9 w-9 rounded-full ring-2 transition ${
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

      {stok === 0 && secili && (
        <StokBildirimi variantId={secili.id} slug={slug} durum={bildirimDurumu} />
      )}
    </div>
  );
}
