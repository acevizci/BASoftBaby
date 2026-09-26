import Link from "next/link";
import StokSekmeleri from "@/ui/stok-sekmeleri";
import { PENCERELER, pencereCoz, satmayanlar } from "@/server/satmayan";
import { renkAdlari } from "@/server/renkler";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { fiyatYaz } from "@/ui/katalog-bicim";

export const dynamic = "force-dynamic";

function kacGunOnce(t: Date | null): string {
  if (!t) return "hiç";
  const gun = Math.floor((Date.now() - t.getTime()) / (24 * 60 * 60 * 1000));
  return gun === 0 ? "bugün" : `${gun} gün önce`;
}

/**
 * Satmayan stok (K-108): rafta bekleyen para. İndirime ya da kampanyaya
 * alınacaklar buradan seçiliyor.
 */
export default async function Satmayanlar({ searchParams }: PageProps<"/yonetim/stok/satmayanlar">) {
  await yoneticiGerekli();
  const gun = pencereCoz((await searchParams).gun);
  const [rapor, adlar] = await Promise.all([satmayanlar(gun), renkAdlari()]);
  const alissiz = rapor.satirlar.some((s) => !s.maliyetMi);

  return (
    <div className="flex flex-col gap-5">
      <StokSekmeleri secili="/yonetim/stok/satmayanlar" />
      <h1 className="text-2xl">Satmayan stok</h1>
      <p className="text-sm text-metin-2">
        Son {gun} günde hiç satmamış, stoğu olan bedenler; en çok para bağlayan üstte. Bu süre
        içinde yeni mal gelen ya da yeni açılan ürünler sayılmıyor. İndirime aldığın ürünü
        favorisine ekleyenlere zaten haber gidiyor.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-metin-2">Satmadığı süre:</span>
        {PENCERELER.map((p) => (
          <Link
            key={p}
            href={`/yonetim/stok/satmayanlar?gun=${p}`}
            aria-current={gun === p ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              gun === p ? "border-mercan bg-mercan-soluk text-mercan-koyu" : "border-cizgi text-metin-2 hover:border-metin-3"
            }`}
          >
            {p} gün
          </Link>
        ))}
      </div>

      {rapor.satirlar.length === 0 ? (
        <p className="rounded-marka border border-cizgi bg-yuzey p-8 text-center text-sm text-metin-2">
          Son {gun} günde satmayan stok yok.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-marka border border-cizgi bg-yuzey p-4">
              <p className="text-xs font-bold text-metin-3">Rafta bekleyen</p>
              <p className="rakam mt-1 text-lg font-bold">
                {rapor.adet} adet · {rapor.satirlar.length} beden
              </p>
            </div>
            <div className="rounded-marka border border-cizgi bg-yuzey p-4">
              <p className="text-xs font-bold text-metin-3">Bağlı para (alış fiyatıyla)</p>
              <p className="rakam mt-1 text-lg font-bold text-mercan-koyu">{fiyatYaz(rapor.maliyetKurus)}</p>
            </div>
            <div className="rounded-marka border border-cizgi bg-yuzey p-4">
              <p className="text-xs font-bold text-metin-3">Alış fiyatı girilmemişlerin satış değeri</p>
              <p className="rakam mt-1 text-lg font-bold">{fiyatYaz(rapor.satisDegeriKurus)}</p>
            </div>
          </div>
          {alissiz && (
            <p className="text-xs text-metin-3">
              Bazı ürünlerde alış fiyatı yok; onlar satış fiyatıyla sayıldı. Ürün ekranından ya da
              toplu yüklemedeki &quot;Alış fiyatı&quot; sütunundan girebilirsin.
            </p>
          )}

          {/* Satmayanlardan kampanya (K-179): seçilenlerle sihirbaz hazır dolu açılıyor. */}
          <form id="kampanya-sec" method="get" action="/yonetim/kampanyalar/yeni" />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="mr-auto text-xs text-metin-3">
              Eritmek istediklerini işaretle, indirim kampanyası kur:
            </span>
            <button
              type="submit"
              form="kampanya-sec"
              className="rounded-full bg-dugme px-4 py-1.5 text-xs font-bold text-dugme-yazi transition hover:brightness-95"
            >
              Seçilenlerle kampanya yap
            </button>
            <a
              href={`/yonetim/stok/satmayanlar/csv?gun=${gun}`}
              download
              className="rounded-full border border-cizgi bg-yuzey px-4 py-1.5 text-xs font-bold text-metin-2 hover:border-metin-3"
            >
              CSV indir
            </a>
          </div>

          <div className="overflow-x-auto rounded-marka border border-cizgi bg-yuzey">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
                <tr>
                  <th className="w-8 px-4 py-3">
                    <span className="sr-only">Kampanyaya al</span>
                  </th>
                  <th className="px-4 py-3">Ürün</th>
                  <th className="px-4 py-3">Beden · renk</th>
                  <th className="px-4 py-3 text-right">Stok</th>
                  <th className="px-4 py-3">Son satış</th>
                  <th className="px-4 py-3">Son giriş</th>
                  <th className="px-4 py-3 text-right">Bağlı tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi-soluk">
                {rapor.satirlar.map((s) => (
                  <tr key={s.variantId}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        name="urun"
                        value={s.slug}
                        form="kampanya-sec"
                        aria-label={`${s.urunAd} kampanyaya al`}
                        className="h-4 w-4 accent-[var(--mercan)]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/yonetim/urunler/${s.slug}`} className="font-bold hover:text-mercan-koyu">
                        {s.urunAd}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {s.beden} · {adlar[s.renk] ?? s.renk}
                    </td>
                    <td className="rakam px-4 py-3 text-right">{s.stok}</td>
                    <td className="px-4 py-3 text-metin-2">{kacGunOnce(s.sonSatis)}</td>
                    <td className="px-4 py-3 text-metin-2">{s.sonGiris ? kacGunOnce(s.sonGiris) : "—"}</td>
                    <td className="rakam px-4 py-3 text-right font-bold">
                      {fiyatYaz(s.stok * s.birimKurus)}
                      {!s.maliyetMi && <span className="block text-xs font-normal text-metin-3">satış fiyatıyla</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
