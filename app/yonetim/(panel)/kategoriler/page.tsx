import Link from "next/link";
import { tumKategoriler } from "@/server/katalog";
import {
  kategoriCevir,
  kategoriKaydet,
  kategoriSil,
  kategoriTasi,
} from "@/server/yonetim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import PanelBildirim, { ORTAK_HATALAR } from "@/ui/panel-bildirim";
import SilmeOnayi, { SIL_DUGMESI } from "@/ui/silme-onayi";
import Sayfalama, { SayfaAlani } from "@/ui/sayfalama";
import { dilimle, sayfaAdresi, sayfaCoz } from "@/ui/sayfalama-bicim";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";
const KUCUK_DUGME =
  "rounded-full border border-cizgi bg-yuzey px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin disabled:opacity-40";
const ANA_DUGME =
  "rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi transition hover:brightness-95";

/** Kategori satırı tek satırlık; sayfaya çok sayıda sığıyor. */
const LISTE_BOYU = 15;

/**
 * Kategori yönetimi.
 *
 * Sıralama sürükle bırak değil ok düğmeleri, düzenleme ayrı sayfa değil
 * `?duzenle=<id>` ile dolu açılan form: panelin geri kalanı gibi burası da
 * JavaScript kapalı tarayıcıda çalışıyor.
 */
/** Bildirim metinleri koddan; adres yalnızca kodu taşıyor (K-57). */
const BILDIRIMLER: Record<string, string> = {
  "1": "Kaydedildi.",
  silindi: "Kategori silindi.",
  acildi: "Kategori açıldı. Vitrinde ve menüde görünüyor.",
  kapatildi: "Kategori kapatıldı. Vitrinde ve menüde görünmüyor.",
  sira: "Sıra değişti. Vitrinde de bu sırayla görünüyor.",
};

const HATALAR: Record<string, string> = {
  ...ORTAK_HATALAR,
  ad: "Kategori adı boş bırakılamaz.",
  "hedef-yok": "Ürünlerin taşınacağı kategoriyi seç.",
};

export default async function KategoriEkrani({
  searchParams,
}: PageProps<"/yonetim/kategoriler">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { duzenle, kayit, hata, adet, sayfa } = await searchParams;
  const kategoriler = await tumKategoriler();

  const durum = sayfaCoz(sayfa, kategoriler.length, LISTE_BOYU);
  const sayfadakiler = dilimle(kategoriler, durum);
  const adres = (n: number) => sayfaAdresi("/yonetim/kategoriler", n);

  const duzenlenen =
    typeof duzenle === "string" ? kategoriler.find((k) => k.id === duzenle) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Kategoriler</h1>

      <PanelBildirim kayit={kayit} hata={hata} bildirimler={BILDIRIMLER} hatalar={HATALAR} />

      {/* Bu ikisi adres satırından bir **sayı** alıyor; cümle sayfada
          tamamlanıyor. Metin taşınmıyor (K-57). */}
      {kayit === "tasindi" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Kategori silindi, <span className="rakam">{String(adet ?? "")}</span> ürün seçtiğin
          kategoriye taşındı.
        </p>
      )}


      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Sıra ve durum</h2>
        <p className="mt-1 text-xs text-metin-3">
          Üstteki kategori vitrinde de üstte görünür. Kapalı kategori menüde ve listelerde
          çıkmaz.
        </p>

        <ul className="mt-4 flex flex-col divide-y divide-cizgi-soluk">
          {sayfadakiler.map((k, yer) => {
            // Ok düğmeleri listenin tamamına göre: sayfanın son kaydı
            // listenin sonu değil (K-67).
            const sira = durum.atla + yer;
            return (
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
                  <SayfaAlani sayfa={durum.sayfa} boy={LISTE_BOYU} />
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
                  <SayfaAlani sayfa={durum.sayfa} boy={LISTE_BOYU} />
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

                <Link
                  href={sayfaAdresi(`/yonetim/kategoriler?duzenle=${k.id}`, durum.sayfa)}
                  className={KUCUK_DUGME}
                >
                  Düzenle
                </Link>

                <form action={kategoriCevir}>
                  <input type="hidden" name="id" value={k.id} />
                  <SayfaAlani sayfa={durum.sayfa} />
                  <button type="submit" className={KUCUK_DUGME}>
                    {k.aktif ? "Kapat" : "Aç"}
                  </button>
                </form>

                {/* İçinde ürün varsa önce nereye taşınacağı soruluyor.
                    Eskiden düğme kapalıydı; bütün kategorilerde ürün olduğu
                    için silme yokmuş gibi duruyordu (K-52). */}
                {k.urunAdedi === 0 ? (
                  // Boş kategori de tek tıkla gitmiyor: "Sil" düğmesi
                  // "Kapat"ın hemen yanında (K-61).
                  <SilmeOnayi
                    uyari={
                      <>
                        <strong>{k.ad}</strong> kalıcı olarak siliniyor; geri
                        alınamıyor. İçinde ürün yok. Yalnızca vitrinden kaldırmak
                        istiyorsan &quot;Kapat&quot; yeter.
                      </>
                    }
                  >
                    <form action={kategoriSil}>
                      <input type="hidden" name="id" value={k.id} />
                      <SayfaAlani sayfa={durum.sayfa} />
                      <button type="submit" className={SIL_DUGMESI}>
                        Evet, sil
                      </button>
                    </form>
                  </SilmeOnayi>
                ) : (
                  /* Ürünü olan kategori: silme aynı denetimden geçiyor ama
                     ürünlerin nereye gideceği de soruluyor. Eskiden burası
                     biçimsiz bir "Sil ▾" yazısıydı — "Kapat" düğmesinin
                     yanında silme denetimi gibi durmuyordu ve kategorinin
                     kalıcı olarak gideceğini hiç söylemiyordu (K-63). */
                  <SilmeOnayi
                    uyari={
                      <>
                        <strong>{k.ad}</strong> kalıcı olarak siliniyor; geri
                        alınamıyor. İçindeki{" "}
                        <span className="rakam font-bold">{k.urunAdedi}</span> ürün
                        silinmiyor, seçtiğin kategoriye taşınıyor. Yalnızca vitrinden
                        kaldırmak istiyorsan &quot;Kapat&quot; yeter.
                      </>
                    }
                  >
                    <form
                      action={kategoriSil}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="id" value={k.id} />
                      <SayfaAlani sayfa={durum.sayfa} />
                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-metin-2">
                          Ürünler nereye taşınsın?
                        </span>
                        <select
                          name="hedefKategori"
                          required
                          defaultValue=""
                          className="rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm outline-none focus:border-mercan"
                        >
                          <option value="" disabled>
                            Kategori seç
                          </option>
                          {kategoriler
                            .filter((d) => d.id !== k.id)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.ad}
                              </option>
                            ))}
                        </select>
                      </label>
                      <button type="submit" className={SIL_DUGMESI}>
                        Taşı ve sil
                      </button>
                    </form>
                  </SilmeOnayi>
                )}

                <Link href={`/${k.slug}`} className="text-xs font-bold text-mavi-koyu hover:underline">
                  Gör
                </Link>
              </div>
            </li>
            );
          })}
        </ul>

        {kategoriler.length === 0 && (
          <p className="mt-4 text-sm text-metin-2">Henüz kategori yok.</p>
        )}

        <div className="mt-4">
          <Sayfalama durum={durum} birim="kategori" adres={adres} />
        </div>
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
