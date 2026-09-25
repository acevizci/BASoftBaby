import Link from "next/link";
import { SepetAdediBildir } from "@/ui/ziyaretci";
import type { Metadata } from "next";
import UrunFoto from "@/ui/urun-foto";
import { sepetGetir } from "@/server/sepet";
import { adetDegistir, kuponKaldir, kuponUygula, satirSil } from "@/server/sepet-islem";
import { girisYapan } from "@/server/uyelik";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import { fiyatYaz, type GorselTipi } from "@/ui/katalog-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sepetim", robots: { index: false } };

export default async function SepetSayfasi({ searchParams }: PageProps<"/sepet">) {
  const { kupon } = await searchParams;
  const [sepet, girisli] = await Promise.all([
    sepetGetir(),
    girisYapan().then(Boolean),
  ]);

  if (sepet.satirlar.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <SepetAdediBildir adet={0} />
        <h1 className="text-2xl sm:text-3xl">Sepetin boş</h1>
        <p className="mt-3 text-metin-2">
          {sepet.cikarilan > 0
            ? "Sepetindeki ürün artık satışta olmadığı için çıkarıldı."
            : "Beğendiğin ürünü sepete eklediğinde burada görünecek."}
        </p>
        <Link
          href="/urunler"
          className="mt-6 inline-block rounded-full bg-dugme px-6 py-3 font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Ürünlere göz at
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Adet değişince sayfa adresi değişmiyor; üst çubuk buradan öğreniyor (K-131). */}
      <SepetAdediBildir adet={sepet.toplamAdet} />
      <h1 className="text-2xl sm:text-3xl">Sepetim</h1>
      <p className="mt-1 text-sm text-metin-2">{sepet.toplamAdet} ürün</p>
      {sepet.cikarilan > 0 && (
        <p className="mt-3 rounded-marka bg-sari-soluk px-4 py-3 text-sm text-sari-koyu">
          Sepetindeki {sepet.cikarilan} ürün artık satışta olmadığı için çıkarıldı.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <ul className="flex flex-col gap-3">
          {sepet.satirlar.map((s) => (
            <li
              key={s.variantId}
              className="flex gap-4 rounded-marka border border-cizgi bg-yuzey p-4"
            >
              <Link href={`/urun/${s.slug}`} className="w-20 flex-none sm:w-24">
                <UrunFoto
                  fotograf={s.fotograf}
                  gorsel={s.gorsel as GorselTipi}
                  palet={s.paletRenkleri}
                  className="aspect-square w-full rounded-[12px]"
                  sizes="96px"
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <Link href={`/urun/${s.slug}`} className="font-baslik font-bold hover:text-mercan-koyu">
                    {s.ad}
                  </Link>
                  <span className="rakam font-baslik font-bold text-mercan-koyu">
                    {fiyatYaz(s.araToplamKurus)}
                  </span>
                </div>

                <p className="text-sm text-metin-2">
                  {s.beden} · {s.renkAdi}
                  <span className="rakam text-metin-3"> · birim {fiyatYaz(s.fiyatKurus)}</span>
                </p>

                {s.stok === 0 ? (
                  <p className="text-sm font-bold text-mercan-koyu">
                    Bu ürün tükendi, siparişe giremez. Satırı kaldırman gerekiyor.
                  </p>
                ) : s.azaltildi ? (
                  <p className="text-sm font-semibold text-mercan-koyu">
                    Sepetine {s.azaltildi} adet koymuştun, stokta {s.stok} kaldı; adedi {s.stok}{" "}
                    olarak güncelledik.
                  </p>
                ) : s.stok <= 3 ? (
                  <p className="text-sm font-semibold text-mercan-koyu">Son {s.stok} adet</p>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-3">
                  <form action={adetDegistir} className="flex items-center gap-2">
                    <input type="hidden" name="variantId" value={s.variantId} />
                    <label className="text-xs font-bold text-metin-2" htmlFor={`adet-${s.variantId}`}>
                      Adet
                    </label>
                    <input
                      id={`adet-${s.variantId}`}
                      name="adet"
                      type="number"
                      min={1}
                      max={Math.max(1, s.stok)}
                      defaultValue={s.adet}
                      className="rakam w-16 rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-2 py-1.5 text-sm outline-none focus:border-mercan"
                    />
                    <GonderDugmesi
                      bekleyen="Güncelleniyor…"
                      className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-metin-3"
                    >
                      Güncelle
                    </GonderDugmesi>
                  </form>

                  <form action={satirSil}>
                    <input type="hidden" name="variantId" value={s.variantId} />
                    <GonderDugmesi
                      bekleyen="Kaldırılıyor…"
                      className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-mercan hover:text-mercan-koyu"
                    >
                      Kaldır
                    </GonderDugmesi>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-marka border border-cizgi bg-yuzey p-5 lg:sticky lg:top-4">
          <h2 className="text-lg">Özet</h2>

          <dl className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-metin-2">Ara toplam</dt>
              <dd className="rakam font-semibold">{fiyatYaz(sepet.araToplamKurus)}</dd>
            </div>
            {sepet.kampanya && (
              <div className="flex justify-between">
                <dt className="text-nane-koyu">
                  İndirim
                  <span className="block text-xs text-metin-3">{sepet.kampanya.ad}</span>
                </dt>
                <dd className="rakam font-semibold text-nane-koyu">
                  -{fiyatYaz(sepet.indirimKurus)}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-metin-2">Kargo</dt>
              <dd className="rakam font-semibold">
                {sepet.kargoKurus === 0 ? (
                  <span className="text-nane-koyu">Bedava</span>
                ) : (
                  fiyatYaz(sepet.kargoKurus)
                )}
              </dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-cizgi pt-3">
              <dt className="font-baslik font-bold">Toplam</dt>
              <dd className="rakam font-baslik text-lg font-bold text-mercan-koyu">
                {fiyatYaz(sepet.toplamKurus)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-cizgi pt-4">
            {sepet.kuponKodu ? (
              <form action={kuponKaldir} className="flex items-center justify-between gap-2">
                <span className="text-sm">
                  Kupon: <span className="rakam font-bold">{sepet.kuponKodu}</span>
                </span>
                <GonderDugmesi
                  bekleyen="Kaldırılıyor…"
                  className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-mercan hover:text-mercan-koyu"
                >
                    Kaldır
                </GonderDugmesi>
              </form>
            ) : (
              <form action={kuponUygula} className="flex items-end gap-2">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="text-xs font-bold text-metin-2">Kupon kodun varsa</span>
                  <input
                    name="kupon"
                    placeholder="KUPONKODU"
                    className="rakam w-full rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm uppercase outline-none focus:border-mercan"
                  />
                </label>
                <GonderDugmesi
                  bekleyen="Uygulanıyor…"
                  className="rounded-full border border-cizgi px-4 py-2 text-xs font-bold text-metin-2 hover:border-metin-3"
                >
                    Uygula
                </GonderDugmesi>
              </form>
            )}

            {kupon === "cok" && (
              <p className="mt-2 text-xs font-semibold text-mercan-koyu">
                Kısa sürede çok fazla kupon denendi. Bir saat içinde tekrar deneyebilirsin.
              </p>
            )}
            {sepet.kuponGecersizMi && (
              <p className="mt-2 text-xs font-semibold text-mercan-koyu">
                Bu kupon geçerli değil ya da süresi dolmuş.
                {/* Kişiye özel kuponlar (K-151, K-152) yalnızca sahibi girişliyken. */}
                {!girisli && (
                  <>
                    {" "}
                    Sana özel bir kuponsa önce{" "}
                    <Link href="/giris?nereye=%2Fsepet" className="underline">
                      giriş yap
                    </Link>
                    .
                  </>
                )}
              </p>
            )}
            {sepet.kuponYetersizMi && (
              <p className="mt-2 text-xs font-semibold text-metin-2">
                Kuponun geçerli, ama şu an sepetinde daha çok indiren bir kampanya var; o
                uygulandı. İndirimler üst üste binmiyor.
              </p>
            )}
          </div>

          {sepet.bedavayaKalanKurus > 0 && (
            <p className="mt-3 rounded-[10px] bg-nane-soluk px-3 py-2 text-xs font-semibold text-nane-koyu">
              <span className="rakam">{fiyatYaz(sepet.bedavayaKalanKurus)}</span> daha eklersen
              kargo bedava.
            </p>
          )}

          {sepet.sorunluMu ? (
            <p className="mt-4 rounded-[10px] bg-mercan-soluk px-3 py-2 text-sm font-semibold text-mercan-koyu">
              Tükenen ürünü kaldırınca siparişe geçebilirsin.
            </p>
          ) : (
            <Link
              href="/odeme"
              className="mt-4 block rounded-full bg-dugme px-6 py-3 text-center font-bold text-dugme-yazi transition hover:brightness-95"
            >
              Siparişi tamamla
            </Link>
          )}

          <Link
            href="/urunler"
            className="mt-3 block text-center text-sm font-bold text-mavi-koyu hover:underline"
          >
            Alışverişe devam et
          </Link>
        </aside>
      </div>
    </div>
  );
}
