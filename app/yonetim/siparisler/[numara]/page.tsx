import Link from "next/link";
import { notFound } from "next/navigation";
import SiparisKarti from "@/ui/siparis-karti";
import { siparisGetirPanel } from "@/server/siparis";
import { siparisDurumuKaydet } from "@/server/yonetim";
import { DURUMLAR, ODEME_DURUMLARI, durumAdi, odemeAdi } from "@/ui/siparis-bicim";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

export default async function SiparisDetayi({
  params,
  searchParams,
}: PageProps<"/yonetim/siparisler/[numara]">) {
  const { numara } = await params;
  const { kayit } = await searchParams;

  const siparis = await siparisGetirPanel(numara);
  if (!siparis) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="rakam text-2xl">{siparis.numara}</h1>
        <Link href="/yonetim/siparisler" className="text-sm font-bold text-metin-2 hover:underline">
          Listeye dön
        </Link>
      </div>

      {kayit === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Kaydedildi.
        </p>
      )}

      <SiparisKarti siparis={siparis} />

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Durumu güncelle</h2>
        <p className="mt-1 text-xs text-metin-3">
          Havale hesabına para geçtiğinde ödemeyi &quot;Ödendi&quot; yap, sonra siparişi
          hazırlamaya başla.
        </p>

        <form action={siparisDurumuKaydet} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="numara" value={siparis.numara} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Sipariş durumu</span>
              <select name="durum" defaultValue={siparis.durum} className={GIRDI}>
                {DURUMLAR.map((d) => (
                  <option key={d} value={d}>
                    {durumAdi(d)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Ödeme durumu</span>
              <select name="odemeDurumu" defaultValue={siparis.odemeDurumu} className={GIRDI}>
                {ODEME_DURUMLARI.map((d) => (
                  <option key={d} value={d}>
                    {odemeAdi(d)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ETIKET}>Kargo takip numarası</span>
              <input
                name="kargoTakipNo"
                defaultValue={siparis.kargoTakipNo ?? ""}
                placeholder="kargoya verince yaz"
                className={`${GIRDI} rakam`}
              />
            </label>
          </div>

          <button
            type="submit"
            className="self-start rounded-full bg-mercan px-5 py-2.5 text-sm font-bold text-white"
          >
            Kaydet
          </button>
        </form>
      </section>
    </div>
  );
}
