import Link from "next/link";
import { tumKategoriler } from "@/server/katalog";
import {
  kategoriCevir,
  kategoriKaydet,
  kategoriSil,
  kategoriTasi,
} from "@/server/yonetim";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";
const KUCUK_DUGME =
  "rounded-full border border-cizgi bg-yuzey px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin disabled:opacity-40";
const ANA_DUGME =
  "rounded-full bg-mercan px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95";

/**
 * Kategori yönetimi.
 *
 * Sıralama sürükle bırak değil ok düğmeleri, düzenleme ayrı sayfa değil
 * `?duzenle=<id>` ile dolu açılan form: panelin geri kalanı gibi burası da
 * JavaScript kapalı tarayıcıda çalışıyor.
 */
export default async function KategoriEkrani({
  searchParams,
}: PageProps<"/yonetim/kategoriler">) {
  const { duzenle, kayit, hata } = await searchParams;
  const kategoriler = await tumKategoriler();

  const duzenlenen =
    typeof duzenle === "string" ? kategoriler.find((k) => k.id === duzenle) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Kategoriler</h1>

      {kayit === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Kaydedildi.
        </p>
      )}
      {kayit === "silindi" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Kategori silindi.
        </p>
      )}
      {hata === "ad" && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Kategori adı boş bırakılamaz.
        </p>
      )}
      {hata === "dolu" && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          İçinde ürün olan kategori silinemiyor. Ürünleri başka bir kategoriye taşı ya da
          kategoriyi kapat — kapalı kategori vitrinde görünmez, ürünleri kendi
          sayfalarından erişilebilir kalır.
        </p>
      )}

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Sıra ve durum</h2>
        <p className="mt-1 text-xs text-metin-3">
          Üstteki kategori vitrinde de üstte görünür. Kapalı kategori menüde ve listelerde
          çıkmaz.
        </p>

        <ul className="mt-4 flex flex-col divide-y divide-cizgi-soluk">
          {kategoriler.map((k, sira) => (
            <li key={k.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-[180px] flex-1">
                <p className="font-bold">
                  {k.ad}
                  {!k.aktif && (
                    <span className="ml-2 rounded-full bg-cizgi-soluk px-2 py-0.5 text-xs font-bold text-metin-3">
                      kapalı
                    </span>
                  )}
                </p>
                <p className="text-xs text-metin-3">
                  <span className="rakam">/{k.slug}</span> · {k.urunAdedi} ürün
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <form action={kategoriTasi}>
                  <input type="hidden" name="id" value={k.id} />
                  <input type="hidden" name="yon" value="yukari" />
                  <button
                    type="submit"
                    className={KUCUK_DUGME}
                    disabled={sira === 0}
                    aria-label={`${k.ad} kategorisini yukarı taşı`}
                    title="Yukarı taşı"
                  >
                    ↑
                  </button>
                </form>
                <form action={kategoriTasi}>
                  <input type="hidden" name="id" value={k.id} />
                  <input type="hidden" name="yon" value="asagi" />
                  <button
                    type="submit"
                    className={KUCUK_DUGME}
                    disabled={sira === kategoriler.length - 1}
                    aria-label={`${k.ad} kategorisini aşağı taşı`}
                    title="Aşağı taşı"
                  >
                    ↓
                  </button>
                </form>

                <Link href={`/yonetim/kategoriler?duzenle=${k.id}`} className={KUCUK_DUGME}>
                  Düzenle
                </Link>

                <form action={kategoriCevir}>
                  <input type="hidden" name="id" value={k.id} />
                  <button type="submit" className={KUCUK_DUGME}>
                    {k.aktif ? "Kapat" : "Aç"}
                  </button>
                </form>

                <form action={kategoriSil}>
                  <input type="hidden" name="id" value={k.id} />
                  <button type="submit" className={KUCUK_DUGME} disabled={k.urunAdedi > 0}>
                    Sil
                  </button>
                </form>

                <Link href={`/${k.slug}`} className="text-xs font-bold text-mavi-koyu hover:underline">
                  Gör
                </Link>
              </div>
            </li>
          ))}
        </ul>

        {kategoriler.length === 0 && (
          <p className="mt-4 text-sm text-metin-2">Henüz kategori yok.</p>
        )}
      </section>

      <form
        action={kategoriKaydet}
        className="flex flex-col gap-4 rounded-marka border border-cizgi bg-yuzey p-5"
      >
        <h2 className="text-lg">
          {duzenlenen ? `Kategoriyi düzenle: ${duzenlenen.ad}` : "Yeni kategori"}
        </h2>

        {duzenlenen && <input type="hidden" name="id" value={duzenlenen.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Kategori adı</span>
            <input
              name="ad"
              required
              defaultValue={duzenlenen?.ad ?? ""}
              placeholder="Örn. Uyku tulumu"
              className={GIRDI}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Adres</span>
            <input
              value={duzenlenen ? `/${duzenlenen.slug}` : "addan üretilecek"}
              disabled
              className={`${GIRDI} opacity-60`}
            />
            <span className="text-xs text-metin-3">
              Adres kategori adından bir kez üretilir ve sonra değişmez; verilmiş
              bağlantılar ve arama motorundaki sıra kırılmasın diye.
            </span>
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={ETIKET}>Açıklama</span>
            <input
              name="aciklama"
              defaultValue={duzenlenen?.aciklama ?? ""}
              maxLength={200}
              placeholder="Kategori sayfasının başında görünen tek cümle"
              className={GIRDI}
            />
          </label>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              name="aktif"
              defaultChecked={duzenlenen ? duzenlenen.aktif : true}
              className="h-4 w-4 accent-[var(--mercan)]"
            />
            <span className="text-sm text-metin-2">Vitrinde görünsün</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className={ANA_DUGME}>
            {duzenlenen ? "Değişikliği kaydet" : "Kategoriyi ekle"}
          </button>
          {duzenlenen && (
            <Link href="/yonetim/kategoriler" className={`${KUCUK_DUGME} self-center`}>
              Vazgeç
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
