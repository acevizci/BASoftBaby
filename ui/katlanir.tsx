import type { ReactNode } from "react";

/**
 * Katlanır bölüm.
 *
 * Panelde birkaç sayfa "önizleme + ayarlar + liste + yeni kayıt formu"
 * kalıbında ve baştan sona açık duruyordu; banner sayfası telefonda üç ekran
 * boyundaydı. Ayda bir dokunulan ayarların ve uzun "yeni kayıt" formlarının
 * sürekli açık durmasının bir sebebi yok (K-44).
 *
 * `<details>` ile: JavaScript kapalıyken çalışıyor, klavyeyle açılıp
 * kapanıyor, ekran okuyucu "genişlet/daralt" diye okuyor. Sitedeki öteki
 * açılır parçalarla aynı yol (K-40, K-43).
 *
 * Üç kural:
 *
 * 1. **Başlık açmadan karar verdirmeli.** `ozet` sağda duruyor: kaç kayıt
 *    var, ayar ne durumda. "Şerit ayarları ▾" tek başına açmayı denemekten
 *    başka seçenek bırakmıyor.
 * 2. **Kaydettikten sonra açık kalmalı.** İşlem `?ac=<kimlik>` ile dönüyor,
 *    sayfa o bölümü `acik` veriyor. Yoksa bir ayarı değiştirip kaydediyorsun
 *    ve bölüm kapanıyor; sonucu görmek için yeniden açman gerekiyor.
 * 3. **Hata kapalı bölümün içinde saklanmaz.** Doğrulama hatası olan bölüm
 *    kendini açıyor; yoksa "kaydedilemedi" yazısını görüp sebebini
 *    bulamıyorsun.
 *
 * Katlanan şey **liste değil form**: tarayıcının kendi sayfa içi araması
 * (Ctrl+F) kapalı `<details>` içindekini bulamıyor, o yüzden aranacak
 * içerik — listeler, tablolar — açık kalıyor.
 */
export default function Katlanir({
  id,
  baslik,
  ozet,
  acik = false,
  children,
}: {
  /** `?ac=<id>` ve `#<id>` ile bu bölüme bağlantı verilebiliyor. */
  id: string;
  baslik: string;
  /** Başlığın sağında, açmadan karar verdiren kısa bilgi. */
  ozet?: ReactNode;
  acik?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      open={acik}
      className="group rounded-marka border border-cizgi bg-yuzey open:shadow-sm"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-marka p-5 [&::-webkit-details-marker]:hidden">
        <span className="font-baslik text-lg font-bold">{baslik}</span>
        {ozet && <span className="text-xs text-metin-3">{ozet}</span>}
        <span
          aria-hidden="true"
          className="ml-auto text-metin-3 transition group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="border-t border-cizgi-soluk p-5">{children}</div>
    </details>
  );
}
