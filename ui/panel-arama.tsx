import Link from "next/link";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ROZET = "rounded-full border px-3 py-1.5 text-xs font-bold transition";

/**
 * Panel listelerinin arama kutusu.
 *
 * Düz GET formu: JavaScript kapalı tarayıcıda da çalışıyor, sonuç adresi
 * paylaşılabiliyor, geri tuşu işliyor (K-69). Stok ve sipariş ekranlarındaki
 * kutunun aynısı; artık ortak parça.
 *
 * **Arama sayfayı sıfırlıyor.** Sayfa numarası forma konmuyor: yeni bir arama
 * yeni bir liste demek, o listenin dördüncü sayfası değil.
 */
export default function PanelArama({
  yol,
  ara,
  yerTutucu,
  gizli,
  ipucu,
}: {
  yol: string;
  ara: string;
  yerTutucu: string;
  /** Arama yapılınca kaybolmaması gereken süzgeçler. */
  gizli?: Record<string, string | undefined>;
  /** Neye göre arandığını söyleyen kısa yazı. */
  ipucu?: string;
}) {
  const temiz = new URLSearchParams();
  for (const [ad, d] of Object.entries(gizli ?? {})) {
    if (d) temiz.set(ad, d);
  }
  const temizAdres = temiz.toString() ? `${yol}?${temiz}` : yol;

  return (
    <form
      method="get"
      action={yol}
      className="flex flex-wrap items-center gap-2 rounded-marka border border-cizgi bg-yuzey p-4"
    >
      {Object.entries(gizli ?? {}).map(([ad, d]) =>
        d ? <input key={ad} type="hidden" name={ad} value={d} /> : null,
      )}
      <input
        name="ara"
        defaultValue={ara}
        placeholder={yerTutucu}
        aria-label={yerTutucu}
        className={`${GIRDI} min-w-[200px] flex-1`}
      />
      <button
        type="submit"
        className="rounded-full bg-dugme px-5 py-2 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
      >
        Ara
      </button>
      {ara && (
        <Link href={temizAdres} className={`${ROZET} border-cizgi text-metin-2 hover:border-metin-3`}>
          Temizle
        </Link>
      )}
      {ipucu && <span className="w-full text-xs text-metin-3">{ipucu}</span>}
    </form>
  );
}
