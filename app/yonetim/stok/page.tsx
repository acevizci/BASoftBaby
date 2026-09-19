import Link from "next/link";
import { db } from "@/server/veritabani";
import { stoklariKaydet } from "@/server/yonetim";
import { BEDENLER, RENK_ADLARI, type RenkAdi } from "@/ui/katalog-bicim";

export const dynamic = "force-dynamic";

export default async function StokEkrani({ searchParams }: PageProps<"/yonetim/stok">) {
  const { kayit } = await searchParams;

  const urunler = await db.product.findMany({
    include: { variants: true },
    orderBy: { ad: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Stok</h1>
      <p className="text-sm text-metin-2">
        Bütün bedenlerin adedi tek ekranda. Değiştirip en alttan kaydet; sıfır yazdığın beden
        mağazada seçilemez hale gelir.
      </p>

      {kayit === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Stoklar kaydedildi.
        </p>
      )}

      <form action={stoklariKaydet} className="flex flex-col gap-5">
        {urunler.map((u) => {
          const sirali = [...u.variants].sort((a, b) => {
            const fark =
              (BEDENLER as readonly string[]).indexOf(a.beden) -
              (BEDENLER as readonly string[]).indexOf(b.beden);
            return fark !== 0 ? fark : a.renk.localeCompare(b.renk, "tr");
          });

          return (
            <section key={u.id} className="rounded-marka border border-cizgi bg-yuzey p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base">
                  <Link href={`/yonetim/urunler/${u.slug}`} className="hover:text-mercan-koyu">
                    {u.ad}
                  </Link>
                </h2>
                <span className="rakam text-xs text-metin-3">
                  toplam {u.variants.reduce((t, v) => t + v.stok, 0)} adet
                </span>
              </div>

              {sirali.length === 0 ? (
                <p className="mt-3 text-sm text-metin-3">
                  Bu ürüne henüz beden eklenmemiş.{" "}
                  <Link
                    href={`/yonetim/urunler/${u.slug}`}
                    className="font-bold text-mavi-koyu hover:underline"
                  >
                    Ekle
                  </Link>
                </p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sirali.map((v) => (
                    <label key={v.id} className="flex items-center gap-3">
                      <span className="flex-1 text-sm">
                        {v.beden}
                        <span className="text-metin-3">
                          {" "}
                          · {RENK_ADLARI[v.renk as RenkAdi] ?? v.renk}
                        </span>
                      </span>
                      <input
                        name={`stok-${v.id}`}
                        type="number"
                        min={0}
                        defaultValue={v.stok}
                        className={`rakam w-20 rounded-[10px] border-[1.5px] px-3 py-2 text-sm outline-none focus:border-mercan ${
                          v.stok === 0 ? "border-mercan bg-mercan-soluk" : "border-cizgi bg-yuzey"
                        }`}
                      />
                    </label>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        <button
          type="submit"
          className="sticky bottom-4 self-start rounded-full bg-mercan px-6 py-3 font-bold text-white shadow-md transition hover:brightness-95"
        >
          Stokları kaydet
        </button>
      </form>
    </div>
  );
}
