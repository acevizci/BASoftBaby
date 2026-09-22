import Link from "next/link";
import HeroBanner from "@/ui/hero-banner";
import Katlanir from "@/ui/katlanir";
import { BANNER_GORSELLERI, BANNER_PALETLERI, bannerSaniyeGetir, tumBannerlar } from "@/server/banner";
import { BANNER_PALET_ADLARI } from "@/ui/banner-bicim";
import { bannerCevir, bannerKaydet, bannerSil, bannerSuresiKaydet } from "@/server/yonetim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import PanelBildirim, { ORTAK_HATALAR } from "@/ui/panel-bildirim";
import DosyaBirak from "@/ui/dosya-birak";
import SilmeOnayi, { SIL_DUGMESI } from "@/ui/silme-onayi";
import Sayfalama, { SayfaAlani } from "@/ui/sayfalama";
import { dilimle, sayfaAdresi, sayfaCoz } from "@/ui/sayfalama-bicim";

export const dynamic = "force-dynamic";

/** Satırlar tek satırlık; sayfaya çok sayıda sığıyor. */
const LISTE_BOYU = 15;

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";


function tarihYaz(t: Date | null): string {
  return t ? t.toLocaleDateString("tr-TR") : "—";
}

const UYARI = <>Banner kalıcı olarak siliniyor; geri alınamıyor. Ana sayfadan kalkacak. Yalnızca yayından kaldırmak istiyorsan &quot;Kapat&quot; yeter.</>;

/** Bildirim metinleri koddan; adres yalnızca kodu taşıyor (K-57). */
const BILDIRIMLER: Record<string, string> = {
  "1": "Kaydedildi.",
  silindi: "Banner silindi. Ana sayfadan kalktı.",
  acildi: "Banner yayına alındı.",
  kapatildi: "Banner kapatıldı. Ana sayfada görünmüyor.",
};

const HATALAR: Record<string, string> = {
  ...ORTAK_HATALAR,
  baslik: "Yazılı banner'da başlık boş bırakılamaz.",
  "resim-yok": "Resimli banner için bir resim seç.",
};

/** Kabul edilen resim biçimleri; ürün fotoğraflarıyla aynı. */
const RESIM_BICIMLERI = "image/jpeg,image/png,image/webp,image/avif,image/gif";

