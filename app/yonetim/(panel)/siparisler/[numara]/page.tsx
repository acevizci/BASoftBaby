import Link from "next/link";
import { notFound } from "next/navigation";
import SiparisKarti from "@/ui/siparis-karti";
import { siparisGetirPanel } from "@/server/siparis";
import {
  faturaHazirla,
  faturaKaydiGuncelle,
  kargoKaydet,
  siparisDurumuKaydet,
} from "@/server/yonetim";
import { GONDERI_DURUM_ADLARI, TASIYICILAR, gonderiGetir } from "@/server/kargo";
import { faturaGetir } from "@/server/fatura";
import { ayarlariGetir } from "@/server/sepet";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { DURUMLAR, ODEME_DURUMLARI, durumAdi, odemeAdi } from "@/ui/siparis-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

export default async function SiparisDetayi({
  params,
  searchParams,
}: PageProps<"/yonetim/siparisler/[numara]">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { numara } = await params;
  const { kayit } = await searchParams;

  const [siparis, gonderi, fatura, ayar] = await Promise.all([
    siparisGetirPanel(numara),
    gonderiGetir(numara),
    faturaGetir(numara),
    ayarlariGetir(),
  ]);
  if (!siparis) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="rakam text-2xl">{siparis.numara}</h1>
        <Link href="/yonetim/siparisler" className="text-sm font-bold text-metin-2 hover:underline">
          Listeye dön
        </Link>
      </div>

      {typeof kayit === "string" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          {kayit === "kargo"
            ? "Kargo bilgisi kaydedildi. Takip numarası girildiyse müşteriye e-posta gitti."
            : kayit === "fatura"
              ? "Fatura kaydı güncellendi."
              : "Kaydedildi."}
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

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">Kargo</h2>
          <Link
            href={`/yonetim/siparisler/${siparis.numara}/etiket`}
            className="text-sm font-bold text-mavi-koyu hover:underline"
          >
            Etiketi yazdır
          </Link>
        </div>
        <p className="mt-1 text-xs text-metin-3">
          Takip numarasını girip kaydedince sipariş &quot;kargoda&quot; olur ve müşteriye
          taşıyıcının sorgulama bağlantısıyla e-posta gider. Aynı numarayı tekrar
          kaydetmek ikinci bir e-posta göndermez.
        </p>

        <form action={kargoKaydet} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="numara" value={siparis.numara} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Taşıyıcı</span>
              <select
                name="tasiyici"
                defaultValue={gonderi?.tasiyici ?? ayar.varsayilanTasiyici}
                className={GIRDI}
              >
                {TASIYICILAR.map((t) => (
                  <option key={t.kod} value={t.kod}>
                    {t.ad}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Takip numarası</span>
              <input
                name="takipNo"
                defaultValue={gonderi?.takipNo ?? siparis.kargoTakipNo ?? ""}
                placeholder="kargo firmasından aldığın numara"
                className={`${GIRDI} rakam`}
              />
            </label>
          </div>

          {gonderi && (
            <p className="text-xs text-metin-3">
              Gönderi durumu: <span className="font-bold">
                {GONDERI_DURUM_ADLARI[gonderi.durum as keyof typeof GONDERI_DURUM_ADLARI] ??
                  gonderi.durum}
              </span>
              {gonderi.takipAdresi && (
                <>
                  {" · "}
                  <a
                    href={gonderi.takipAdresi}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-mavi-koyu hover:underline"
                  >
                    taşıyıcıda sorgula
                  </a>
                </>
              )}
            </p>
          )}

          <button
            type="submit"
            className="self-start rounded-full bg-mercan px-5 py-2.5 text-sm font-bold text-white"
          >
            Kargoyu kaydet
          </button>
        </form>
      </section>

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">Fatura</h2>
          {fatura && (
            <Link
              href={`/yonetim/siparisler/${siparis.numara}/fatura`}
              className="text-sm font-bold text-mavi-koyu hover:underline"
            >
              Faturayı yazdır
            </Link>
          )}
        </div>

        {fatura ? (
          <>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[160px_1fr]">
              <dt className="text-metin-3">Fatura no</dt>
              <dd className="rakam font-bold">{fatura.numara}</dd>
              <dt className="text-metin-3">Matrah</dt>
              <dd className="rakam">{fiyatYaz(fatura.matrahKurus)}</dd>
              <dt className="text-metin-3">KDV (%{fatura.kdvOrani})</dt>
              <dd className="rakam">{fiyatYaz(fatura.kdvKurus)}</dd>
              <dt className="text-metin-3">Toplam</dt>
              <dd className="rakam font-bold">{fiyatYaz(fatura.toplamKurus)}</dd>
            </dl>

            <form action={faturaKaydiGuncelle} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="numara" value={siparis.numara} />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={ETIKET}>Resmî fatura numarası</span>
                  <input
                    name="saglayiciRef"
                    defaultValue={fatura.saglayiciRef ?? ""}
                    placeholder="e-arşivde kesilen numara"
                    className={`${GIRDI} rakam`}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={ETIKET}>Durum</span>
                  <select name="durum" defaultValue={fatura.durum} className={GIRDI}>
                    <option value="taslak">Taslak</option>
                    <option value="kesildi">Kesildi</option>
                    <option value="iptal">İptal</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={ETIKET}>Fatura belgesinin adresi</span>
                  <input
                    name="pdfAdresi"
                    type="url"
                    defaultValue={fatura.pdfAdresi ?? ""}
                    placeholder="https://..."
                    className={GIRDI}
                  />
                </label>
              </div>
              <button
                type="submit"
                className="self-start rounded-full bg-mercan px-5 py-2.5 text-sm font-bold text-white"
              >
                Fatura kaydını güncelle
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-1 text-xs text-metin-3">
              Fatura oluşturulunca numarası verilir ve KDV, sipariş toplamından
              ayrıştırılır. Oran satış ayarlarından değiştirilebiliyor; şu an %
              {ayar.kdvOrani}.
            </p>
            <form action={faturaHazirla} className="mt-4">
              <input type="hidden" name="numara" value={siparis.numara} />
              <button
                type="submit"
                className="rounded-full bg-mercan px-5 py-2.5 text-sm font-bold text-white"
              >
                Fatura oluştur
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
