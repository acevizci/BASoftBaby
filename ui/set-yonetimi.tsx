import Link from "next/link";
import { setIslemi, setParcasiEkle, setParcasiSil } from "@/server/set-islem";
import GonderDugmesi from "@/ui/gonder-dugmesi";

type Varyant = {
  id: string;
  beden: string;
  renk: string;
  stok: number;
  hazirlanabilir: number;
  setIcerigi: {
    id: string;
    adet: number;
    variant: { beden: string; renk: string; stok: number; sku: string; product: { ad: string; slug: string } };
  }[];
};

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-2.5 py-1.5 text-sm text-metin outline-none focus:border-mercan";
const KUCUK = "rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-mercan";

const HATALAR: Record<string, string> = {
  bulunamadi: "Bu SKU ya da barkodla bir beden bulunamadı.",
  kendisi: "Set kendi ürününün bir bedenini içeremez.",
  icice: "Set içinde set olamıyor: eklenen beden bir set ya da bu beden başka bir setin parçası.",
  degisti: "Parça stoğu tam o sırada değişti; hiçbir şey düşülmedi. Tekrar dene.",
  bos: "Önce setin içeriğini ekle.",
  adet: "Geçerli bir adet yaz.",
  "set-stok": "Bozulacak kadar hazır set yok.",
};

function hataMetni(kod: string): string {
  // Sayı adres satırından geliyor: yalnızca rakamsa yazılıyor.
  if (kod.startsWith("yetersiz:") && /^\d+$/.test(kod.slice(9))) {
    return `Parça stoğu yetmiyor; en çok ${kod.slice(9)} set hazırlanabilir.`;
  }
  return (Object.hasOwn(HATALAR, kod) ? HATALAR[kod] : undefined) ?? "İşlem yapılamadı.";
}

/**
 * Ürün düzenleme ekranında set bölümü (K-133). Ürün set değilse kapalı
 * duruyor: çoğu ürün set değil, ekranı kalabalıklaştırmasın.
 */
export default function SetYonetimi({
  varyantlar,
  renkAdi,
  hata,
  kayit,
  islemAdedi,
}: {
  varyantlar: Varyant[];
  renkAdi: (kod: string) => string;
  hata?: string;
  kayit?: string;
  islemAdedi?: string;
}) {
  const setMi = varyantlar.some((v) => v.setIcerigi.length > 0);
  return (
    <details id="set" open={setMi || Boolean(hata || kayit)} className="rounded-marka border border-cizgi bg-yuzey p-5">
      <summary className="cursor-pointer text-lg font-bold">
        Set içeriği {setMi ? "" : <span className="text-sm font-normal text-metin-3">· bu ürün bir set mi?</span>}
      </summary>
      <p className="mt-2 text-sm text-metin-2">
        &quot;3&apos;lü body seti&quot; gibi ürünlerde her bedenin içinde hangi ürünlerin olduğunu yaz.
        &quot;Set hazırla&quot; o kadar seti paketliyor: parçaların stoğu düşüyor, setin stoğu artıyor.
        Müşteri seti tek ürün olarak alıyor; ürün sayfasında içindekiler ve &quot;ayrı ayrı alsan&quot;
        fiyatı görünüyor.
      </p>
      {hata && (
        <p className="mt-3 rounded-marka bg-mercan-soluk px-4 py-2 text-sm font-semibold text-mercan-koyu">{hataMetni(hata)}</p>
      )}
      {kayit && (
        <p className="mt-3 rounded-marka bg-nane-soluk px-4 py-2 text-sm font-semibold text-nane-koyu">
          {kayit === "hazirla"
            ? `${islemAdedi} set hazırlandı.`
            : kayit === "boz"
              ? `${islemAdedi} set bozuldu, parçalar stoğa döndü.`
              : "Set içeriği güncellendi."}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {varyantlar.map((v) => (
          <div key={v.id} className="rounded-[12px] border border-cizgi-soluk p-4">
            <p className="text-sm font-bold">
              {v.beden} · {renkAdi(v.renk)}
              <span className="ml-2 font-normal text-metin-3">
                hazır set: <span className="rakam">{v.stok}</span>
                {v.setIcerigi.length > 0 && (
                  <>
                    {" "}
                    · parçalarla hazırlanabilir: <span className="rakam">{v.hazirlanabilir}</span>
                  </>
                )}
              </span>
            </p>
            {v.setIcerigi.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {v.setIcerigi.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2">
                    <span className="rakam font-bold">{p.adet}×</span>
                    <Link href={`/yonetim/urunler/${p.variant.product.slug}`} className="hover:underline">
                      {p.variant.product.ad}
                    </Link>
                    <span className="text-metin-3">
                      {p.variant.beden} · {renkAdi(p.variant.renk)} · stok {p.variant.stok}
                    </span>
                    <form action={setParcasiSil}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="setVariantId" value={v.id} />
                      <button type="submit" className="text-xs font-bold text-mercan-koyu hover:underline">
                        çıkar
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <form action={setParcasiEkle} className="flex items-end gap-2">
                <input type="hidden" name="setVariantId" value={v.id} />
                <label className="flex flex-col gap-1 text-xs font-bold text-metin-2">
                  Parça (SKU ya da barkod)
                  <input name="kod" required className={`${GIRDI} w-44 font-mono`} placeholder="B1234" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-metin-2">
                  Adet
                  <input name="adet" type="number" min={1} max={20} defaultValue={1} className={`${GIRDI} w-16`} />
                </label>
                <GonderDugmesi bekleyen="…" className={KUCUK}>
                  Ekle
                </GonderDugmesi>
              </form>
              {v.setIcerigi.length > 0 && (
                <form action={setIslemi} className="flex items-end gap-2">
                  <input type="hidden" name="setVariantId" value={v.id} />
                  <label className="flex flex-col gap-1 text-xs font-bold text-metin-2">
                    Kaç set
                    <input name="adet" type="number" min={1} max={1000} defaultValue={1} className={`${GIRDI} w-16`} />
                  </label>
                  <GonderDugmesi name="tur" value="hazirla" bekleyen="…" className={KUCUK}>
                    Set hazırla
                  </GonderDugmesi>
                  <GonderDugmesi name="tur" value="boz" bekleyen="…" className={KUCUK}>
                    Seti boz
                  </GonderDugmesi>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
