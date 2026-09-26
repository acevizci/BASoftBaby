import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { kategoriEtiketleri } from "@/ui/kategori-etiketi";
import { tedarikciAdlari } from "@/server/tedarik";
import DepoEkrani from "@/ui/depo-ekrani";

export const dynamic = "force-dynamic";

/**
 * Depo (K-176, K-177): telefonla barkod okutarak mal kabulü, stoktan
 * çıkarma ve sayım. Mal kabulü sayfası buraya yönleniyor.
 */
export default async function Depo({ searchParams }: PageProps<"/yonetim/stok/depo">) {
  await yoneticiGerekli();
  const { mod } = await searchParams;
  const [kategoriler, tedarikciler] = await Promise.all([
    db.category.findMany({ orderBy: { sira: "asc" }, select: { slug: true, ad: true } }),
    tedarikciAdlari(),
  ]);
  const etiketler = kategoriEtiketleri(kategoriler);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-2xl">Depo</h1>
        <p className="mt-1 text-sm text-metin-2">
          Barkodu okut, liste birikir; bitince tek seferde kaydet. Tanınmayan barkodu bir kez
          öğretirsin, bir daha sorulmaz.
        </p>
      </div>
      <DepoEkrani
        baslangicModu={mod === "cikar" ? "cikar" : mod === "say" ? "say" : "gelen"}
        kategoriler={kategoriler.map((k) => ({ slug: k.slug, ad: etiketler.get(k.slug) ?? k.ad }))}
        tedarikciler={tedarikciler}
      />
    </div>
  );
}
