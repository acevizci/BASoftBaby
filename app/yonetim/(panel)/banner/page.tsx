import Link from "next/link";
import HeroBanner from "@/ui/hero-banner";
import Katlanir from "@/ui/katlanir";
import { BANNER_GORSELLERI, BANNER_PALETLERI, bannerSaniyeGetir, tumBannerlar } from "@/server/banner";
import { BANNER_PALET_ADLARI } from "@/ui/banner-bicim";
import {
  bannerCevir,
  bannerKaydet,
  bannerSil,
  bannerSuresiKaydet,
  bannerTasi,
} from "@/server/yonetim";
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
  sira: "Sıra değişti. Ana sayfada bu sırayla dönüyor.",
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

  const { kayit, hata, ac, sayfa, mesaj, duzenle } = await searchParams;
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
            {sayfadakiler.map((b, j) => (
              <li
                key={b.id}
                id={`banner-${b.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3"
              >
                {/* Sıra oklarla (K-93); ana sayfada bu sırayla dönüyor. */}
                <span className="flex flex-none items-center gap-1">
                  {(["yukari", "asagi"] as const).map((yon) => {
                    const i = durum.atla + j;
                    const kapali = yon === "yukari" ? i === 0 : i === bannerlar.length - 1;
                    return (
                      <form key={yon} action={bannerTasi}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="yon" value={yon} />
                        <SayfaAlani sayfa={durum.sayfa} boy={LISTE_BOYU} />
                        <button
                          type="submit"
                          disabled={kapali}
                          aria-label={yon === "yukari" ? "Yukarı taşı" : "Aşağı taşı"}
                          className="grid h-7 w-7 place-items-center rounded-full border border-cizgi text-xs font-bold text-metin-2 hover:border-metin-3 disabled:opacity-30"
                        >
                          {yon === "yukari" ? "↑" : "↓"}
                        </button>
                      </form>
                    );
                  })}
                </span>
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
                <Link
                  href={
                    duzenle === b.id
                      ? sayfaAdresi("/yonetim/banner", durum.sayfa)
                      : `${sayfaAdresi("/yonetim/banner", durum.sayfa)}${durum.sayfa > 1 ? "&" : "?"}duzenle=${b.id}#banner-${b.id}`
                  }
                  className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-metin-3"
                >
                  {duzenle === b.id ? "Vazgeç" : "Düzenle"}
                </Link>
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
                {/* Geniş resim telefonda ekran genişliğine iniyor; 3:1 bir
                    görsel 390 piksellik ekranda 130 piksel yükseklikte kalıyor
                    ve içindeki yazı okunmuyor (K-96). */}
                {b.resimYol &&
                  !b.telefonYol &&
                  b.resimYukseklik > 0 &&
                  b.resimGenislik / b.resimYukseklik >= 2 && (
                    <p className="w-full rounded-marka bg-sari-soluk px-3 py-2 text-xs text-sari-koyu">
                      <strong>Telefonda küçük görünebilir.</strong> Resim geniş (
                      <span className="rakam">
                        {b.resimGenislik}×{b.resimYukseklik}
                      </span>
                      ); telefonda ekran genişliğine inince içindeki yazı okunmayabilir.{" "}
                      <Link
                        href={`${sayfaAdresi("/yonetim/banner", durum.sayfa)}${durum.sayfa > 1 ? "&" : "?"}duzenle=${b.id}#banner-${b.id}`}
                        className="font-bold underline"
                      >
                        Telefon resmi ekle
                      </Link>
                    </p>
                  )}
                {duzenle === b.id && (
                  <div className="mt-2 w-full rounded-marka border border-cizgi-soluk bg-yuzey-sicak p-4">
                    <BannerFormu b={b} />
                  </div>
                )}
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
        <BannerFormu varsayilanSira={bannerlar.length} />
      </Katlanir>
    </div>
  );
}

/** "YYYY-MM-DD": tarih kutusunun beklediği biçim. */
function tarihGirdisi(t: Date | null | undefined): string {
  if (!t) return "";
  const y = t.getFullYear();
  const a = String(t.getMonth() + 1).padStart(2, "0");
  const g = String(t.getDate()).padStart(2, "0");
  return `${y}-${a}-${g}`;
}

type BannerKaydi = Awaited<ReturnType<typeof tumBannerlar>>[number];

/**
 * Banner formu; ekleme ve düzenlemede aynı (K-90).
 *
 * Düzenlemede resim yüklemek isteğe bağlı: yeni resim seçilmezse eskisi
 * kalıyor. Tür değiştirilebiliyor; resimliden yazılıya geçince resim
 * dosyaları siliniyor.
 */
function BannerFormu({ b, varsayilanSira = 0 }: { b?: BannerKaydi; varsayilanSira?: number }) {
  const tur = b ? (b.resimYol ? "resim" : "yazi") : "resim";
  return (
        <form action={bannerKaydet} className="banner-form flex flex-col gap-4">
          {b ? (
            <input type="hidden" name="id" value={b.id} />
          ) : (
            // Arka arkaya birkaç banner eklenebilsin.
            <input type="hidden" name="ac" value="yeni-banner" />
          )}

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
                  defaultChecked={deger === tur}
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
              {b?.resimYol && (
                <p className="flex items-center gap-3 text-xs text-metin-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.resimKucukYol || b.resimYol}
                    alt=""
                    className="h-12 w-32 rounded-md object-cover ring-1 ring-cizgi"
                  />
                  Şu anki resim. Yeni resim seçmezsen bu kalır.
                </p>
              )}
              <DosyaBirak
                ad="resim"
                etiket={b?.resimYol ? "Resmi değiştir (isteğe bağlı)" : "Banner resmi"}
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
              {b?.telefonYol && (
                <label className="flex items-center gap-2 text-xs text-metin-2">
                  <input
                    type="checkbox"
                    name="telefonKaldir"
                    className="h-4 w-4 accent-[var(--mercan)]"
                  />
                  Şu anki telefon resmini kaldır (telefonda da geniş resim görünsün)
                </label>
              )}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Resmin açıklaması (isteğe bağlı)</span>
              <input
                name="resimAciklama"
                defaultValue={b?.resimYol ? b.baslik : ""}
                placeholder="Sonbahar koleksiyonu: yüzde 20 indirim"
                className={GIRDI}
              />
              <span className="text-xs text-metin-3">
                Ekranda görünmüyor; ekran okuyucular ve arama motorları için.
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Tıklanınca gideceği sayfa (isteğe bağlı)</span>
              <input
                name="resimLink"
                defaultValue={b?.resimYol ? b.dugmeLink : ""}
                placeholder="/kiz-cocuk"
                className={GIRDI}
              />
            </label>
          </div>

          <div className="yalniz-yazi grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ETIKET}>Başlık</span>
              <input
                name="baslik"
                defaultValue={b && !b.resimYol ? b.baslik : ""}
                placeholder="Sonbahar koleksiyonu yayında"
                className={GIRDI}
              />
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ETIKET}>Alt yazı</span>
              <input
                name="altYazi"
                defaultValue={b?.altYazi ?? ""}
                placeholder="Yumuşacık kadife ve fitilli pamuk parçalar"
                className={GIRDI}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Düğme yazısı</span>
              <input
                name="dugmeYazi"
                defaultValue={b?.dugmeYazi ?? ""}
                placeholder="Koleksiyonu gör"
                className={GIRDI}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Düğme bağlantısı</span>
              <input
                name="dugmeLink"
                defaultValue={b && !b.resimYol ? b.dugmeLink : ""}
                placeholder="/tulum"
                className={GIRDI}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Arka plan rengi</span>
              <select name="palet" defaultValue={b?.palet ?? "sari"} className={GIRDI}>
                {BANNER_PALETLERI.map((p) => (
                  <option key={p} value={p}>
                    {BANNER_PALET_ADLARI[p]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Çizim</span>
              <select name="gorsel" defaultValue={b?.gorsel ?? "amblem"} className={GIRDI}>
                {BANNER_GORSELLERI.map((g) => (
                  <option key={g} value={g}>
                    {g === "amblem" ? "Logo" : g}
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
                defaultValue={b ? b.sira : varsayilanSira}
                className={`${GIRDI} rakam`}
              />
            </label>

            <div />

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Başlangıç</span>
              <input
                name="baslangic"
                type="date"
                defaultValue={tarihGirdisi(b?.baslangic)}
                className={GIRDI}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Bitiş</span>
              <input
                name="bitis"
                type="date"
                defaultValue={tarihGirdisi(b?.bitis)}
                className={GIRDI}
              />
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="aktif"
              defaultChecked={b ? b.aktif : true}
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
            {b ? "Kaydet" : "Banner ekle"}
          </button>
        </form>
  );
}
