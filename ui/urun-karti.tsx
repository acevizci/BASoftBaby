"use client";

import { useState } from "react";
import Link from "next/link";
import UrunFoto from "@/ui/urun-foto";
import SepeteEkle from "@/ui/sepete-ekle";
import { FavoriDugmesi } from "@/ui/favori";
import {
  fiyatYaz,
  paletCoz,
  renginFotograflari,
  toplamStok,
  type Urun,
} from "@/ui/katalog-bicim";

const ROZET_SINIFI: Record<string, string> = {
  mint: "bg-nane-soluk text-nane-koyu",
  mercan: "bg-mercan-soluk text-mercan-koyu",
  sari: "bg-sari-soluk text-sari-koyu",
  mavi: "bg-mavi-soluk text-mavi-koyu",
};

function Puan({ puan, yorum }: { puan: number; yorum: number }) {
  const dolu = Math.round(puan);
  return (
    <p className="flex items-center gap-1.5 text-xs text-metin-3">
      <span className="text-sari-koyu" aria-hidden="true">
        {"★".repeat(dolu)}
        <span className="text-cizgi">{"★".repeat(5 - dolu)}</span>
      </span>
      <span className="rakam font-semibold text-metin-2">
        {puan.toLocaleString("tr-TR", { minimumFractionDigits: 1 })}
      </span>
      <span className="rakam">({yorum})</span>
    </p>
  );
}

/**
 * Ürün kartı.
 *
 * **Renk noktaları fotoğrafı değiştiriyor.** Çok renkli bir üründe müşteri
 * hangi rengin nasıl göründüğünü görmek için ürüne girmek zorundaydı.
 * Masaüstünde noktanın üzerine gelmek fotoğrafı o renge çeviriyor, fare
 * çekilince seçili renge dönüyor. Telefonda "üzerine gelmek" yok: dokunmak
 * rengi seçiyor ve seçim kalıyor (K-88).
 *
 * **Seçilen renk kartın geri kalanına da geçiyor.** "Sepete ekle" o rengin
 * stoktaki ilk bedenini ekliyor, ürün bağlantısı sayfayı o renkte açıyor.
 * Mavi fotoğrafa bakıp sepete eklenince pembe gelmesi, hiç değişmemesinden
 * kötü olurdu.
 *
 * Fotoğrafın hangi renge ait olduğu panelde fotoğraf yüklenirken seçiliyor
 * (K-48). Rengine ait fotoğrafı olmayan renkte genel fotoğraf kalıyor;
 * hiç fotoğraf yoksa çizim o rengin paletine boyanıyor.
 */
