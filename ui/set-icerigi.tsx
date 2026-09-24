import Link from "next/link";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { ayriAyriKurus } from "@/server/set-bicim";
import type { SetKalemi } from "@/server/set";

/**
 * Ürün sayfasında setin içindekiler (K-133): seçili rengin ilk bedeninin
 * içeriği, parçaların sayfalarına bağlantı ve "ayrı ayrı alsan" fiyatı.
 * Set fiyatı ayrı ayrı toplamdan düşük değilse tasarruf satırı yazılmıyor.
 */
export default function SetIcerigi({
  kalemler,
  setFiyatKurus,
  renkAdi,
}: {
  kalemler: SetKalemi[];
  setFiyatKurus: number;
  renkAdi: (kod: string) => string;
}) {
  if (kalemler.length === 0) return null;
  const ayri = ayriAyriKurus(kalemler);
  const tasarruf = ayri - setFiyatKurus;
  return (
    <div className="rounded-marka border border-nane bg-nane-soluk/60 p-4 text-sm">
      <p className="font-bold">Sette neler var</p>
      <ul className="mt-2 flex flex-col gap-1 text-metin-2">
        {kalemler.map((k, i) => (
          <li key={i}>
            <span className="rakam font-bold text-metin">{k.adet}×</span>{" "}
            {k.aktif ? (
              <Link href={`/urun/${k.slug}?renk=${encodeURIComponent(k.renk)}`} className="hover:underline">
                {k.ad}
              </Link>
            ) : (
              k.ad
            )}{" "}
            <span className="text-metin-3">· {renkAdi(k.renk)}</span>
          </li>
        ))}
      </ul>
      {tasarruf > 0 && (
        <p className="mt-2 font-semibold text-nane-koyu">
          Ayrı ayrı alsan <span className="rakam line-through">{fiyatYaz(ayri)}</span> — sette{" "}
          <span className="rakam">{fiyatYaz(tasarruf)}</span> daha az ödüyorsun.
        </p>
      )}
    </div>
  );
}
