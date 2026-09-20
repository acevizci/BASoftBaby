import UrunGorseli from "@/ui/urun-gorseli";
import type { Fotograf, GorselTipi, RenkAdi } from "@/ui/katalog-bicim";

/**
 * Ürün görseli: fotoğraf varsa fotoğraf, yoksa çizim.
 *
 * Fotoğraflar iki boyutta saklanıyor; hangisinin indirileceğine tarayıcı
 * `sizes` bilgisine bakarak karar veriyor. Next'in görsel iyileştiricisi
 * kullanılmıyor, çünkü dosyalar zaten yüklenirken küçültülüp webp'ye
 * çevriliyor ve iyileştiricinin aylık sınırı var.
 */
export default function UrunFoto({
  fotograf,
  gorsel,
  palet,
  className = "",
  sizes = "(min-width: 1024px) 300px, 50vw",
  oncelikli = false,
}: {
  fotograf?: Fotograf;
  gorsel: GorselTipi;
  palet: RenkAdi;
  className?: string;
  sizes?: string;
  oncelikli?: boolean;
}) {
  if (!fotograf) {
    return <UrunGorseli tip={gorsel} palet={palet} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fotograf.yol}
      srcSet={`${fotograf.kucukYol} 600w, ${fotograf.yol} 1400w`}
      sizes={sizes}
      alt={fotograf.altMetin}
      width={fotograf.genislik || undefined}
      height={fotograf.yukseklik || undefined}
      loading={oncelikli ? "eager" : "lazy"}
      fetchPriority={oncelikli ? "high" : undefined}
      decoding="async"
      className={`bg-yuzey-sicak object-cover ${className}`}
    />
  );
}