export default function UrunKarti({ urun }: { urun: Urun }) {
  const stok = toplamStok(urun);
  const [secili, setSecili] = useState<string | undefined>(undefined);
  const [bakilan, setBakilan] = useState<string | undefined>(undefined);
  const gosterilen = bakilan ?? secili;

  const fotograf = renginFotograflari(urun.fotograflar, gosterilen)[0];
  const palet = gosterilen ? paletCoz(urun.renkler, gosterilen) : urun.paletRenkleri;

  const ilkVaryant =
    (secili && urun.varyantlar.find((v) => v.renk === secili && v.stok > 0)) ||
    urun.varyantlar.find((v) => v.stok > 0) ||
    urun.varyantlar[0];
  // Seçili renk tükenmişse düğme kapanıyor: başka renk eklemek yanlış olurdu.
  const seciliRenkteStokVar =
    !secili || urun.varyantlar.some((v) => v.renk === secili && v.stok > 0);
  // Renk fotoğrafları önceden ısıtılıyor: fare noktalara yaklaşınca (ya da
  // parmak değince) her rengin küçük fotoğrafı istenmiş oluyor. Yoksa
  // değiştiği an bir süre boş kare görünüyordu. Kart başına bir kez.
  const [isitildi, setIsitildi] = useState(false);
  const isit = () => {
    if (isitildi) return;
    setIsitildi(true);
    for (const r of urun.renkler) {
      const f = urun.fotograflar.find((x) => x.renk === r.kod);
      if (f) new Image().src = f.kucukYol || f.yol;
    }
  };

  const adres = secili
    ? `/urun/${urun.slug}?renk=${encodeURIComponent(secili)}`
    : `/urun/${urun.slug}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-marka border border-cizgi bg-yuzey shadow-sm">
      <Link href={adres} className="relative block">
        <UrunFoto
          fotograf={fotograf}
          gorsel={urun.gorsel}
          palet={palet}
          className={`aspect-square w-full rounded-none ${stok === 0 ? "opacity-65" : ""}`}
          sizes="(min-width: 1024px) 300px, 50vw"
        />
        {urun.rozet && (
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide ${ROZET_SINIFI[urun.rozet.ton]}`}
          >
            {urun.rozet.yazi}
          </span>
        )}
        {/* Tükendiği yalnızca en alttaki düğmeye bakınca anlaşılıyordu;
            ızgarada göz önce fotoğrafa gidiyor. Fotoğraf da soluklaşıyor —
            rozet tek başına küçük ekranda gözden kaçıyor (K-49). */}
        {/* Kalp fotoğrafın sağ alt köşesinde: üst köşeler rozet ve
            "Tükendi" etiketinin (K-94). */}
        <span className="absolute bottom-3 right-3">
          <FavoriDugmesi urunId={urun.id} urunAd={urun.ad} yuzen />
        </span>
        {stok === 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-metin/85 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-white">
            Tükendi
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={adres} className="font-baslik text-base font-bold leading-snug hover:text-mercan-koyu">
          {urun.ad}
        </Link>
        <p className="text-xs text-metin-3">{urun.ozet}</p>

        {urun.yorumSayisi > 0 && <Puan puan={urun.puan} yorum={urun.yorumSayisi} />}

        {/* Nokta küçük, dokunma alanı değil: düğmenin dolgusu parmağa yer
            açıyor. Tek renkli üründe seçilecek bir şey yok, düğme değil. */}
        <ul
          className="-mx-1 flex flex-wrap"
          aria-label="Renk seçenekleri"
          onMouseEnter={isit}
          onTouchStart={isit}
          onFocus={isit}
          onMouseLeave={() => setBakilan(undefined)}
        >
          {urun.renkler.map((r) => {
            const nokta = (
              <span
                className={`block h-3.5 w-3.5 rounded-full ring-1 transition ${
                  secili === r.kod
                    ? "ring-2 ring-metin ring-offset-1 ring-offset-yuzey"
                    : "ring-black/10"
                }`}
                style={{ background: r.palet.c1 }}
              />
            );
            return (
              <li key={r.kod}>
                {urun.renkler.length > 1 ? (
                  <button
                    type="button"
                    title={r.ad}
                    aria-label={`${r.ad} rengini göster`}
                    aria-pressed={secili === r.kod}
                    onMouseEnter={() => setBakilan(r.kod)}
                    onFocus={() => setBakilan(r.kod)}
                    onBlur={() => setBakilan(undefined)}
                    onClick={() => setSecili((s) => (s === r.kod ? undefined : r.kod))}
                    className="rounded-full p-1"
                  >
                    {nokta}
                  </button>
                ) : (
                  <span title={r.ad} className="block p-1">
                    {nokta}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <p className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="rakam font-baslik text-lg font-bold text-mercan-koyu">
            {fiyatYaz(urun.kampanya ? urun.kampanya.indirimliFiyatKurus : urun.fiyatKurus)}
          </span>
          {(urun.kampanya || urun.eskiFiyatKurus) && (
            <span className="rakam text-sm text-metin-3 line-through">
              {fiyatYaz(urun.kampanya ? urun.fiyatKurus : urun.eskiFiyatKurus!)}
            </span>
          )}
        </p>
        {urun.kampanya && (
          <p className="text-xs font-bold text-nane-koyu">{urun.kampanya.ad}</p>
        )}

        <SepeteEkle
          tamGenislik
          kucuk
          devreDisi={stok === 0 || !seciliRenkteStokVar}
          variantId={ilkVaryant?.id}
        />
      </div>
    </article>
  );
}
