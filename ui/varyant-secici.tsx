"use client";

import { useState } from "react";
import Link from "next/link";
import SepeteEkle from "@/ui/sepete-ekle";
import StokBildirimi from "@/ui/stok-bildirimi";
import { renkYaz, type RenkAdi, type RenkSecenegi, type Varyant } from "@/ui/katalog-bicim";
import { tonSec, type Ton } from "@/ui/kategori-tonu";

/**
 * Beden düğmelerinin tonları (K-90). Ana sayfadaki "Yaşa göre" kutularıyla
 * aynı dört pastel. Sınıflar tam yazılı: Tailwind birleştirilmiş sınıf
 * adlarını göremiyor.
 */
const BEDEN_TONU: Record<Ton, { normal: string; secili: string }> = {
  mavi: {
    normal: "border-mavi/60 bg-mavi-soluk text-mavi-koyu hover:border-mavi-koyu",
    secili: "border-mavi-koyu bg-mavi-soluk text-mavi-koyu ring-2 ring-mavi-koyu",
  },
  nane: {
    normal: "border-nane/60 bg-nane-soluk text-nane-koyu hover:border-nane-koyu",
    secili: "border-nane-koyu bg-nane-soluk text-nane-koyu ring-2 ring-nane-koyu",
  },
  mercan: {
    normal: "border-mercan/60 bg-mercan-soluk text-mercan-koyu hover:border-mercan-koyu",
    secili: "border-mercan-koyu bg-mercan-soluk text-mercan-koyu ring-2 ring-mercan-koyu",
  },
  sari: {
    normal: "border-sari/70 bg-sari-soluk text-sari-koyu hover:border-sari-koyu",
    secili: "border-sari-koyu bg-sari-soluk text-sari-koyu ring-2 ring-sari-koyu",
  },
};

/** Beden adı → boy/kilo. Bedenler veritabanından geldiği için sunucudan
 *  geçiyor: bu bir istemci bileşeni, veritabanına bakamaz (K-56). */
export type BedenOlculeri = Record<string, { boy: string; kilo: string }>;

/** Bir beden ve renk için stok; olmayan birleşim undefined döner. */
function bul(varyantlar: Varyant[], beden: string, renk: RenkAdi): Varyant | undefined {
  return varyantlar.find((v) => v.beden === beden && v.renk === renk);
}

export default function VaryantSecici({
  bedenler,
  olculer,
  renkler,
  seciliRenk,
  varyantlar,
  slug,
  bildirimDurumu,
}: {
  bedenler: string[];
  olculer: BedenOlculeri;
  renkler: RenkSecenegi[];
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
  const seciliOlcu = olculer[beden];

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
            // Üstü çizili işareti **seçili renge** göre: eskiden bütün
            // renklere bakıyordu, yani "Mavi" seçiliyken kremde olan bir
            // beden açık görünüyor, basınca "tükendi" diyordu. Yanlış
            // bilgi veren bir işaret, hiç işaret olmamasından kötü (K-49).
            const bedendeStok = varyantlar.some(
              (v) => v.beden === b && v.renk === renk && v.stok > 0,
            );
            // Ton bedenin mağazadaki sırasından (ölçü tablosu o sırada):
            // "3-4 Yaş" her üründe aynı renkte. Üründeki sırasından alınsaydı
            // aynı beden üründen ürüne renk değiştirirdi (K-90).
            const sira = Object.keys(olculer).indexOf(b);
            const ton = BEDEN_TONU[tonSec(sira < 0 ? 0 : sira)];
            return (
              <button
                key={b}
                type="button"
                onClick={() => setBeden(b)}
                aria-pressed={beden === b}
                title={bedendeStok ? b : `${b} · ${renkYaz(renkler, renk)} renkte tükendi`}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  beden === b
                    ? `${ton.secili} ${bedendeStok ? "" : "line-through"}`
                    : bedendeStok
                      ? ton.normal
                      : "border-cizgi-soluk bg-yuzey-sicak text-metin-3 line-through"
                }`}
              >
                {b}
                {/* Renk ve çizgi tek başına yetmiyor; ekran okuyucu da
                    bilmeli. */}
                {!bedendeStok && <span className="sr-only"> — tükendi</span>}
              </button>
            );
          })}
        </div>
        {/* Seçili bedenin boy-kilo karşılığı: bebek bedenlerinde ay aralığı
            yalnızca bir işaret, asıl ölçü boy. İadelerin çoğu buradan. */}
        {seciliOlcu && (
          <p className="mt-2 text-xs text-metin-3">
            {beden} ≈ boy {seciliOlcu.boy} · kilo {seciliOlcu.kilo}
          </p>
        )}
      </div>

      <div>
        <p className="text-sm font-bold">Renk · {renkYaz(renkler, renk)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {renkler.map((r) => {
            const v = bul(varyantlar, beden, r.kod);
            const yok = !v || v.stok === 0;
            return (
              <Link
                key={r.kod}
                href={`/urun/${slug}?renk=${r.kod}#galeri`}
                aria-current={renk === r.kod ? "true" : undefined}
                aria-label={yok ? `${r.ad} — bu bedende tükendi` : r.ad}
                title={yok ? `${r.ad} · ${beden} bedeninde tükendi` : r.ad}
                // Yuvarlak bir renge üstü çizili yapılamıyor; karşılığı
                // çapraz çizgi. Yalnızca soluklaştırmak belirsizdi: "seçili
                // değil" mi "yok" mu anlaşılmıyordu (K-49).
                className={`tukenmis block h-9 w-9 rounded-full ring-2 transition ${
                  renk === r.kod ? "ring-mercan" : "ring-cizgi hover:ring-metin-3"
                } ${yok ? "tukenmis-acik opacity-50" : ""}`}
                style={{ background: r.palet.c1 }}
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
        <StokBildirimi variantId={secili.id} slug={slug} renk={renk} durum={bildirimDurumu} />
      )}
    </div>
  );
}
