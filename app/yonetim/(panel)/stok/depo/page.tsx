import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import DepoEkrani from "@/ui/depo-ekrani";

export const dynamic = "force-dynamic";

/**
 * Depo (K-176): telefonla barkod okutarak mal kabulü ve stoktan çıkarma.
 * Mal kabulü sayfası buraya yönleniyor.
 */
export default async function Depo({ searchParams }: PageProps<"/yonetim/stok/depo">) {
  await yoneticiGerekli();
  const { mod } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-2xl">Depo</h1>
        <p className="mt-1 text-sm text-metin-2">
          Barkodu okut, liste birikir; bitince tek seferde kaydet. Tanınmayan barkodu bir kez
          öğretirsin, bir daha sorulmaz.
        </p>
      </div>
      <DepoEkrani baslangicModu={mod === "cikar" ? "cikar" : "gelen"} />
    </div>
  );
}
