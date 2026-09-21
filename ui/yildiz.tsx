/**
 * Yıldızlar.
 *
 * Gösterim için `Yildiz`, seçim için `YildizSecici`. Seçici radyo
 * düğmelerinden kuruluyor: JavaScript kapalı tarayıcıda da çalışıyor, klavyeyle
 * gezilebiliyor ve ekran okuyucu "5 üzerinden 4" diye okuyor. Yıldızlar
 * `aria-hidden`; anlamı taşıyan şey radyo düğmesinin kendisi.
 */

export function Yildiz({ puan, className = "" }: { puan: number; className?: string }) {
  const dolu = Math.round(puan);
  return (
    <span className={`text-sari-koyu ${className}`} aria-hidden="true">
      {"★".repeat(dolu)}
      <span className="text-cizgi">{"★".repeat(Math.max(0, 5 - dolu))}</span>
    </span>
  );
}

const PUAN_ADLARI = ["Hiç memnun kalmadım", "Memnun kalmadım", "İdare eder", "Memnunum", "Çok memnunum"];

export function YildizSecici({ ad, gerekli = true }: { ad: string; gerekli?: boolean }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-bold text-metin-2">Puanın</legend>
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 4, 5].map((p) => (
          <label key={p} className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name={ad}
              value={p}
              required={gerekli}
              className="h-4 w-4 accent-[var(--mercan)]"
            />
            <span className="flex items-center gap-1">
              <Yildiz puan={p} className="text-xs" />
              <span className="sr-only">
                5 üzerinden {p} — {PUAN_ADLARI[p - 1]}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
