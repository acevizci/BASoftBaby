import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { aramaMotoruAyari } from "@/server/arama-motoru";
import { aramaMotoruKaydet, hepsiniBildir } from "@/server/arama-motoru-islem";
import { tamAdres } from "@/server/site";
import GonderDugmesi from "@/ui/gonder-dugmesi";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";
const KART = "rounded-marka border border-cizgi bg-yuzey p-5";

const HATALAR: Record<string, string> = {
  google: "Google kodu okunamadı. Search Console'daki HTML etiketini ya da yalnızca content değerini yapıştır.",
  bing: "Bing kodu okunamadı. Bing Webmaster'daki meta etiketini ya da yalnızca content değerini yapıştır.",
  yandex: "Yandex kodu okunamadı. Yandex Webmaster'daki meta etiketini ya da yalnızca content değerini yapıştır.",
};

/**
 * Arama motorları (K-129): site sahipliği doğrulaması, site haritası ve
 * ürün beslemesi adresleri, IndexNow.
 */
export default async function AramaMotorlari({ searchParams }: PageProps<"/yonetim/ayarlar/arama-motorlari">) {
  await yoneticiGerekli();
  const p = await searchParams;
  const a = await aramaMotoruAyari();
  const hata = typeof p.hata === "string" ? HATALAR[p.hata] : undefined;

  const adresler = [
    { ad: "Site haritası", adres: tamAdres("/sitemap.xml"), not: "Search Console › Site haritaları'na ekle." },
    { ad: "Google ürün beslemesi", adres: tamAdres("/google-urunler.xml"), not: "Merchant Center › Ürün kaynakları (K-123)." },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">Arama motorları</h1>
        <p className="mt-1 text-sm text-metin-3">
          Google, Bing ve Yandex&apos;e sitenin sahibi olduğunu göster; değişen ürünler hemen
          bildirilsin.
        </p>
      </div>

      {p.kayit === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Kaydedildi. Doğrulama etiketleri ana sayfada; şimdi ilgili panelde &quot;Doğrula&quot;ya bas.
        </p>
      )}
      {typeof p.bildirildi === "string" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          {p.bildirildi} adres Bing ve Yandex&apos;e bildirildi.
        </p>
      )}
      {typeof p.bildirilemedi === "string" && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Bildirilemedi ({p.bildirilemedi}).
        </p>
      )}
      {hata && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          {hata}
        </p>
      )}

      <form action={aramaMotoruKaydet} className={`flex flex-col gap-4 ${KART}`}>
        <h2 className="text-lg">Site sahipliği doğrulaması</h2>
        <p className="text-sm text-metin-2">
          Panelde &quot;HTML etiketi&quot; yöntemini seç, verdiği etiketi olduğu gibi yapıştır.
        </p>
        {(
          [
            ["google", "Google Search Console", a.googleDogrulama],
            ["bing", "Bing Webmaster Tools", a.bingDogrulama],
            ["yandex", "Yandex Webmaster", a.yandexDogrulama],
          ] as const
        ).map(([ad, baslik, deger]) => (
          <label key={ad} className="flex flex-col gap-1.5">
            <span className={ETIKET}>{baslik}</span>
            <input
              name={ad}
              defaultValue={deger}
              placeholder={`<meta name="…" content="…" />`}
              className={`${GIRDI} font-mono`}
            />
          </label>
        ))}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="indexNow" defaultChecked={a.indexNowAcik} className="mt-1" />
          <span>
            <strong>IndexNow</strong>: ürün eklenince, değişince ya da silinince adresi Bing ve
            Yandex&apos;e hemen bildir. (Google bunu kullanmıyor; Google site haritasını okuyor.)
          </span>
        </label>
        <div>
          <GonderDugmesi
            bekleyen="Kaydediliyor…"
            className="rounded-full bg-dugme px-6 py-2.5 font-bold text-dugme-yazi transition hover:brightness-95"
          >
            Kaydet
          </GonderDugmesi>
        </div>
      </form>

      <section className={KART}>
        <h2 className="text-lg">Arama motorlarına verilecek adresler</h2>
        <ul className="mt-3 flex flex-col gap-3 text-sm">
          {adresler.map((x) => (
            <li key={x.ad}>
              <p className="font-bold">{x.ad}</p>
              <p className="break-all font-mono text-mavi-koyu">{x.adres}</p>
              <p className="text-xs text-metin-3">{x.not}</p>
            </li>
          ))}
        </ul>
        {a.indexNowAcik && (
          <form action={hepsiniBildir} className="mt-4">
            <GonderDugmesi
              bekleyen="Bildiriliyor…"
              className="rounded-full border border-cizgi px-4 py-2 text-sm font-bold text-metin-2 hover:border-mercan"
            >
              Bütün ürünleri şimdi bildir
            </GonderDugmesi>
            <p className="mt-1 text-xs text-metin-3">
              İlk kurulumda bir kez yeter; sonrası kendiliğinden gidiyor.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
