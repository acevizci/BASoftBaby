import {
  fotografAdiKaydet,
  fotografEkle,
  fotografSil,
  fotografTasi,
} from "@/server/yonetim";

/**
 * Ürün fotoğraflarının panel bölümü.
 *
 * Sürükle bırak yok, yukarı/aşağı düğmeleri var: bütün panel gibi burası da
 * JavaScript kapalı tarayıcıda çalışıyor. İlk sıradaki fotoğraf kapak
 * fotoğrafı, kartlarda ve sepette o görünüyor.
 */

export type PanelFotografi = {
  id: string;
  yol: string;
  kucukYol: string;
  altMetin: string;
  genislik: number;
  yukseklik: number;
  boyutBayt: number;
};

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const DUGME =
  "rounded-full border border-cizgi bg-yuzey px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin disabled:opacity-40";

function boyutYaz(bayt: number): string {
  if (bayt <= 0) return "";
  if (bayt < 1024 * 1024) return `${Math.round(bayt / 1024)} KB`;
  return `${(bayt / 1024 / 1024).toFixed(1)} MB`;
}

export default function FotografYonetimi({
  slug,
  fotograflar,
  hata,
  eklenen,
}: {
  slug: string;
  fotograflar: PanelFotografi[];
  hata?: string;
  eklenen?: number;
}) {
  return (
    <section className="rounded-marka border border-cizgi bg-yuzey p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-baslik text-lg font-bold">Fotoğraflar</h2>
        <p className="text-xs text-metin-3">
          {fotograflar.length === 0
            ? "Fotoğraf yokken ürünün çizimi gösteriliyor."
            : "İlk sıradaki fotoğraf kapak fotoğrafı."}
        </p>
      </div>

      {hata && (
        <p className="mt-3 rounded-marka bg-mercan-soluk px-3 py-2 text-sm text-mercan-koyu">
          {hata === "bos" ? "Önce bir dosya seç." : hata}
        </p>
      )}
      {eklenen !== undefined && !hata && (
        <p className="mt-3 rounded-marka bg-nane-soluk px-3 py-2 text-sm text-nane-koyu">
          {eklenen > 0 ? `${eklenen} fotoğraf eklendi.` : "Kaydedildi."}
        </p>
      )}

      <form action={fotografEkle} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="slug" value={slug} />
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-bold text-metin-2">Fotoğraf seç</span>
          <input
            type="file"
            name="fotograf"
            multiple
            required
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-mavi-soluk file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-mavi-koyu"
          />
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-bold text-metin-2">Açıklama (isteğe bağlı)</span>
          <input
            name="altMetin"
            placeholder="Krem rengi organik zıbın, önden görünüm"
            className={GIRDI}
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-mercan px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
        >
          Yükle
        </button>
      </form>
      <p className="mt-2 text-xs text-metin-3">
        Birden fazla dosya seçebilirsin. Fotoğraflar yüklenirken otomatik küçültülüp webp&apos;ye
        çevriliyor, telefonla çekilmiş büyük dosyalar sorun değil. En fazla 12 MB.
      </p>

      {fotograflar.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {fotograflar.map((f, i) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-3 rounded-marka border border-cizgi-soluk p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.kucukYol || f.yol}
                alt={f.altMetin}
                width={72}
                height={72}
                className="h-18 w-18 flex-none rounded-[10px] bg-yuzey-sicak object-cover"
                style={{ width: 72, height: 72 }}
              />

              <div className="min-w-[180px] flex-1">
                <form action={fotografAdiKaydet} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <input
                    name="altMetin"
                    defaultValue={f.altMetin}
                    aria-label="Fotoğraf açıklaması"
                    className={`${GIRDI} min-w-[160px] flex-1`}
                  />
                  <button type="submit" className={DUGME}>
                    Kaydet
                  </button>
                </form>
                <p className="rakam mt-1.5 text-xs text-metin-3">
                  {i === 0 ? "Kapak · " : `${i + 1}. sıra · `}
                  {f.genislik > 0 && `${f.genislik}×${f.yukseklik} · `}
                  {boyutYaz(f.boyutBayt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <form action={fotografTasi}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="yon" value="yukari" />
                  <button type="submit" className={DUGME} disabled={i === 0} aria-label="Yukarı taşı">
                    ↑
                  </button>
                </form>
                <form action={fotografTasi}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="yon" value="asagi" />
                  <button
                    type="submit"
                    className={DUGME}
                    disabled={i === fotograflar.length - 1}
                    aria-label="Aşağı taşı"
                  >
                    ↓
                  </button>
                </form>
                <form action={fotografSil}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button
                    type="submit"
                    className="rounded-full border border-mercan px-3 py-1.5 text-xs font-bold text-mercan-koyu transition hover:bg-mercan-soluk"
                  >
                    Sil
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
