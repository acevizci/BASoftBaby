import Link from "next/link";
import UrunFoto from "@/ui/urun-foto";
import SepeteEkle from "@/ui/sepete-ekle";
import { fiyatYaz, toplamStok, type Urun } from "@/ui/katalog-bicim";

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

export default function UrunKarti({ urun }: { urun: Urun }) {
  const stok = toplamStok(urun);
  const ilkVaryant = urun.varyantlar.find((v) => v.stok > 0) ?? urun.varyantlar[0];

  return (
    <article className="flex flex-col overflow-hidden rounded-marka border border-cizgi bg-yuzey shadow-sm">
      <Link href={`/urun/${urun.slug}`} className="relative block">
        <UrunFoto
          fotograf={urun.fotograflar[0]}
          gorsel={urun.gorsel}
          palet={urun.paletRenkleri}
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
        {stok === 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-metin/85 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-white">
            Tükendi
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/urun/${urun.slug}`} className="font-baslik text-base font-bold leading-snug hover:text-mercan-koyu">
          {urun.ad}
        </Link>
        <p className="text-xs text-metin-3">{urun.ozet}</p>

        {urun.yorumSayisi > 0 && <Puan puan={urun.puan} yorum={urun.yorumSayisi} />}

        <ul className="flex gap-1.5" aria-label="Renk seçenekleri">
          {urun.renkler.map((r) => (
            <li
              key={r.kod}
              title={r.ad}
              className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
              style={{ background: r.palet.c1 }}
            />
          ))}
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

        <SepeteEkle tamGenislik kucuk devreDisi={stok === 0} variantId={ilkVaryant?.id} />
      </div>
    </article>
  );
}
