import Link from "next/link";
import { db } from "@/server/veritabani";
import { fiyatYaz } from "@/ui/katalog-bicim";

export const dynamic = "force-dynamic";

const KRITIK_STOK = 3;

export default async function YonetimOzeti() {
  const [urunSayisi, kapaliUrun, duyuruSayisi, azalanlar, tukenenler] = await Promise.all([
    db.product.count({ where: { aktif: true } }),
    db.product.count({ where: { aktif: false } }),
    db.announcement.count({ where: { aktif: true } }),
    db.productVariant.findMany({
      where: { stok: { gt: 0, lte: KRITIK_STOK } },
      include: { product: true },
      orderBy: { stok: "asc" },
      take: 10,
    }),
    db.productVariant.count({ where: { stok: 0 } }),
  ]);

  const kutular = [
    { ad: "Yayında ürün", deger: String(urunSayisi) },
    { ad: "Kapalı ürün", deger: String(kapaliUrun) },
    { ad: "Tükenen beden", deger: String(tukenenler) },
    { ad: "Yayında duyuru", deger: String(duyuruSayisi) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl">Özet</h1>
        <Link
          href="/yonetim/urunler/yeni"
          className="rounded-full bg-mercan px-5 py-2.5 text-sm font-bold text-white"
        >
          Yeni ürün
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kutular.map((k) => (
          <div key={k.ad} className="rounded-marka border border-cizgi bg-yuzey p-4">
            <p className="text-xs font-semibold text-metin-3">{k.ad}</p>
            <p className="rakam mt-1 font-baslik text-2xl font-bold">{k.deger}</p>
          </div>
        ))}
      </div>

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Stoğu azalanlar</h2>
        {azalanlar.length === 0 ? (
          <p className="mt-2 text-sm text-metin-2">
            {KRITIK_STOK} adedin altına düşen beden yok.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
            {azalanlar.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <Link
                  href={`/yonetim/urunler/${v.product.slug}`}
                  className="font-semibold hover:text-mercan-koyu"
                >
                  {v.product.ad}
                </Link>
                <span className="text-metin-3">
                  {v.beden} · {v.renk}
                </span>
                <span className="rakam ml-auto font-bold text-mercan-koyu">{v.stok} adet</span>
                <span className="rakam text-metin-3">{fiyatYaz(v.product.fiyatKurus)}</span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/yonetim/stok"
          className="mt-4 inline-block text-sm font-bold text-mavi-koyu hover:underline"
        >
          Stok ekranına git
        </Link>
      </section>
    </div>
  );
}
