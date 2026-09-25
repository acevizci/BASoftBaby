import { listeyeEkle } from "@/server/dogum-listesi-islem";
import GonderDugmesi from "@/ui/gonder-dugmesi";

/**
 * "Doğum listeme ekle" (K-144). Seçili beden-renk listeye gidiyor; üye
 * değilse giriş sayfasına, listesi yoksa ilk eklemede açılıyor. Ürün
 * sayfası önbellekten verildiği için giriş durumu burada bilinmiyor; karar
 * sunucuda veriliyor.
 */
export default function ListeyeEkle({ variantId, slug }: { variantId?: string; slug: string }) {
  return (
    <form action={listeyeEkle} className="w-full">
      <input type="hidden" name="variantId" value={variantId ?? ""} />
      <input type="hidden" name="slug" value={slug} />
      <GonderDugmesi
        devreDisi={!variantId}
        bekleyen="Ekleniyor…"
        className="w-full rounded-full border-[1.5px] border-cizgi bg-yuzey px-6 py-2.5 text-sm font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
      >
        Doğum listeme ekle
      </GonderDugmesi>
    </form>
  );
}
