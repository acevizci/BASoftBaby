import Link from "next/link";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { olcumAyari } from "@/server/olcum";
import { olcumAyariKaydet } from "@/server/olcum-islem";
import GonderDugmesi from "@/ui/gonder-dugmesi";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

const HATALAR: Record<string, string> = {
  meta: "Meta Pixel kimliği yalnızca rakamlardan oluşuyor (10-20 hane). Events Manager'da pikselin adının altında yazıyor.",
  google: "Google etiketi \"G-\" (Analytics) ya da \"AW-\" (Google Ads) ile başlıyor.",
};

/**
 * Reklam ölçümü (K-124): Meta Pixel ve Google etiketi.
 *
 * Kimlik girilmedikçe hiçbir şey değişmiyor: site çerez kullanmıyor, bant
 * çıkmıyor (K-16). Girilince mağazada çerez onay bandı çıkıyor; araçlar
 * yalnızca "Kabul et" diyen ziyaretçide yükleniyor.
 */
export default async function OlcumAyarlari({ searchParams }: PageProps<"/yonetim/ayarlar/olcum">) {
  await yoneticiGerekli();
  const { kayit, hata } = await searchParams;
  const ayar = await olcumAyari();
  const hataMetni = typeof hata === "string" && Object.hasOwn(HATALAR, hata) ? HATALAR[hata] : undefined;
  const acik = Boolean(ayar.metaPikselId || ayar.googleEtiketId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">Reklam ölçümü</h1>
        <p className="mt-1 text-sm text-metin-3">
          Instagram, Facebook ya da Google reklamı verince hangi reklamın satış getirdiğini
          görmek için.
        </p>
      </div>

      {kayit === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Kaydedildi. {acik ? "Mağazada çerez onay bandı açık." : "Ölçüm kapalı; bant da çıkmıyor."}
        </p>
      )}
      {hataMetni && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          {hataMetni}
        </p>
      )}

      <form
        action={olcumAyariKaydet}
        className="flex flex-col gap-4 rounded-marka border border-cizgi bg-yuzey p-5"
      >
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Meta Pixel kimliği</span>
          <input
            name="meta"
            defaultValue={ayar.metaPikselId}
            inputMode="numeric"
            placeholder="örn. 1234567890123456"
            className={GIRDI}
          />
          <span className="text-xs text-metin-3">
            Instagram ve Facebook reklamları için. Meta Events Manager → Veri kaynakları.
          </span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Google etiketi</span>
          <input
            name="google"
            defaultValue={ayar.googleEtiketId}
            placeholder="örn. G-ABC123XYZ ya da AW-123456789"
            className={GIRDI}
          />
          <span className="text-xs text-metin-3">
            Google Analytics 4 (&quot;G-&quot;) ya da Google Ads (&quot;AW-&quot;). Ads dönüşümleri Analytics&apos;ten
            içe aktarılabiliyor.
          </span>
        </label>
        <div>
          <GonderDugmesi
            bekleyen="Kaydediliyor…"
            className="rounded-full bg-dugme px-6 py-2.5 font-bold text-dugme-yazi transition hover:brightness-95"
          >
            Kaydet
          </GonderDugmesi>
        </div>
      </form>

      <section className="rounded-marka border border-cizgi bg-yuzey p-5 text-sm text-metin-2">
        <h2 className="text-lg text-metin">Nasıl çalışıyor</h2>
        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5">
          <li>
            Kimlik girilince mağazada çerez onay bandı çıkıyor. &quot;Reddet&quot; ile &quot;Kabul
            et&quot; eşit; reddeden ziyaretçide hiçbir araç yüklenmiyor.
          </li>
          <li>
            Ölçülen olaylar: sayfa görüntüleme, ürün görüntüleme, sepete ekleme, ödemeye geçiş ve
            satış (tutar ve sipariş numarasıyla, bir kez).
          </li>
          <li>
            Çerez politikasına bu araçlar yazılmalı:{" "}
            <Link href="/yonetim/yasal" className="font-bold text-mavi-koyu hover:underline">
              Yasal metinler
            </Link>
            . Meta için <span className="font-mono">_fbp</span>, Google için{" "}
            <span className="font-mono">_ga</span> çerezleri.
          </li>
          <li>İkisini de boşaltıp kaydetmek ölçümü ve bandı kapatıyor.</li>
        </ul>
      </section>
    </div>
  );
}
