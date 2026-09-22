import UrunFoto from "@/ui/urun-foto";
import UrunGorseli from "@/ui/urun-gorseli";
import type { Fotograf, GorselTipi, Palet, RenkSecenegi } from "@/ui/katalog-bicim";

/**
 * Ürün sayfasının fotoğraf galerisi.
 *
 * İki eksik vardı: küçük görsellere basılamıyordu (büyük fotoğraf hep ilk
 * kare kalıyordu) ve fotoğrafa tıklayınca büyümüyordu. Kıyafet alırken
 * kumaşın dokusuna yakından bakmak satın alma kararının kendisi (K-48).
 *
 * **JavaScript yok.** İkisi de `:target` ile çalışıyor: küçük görsel bir
 * `#kare-...` bağlantısı, büyüteç `#buyuk-...`. Tarayıcının kendi işi, yani
 * geri tuşu da çalışıyor ve bağlantı paylaşılabiliyor. Durum CSS'te
 * `:has()` ile kuruluyor: hiçbir kare hedef değilse ilk kare görünüyor.
 *
 * Bütün kareler HTML'e basılıyor ama yalnızca biri görünür; `loading="lazy"`
 * sayesinde görünmeyenler indirilmiyor.
 */
export default function UrunGalerisi({
  fotograflar,
  gorsel,
  palet,
  renkler,
  ad,
}: {
  fotograflar: Fotograf[];
  gorsel: GorselTipi;
  palet: Palet;
  /** Fotoğraf yokken küçük görsellerde gösterilecek renk seçenekleri. */
  renkler: RenkSecenegi[];
  ad: string;
}) {
  // Hiç fotoğraf yoksa eski davranış: büyük çizim + renk seçenekleri.
  if (fotograflar.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <UrunGorseli tip={gorsel} palet={palet} className="aspect-square w-full rounded-marka" />
        <div className="grid grid-cols-4 gap-3">
          {renkler.slice(0, 4).map((r) => (
            <UrunGorseli
              key={r.kod}
              tip={gorsel}
              palet={r.palet}
              className="aspect-square rounded-marka"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div id="galeri" className="galeri relative">
        {fotograflar.map((f, i) => (
          <a
            key={f.id}
            id={`buyut-${f.id}`}
            href={`#buyuk-${f.id}`}
            aria-label={`${f.altMetin || ad} — büyüt`}
            className={`kare block cursor-zoom-in ${i === 0 ? "ilk" : ""}`}
          >
            <UrunFoto
              fotograf={f}
              gorsel={gorsel}
              palet={palet}
              className="aspect-square w-full rounded-marka"
              sizes="(min-width: 1024px) 560px, 100vw"
              oncelikli={i === 0}
            />
          </a>
        ))}
      </div>

      {fotograflar.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {fotograflar.map((f, i) => (
            <a
              key={f.id}
              href={`#buyut-${f.id}`}
              aria-label={`${i + 1}. fotoğrafı göster`}
              className="kucuk block rounded-marka ring-offset-2 transition hover:ring-2 hover:ring-mercan"
            >
              <UrunFoto
                fotograf={f}
                gorsel={gorsel}
                palet={palet}
                className="aspect-square w-full rounded-marka"
                sizes="140px"
              />
            </a>
          ))}
        </div>
      )}

      {/* Büyüteç katmanı. Kapalıyken ekranda hiç yer kaplamıyor; açıkken
          sayfanın üstünü örtüyor. Kapatma bağlantısı geldiği kareye dönüyor,
          böylece kapanınca aynı fotoğraf seçili kalıyor.

          **Resmin kendisi de kapatma bağlantısının içinde.** Yalnızca
          kenardaki boşluk kapatsaydı, telefonda ekranı kaplayan bir karede
          basacak yer kalmazdı. */}
      {fotograflar.map((f) => (
        <div key={f.id} id={`buyuk-${f.id}`} className="buyutec">
          <a
            href={`#buyut-${f.id}`}
            aria-label="Büyütmeyi kapat"
            className="buyutec-zemin"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- dosyalar
                yüklenirken zaten küçültülüp webp'ye çevriliyor; Next'in
                iyileştiricisinin aylık sınırı var (bkz. ui/urun-foto.tsx). */}
            <img
              src={f.yol}
              alt={f.altMetin || ad}
              width={f.genislik || undefined}
              height={f.yukseklik || undefined}
              loading="lazy"
              decoding="async"
              className="buyutec-resim"
            />
            <span aria-hidden="true" className="buyutec-kapat">
              ×
            </span>
          </a>
        </div>
      ))}
    </div>
  );
}
