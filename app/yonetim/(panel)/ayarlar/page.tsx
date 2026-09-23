import { ayarlariGetir } from "@/server/sepet";
import { satisAyariKaydet } from "@/server/yonetim";
import { TASIYICILAR } from "@/server/kargo";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { giderAyari } from "@/server/siparis-kari";
import { giderAyariKaydet } from "@/server/gider-islem";

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
  const [ayar, gider] = await Promise.all([ayarlariGetir(), giderAyari()]);
  const bosYaz = (k: number | null) => (k === null ? "" : kurusYaz(k));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Satış ayarları</h1>

      {kayit === "gider" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Giderler kaydedildi. Siparişlerin kâr dökümü bunlarla hesaplanıyor.
        </p>
      )}
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

        <button
          type="submit"
          className="self-start rounded-full bg-dugme px-6 py-3 font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Ayarları kaydet
        </button>
      </form>

      {/* Kâr hesabının giderleri ayrı form: satış ayarları mağazayı
          etkiliyor, bunlar yalnızca panelin hesabını (K-112). */}
      <form
        id="giderler"
        action={giderAyariKaydet}
        className="flex flex-col gap-4 rounded-marka border border-cizgi bg-yuzey p-5"
      >
        <div>
          <h2 className="text-lg">Giderler (kâr hesabı için)</h2>
          <p className="mt-1 text-xs text-metin-3">
            Yalnızca panelde, siparişin ve raporun kâr dökümünde kullanılır; müşteri görmez.
            Bilmediğin kutuyu boş bırak: o kalem hesaba girmez ve dökümde &quot;girilmedi&quot;
            yazar. Sıfır &quot;bu gider yok&quot; demek. Tutarlar KDV hariç.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <GiderKutusu ad="kargoGider" etiket="Kargo firmasına gönderi başı (₺)" deger={bosYaz(gider.kargoGiderKurus)}
            aciklama="Ortalama. Siparişte gerçek ücret girilirse o kullanılır." />
          <GiderKutusu ad="paketGider" etiket="Sipariş başı paket (₺)" deger={bosYaz(gider.paketGiderKurus)}
            aciklama="Kutu, poşet, etiket." />
          <GiderKutusu ad="hediyePaketGider" etiket="Hediye paketi ek (₺)" deger={bosYaz(gider.hediyePaketGiderKurus)}
            aciklama="Hediye paketi istenen siparişte pakete eklenir." />
          <GiderKutusu
            ad="kartKomisyon"
            etiket="Kart komisyonu (%)"
            deger={gider.kartKomisyonOnbinde === null ? "" : (gider.kartKomisyonOnbinde / 100).toString().replace(".", ",")}
            aciklama="iyzico'nun gerçek kesintisi ödeme cevabından okunur; bu yalnızca yedek."
          />
          <GiderKutusu ad="kartSabit" etiket="Kart işlem başı sabit (₺)" deger={bosYaz(gider.kartKomisyonSabitKurus)}
            aciklama="Varsa işlem başı ücret." />
        </div>
        <button
          type="submit"
          className="self-start rounded-full bg-dugme px-6 py-3 font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Giderleri kaydet
        </button>
      </form>
    </div>
  );
}

function GiderKutusu({ ad, etiket, deger, aciklama }: { ad: string; etiket: string; deger: string; aciklama: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={ETIKET}>{etiket}</span>
      <input name={ad} inputMode="decimal" defaultValue={deger} placeholder="girilmedi" className={`${GIRDI} rakam`} />
      <span className="text-xs text-metin-3">{aciklama}</span>
    </label>
  );
}
