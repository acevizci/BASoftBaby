import Link from "next/link";
import { kelimeSayisi } from "@/ui/rehber-bicim";
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
import PanelArama from "@/ui/panel-arama";
import { aramaCoz, aramayaGoreSuz } from "@/ui/panel-arama-bicim";
import { kategoriEtiketleri } from "@/ui/kategori-etiketi";

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
  "ad-tekrar":
    "Bu adda başka bir kategori var. İkisini birleştirmek için birini sil ve \"Ürünler nereye taşınsın?\" bölümünde ötekini seç.",
  "hedef-yok": "Ürünlerin taşınacağı kategoriyi seç.",
};

export default async function KategoriEkrani({
  searchParams,
}: PageProps<"/yonetim/kategoriler">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { duzenle, kayit, hata, adet, sayfa, ara } = await searchParams;
  const tumListe = await tumKategoriler();

  const arama = aramaCoz(ara);
  const kategoriler = aramayaGoreSuz(tumListe, arama, (k) => [k.ad, k.slug, k.aciklama]);

  // Ok düğmeleri tam listedeki sıraya bakıyor (K-69).
  const sira = new Map(tumListe.map((k, i) => [k.id, i]));

  const durum = sayfaCoz(sayfa, kategoriler.length, LISTE_BOYU);
  const sayfadakiler = dilimle(kategoriler, durum);
  const temel = arama
    ? `/yonetim/kategoriler?ara=${encodeURIComponent(arama)}`
    : "/yonetim/kategoriler";
  const adres = (n: number) => sayfaAdresi(temel, n);

  const duzenlenen =
    typeof duzenle === "string" ? tumListe.find((k) => k.id === duzenle) : undefined;

  // Aynı adlı kategoriler: yeni çakışma açılamıyor ama eskiden kalan olabilir.
  // Veritabanı kuralı ancak bunlar giderilince kurulabiliyor (K-83).
  const adSayimi = new Map<string, string[]>();
  for (const k of tumListe) {
    const anahtar = k.ad.trim().toLocaleLowerCase("tr");
    adSayimi.set(anahtar, [...(adSayimi.get(anahtar) ?? []), k.slug]);
  }
  const cakisanlar = [...adSayimi.values()].filter((s) => s.length > 1);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Kategoriler</h1>
      <p className="text-sm text-metin-2">
        İçinde yayında ürün olmayan kategori mağazanın menüsünde{" "}
        <strong>görünmüyor</strong> — müşteri boş bir sayfaya düşmesin diye (K-73). Bir
        kategoriye ürün eklemenin iki yolu var: ürünü açıp{" "}
        <strong>Temel bilgiler → Kategori</strong> alanını değiştirmek, ya da{" "}
        <Link href="/yonetim/urunler" className="font-bold text-mavi-koyu hover:underline">
          ürün listesinden
        </Link>{" "}
        birkaçını işaretleyip <strong>&quot;Kategoriye taşı&quot;</strong> demek.
      </p>

      <PanelBildirim kayit={kayit} hata={hata} bildirimler={BILDIRIMLER} hatalar={HATALAR} />

      {cakisanlar.length > 0 && (
        <div className="rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm text-sari-koyu">
          <p className="font-bold">Aynı adlı kategoriler var</p>
          <p className="mt-1">
            {cakisanlar.map((c) => c.map((slug) => `/${slug}`).join(" ile ")).join("; ")}.
            Seçim listelerinde birbirine karışıyorlar. Birleştirmek için birini sil ve
            &quot;Ürünler nereye taşınsın?&quot; bölümünde ötekini seç.
          </p>
        </div>
      )}

      {/* Bu ikisi adres satırından bir **sayı** alıyor; cümle sayfada
          tamamlanıyor. Metin taşınmıyor (K-57). */}
      {kayit === "tasindi" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Kategori silindi, <span className="rakam">{String(adet ?? "")}</span> ürün seçtiğin
          kategoriye taşındı.
        </p>
      )}


      <PanelArama
        yol="/yonetim/kategoriler"
        ara={arama}
        yerTutucu="Kategori ara: ad, adres ya da açıklama"
      />

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Sıra ve durum</h2>
        <p className="mt-1 text-xs text-metin-3">
          Üstteki kategori vitrinde de üstte görünür. Kapalı kategori menüde ve listelerde
          çıkmaz.
        </p>

        <ul className="mt-4 flex flex-col divide-y divide-cizgi-soluk">
          {sayfadakiler.map((k) => {
            const yer = sira.get(k.id) ?? 0;
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
                  <span className="rakam">/{k.slug}</span> ·{" "}
                  {/* Ürün adedi bağlantı: "bu kategoride ne var" ve "buraya
                      nasıl ürün eklerim" sorularının ikisinin de cevabı ürün
                      listesinde (K-74). */}
                  <Link
                    href={`/yonetim/urunler?kategori=${k.slug}`}
                    className="font-bold text-mavi-koyu hover:underline"
                  >
                    <span className="rakam">{k.urunAdedi}</span> ürün
                  </Link>
                  {k.urunAdedi === 0 && (
                    <span className="text-sari-koyu"> · mağazada görünmüyor</span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <form action={kategoriTasi}>
                  <input type="hidden" name="id" value={k.id} />
                  <input type="hidden" name="yon" value="yukari" />
                  <SayfaAlani sayfa={durum.sayfa} boy={LISTE_BOYU} ara={arama} />
                  <button
                    type="submit"
                    className={KUCUK_DUGME}
                    disabled={yer === 0}
                    aria-label={`${k.ad} kategorisini yukarı taşı`}
                    title="Yukarı taşı"
                  >
                    ↑
                  </button>
                </form>
                <form action={kategoriTasi}>
                  <input type="hidden" name="id" value={k.id} />
                  <input type="hidden" name="yon" value="asagi" />
                  <SayfaAlani sayfa={durum.sayfa} boy={LISTE_BOYU} ara={arama} />
                  <button
                    type="submit"
                    className={KUCUK_DUGME}
                    disabled={yer === tumListe.length - 1}
                    aria-label={`${k.ad} kategorisini aşağı taşı`}
                    title="Aşağı taşı"
                  >
                    ↓
                  </button>
                </form>

                <Link
                  href={sayfaAdresi(`${temel}${temel.includes("?") ? "&" : "?"}duzenle=${k.id}`, durum.sayfa)}
                  className={KUCUK_DUGME}
                >
                  Düzenle
                </Link>

                <form action={kategoriCevir}>
                  <input type="hidden" name="id" value={k.id} />
                  <SayfaAlani sayfa={durum.sayfa} ara={arama} />
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
                      <SayfaAlani sayfa={durum.sayfa} ara={arama} />
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
                      <SayfaAlani sayfa={durum.sayfa} ara={arama} />
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
                          {tumListe
                            .filter((d) => d.id !== k.id)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {kategoriEtiketleri(tumListe).get(d.slug) ?? d.ad}
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
          <p className="mt-4 text-sm text-metin-2">
            {arama ? `"${arama}" aramasına uyan kategori yok.` : "Henüz kategori yok."}
          </p>
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

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={ETIKET}>Rehber yazısı (sayfanın altında)</span>
            <textarea
              name="rehberMetni"
              defaultValue={duzenlenen?.rehberMetni ?? ""}
              rows={8}
              maxLength={8000}
              placeholder={"Bu kategoride seçim yaparken nelere dikkat edilmeli?\n\n## Hangi beden?\n- 0-3 ay: 50-62 cm\n- 3-6 ay: 62-68 cm"}
              className={GIRDI}
            />
            <span className="text-xs text-metin-3">
              Google için en değerli içerik: 150-300 kelimelik, bu kategoriye özgü tavsiye
              (kumaş, beden, mevsim). Boş satır paragraf, &quot;## &quot; ara başlık, &quot;- &quot; madde.
              {duzenlenen?.rehberMetni
                ? ` Şu an ${kelimeSayisi(duzenlenen.rehberMetni)} kelime.`
                : ""}
            </span>
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
