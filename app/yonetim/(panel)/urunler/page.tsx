import Link from "next/link";
import { db } from "@/server/veritabani";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

export const dynamic = "force-dynamic";

const ROZET = "rounded-full border px-3 py-1.5 text-xs font-bold transition";

/**
 * Ürün listesi.
 *
 * Listede fotoğraf sütunu var ve fotoğrafsız ürünler süzülebiliyor: Excel'den
 * elli ürün yüklendiğinde hangilerinin fotoğrafı eksik kaldığını görmenin
 * başka yolu yoktu (K-41).
 */
export default async function UrunListesi({ searchParams }: PageProps<"/yonetim/urunler">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { eksik } = await searchParams;
  const fotografsizSuzgeci = eksik === "fotograf";

  const [urunler, fotografsizAdedi] = await Promise.all([
    db.product.findMany({
      where: fotografsizSuzgeci ? { images: { none: {} } } : {},
      include: {
        category: true,
        variants: true,
        images: { orderBy: { sira: "asc" }, take: 1, select: { kucukYol: true, yol: true, altMetin: true } },
        _count: { select: { images: true } },
      },
      orderBy: { olusturuldu: "asc" },
    }),
    db.product.count({ where: { images: { none: {} } } }),
  ]);

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
            className="rounded-full bg-mercan px-5 py-2.5 text-sm font-bold text-white"
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

      <div className="overflow-x-auto rounded-marka border border-cizgi bg-yuzey">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
            <tr>
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

      {urunler.length === 0 && (
        <p className="text-sm text-metin-2">Henüz ürün yok. Sağ üstten ekleyebilirsin.</p>
      )}
    </div>
  );
}
