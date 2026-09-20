import HeroBanner from "@/ui/hero-banner";
import { BANNER_GORSELLERI, BANNER_PALETLERI, bannerSaniyeGetir, tumBannerlar } from "@/server/banner";
import { bannerCevir, bannerKaydet, bannerSil, bannerSuresiKaydet } from "@/server/yonetim";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

const PALET_ADLARI: Record<string, string> = {
  sari: "Sarı",
  mint: "Nane",
  mercan: "Mercan",
  mavi: "Mavi",
  krem: "Krem",
};

function tarihYaz(t: Date | null): string {
  return t ? t.toLocaleDateString("tr-TR") : "—";
}

export default async function BannerEkrani({ searchParams }: PageProps<"/yonetim/banner">) {
  const { kayit } = await searchParams;
  const [bannerlar, saniye] = await Promise.all([tumBannerlar(), bannerSaniyeGetir()]);

  const yayinda = bannerlar.filter((b) => b.aktif).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">Ana sayfa banner&apos;ı</h1>
      <p className="text-sm text-metin-2">
        Ana sayfanın en üstündeki büyük alan. Birden çok banner yayındaysa kendiliğinden sırayla
        geçer; tek banner varsa sabit durur. Hiç banner yoksa varsayılan tanıtım yazısı görünür.
      </p>

      {kayit === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Kaydedildi.
        </p>
      )}

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Şu an mağazada görünen</h2>
        <div className="mt-3 overflow-hidden rounded-[11px] border border-cizgi">
          <HeroBanner />
        </div>
      </section>

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Geçiş hızı</h2>
        <form action={bannerSuresiKaydet} className="mt-3 flex flex-wrap items-end gap-3">
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
      </section>

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Bannerlar</h2>
        {bannerlar.length === 0 ? (
          <p className="mt-2 text-sm text-metin-3">Henüz banner yok.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
            {bannerlar.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <span className="rakam text-xs text-metin-3">{b.sira}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{b.baslik}</span>
                  <span className="block text-xs text-metin-3">
                    {PALET_ADLARI[b.palet] ?? b.palet} · {b.gorsel}
                    {b.dugmeYazi ? ` · ${b.dugmeYazi} → ${b.dugmeLink}` : ""}
                  </span>
                </span>
                <span className="rakam text-xs text-metin-3">
                  {tarihYaz(b.baslangic)} → {tarihYaz(b.bitis)}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    b.aktif ? "bg-nane-soluk text-nane-koyu" : "bg-cizgi-soluk text-metin-3"
                  }`}
                >
                  {b.aktif ? "Yayında" : "Kapalı"}
                </span>
                <form action={bannerCevir}>
                  <input type="hidden" name="id" value={b.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-metin-3"
                  >
                    {b.aktif ? "Kapat" : "Aç"}
                  </button>
                </form>
                <form action={bannerSil}>
                  <input type="hidden" name="id" value={b.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-mercan hover:text-mercan-koyu"
                  >
                    Sil
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={bannerKaydet} className="mt-5 flex flex-col gap-4 border-t border-cizgi pt-5">
          <h3 className="font-baslik text-sm font-bold">Yeni banner</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ETIKET}>Başlık</span>
              <input
                name="baslik"
                required
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
                    {PALET_ADLARI[p]}
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
            className="self-start rounded-full bg-mercan px-6 py-3 font-bold text-white transition hover:brightness-95"
          >
            Banner ekle
          </button>
        </form>
      </section>
    </div>
  );
}
