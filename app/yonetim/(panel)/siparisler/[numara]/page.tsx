import Link from "next/link";
import KarDokumu from "@/ui/kar-dokumu";
import { siparisKariGetir } from "@/server/siparis-kari";
import { notFound } from "next/navigation";
import SiparisKarti from "@/ui/siparis-karti";
import { siparisGetirPanel } from "@/server/siparis";
import {
  faturaHazirla,
  faturaKaydiGuncelle,
  irsaliyeHazirla,
  kargoKaydet,
  siparisDurumuKaydet,
} from "@/server/yonetim";
import { GONDERI_DURUM_ADLARI, TASIYICILAR, gonderiGetir } from "@/server/kargo";
import { faturaGetir } from "@/server/fatura";
import { belgeBasilabilirMi } from "@/server/siparis-belge";
import { siparisinIadeleri } from "@/server/iade";
import { irsaliyeGetir } from "@/server/irsaliye";
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
  const { kayit, hata } = await searchParams;

  const [siparis, gonderi, fatura, ayar] = await Promise.all([
    siparisGetirPanel(numara),
    gonderiGetir(numara),
    faturaGetir(numara),
    ayarlariGetir(),
  ]);
  if (!siparis) notFound();

  const belge = belgeBasilabilirMi(siparis);
  // Bu siparişin iade kayıtları: borç ve ödendiği an sipariş ekranında da
  // görünmeli, ayrı bir listeye bakmayı gerektirmemeli (K-58).
  const [iadeler, kar] = await Promise.all([
    siparisinIadeleri(siparis.numara),
    siparisKariGetir(siparis.numara),
  ]);
  const irsaliye = await irsaliyeGetir(siparis.numara);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="rakam text-2xl">{siparis.numara}</h1>
        <Link href="/yonetim/siparisler" className="text-sm font-bold text-metin-2 hover:underline">
          Listeye dön
        </Link>
      </div>

      {hata === "iptal-acilmaz" && (
        <p className="rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm text-sari-koyu">
          İptal edilmiş sipariş yeniden açılamıyor: ürünleri stoğa geri verildi. Müşteri yine
          istiyorsa yeni sipariş vermesi gerekiyor.
        </p>
      )}
      {hata === "odenmedi" && (
        <p className="rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm text-sari-koyu">
          Ödemesi tamamlanmamış siparişe fatura kesilmiyor. Havale geldiyse aşağıdan
          ödeme durumunu &quot;Ödendi&quot; yap.
        </p>
      )}

      {typeof kayit === "string" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          {kayit === "kargo"
            ? "Kargo bilgisi kaydedildi. Takip numarası girildiyse müşteriye e-posta gitti."
            : kayit === "fatura"
              ? "Fatura kaydı güncellendi."
              : kayit === "iptal"
                ? "Sipariş iptal edildi, ürünleri stoğa geri döndü. Parası alındıysa iade kaydı açıldı."
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
            className="self-start rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
          >
            Kaydet
          </button>
        </form>
      </section>

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">Kargo</h2>
          {/* Ödemesi tamamlanmamış siparişe etiket basmak "gönderiyorum"
              demek; bağlantı hiç çıkmıyor ve sayfası da reddediyor (K-54). */}
          {belge.basilabilir ? (
            <Link
              href={`/yonetim/siparisler/${siparis.numara}/etiket`}
              className="text-sm font-bold text-mavi-koyu hover:underline"
            >
              Etiketi yazdır
            </Link>
          ) : (
            <span className="text-xs text-metin-3">Etiket için ödeme bekleniyor</span>
          )}
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

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Kargo ücreti (₺, KDV hariç, isteğe bağlı)</span>
              <input
                name="ucret"
                inputMode="decimal"
                defaultValue={
                  gonderi?.ucretKurus != null ? (gonderi.ucretKurus / 100).toFixed(2).replace(".", ",") : ""
                }
                placeholder="boşsa ayardaki ortalama"
                className={`${GIRDI} rakam`}
              />
              <span className="text-xs text-metin-3">Firmaya ödediğin; yalnızca kâr hesabı için.</span>
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
            className="self-start rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
          >
            Kargoyu kaydet
          </button>
        </form>
      </section>

      {/* İade kayıtları: borç ve ödendiği an siparişin kendi ekranında da
          görünüyor, ayrı listeye bakmayı gerektirmiyor (K-58). */}
      <KarDokumu kar={kar} iptal={siparis.durum === "iptal"} />

      {iadeler.length > 0 && (
        <section className="rounded-marka border border-cizgi bg-yuzey p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg">İadeler</h2>
            <Link
              href="/yonetim/iadeler"
              className="text-sm font-bold text-mavi-koyu hover:underline"
            >
              İade listesi
            </Link>
          </div>
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk text-sm">
            {iadeler.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="rakam font-bold">
                  {i.tutarKurus > 0 || i.hediyeCekiKurus === 0 ? fiyatYaz(i.tutarKurus) : null}
                  {/* Çekle ödenen kısım bakiyesine döndü; gönderilecek para değil (K-137). */}
                  {i.hediyeCekiKurus > 0 && (
                    <span className="font-semibold text-nane-koyu">
                      {i.tutarKurus > 0 ? " + " : ""}
                      {fiyatYaz(i.hediyeCekiKurus)} çek bakiyesine
                    </span>
                  )}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    i.durum === "tamamlandi"
                      ? "bg-nane-soluk text-nane-koyu"
                      : i.durum === "basarisiz"
                        ? "bg-mercan-soluk text-mercan-koyu"
                        : "bg-sari-soluk text-sari-koyu"
                  }`}
                >
                  {i.durum === "tamamlandi"
                    ? "İade edildi"
                    : i.durum === "basarisiz"
                      ? "Gönderilemedi"
                      : "Bekliyor"}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-metin-3">
                  {i.aciklama}
                  {i.saglayiciRef && ` · ${i.saglayiciRef}`}
                  {i.hata && ` · ${i.hata}`}
                </span>
                <span className="rakam text-xs text-metin-3">
                  {(i.tamamlandi ?? i.olusturuldu).toLocaleDateString("tr-TR")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* İrsaliye faturadan ayrı bir belge: fatura satışın, irsaliye malın
          belgesi. Kutunun yanında gidiyor ve fiyat taşımıyor (K-59). */}
      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">Sevk irsaliyesi</h2>
          {irsaliye && belge.basilabilir && (
            <Link
              href={`/yonetim/siparisler/${siparis.numara}/irsaliye`}
              className="text-sm font-bold text-mavi-koyu hover:underline"
            >
              İrsaliyeyi yazdır
            </Link>
          )}
        </div>

        {irsaliye ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[160px_1fr]">
            <dt className="text-metin-3">İrsaliye no</dt>
            <dd className="rakam font-bold">{irsaliye.numara}</dd>
            <dt className="text-metin-3">Düzenleme</dt>
            <dd className="rakam">
              {irsaliye.tarih.toLocaleString("tr-TR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </dd>
            <dt className="text-metin-3">Fiili sevk</dt>
            <dd className="rakam">
              {irsaliye.sevk
                ? irsaliye.sevk.toLocaleString("tr-TR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "kargo kaydedilince dolacak"}
            </dd>
          </dl>
        ) : (
          <>
            <p className="mt-1 text-xs text-metin-3">
              Malın yanında giden belge. Fiyat yazmıyor; kutuyu açanın tutarı görmesi
              gerekmiyor. Kargo bilgisini kaydettiğinde fiili sevk tarihi kendiliğinden
              doluyor.
            </p>
            {belge.basilabilir ? (
              <form action={irsaliyeHazirla} className="mt-4">
                <input type="hidden" name="numara" value={siparis.numara} />
                <button
                  type="submit"
                  className="rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
                >
                  İrsaliye oluştur
                </button>
              </form>
            ) : (
              <p className="mt-3 rounded-marka bg-yuzey-sicak px-3 py-2 text-xs text-metin-2">
                {belge.sebep}
              </p>
            )}
          </>
        )}
      </section>

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">Fatura</h2>
          {fatura && belge.basilabilir && (
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
                className="self-start rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
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
            {belge.basilabilir ? (
              <form action={faturaHazirla} className="mt-4">
                <input type="hidden" name="numara" value={siparis.numara} />
                <button
                  type="submit"
                  className="rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
                >
                  Fatura oluştur
                </button>
              </form>
            ) : (
              /* Fatura satışın belgesi: ödeme gelmeden kesilmiyor. Kural
                 sunucuda da var — görünmeyen düğme koruma değildir (K-54). */
              <p className="mt-3 rounded-marka bg-yuzey-sicak px-3 py-2 text-xs text-metin-2">
                {belge.sebep}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
