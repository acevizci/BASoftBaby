import { HATA_KUTUSU, IYI_KUTU } from "@/app/yonetim/panel-bicim";

/**
 * Panel bildirimi: "ne oldu" kutusu.
 *
 * Panelde birçok işlem sessizce bitiyordu — kampanya siliniyor, banner
 * kapatılıyor, duyuru kalkıyor ve ekranda hiçbir şey yazmıyordu. Yıkıcı bir
 * işlemin sessiz bitmesi en kötüsü: yanlış satıra bastığını ancak listeye
 * dikkatle bakarsan anlıyorsun (K-57).
 *
 * **Metin koddan geliyor, adres satırından değil.** Adres yalnızca bir kod
 * taşıyor (`?kayit=silindi`); cümle buradaki haritadan seçiliyor. Yoksa biri
 * `?kayit=<istediği yazı>` bağlantısı hazırlayıp panelde istediğini
 * gösterebilirdi — aynı gerekçe giriş ekranında da yazılı (K-45).
 */
export default function PanelBildirim({
  kayit,
  hata,
  bildirimler,
  hatalar,
}: {
  /** `searchParams`tan gelen ham değer; dizi ya da tanımsız olabiliyor. */
  kayit?: string | string[];
  hata?: string | string[];
  bildirimler?: Record<string, string>;
  hatalar?: Record<string, string>;
}) {
  const iyi = typeof kayit === "string" ? bildirimler?.[kayit] : undefined;
  const kotu = typeof hata === "string" ? hatalar?.[hata] : undefined;

  if (!iyi && !kotu) return null;

  return (
    <>
      {kotu && <p className={HATA_KUTUSU}>{kotu}</p>}
      {iyi && <p className={IYI_KUTU}>{iyi}</p>}
    </>
  );
}

/** Her panel ekranında tekrar eden ortak hata metinleri. */
export const ORTAK_HATALAR: Record<string, string> = {
  bulunamadi: "Kayıt bulunamadı — başka biri silmiş olabilir. Liste yenilendi.",
};