export default async function BannerEkrani({ searchParams }: PageProps<"/yonetim/banner">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { kayit, hata, ac, sayfa, mesaj } = await searchParams;
  const [bannerlar, saniye] = await Promise.all([tumBannerlar(), bannerSaniyeGetir()]);

  const durum = sayfaCoz(sayfa, bannerlar.length, LISTE_BOYU);
  const sayfadakiler = dilimle(bannerlar, durum);
  const adres = (n: number) => sayfaAdresi("/yonetim/banner", n);

  const yayinda = bannerlar.filter((b) => b.aktif).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">Ana sayfa banner&apos;ı</h1>
      <p className="text-sm text-metin-2">
        Ana sayfanın en üstündeki büyük alan. Birden çok banner yayındaysa kendiliğinden sırayla
        geçer; tek banner varsa sabit durur. Hiç banner yoksa varsayılan tanıtım yazısı görünür.
      </p>

      <PanelBildirim kayit={kayit} hata={hata} bildirimler={BILDIRIMLER} hatalar={HATALAR} />
      {/* Yükleme hatasının metni sunucudan geliyor ("Dosya çok büyük…"). */}
      {hata === "resim" && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Resim yüklenemedi: {typeof mesaj === "string" ? mesaj : "bilinmeyen hata"}
        </p>
      )}

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Şu an mağazada görünen</h2>
        <div className="mt-3 overflow-hidden rounded-[11px] border border-cizgi">
          <HeroBanner />
        </div>
      </section>

      <Katlanir
        id="gecis-hizi"
        baslik="Geçiş hızı"
        acik={ac === "gecis-hizi"}
        ozet={`her banner ${saniye} saniye`}
      >
        <form action={bannerSuresiKaydet} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="ac" value="gecis-hizi" />
          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Her banner kaç saniye dursun</span>
            <input
              name="saniye"
              type="number"
              min={2}
              max={30}
              defaultValue={saniye}
              className={`${GIRDI} rakam w-28`}
            />
          </label>
          <button
            type="submit"
            className="rounded-full border border-cizgi px-4 py-2 text-sm font-bold text-metin-2 hover:border-metin-3"
          >
            Kaydet
          </button>
          <p className="w-full text-xs text-metin-3">
            Şu an {yayinda === 0 ? "hiç" : yayinda} banner yayında.
            {yayinda < 2 && " Geçiş için en az iki banner gerekiyor."}
          </p>
        </form>
      </Katlanir>

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        {/* Liste katlanmıyor: aradığın banner'ı tarayıcının kendi sayfa içi
            araması bulabilsin. */}
        <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg">
          Bannerlar
          <span className="rakam text-xs font-semibold text-metin-3">
            {bannerlar.length} banner · {yayinda} yayında
          </span>
          <Link
            href="/yonetim/banner?ac=yeni-banner#yeni-banner"
            className="ml-auto text-sm font-bold text-mavi-koyu hover:underline"
          >
            + Yeni banner
          </Link>
        </h2>
        {bannerlar.length === 0 ? (
          <p className="mt-2 text-sm text-metin-3">Henüz banner yok.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
            {sayfadakiler.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <span className="rakam text-xs text-metin-3">{b.sira}</span>
                {b.resimYol && (
                  // Küçük önizleme: resimli banner'ın başlığı olmayabiliyor,
                  // hangisi olduğu resimden anlaşılsın.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.resimKucukYol || b.resimYol}
                    alt=""
                    className="h-10 w-24 flex-none rounded-md object-cover ring-1 ring-cizgi"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">
                    {b.baslik || (b.resimYol ? "Resimli banner" : "—")}
                  </span>
                  <span className="block text-xs text-metin-3">
                    {b.resimYol
                      ? `Resim${b.telefonYol ? " · telefon resmi var" : ""}${b.dugmeLink ? ` → ${b.dugmeLink}` : ""}`
                      : `${BANNER_PALET_ADLARI[b.palet] ?? b.palet} · ${b.gorsel}${b.dugmeYazi ? ` · ${b.dugmeYazi} → ${b.dugmeLink}` : ""}`}
                  </span>
                </span>
                <span className="rakam text-xs text-metin-3">
                  {tarihYaz(b.baslangic)} → {tarihYaz(b.bitis)}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    b.aktif ? "bg-nane-soluk text-nane-koyu" : "bg-cizgi-soluk text-metin-2"
                  }`}
                >
                  {b.aktif ? "Yayında" : "Kapalı"}
                </span>
                <form action={bannerCevir}>
                  <input type="hidden" name="id" value={b.id} />
                  <SayfaAlani sayfa={durum.sayfa} />
                  <button
                    type="submit"
                    className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-metin-3"
                  >
                    {b.aktif ? "Kapat" : "Aç"}
                  </button>
                </form>
                <SilmeOnayi uyari={UYARI}>
                  <form action={bannerSil}>
                    <input type="hidden" name="id" value={b.id} />
                    <SayfaAlani sayfa={durum.sayfa} />
                    <button type="submit" className={SIL_DUGMESI}>
                      Evet, sil
                    </button>
                  </form>
                </SilmeOnayi>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <Sayfalama durum={durum} birim="banner" adres={adres} />
        </div>
      </section>

      {/* Hiç banner yokken açık geliyor: boş bir listeyle karşılaşan kişinin
          yapacağı tek şey zaten eklemek (K-52). */}
      <Katlanir
        id="yeni-banner"
        baslik="Yeni banner ekle"
        eylem
        acik={ac === "yeni-banner" || bannerlar.length === 0}
      >
        <form action={bannerKaydet} className="banner-form flex flex-col gap-4">
          {/* Arka arkaya birkaç banner eklenebilsin. */}
          <input type="hidden" name="ac" value="yeni-banner" />

          {/* Tür: hazır bir kampanya görseli mi, yoksa yazı + çizim mi (K-89).
              Seçilmeyen türün alanları CSS ile gizleniyor. */}
          <fieldset className="flex flex-wrap gap-2">
            <legend className={`${ETIKET} mb-1.5`}>Banner türü</legend>
            {(
              [
                ["resim", "Yalnızca resim", "Kendi hazırladığın görsel; yazı resmin içinde."],
                ["yazi", "Yazı ve çizim", "Başlık, alt yazı ve düğme; arka plan rengi ve çizim."],
              ] as const
            ).map(([deger, ad, aciklama]) => (
              <label
                key={deger}
                className="flex min-w-[220px] flex-1 cursor-pointer items-start gap-2 rounded-marka border border-cizgi p-3 has-[:checked]:border-mercan has-[:checked]:bg-mercan-soluk"
              >
                <input
                  type="radio"
                  name="tur"
                  value={deger}
                  defaultChecked={deger === "resim"}
                  className="mt-1 accent-[var(--mercan)]"
                />
                <span>
                  <span className="block text-sm font-bold">{ad}</span>
                  <span className="block text-xs text-metin-3">{aciklama}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="yalniz-resim grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <DosyaBirak
                ad="resim"
                etiket="Banner resmi"
                kabul={RESIM_BICIMLERI}
                kucult
                tekli
                zorunlu={false}
                enGenis={2400}
                hedefBayt={900 * 1024}
                kare={false}
              />
              <span className="text-xs text-metin-3">
                Ekranın tamamını kaplıyor ve kırpılmıyor; olduğu gibi görünüyor. Geniş bir
                görsel önerilir, örneğin 2400×800 (3:1).
              </span>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <DosyaBirak
                ad="telefonResmi"
                etiket="Telefon resmi (isteğe bağlı)"
                kabul={RESIM_BICIMLERI}
                kucult
                tekli
                zorunlu={false}
                enGenis={1200}
                hedefBayt={600 * 1024}
                kare={false}
              />
              <span className="text-xs text-metin-3">
                Telefonda geniş resim küçülüp yazısı okunmaz hâle geliyor. Buraya daha
                dik bir görsel koyarsan (örneğin 1080×1080) telefonda o gösterilir.
              </span>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Resmin açıklaması (isteğe bağlı)</span>
              <input
                name="resimAciklama"
                placeholder="Sonbahar koleksiyonu: yüzde 20 indirim"
                className={GIRDI}
              />
              <span className="text-xs text-metin-3">
                Ekranda görünmüyor; ekran okuyucular ve arama motorları için.
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Tıklanınca gideceği sayfa (isteğe bağlı)</span>
              <input name="resimLink" placeholder="/kiz-cocuk" className={GIRDI} />
            </label>
          </div>

          <div className="yalniz-yazi grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ETIKET}>Başlık</span>
              <input
                name="baslik"
                placeholder="Sonbahar koleksiyonu yayında"
                className={GIRDI}
              />
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ETIKET}>Alt yazı</span>
              <input
                name="altYazi"
                placeholder="Yumuşacık kadife ve fitilli pamuk parçalar"
                className={GIRDI}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Düğme yazısı</span>
              <input name="dugmeYazi" placeholder="Koleksiyonu gör" className={GIRDI} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Düğme bağlantısı</span>
              <input name="dugmeLink" placeholder="/tulum" className={GIRDI} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Arka plan rengi</span>
              <select name="palet" defaultValue="sari" className={GIRDI}>
                {BANNER_PALETLERI.map((p) => (
                  <option key={p} value={p}>
                    {BANNER_PALET_ADLARI[p]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Çizim</span>
              <select name="gorsel" defaultValue="amblem" className={GIRDI}>
                {BANNER_GORSELLERI.map((g) => (
                  <option key={g} value={g}>
                    {g === "amblem" ? "Logo amblemi" : g}
                  </option>
                ))}
              </select>
            </label>

          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Sıra — küçük olan önce</span>
              <input
                name="sira"
                type="number"
                defaultValue={bannerlar.length}
                className={`${GIRDI} rakam`}
              />
            </label>

            <div />

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Başlangıç</span>
              <input name="baslangic" type="date" className={GIRDI} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Bitiş</span>
              <input name="bitis" type="date" className={GIRDI} />
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="aktif"
              defaultChecked
              className="h-4 w-4 accent-[var(--mercan)]"
            />
            <span className="text-sm font-semibold">Banner yayında</span>
          </label>

          <p className="text-xs text-metin-3">
            Cihazında &quot;hareketi azalt&quot; ayarı açık olan müşteride banner geçmez, ilk
            banner sabit durur. Bu erişilebilirlik için zorunlu, ayarı yok.
          </p>

          <button
            type="submit"
            className="self-start rounded-full bg-dugme px-6 py-3 font-bold text-dugme-yazi transition hover:brightness-95"
          >
            Banner ekle
          </button>
        </form>
      </Katlanir>
    </div>
  );
}
