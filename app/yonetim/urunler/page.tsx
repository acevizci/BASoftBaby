import Link from "next/link";
import { db } from "@/server/veritabani";
import { fiyatYaz } from "@/ui/katalog-bicim";

export const dynamic = "force-dynamic";

export default async function UrunListesi() {
  const urunler = await db.product.findMany({
    include: { category: true, variants: true },
    orderBy: { olusturuldu: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl">Ürünler</h1>
        <Link
          href="/yonetim/urunler/yeni"
          className="rounded-full bg-mercan px-5 py-2.5 text-sm font-bold text-white"
        >
          Yeni ürün
        </Link>
      </div>

      <div className="overflow-x-auto rounded-marka border border-cizgi bg-yuzey">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
            <tr>
              <th className="px-4 py-3">Ürün</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Fiyat</th>
              <th className="px-4 py-3">Stok</th>
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
