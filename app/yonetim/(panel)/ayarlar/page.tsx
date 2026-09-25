import { ayarlariGetir } from "@/server/sepet";
import { satisAyariKaydet } from "@/server/yonetim";
import { TASIYICILAR } from "@/server/kargo";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { db } from "@/server/veritabani";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

/** Kuruşu form kutusuna yazılabilir hale getirir: 4990 → "49,90" */
function kurusYaz(kurus: number): string {
  return (kurus / 100).toFixed(2).replace(".", ",");
}

export default async function AyarEkrani({ searchParams }: PageProps<"/yonetim/ayarlar">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { kayit } = await searchParams;
  const ayar = await ayarlariGetir();
  const tesvik = (await db.storeSetting.findUnique({
    where: { id: "tek" },
    select: {
      tesvikYuzde: true,
      tesvikGun: true,
      tesvikGecerlilik: true,
      davetOdulKurus: true,
      davetYuzde: true,
      davetEnFazla: true,
    },
  })) ?? {
    tesvikYuzde: 0,
    tesvikGun: 10,
    tesvikGecerlilik: 30,
    davetOdulKurus: 0,
    davetYuzde: 10,
    davetEnFazla: 10,
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Satış ayarları</h1>

      {kayit === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Kaydedildi.
        </p>
      )}

      {!ayar.havaleBilgisi && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Banka bilgisi boş. Müşteri sipariş verebiliyor ama ödemeyi nereye yapacağını
          göremiyor; hesap açılınca burayı doldur.
        </p>
      )}

      <form action={satisAyariKaydet} className="flex flex-col gap-5">
        <section className="rounded-marka border border-cizgi bg-yuzey p-5">
          <h2 className="text-lg">Fatura ve kargo firması</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>KDV oranı (%)</span>
              <input
                name="kdvOrani"
                inputMode="numeric"
                defaultValue={String(ayar.kdvOrani)}
                className={`${GIRDI} rakam`}
              />
              <span className="text-xs text-metin-3">
                Faturada kullanılıyor. Fiyatlar KDV dahil girildiği için matrah bu orandan
                geriye hesaplanıyor. Kesilmiş faturalar sonradan değişmez.
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Varsayılan taşıyıcı</span>
              <select
                name="varsayilanTasiyici"
                defaultValue={ayar.varsayilanTasiyici}
                className={GIRDI}
              >
                {TASIYICILAR.map((t) => (
                  <option key={t.kod} value={t.kod}>
                    {t.ad}
                  </option>
                ))}
              </select>
              <span className="text-xs text-metin-3">
                Sipariş ekranındaki kargo alanına önceden seçili gelir.
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-marka border border-cizgi bg-yuzey p-5">
          <h2 className="text-lg">Kargo</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Kargo ücreti (₺)</span>
              <input
                name="kargo"
                inputMode="decimal"
                defaultValue={kurusYaz(ayar.kargoKurus)}
                className={`${GIRDI} rakam`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Bedava kargo eşiği (₺)</span>
              <input
                name="esik"
                inputMode="decimal"
                defaultValue={kurusYaz(ayar.bedavaKargoEsigi)}
                className={`${GIRDI} rakam`}
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-metin-3">
            Şu an: sepet <span className="rakam">{fiyatYaz(ayar.bedavaKargoEsigi)}</span> ve
            üzerindeyse kargo bedava, altındaysa{" "}
            <span className="rakam">{fiyatYaz(ayar.kargoKurus)}</span>. Eşiğe 0 yazarsan kargo
            her siparişte ücretli olur.
          </p>
        </section>

        <section className="rounded-marka border border-cizgi bg-yuzey p-5">
          <h2 className="text-lg">Havale / EFT bilgisi</h2>
          <p className="mt-1 text-xs text-metin-3">
            Sipariş veren müşteriye onay ekranında aynen bu yazı gösterilir. Banka adı, hesap
            sahibi ve IBAN yazman yeterli.
          </p>
          <label className="mt-4 flex flex-col gap-1.5">
            <span className={ETIKET}>Metin</span>
            <textarea
              name="havaleBilgisi"
              rows={5}
              maxLength={1000}
              defaultValue={ayar.havaleBilgisi}
              placeholder={"Banka: ...\nHesap sahibi: ...\nIBAN: TR.. .... .... .... .... .... .."}
              className={GIRDI}
            />
          </label>

          {/* Bekleyen havale siparişi stoğu tutuyor. Süre olmadan, parayı
              hiç göndermeyen bir sipariş o stoğu süresiz kilitliyordu
              (K-64). */}
          <div className="mt-5 grid gap-4 border-t border-cizgi-soluk pt-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Ödeme süresi (saat)</span>
              <input
                name="havaleSaat"
                type="number"
                min={0}
                max={720}
                defaultValue={ayar.havaleSaat}
                className={`${GIRDI} rakam`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Hatırlatma (bitmesine kaç saat kala)</span>
              <input
                name="havaleHatirlatmaSaat"
                type="number"
                min={0}
                max={720}
                defaultValue={ayar.havaleHatirlatmaSaat}
                className={`${GIRDI} rakam`}
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-metin-3">
            {ayar.havaleSaat > 0 ? (
              <>
                Havale siparişi{" "}
                <span className="rakam font-bold">{ayar.havaleSaat}</span> saat içinde
                ödenmezse kendiliğinden iptal oluyor ve ürünler yeniden satışa açılıyor.
                {ayar.havaleHatirlatmaSaat > 0 && (
                  <>
                    {" "}
                    Bitmesine{" "}
                    <span className="rakam font-bold">{ayar.havaleHatirlatmaSaat}</span> saat
                    kala müşteriye bir hatırlatma e-postası gidiyor.
                  </>
                )}{" "}
                Bekleyen sipariş stoğu tuttuğu için süre koymak önemli: ödemeyen bir
                sipariş, o bedeni başkasına satılamaz hâlde bırakıyor.
              </>
            ) : (
              <>
                Otomatik iptal <strong>kapalı</strong>. Ödenmeyen havale siparişleri stoğu
                sen elle iptal edene kadar tutmaya devam eder.
              </>
            )}
          </p>
        </section>

        {/* İkinci sipariş teşviki (K-151). */}
        <section className="rounded-marka border border-cizgi bg-yuzey p-5">
          <h2 className="text-lg">İkinci sipariş teşviki</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>İndirim (%) · 0 kapalı</span>
              <input
                name="tesvikYuzde"
                type="number"
                min={0}
                max={50}
                defaultValue={tesvik.tesvikYuzde}
                className={`${GIRDI} rakam`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Teslimden kaç gün sonra</span>
              <input
                name="tesvikGun"
                type="number"
                min={1}
                max={365}
                defaultValue={tesvik.tesvikGun}
                className={`${GIRDI} rakam`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Kupon kaç gün geçerli</span>
              <input
                name="tesvikGecerlilik"
                type="number"
                min={1}
                max={365}
                defaultValue={tesvik.tesvikGecerlilik}
                className={`${GIRDI} rakam`}
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-metin-3">
            {tesvik.tesvikYuzde > 0 ? (
              <>
                İlk siparişi teslim edilen üyeye{" "}
                <span className="rakam font-bold">{tesvik.tesvikGun}</span> gün sonra kendine
                özel, tek kullanımlık{" "}
                <span className="rakam font-bold">%{tesvik.tesvikYuzde}</span> kupon e-postayla
                gidiyor;{" "}
                <span className="rakam font-bold">{tesvik.tesvikGecerlilik}</span> gün geçerli.
              </>
            ) : (
              <>Kapalı.</>
            )}{" "}
            Yalnızca tanıtım e-postasına izin vermiş, e-postasını doğrulamış üyelere; her üyeye bir
            kez. Kupon yalnızca o üyenin hesabında geçerli, kampanyalar listesinde görünmez.
          </p>
        </section>

        {/* Arkadaşını davet et (K-152). */}
        <section className="rounded-marka border border-cizgi bg-yuzey p-5">
          <h2 className="text-lg">Arkadaşını davet et</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Davet edene çek (₺) · 0 kapalı</span>
              <input
                name="davetOdul"
                inputMode="decimal"
                defaultValue={kurusYaz(tesvik.davetOdulKurus)}
                className={`${GIRDI} rakam`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Davet edilene ilk sipariş (%)</span>
              <input
                name="davetYuzde"
                type="number"
                min={0}
                max={50}
                defaultValue={tesvik.davetYuzde}
                className={`${GIRDI} rakam`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Üye başına yılda en fazla ödül</span>
              <input
                name="davetEnFazla"
                type="number"
                min={1}
                max={100}
                defaultValue={tesvik.davetEnFazla}
                className={`${GIRDI} rakam`}
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-metin-3">
            {tesvik.davetOdulKurus > 0 ? (
              <>
                Açık. Her üyenin Hesabım&apos;da davet bağlantısı var. Bağlantıyla üye olan
                arkadaşa kendine özel, tek kullanımlık{" "}
                <span className="rakam font-bold">%{tesvik.davetYuzde}</span> ilk sipariş kuponu
                (30 gün); arkadaşın ilk siparişi teslim edilip 14 günlük cayma süresi geçince
                davet edene{" "}
                <span className="rakam font-bold">{fiyatYaz(tesvik.davetOdulKurus)}</span> hediye
                çeki (1 yıl geçerli).
              </>
            ) : (
              <>Kapalı: davet bağlantıları çalışmıyor, Hesabım&apos;da görünmüyor.</>
            )}{" "}
            Siparişin telefonu ya da adresi davet edeninkiyle aynıysa ödül verilmiyor.
          </p>
        </section>

        <button
          type="submit"
          className="self-start rounded-full bg-dugme px-6 py-3 font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Ayarları kaydet
        </button>
      </form>

    </div>
  );
}
