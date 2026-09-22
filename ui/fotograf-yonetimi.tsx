import Link from "next/link";
import DosyaBirak from "@/ui/dosya-birak";
import { EN_GENIS, GOVDE_SINIRI, HEDEF_BAYT, boyutYaz as sinirYaz } from "@/ui/fotograf-sinirlari";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import {
  fotografAdiKaydet,
  fotografEkle,
  fotografSil,
  fotografTasi,
} from "@/server/yonetim";
import type { RenkSecenegi } from "@/ui/katalog-bicim";
import SilmeOnayi, { SIL_DUGMESI } from "@/ui/silme-onayi";

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
  /** Gösterdiği renk; boşsa her renkte görünüyor (K-48). */
  renk: string | null;
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
  renkler,
  digerRenkler = [],
  hata,
  eklenen,
  sonuc,
  sonraki,
  varsayilanRenk = "",
}: {
  slug: string;
  fotograflar: PanelFotografi[];
  /**
   * Ürünün kendi renkleri: varyantı olan renkler, listenin başında.
   *
   * Fotoğrafa **yalnızca** bunlar atanabiliyordu. Mantığı vardı — galeri
   * seçili renge göre süzülüyor ve seçili renk varyantlardan geliyor, yani
   * satılmayan bir renge atanan fotoğraf hiç görünmüyor — ama bir sıra
   * tuzağı kuruyordu: fotoğrafları varyantlardan önce yükleyen kişiye tek
   * bir seçenek çıkıyordu ve sebebi hiçbir yerde yazmıyordu (K-71).
   */
  renkler: RenkSecenegi[];
  /**
   * Mağazanın öteki açık renkleri: ayrı bir grupta, uyarısıyla.
   *
   * Varyantı henüz açılmamış bir renge fotoğraf atamak olağan bir sıra:
   * önce çekimi yükle, sonra stoğu gir. Engellemek yerine söylüyoruz.
   */
  digerRenkler?: RenkSecenegi[];
  hata?: string;
  eklenen?: number;
  /**
   * Yükleme dışındaki işlemin sonucu: silme ve sıra değiştirme.
   *
   * Fotoğraf silmek hiçbir şey söylemiyordu — küçük bir kare listeden
   * kayboluyordu, o kadar. Yanlış fotoğrafı sildiğini fark etmenin tek yolu
   * dikkatle bakmaktı (K-57).
   */
  sonuc?: "silindi" | "sira";
  /** Fotoğrafı olmayan bir sonraki ürün; fotoğraf çekimi yarım kalmasın. */
  sonraki?: { slug: string; ad: string; kalan: number };
  /**
   * Yükleme formunda seçili gelen renk (K-91): az önce stoğu eklenen renk,
   * yoksa henüz kendi fotoğrafı olmayan ilk renk.
   */
  varsayilanRenk?: string;
}) {
  return (
    <section id="fotograflar" className="rounded-marka border border-cizgi bg-yuzey p-5">
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
      {sonuc && !hata && (
        <p className="mt-3 rounded-marka bg-nane-soluk px-3 py-2 text-sm text-nane-koyu">
          {sonuc === "silindi"
            ? "Fotoğraf silindi. Depodan da kaldırıldı."
            : "Sıra değişti. İlk sıradaki fotoğraf kapak fotoğrafı."}
        </p>
      )}

      {eklenen !== undefined && !hata && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-marka bg-nane-soluk px-3 py-2 text-sm text-nane-koyu">
          <span>{eklenen > 0 ? `${eklenen} fotoğraf eklendi.` : "Kaydedildi."}</span>
          {/* Çekimden dönen kişi ürün ürün dolaşmak zorunda kalmasın:
              sıradaki fotoğrafsız ürün buradan bir tık ötede. */}
          {sonraki && (
            <Link
              href={`/yonetim/urunler/${sonraki.slug}#fotograflar`}
              className="font-bold underline"
            >
              Sıradaki fotoğrafsız ürün: {sonraki.ad} ({sonraki.kalan} kaldı) →
            </Link>
          )}
        </div>
      )}

      <form action={fotografEkle} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="slug" value={slug} />
        <DosyaBirak
          ad="fotograf"
          etiket="Fotoğraf seç"
          kabul="image/jpeg,image/png,image/webp,image/avif,image/gif"
          kucult
        />
        {/* Renk yüklerken seçiliyor; seçilen bütün fotoğraflar o renge
            atanıyor. `key`: sayfa yenilenmeden gelen yeni varsayılan da
            seçili görünsün (K-91). */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-metin-2">Renk</span>
          <select
            key={varsayilanRenk}
            name="renk"
            defaultValue={varsayilanRenk}
            className={GIRDI}
          >
            <option value="">Her renk</option>
            {renkler.map((r) => (
              <option key={r.kod} value={r.kod}>
                {r.ad}
              </option>
            ))}
            {digerRenkler.length > 0 && (
              <optgroup label="Bu üründe henüz yok">
                {digerRenkler.map((r) => (
                  <option key={r.kod} value={r.kod}>
                    {r.ad}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-bold text-metin-2">Açıklama (isteğe bağlı)</span>
          <input
            name="altMetin"
            placeholder="Krem rengi organik zıbın, önden görünüm"
            className={GIRDI}
          />
        </label>
        <GonderDugmesi
          bekleyen="Yükleniyor…"
          className="rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Yükle
        </GonderDugmesi>
      </form>
      <div className="mt-3 rounded-marka bg-zemin-2 px-3 py-2.5 text-xs leading-relaxed text-metin-3">
        <p className="font-bold text-metin-2">Hangi fotoğraf?</p>
        <ul className="mt-1 list-disc pl-4">
          <li>
            <strong className="text-metin-2">Kare</strong> çek ya da kırp: kartlar ve ürün
            sayfası kare, kare olmayanın kenarları kesiliyor.
          </li>
          <li>
            En az <span className="rakam">1400×1400</span> piksel; telefon fotoğrafı fazlasıyla
            yetiyor.
          </li>
          <li>JPEG, PNG, WEBP ya da AVIF. Açık, düz bir zemin en iyi sonucu veriyor.</li>
        </ul>
        <p className="mt-2">
          Seçtiğin fotoğraf göndermeden önce telefonda ya da bilgisayarda küçültülüyor:
          uzun kenarı en fazla <span className="rakam">{EN_GENIS}</span> piksel, boyutu
          çoğunlukla <span className="rakam">{sinirYaz(HEDEF_BAYT)}</span> altı.
          Sitede <span className="rakam">1400</span> piksel genişlikte webp olarak duruyor.
          Tek seferde toplam <span className="rakam">{sinirYaz(GOVDE_SINIRI)}</span>{" "}
          gönderilebiliyor, bu da on kadar fotoğraf demek. Açıklama boş bırakılırsa ürünün adı
          yazılıyor; her fotoğrafa kendi açıklamasını yazmak hem görme engelli müşteriler hem
          arama motoru için daha iyi, aşağıdaki listeden tek tek düzeltebilirsin.
        </p>
      </div>

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
                  {/* Renk atanınca bu fotoğraf yalnızca o renk seçiliyken
                      görünüyor. Kumaş yakın çekimi gibi renkten bağımsız
                      kareler "her renk" kalıyor (K-48). */}
                  <select
                    name="renk"
                    defaultValue={f.renk ?? ""}
                    aria-label="Fotoğrafın rengi"
                    className={GIRDI}
                  >
                    <option value="">Her renk</option>
                    {renkler.map((r) => (
                      <option key={r.kod} value={r.kod}>
                        {r.ad}
                      </option>
                    ))}
                    {digerRenkler.length > 0 && (
                      <optgroup label="Bu üründe henüz yok">
                        {digerRenkler.map((r) => (
                          <option key={r.kod} value={r.kod}>
                            {r.ad}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <button type="submit" className={DUGME}>
                    Kaydet
                  </button>
                </form>
                <p className="rakam mt-1.5 text-xs text-metin-3">
                  {i === 0 ? "Kapak · " : `${i + 1}. sıra · `}
                  {f.genislik > 0 && `${f.genislik}×${f.yukseklik} · `}
                  {boyutYaz(f.boyutBayt)}
                </p>
                {/* Galeri seçili renge göre süzülüyor ve seçili renk
                    varyantlardan geliyor: varyantı olmayan bir renge atanan
                    fotoğraf müşteriye hiç görünmeyebilir. Engellemek yerine
                    söylüyoruz — stok birazdan girilecek olabilir (K-71). */}
                {f.renk && digerRenkler.some((r) => r.kod === f.renk) && (
                  <p className="mt-1.5 text-xs font-semibold text-sari-koyu">
                    Bu üründe {digerRenkler.find((r) => r.kod === f.renk)?.ad} varyantı yok
                    — o renk stoğa girilene kadar bu fotoğraf galeride görünmeyebilir.
                  </p>
                )}
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
                {/* Fotoğraf silme geri alınamıyor: dosya depodan da
                    kalkıyor. Tek tıkla olmamalı (K-61). */}
                <SilmeOnayi
                  uyari={
                    <>
                      Bu fotoğraf kalıcı olarak siliniyor ve depodan da kaldırılıyor;
                      geri alınamıyor. Yeniden yüklemen gerekir.
                    </>
                  }
                >
                  <form action={fotografSil}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <button type="submit" className={SIL_DUGMESI}>
                      Evet, sil
                    </button>
                  </form>
                </SilmeOnayi>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
