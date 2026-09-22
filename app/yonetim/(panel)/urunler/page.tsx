import Link from "next/link";
import { db } from "@/server/veritabani";
import { topluUrunIslemi } from "@/server/yonetim";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import SilmeOnayi, { SIL_DUGMESI } from "@/ui/silme-onayi";
import Sayfalama, { SayfaAlani } from "@/ui/sayfalama";
import { sayfaAdresi, sayfaCoz } from "@/ui/sayfalama-bicim";
import PanelBildirim, { ORTAK_HATALAR } from "@/ui/panel-bildirim";

export const dynamic = "force-dynamic";

const ROZET = "rounded-full border px-3 py-1.5 text-xs font-bold transition";

/** Ürün satırı fotoğraflı ve yüksek; sayfada bu kadarı rahat okunuyor. */
const LISTE_BOYU = 20;
const ISLEM_DUGMESI =
  "rounded-full border border-cizgi bg-yuzey px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-metin-3";

/**
 * Ürün listesi.
 *
 * Listede fotoğraf sütunu var ve fotoğrafsız ürünler süzülebiliyor: Excel'den
 * elli ürün yüklendiğinde hangilerinin fotoğrafı eksik kaldığını görmenin
 * başka yolu yoktu (K-41).
 */
/** Bildirim metinleri koddan; adres yalnızca kodu taşıyor (K-57). */
const BILDIRIMLER: Record<string, string> = {
  silindi: "Ürün silindi. Sipariş geçmişi bundan etkilenmedi.",
};

const HATALAR: Record<string, string> = {
  ...ORTAK_HATALAR,
  "secim-yok": "Önce listeden ürün seç.",
};

