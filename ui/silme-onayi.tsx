import type { ReactNode } from "react";

/**
 * İki adımlı silme.
 *
 * Kampanya, banner ve duyuru tek tıkla siliniyordu — onay yok, geri alma yok,
 * üstelik işlem sessizdi. "Sil" düğmesi "Kapat"ın hemen yanındaydı; yanlışa
 * basmak bir piksellik mesele (K-57).
 *
 * `<details>` ile: JavaScript gerekmiyor, `confirm()` gibi tarayıcıya özel
 * bir kutu değil, klavyeyle açılıp kapanıyor ve sitenin geri kalanıyla aynı
 * dilde. Açılan kutuda **ne olacağı** yazıyor; "Emin misiniz?" tek başına
 * kimseye bir şey sormuyor.
 *
 * Kapatılabilir şeylerde ikinci bir çıkış yolu gösteriliyor: çoğu zaman
 * istenen şey silmek değil, yayından kaldırmak.
 */
export default function SilmeOnayi({
  children,
  uyari,
  etiket = "Sil",
}: {
  /** Gizli alanlar ve gönder düğmesini taşıyan form içeriği. */
  children: ReactNode;
  /** Silmenin sonucu: ne kaybolacak, geri alınabilir mi. */
  uyari: ReactNode;
  /**
   * Açılır başlığın metni.
   *
   * Zaten "Ürünü sil" diye bir bölümün içindeysek ikinci bir "Sil" kafa
   * karıştırıyor; orada "Silmeyi onayla" daha açık (K-61).
   */
  etiket?: string;
}) {
  return (
    <details className="group">
      {/* Silme denetimi ilk bakışta silme gibi durmalı. Nötr gri bir
          düğmeyken "Kapat"ın yanında fark edilmiyordu; kullanıcı denetim
          olmadığını düşündü (K-63). Mercan yazı beyaz üzerinde 5,85:1. */}
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-full border border-mercan bg-yuzey px-3 py-1.5 text-xs font-bold text-mercan-koyu transition hover:bg-mercan-soluk [&::-webkit-details-marker]:hidden">
        {etiket}
        <span aria-hidden="true" className="transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="mt-2 rounded-marka border border-mercan bg-mercan-soluk p-3">
        <p className="text-xs text-mercan-koyu">{uyari}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {children}
          {/* Renkli zeminde `metin-3` 2,66:1 veriyordu (K-62). */}
          <span className="text-xs text-metin-2">
            Vazgeçmek için bu kutuyu kapatman yeterli.
          </span>
        </div>
      </div>
    </details>
  );
}

/** Onay kutusundaki asıl silme düğmesi. */
export const SIL_DUGMESI =
  "rounded-full bg-dugme px-4 py-1.5 text-xs font-bold text-dugme-yazi transition hover:brightness-95";
