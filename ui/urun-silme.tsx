import Katlanir from "@/ui/katlanir";
import { urunSil } from "@/server/yonetim";
import SilmeOnayi, { SIL_DUGMESI } from "@/ui/silme-onayi";

/**
 * Ürünü silme bölümü.
 *
 * Katlanmış duruyor: günlük iş değil, yılda birkaç kez yapılan ve geri
 * alınamayan bir şey. Başlığında ne kaybedileceği yazıyor, açmadan
 * görülüyor (K-52).
 *
 * **Sipariş geçmişi zarar görmüyor** — sipariş satırı ürünün adını ve
 * bedenini kendi içinde kopya tutuyor. Ama değerlendirmeler, fotoğraflar ve
 * siparişten ürüne giden bağlantı gidiyor. Satılmış bir ürün için onay
 * yazmak gerekiyor; satılmamış ürün doğrudan siliniyor.
 */
export default function UrunSilme({
  slug,
  ad,
  siparisAdedi,
  yorumSayisi,
  fotografAdedi,
  onayHatasi,
}: {
  slug: string;
  ad: string;
  siparisAdedi: number;
  yorumSayisi: number;
  fotografAdedi: number;
  onayHatasi?: boolean;
}) {
  const satildi = siparisAdedi > 0;

  return (
    <Katlanir
      id="urunu-sil"
      baslik="Ürünü sil"
      acik={onayHatasi}
      ozet={
        satildi
          ? `${siparisAdedi} siparişte geçti — silmek yerine pasif yapabilirsin`
          : "hiç satılmamış"
      }
    >
      <form action={urunSil} className="flex flex-col gap-4">
        <input type="hidden" name="slug" value={slug} />

        <p className="text-sm text-metin-2">
          <strong>{ad}</strong> silinecek. Sipariş geçmişi bundan etkilenmiyor: eski
          siparişler ürünün adını, bedenini ve rengini kendi içinde tutuyor.
          {(yorumSayisi > 0 || fotografAdedi > 0) && (
            <>
              {" "}
              Ama{" "}
              {yorumSayisi > 0 && (
                <>
                  <span className="rakam font-bold">{yorumSayisi}</span> değerlendirme
                </>
              )}
              {yorumSayisi > 0 && fotografAdedi > 0 && " ve "}
              {fotografAdedi > 0 && (
                <>
                  <span className="rakam font-bold">{fotografAdedi}</span> fotoğraf
                </>
              )}{" "}
              de silinecek. Bu geri alınamıyor.
            </>
          )}
        </p>

        {satildi ? (
          <>
            <div className="rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm text-sari-koyu">
              <p className="font-bold">
                Bu ürün <span className="rakam">{siparisAdedi}</span> siparişte geçti.
              </p>
              <p className="mt-1">
                Satıştan kaldırmak istiyorsan <strong>pasif yap</strong> daha iyi: ürün
                vitrinden kalkar, değerlendirmeleri ve siparişten ürüne giden bağlantı
                durur. Yukarıdaki formda &quot;Ürün yayında&quot; kutusunun işaretini
                kaldırman yeterli.
              </p>
            </div>

            {onayHatasi && (
              <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
                Silmek için kutuya SİL yazman gerekiyor.
              </p>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-metin-2">
                Yine de sileceksen kutuya SİL yaz
              </span>
              <input
                name="onay"
                required
                placeholder="SİL"
                autoComplete="off"
                className="w-40 rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm outline-none focus:border-mercan"
              />
            </label>
          </>
        ) : (
          <p className="text-sm text-metin-2">
            Bu ürün hiç sipariş edilmemiş, silmenin bir yan etkisi yok.
          </p>
        )}

        {/* Satılmışta SİL yazmak zaten bir onay adımı; satılmamışta iki
            adımlı onay kutusu aynı işi görüyor (K-61). */}
        {satildi ? (
          <button
            type="submit"
            className="self-start rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
          >
            Ürünü sil
          </button>
        ) : (
          <SilmeOnayi
            etiket="Silmeyi onayla"
            uyari={
              <>
                <strong>{ad}</strong> kalıcı olarak siliniyor; geri alınamıyor.
                Fotoğrafları da depodan kalkıyor. Yalnızca satıştan kaldırmak
                istiyorsan yukarıdaki formda &quot;Ürün yayında&quot; kutusunun
                işaretini kaldırman yeterli.
              </>
            }
          >
            <button type="submit" className={SIL_DUGMESI}>
              Evet, ürünü sil
            </button>
          </SilmeOnayi>
        )}
      </form>
    </Katlanir>
  );
}