export default async function UrunListesi({ searchParams }: PageProps<"/yonetim/urunler">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { eksik, toplu, adet, atlanan, kayit, hata, sayfa } = await searchParams;
  const fotografsizSuzgeci = eksik === "fotograf";
  const kosul = fotografsizSuzgeci ? { images: { none: {} } } : {};

  // Liste eskiden bütün ürünleri varyantları ve fotoğraf sayılarıyla birlikte
  // çekiyordu; katalog büyüdükçe bu sayfa en pahalı sorgu oluyordu. Artık
  // yalnızca görünen sayfa okunuyor (K-67).
  const toplamAdet = await db.product.count({ where: kosul });
  const durum = sayfaCoz(sayfa, toplamAdet, LISTE_BOYU);

  const [urunler, fotografsizAdedi] = await Promise.all([
    db.product.findMany({
      where: kosul,
      include: {
        category: true,
        variants: true,
        images: { orderBy: { sira: "asc" }, take: 1, select: { kucukYol: true, yol: true, altMetin: true } },
        _count: { select: { images: true } },
      },
      orderBy: { olusturuldu: "asc" },
      skip: durum.atla,
      take: durum.boy,
    }),
    db.product.count({ where: { images: { none: {} } } }),
  ]);

  const adres = (n: number) =>
    sayfaAdresi(fotografsizSuzgeci ? "/yonetim/urunler?eksik=fotograf" : "/yonetim/urunler", n);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl">Ürünler</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/yonetim/urunler/toplu"
            className="rounded-full border border-cizgi bg-yuzey px-5 py-2.5 text-sm font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
          >
            Excel&apos;den yükle
          </Link>
          <Link
            href="/yonetim/urunler/yeni"
            className="rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
          >
            Yeni ürün
          </Link>
        </div>
      </div>

      {fotografsizAdedi > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/yonetim/urunler"
            className={`${ROZET} ${
              fotografsizSuzgeci
                ? "border-cizgi text-metin-2 hover:border-metin-3"
                : "border-mercan bg-mercan-soluk text-mercan-koyu"
            }`}
          >
            Hepsi
          </Link>
          <Link
            href="/yonetim/urunler?eksik=fotograf"
            className={`${ROZET} ${
              fotografsizSuzgeci
                ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                : "border-cizgi text-metin-2 hover:border-metin-3"
            }`}
          >
            Fotoğrafsız <span className="rakam">({fotografsizAdedi})</span>
          </Link>
        </div>
      )}

      {toplu === "pasif" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          <span className="rakam">{String(adet ?? "")}</span> ürün pasife alındı.
        </p>
      )}
      {toplu === "yayin" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          <span className="rakam">{String(adet ?? "")}</span> ürün yayına alındı.
        </p>
      )}
      {toplu === "sil" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          <span className="rakam">{String(adet ?? "")}</span> ürün silindi.
          {Number(atlanan) > 0 && (
            <>
              {" "}
              <span className="rakam">{String(atlanan)}</span> ürün siparişte geçtiği için
              atlandı — onları ürün sayfasından tek tek silebilirsin.
            </>
          )}
        </p>
      )}
      {/* Tek ürün silme buraya `?kayit=silindi` ile dönüyordu ama sayfa
          `kayit`i hiç okumuyordu: ürün siliniyor, ekranda hiçbir şey
          yazmıyordu (K-61). */}
      <PanelBildirim kayit={kayit} hata={hata} bildirimler={BILDIRIMLER} hatalar={HATALAR} />

      {/* Toplu işlem formu; tablo da içinde. Düz HTML, JavaScript yok. */}
      <form action={topluUrunIslemi} className="flex flex-col gap-3">
        <input type="hidden" name="eksik" value={fotografsizSuzgeci ? "fotograf" : ""} />
        {/* Toplu işlemden sonra kaldığın sayfaya dönülüyor. */}
        <SayfaAlani sayfa={durum.sayfa} />

      <div className="overflow-x-auto rounded-marka border border-cizgi bg-yuzey">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
            <tr>
              <th className="w-10 px-4 py-3">
                <span className="sr-only">Seç</span>
              </th>
              <th className="px-4 py-3">Ürün</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Fiyat</th>
              <th className="px-4 py-3">Stok</th>
              <th className="px-4 py-3">Fotoğraf</th>
              <th className="px-4 py-3">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cizgi-soluk">
            {urunler.map((u) => {
              const stok = u.variants.reduce((t, v) => t + v.stok, 0);
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      name="secili"
                      value={u.slug}
                      aria-label={`${u.ad} ürününü seç`}
                      className="h-4 w-4 accent-[var(--mercan)]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/yonetim/urunler/${u.slug}`}
                      className="font-semibold hover:text-mercan-koyu"
                    >
                      {u.ad}
                    </Link>
                    <p className="text-xs text-metin-3">{u.ozet}</p>
                  </td>
                  <td className="px-4 py-3 text-metin-2">{u.category.ad}</td>
                  <td className="rakam px-4 py-3">{fiyatYaz(u.fiyatKurus)}</td>
                  <td className="rakam px-4 py-3">
                    {stok === 0 ? (
                      <span className="font-bold text-mercan-koyu">tükendi</span>
                    ) : (
                      `${stok} adet`
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u._count.images === 0 ? (
                      <Link
                        href={`/yonetim/urunler/${u.slug}#fotograflar`}
                        className="rounded-full bg-sari-soluk px-2.5 py-1 text-xs font-bold text-sari-koyu hover:brightness-95"
                      >
                        Fotoğraf yok
                      </Link>
                    ) : (
                      <span className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={u.images[0].kucukYol || u.images[0].yol}
                          alt=""
                          width={36}
                          height={36}
                          className="rounded-[8px] bg-yuzey-sicak object-cover"
                          style={{ width: 36, height: 36 }}
                        />
                        <span className="rakam text-xs text-metin-3">{u._count.images}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.aktif ? (
                      <span className="rounded-full bg-nane-soluk px-2.5 py-1 text-xs font-bold text-nane-koyu">
                        Yayında
                      </span>
                    ) : (
                      <span className="rounded-full bg-cizgi-soluk px-2.5 py-1 text-xs font-bold text-metin-3">
                        Kapalı
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

        {/* Çubuk yalnızca bir kutu işaretliyken görünüyor; kural
            globals.css'te `:has()` ile, JavaScript'siz (K-55). */}
        {urunler.length > 0 && (
          <div className="toplu-cubuk flex flex-wrap items-center gap-2 rounded-marka border border-cizgi bg-yuzey p-4">
            <span className="text-sm font-bold text-metin-2">Seçilenleri:</span>
            <button type="submit" name="islem" value="pasif" className={ISLEM_DUGMESI}>
              Pasife al
            </button>
            <button type="submit" name="islem" value="yayin" className={ISLEM_DUGMESI}>
              Yayına al
            </button>
            {/* Toplu silme bir tıkla onlarca ürünü götürebiliyor; tek
                düğme olmamalı (K-61). */}
            <SilmeOnayi
              uyari={
                <>
                  Seçtiğin ürünler kalıcı olarak siliniyor; fotoğrafları da depodan
                  kalkıyor ve geri alınamıyor. Siparişte geçmiş ürünler atlanıyor.
                  Yalnızca satıştan kaldırmak istiyorsan <strong>Pasife al</strong>{" "}
                  yeterli.
                </>
              }
            >
              <button type="submit" name="islem" value="sil" className={SIL_DUGMESI}>
                Evet, seçilenleri sil
              </button>
            </SilmeOnayi>
            {/* Toplu silmede SİL yazma kutusu yok; o yüzden satılmış ürünler
                silinmiyor, atlanıyor ve kaç tanesinin atlandığı yazılıyor
                (K-53). */}
            <span className="text-xs text-metin-3">
              Siparişte geçmiş ürünler toplu silmede atlanıyor — onları ürün sayfasından
              tek tek silebilirsin.
            </span>
          </div>
        )}
      </form>

      <Sayfalama durum={durum} birim="ürün" adres={adres} />

      {toplamAdet === 0 && (
        <p className="text-sm text-metin-2">
          {fotografsizSuzgeci
            ? "Fotoğrafsız ürün kalmadı."
            : "Henüz ürün yok. Sağ üstten ekleyebilirsin."}
        </p>
      )}
    </div>
  );
}
