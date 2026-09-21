import { fiyatYaz } from "@/ui/katalog-bicim";
import type { SatirOzeti } from "@/server/rapor";

/**
 * Kırılım listesi: kategori, ürün, beden, ödeme yöntemi.
 *
 * Pasta grafik değil, sıralı çubuk. Pastada dilimlerin büyüklüğünü
 * karşılaştırmak açı karşılaştırmak demek ve insan bunu iyi yapamıyor;
 * yan yana uzunluk karşılaştırmak kolay. Üstelik sıralı liste hem
 * oranı hem sırayı aynı anda söylüyor.
 *
 * Tek renk: büyüklüğü çubuğun boyu taşıyor, renk bir şey kodlamıyor.
 */
export default function KirilimListesi({
  baslik,
  satirlar,
  bos = "Bu dönemde satış yok.",
}: {
  baslik: string;
  satirlar: SatirOzeti[];
  bos?: string;
}) {
  const toplam = satirlar.reduce((t, s) => t + s.kurus, 0);
  const enFazla = Math.max(1, ...satirlar.map((s) => s.kurus));

  return (
    <section className="rounded-marka border border-cizgi bg-yuzey p-5">
      <h2 className="text-lg">{baslik}</h2>

      {satirlar.length === 0 ? (
        <p className="mt-2 text-sm text-metin-2">{bos}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {satirlar.map((s) => {
            const oran = toplam > 0 ? Math.round((s.kurus / toplam) * 100) : 0;
            return (
              <li key={s.ad}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 font-semibold">{s.ad}</span>
                  <span className="rakam flex-none text-metin-2">
                    {fiyatYaz(s.kurus)}
                    <span className="text-metin-3"> · {s.adet} adet · %{oran}</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-cizgi-soluk">
                  <div
                    className="h-full rounded-full bg-grafik"
                    style={{ width: `${Math.max(2, (s.kurus / enFazla) * 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
