import { sepeteEkle } from "@/server/sepet-islem";
import GonderDugmesi from "@/ui/gonder-dugmesi";

/**
 * "Sepete ekle" düğmesi. Düz bir HTML formu: JavaScript kapalıyken de
 * çalışır. Eklendikten sonra sepet sayfasına gidilir; müşteri ne olduğunu
 * görsün diye sessizce sayfada kalmıyoruz.
 */
export default function SepeteEkle({
  variantId,
  tamGenislik = false,
  kucuk = false,
  devreDisi = false,
}: {
  variantId?: string;
  tamGenislik?: boolean;
  kucuk?: boolean;
  devreDisi?: boolean;
}) {
  const kapali = devreDisi || !variantId;

  return (
    <form action={sepeteEkle} className={tamGenislik ? "w-full" : ""}>
      <input type="hidden" name="variantId" value={variantId ?? ""} />
      <input type="hidden" name="nereye" value="sepet" />
      <GonderDugmesi
        devreDisi={kapali}
        bekleyen="Ekleniyor…"
        className={[
          "rounded-full font-bold transition",
          kucuk ? "px-4 py-2 text-sm" : "px-6 py-3 text-base",
          tamGenislik ? "w-full" : "",
          kapali
            ? "cursor-not-allowed bg-cizgi-soluk text-metin-3"
            : "bg-mercan text-white hover:brightness-95",
        ].join(" ")}
      >
        {kapali ? "Tükendi" : "Sepete ekle"}
      </GonderDugmesi>
    </form>
  );
}
