import Link from "next/link";
import BedenTablosu from "@/ui/beden-tablosu";
import UrunGorseli from "@/ui/urun-gorseli";
import { urunKaydet, varyantEkle, varyantSil } from "@/server/yonetim";
import {
  BEDENLER,
  GORSEL_TIPLERI,
  RENK_ADLARI,
  fiyatYaz,
  type GorselTipi,
  type RenkAdi,
} from "@/ui/katalog-bicim";

type Varyant = { id: string; beden: string; renk: string; stok: number };

export type FormUrunu = {
  slug: string;
  ad: string;
  ozet: string;
  kategoriSlug: string;
  fiyatKurus: number;
  eskiFiyatKurus: number | null;
  kumasIcerigi: string;
  yikamaTalimati: string;
  ozellikler: string[];
  rozetTon: string | null;
  rozetYazi: string | null;
  gorsel: string;
  palet: string;
  aktif: boolean;
  variants: Varyant[];
};

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

/** Kuruşu form kutusunda düzenlenebilir hale getirir: 24990 → "249,90" */
function kurusYaz(kurus: number | null): string {
  if (kurus === null) return "";
  return (kurus / 100).toFixed(2).replace(".", ",");
}

export default function UrunFormu({
  urun,
  kategoriler,
  kaydedildi,
}: {
  urun?: FormUrunu;
  kategoriler: { slug: string; ad: string }[];
  kaydedildi?: boolean;
}) {
  const yeni = !urun;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl">{yeni ? "Yeni ürün" : urun.ad}</h1>
          {!yeni && (
            <Link
              href={`/urun/${urun.slug}`}
              className="text-sm font-semibold text-mavi-koyu hover:underline"
            >
              Mağazadaki sayfasını gör
            </Link>
          )}
        </div>
        <Link href="/yonetim/urunler" className="text-sm font-bold text-metin-2 hover:underline">
          Listeye dön
        </Link>
      </div>

      {kaydedildi && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Kaydedildi. Mağazada göründü.
        </p>
      )}

      <form action={urunKaydet} className="flex flex-col gap-5">
        {!yeni && <input type="hidden" name="eskiSlug" value={urun.slug} />}

        <div className="rounded-marka border border-cizgi bg-yuzey p-5">
          <h2 className="text-lg">Temel bilgiler</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ETIKET}>Ürün adı</span>
              <input name="ad" required defaultValue={urun?.ad} className={GIRDI} />
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ETIKET}>Kısa açıklama</span>
              <input
                name="ozet"
                defaultValue={urun?.ozet}
                placeholder="Kısa kollu, çıtçıtlı"
                className={GIRDI}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Kategori</span>
              <select name="kategori" defaultValue={urun?.kategoriSlug} className={GIRDI}>
                {kategoriler.map((k) => (
                  <option key={k.slug} value={k.slug}>
                    {k.ad}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Fiyat (₺)</span>
              <input
                name="fiyat"
                required
                inputMode="decimal"
                defaultValue={kurusYaz(urun?.fiyatKurus ?? null)}
                placeholder="249,90"
                className={`${GIRDI} rakam`}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Üstü çizili eski fiyat (₺)</span>
              <input
                name="eskiFiyat"
                inputMode="decimal"
                defaultValue={kurusYaz(urun?.eskiFiyatKurus ?? null)}
                placeholder="boş bırakılabilir"
                className={`${GIRDI} rakam`}
              />
            </label>

            <label className="flex items-center gap-2 self-end pb-2">
              <input
                type="checkbox"
                name="aktif"
                defaultChecked={urun?.aktif ?? true}
                className="h-4 w-4 accent-[var(--mercan)]"
              />
              <span className="text-sm font-semibold">Mağazada yayında</span>
            </label>
          </div>
        </div>

        <div className="rounded-marka border border-cizgi bg-yuzey p-5">
          <h2 className="text-lg">Ürün sayfası bilgileri</h2>
          <p className="mt-1 text-xs text-metin-3">
            Kumaş içeriği ve yıkama talimatı bebek tekstilinde yasal zorunluluk.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Kumaş içeriği</span>
              <input
                name="kumasIcerigi"
                defaultValue={urun?.kumasIcerigi}
                placeholder="%100 organik pamuk"
                className={GIRDI}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Yıkama talimatı</span>
              <input
                name="yikamaTalimati"
                defaultValue={urun?.yikamaTalimati}
                placeholder="30°C hassas yıkama"
                className={GIRDI}
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ETIKET}>Özellikler — her satıra bir madde</span>
              <textarea
                name="ozellikler"
                rows={4}
                defaultValue={urun?.ozellikler.join("\n")}
                placeholder={"Dikişsiz omuz bandı\nÇıtçıtlı alt kapama"}
                className={GIRDI}
              />
            </label>
          </div>
        </div>

        <div className="rounded-marka border border-cizgi bg-yuzey p-5">
          <h2 className="text-lg">Görünüm</h2>
          <p className="mt-1 text-xs text-metin-3">
            Gerçek fotoğraflar yüklenene kadar ürün, seçtiğin çizim ve renkle görünüyor.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_140px]">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Çizim</span>
              <select name="gorsel" defaultValue={urun?.gorsel ?? "zibin"} className={GIRDI}>
                {GORSEL_TIPLERI.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Renk</span>
              <select name="palet" defaultValue={urun?.palet ?? "mint"} className={GIRDI}>
                {(Object.keys(RENK_ADLARI) as RenkAdi[]).map((r) => (
                  <option key={r} value={r}>
                    {RENK_ADLARI[r]}
                  </option>
                ))}
              </select>
            </label>
            <UrunGorseli
              tip={(urun?.gorsel ?? "zibin") as GorselTipi}
              palet={(urun?.palet ?? "mint") as RenkAdi}
              className="aspect-square"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Rozet yazısı</span>
              <input
                name="rozetYazi"
                defaultValue={urun?.rozetYazi ?? ""}
                placeholder="Çok satan, %20, Son 3 adet"
                className={GIRDI}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Rozet rengi</span>
              <select name="rozetTon" defaultValue={urun?.rozetTon ?? "mercan"} className={GIRDI}>
                <option value="mercan">Mercan — indirim, çok satan</option>
                <option value="mint">Nane — yeni, stokta</option>
                <option value="sari">Sarı — son adetler</option>
                <option value="mavi">Mavi — bilgi</option>
              </select>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="self-start rounded-full bg-mercan px-6 py-3 font-bold text-white transition hover:brightness-95"
        >
          {yeni ? "Ürünü oluştur" : "Değişiklikleri kaydet"}
        </button>
      </form>

      {!yeni && (
        <div className="rounded-marka border border-cizgi bg-yuzey p-5">
          <h2 className="text-lg">Bedenler ve stok</h2>
          <p className="mt-1 text-xs text-metin-3">
            Her beden-renk birleşimi ayrı stok tutar. Stoğu sıfır olan beden mağazada seçilemez.
          </p>

          {/* Beden hangi boya denk geliyor: müşteri telefonda soruyor,
              cevap için mağazanın rehber sayfasını ayrı sekmede açmak
              gerekiyordu. Katlı duruyor — her gün değil, sorulunca
              bakılıyor (K-55). */}
          <details className="group mt-3">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs font-bold text-metin-2 hover:text-metin [&::-webkit-details-marker]:hidden">
              Beden - boy - kilo tablosu
              <span aria-hidden="true" className="transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="mt-2">
              <BedenTablosu not="Mağazadaki beden rehberiyle aynı ölçüler." />
            </div>
          </details>

          {urun.variants.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
                  <tr>
                    <th className="py-2">Beden</th>
                    <th className="py-2">Renk</th>
                    <th className="py-2">Stok</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cizgi-soluk">
                  {urun.variants.map((v) => (
                    <tr key={v.id}>
                      <td className="py-2">{v.beden}</td>
                      <td className="py-2">{RENK_ADLARI[v.renk as RenkAdi] ?? v.renk}</td>
                      <td className="rakam py-2">{v.stok}</td>
                      <td className="py-2 text-right">
                        <form action={varyantSil}>
                          <input type="hidden" name="id" value={v.id} />
                          <input type="hidden" name="slug" value={urun.slug} />
                          <button
                            type="submit"
                            className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-mercan hover:text-mercan-koyu"
                          >
                            Sil
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form action={varyantEkle} className="mt-5 flex flex-wrap items-end gap-3">
            <input type="hidden" name="slug" value={urun.slug} />
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Beden</span>
              <select name="beden" className={GIRDI}>
                {BEDENLER.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Renk</span>
              <select name="renk" className={GIRDI}>
                {(Object.keys(RENK_ADLARI) as RenkAdi[]).map((r) => (
                  <option key={r} value={r}>
                    {RENK_ADLARI[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Adet</span>
              <input
                name="stok"
                type="number"
                min={0}
                defaultValue={0}
                className={`${GIRDI} rakam w-24`}
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-nane-koyu px-5 py-2.5 text-sm font-bold text-white"
            >
              Ekle / güncelle
            </button>
          </form>

          <p className="mt-4 text-xs text-metin-3">
            Şu anki satış fiyatı: <span className="rakam">{fiyatYaz(urun.fiyatKurus)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
