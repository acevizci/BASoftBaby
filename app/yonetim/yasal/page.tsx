import Link from "next/link";
import Katlanir from "@/ui/katlanir";
import { kunyeKaydet, yasalKaydet } from "@/server/yonetim";
import { kunyeGetir, yasalSayfaGetir, yasalSayfalariGetir } from "@/server/yasal";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";
const DUGME =
  "rounded-full bg-mercan px-6 py-2.5 font-bold text-white transition hover:brightness-95";

/**
 * Yasal metinler ve künye ekranı.
 *
 * Metinler koda gömülü olsaydı avukattan gelen her düzeltme için yeni bir
 * yayın gerekirdi; buradan yapıştırılıp kaydediliyor. "Metin hazır" kutusu
 * işaretlenene kadar sayfanın tepesinde taslak uyarısı duruyor ve sayfa arama
 * motorlarına kapalı kalıyor.
 */
export default async function YasalEkrani({ searchParams }: PageProps<"/yonetim/yasal">) {
  const { duzenle, kayit, hata, ac } = await searchParams;
  const sayfalar = await yasalSayfalariGetir();

  const secilenSlug =
    typeof duzenle === "string" && sayfalar.some((s) => s.slug === duzenle)
      ? duzenle
      : sayfalar[0]?.slug;
  const [sayfa, kunye] = await Promise.all([
    secilenSlug ? yasalSayfaGetir(secilenSlug) : undefined,
    kunyeGetir(),
  ]);

  // Mesafeli satışta satıcının unvanı, adresi, bir iletişim yolu ve ETBİS
  // numarası sitede bulunmak zorunda. Eksikse künye kendini açıyor: kapalı
  // bir bölümün içinde saklanan eksik, olmayan eksikle aynı şey.
  const kunyeEksikMi =
    !kunye.unvan ||
    !kunye.sirketAdresi ||
    !kunye.etbisNo ||
    !(kunye.destekTelefon || kunye.destekEposta);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Yasal metinler</h1>

      {kayit === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Metin kaydedildi.
        </p>
      )}
      {kayit === "kunye" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Künye kaydedildi.
        </p>
      )}
      {hata === "eksik" && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Başlık ve metin boş bırakılamaz.
        </p>
      )}

      <nav className="flex flex-wrap gap-2">
        {sayfalar.map((s) => (
          <Link
            key={s.slug}
            href={`/yonetim/yasal?duzenle=${s.slug}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              s.slug === secilenSlug
                ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                : "border-cizgi bg-yuzey text-metin-2 hover:border-mercan hover:text-metin"
            }`}
          >
            {s.baslik}
            {s.taslakMi && <span className="ml-1.5 font-semibold text-metin-3">taslak</span>}
          </Link>
        ))}
      </nav>

      {sayfa && (
        <form
          action={yasalKaydet}
          className="flex flex-col gap-4 rounded-marka border border-cizgi bg-yuzey p-5"
        >
          <input type="hidden" name="slug" value={sayfa.slug} />

          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg">{sayfa.baslik}</h2>
            <Link
              href={`/yasal/${sayfa.slug}`}
              className="text-xs font-bold text-mavi-koyu hover:underline"
            >
              Sayfayı gör
            </Link>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Başlık</span>
            <input name="baslik" defaultValue={sayfa.baslik} required className={GIRDI} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Özet</span>
            <input
              name="ozet"
              defaultValue={sayfa.ozet}
              maxLength={300}
              placeholder="Sayfanın başında görünen tek cümle"
              className={GIRDI}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Metin</span>
            <textarea
              name="icerik"
              defaultValue={sayfa.icerik}
              required
              rows={24}
              className={`${GIRDI} font-mono text-xs leading-relaxed`}
            />
            <span className="text-xs text-metin-3">
              Boş satır paragrafı ayırır. <span className="font-mono">## </span> ile başlayan
              satır başlık, <span className="font-mono">- </span> ile başlayan satır madde
              olur. Metin HTML olarak yorumlanmaz, olduğu gibi yapıştırabilirsin.
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-[10px] border-[1.5px] border-cizgi p-4">
            <input
              type="checkbox"
              name="hazir"
              defaultChecked={!sayfa.taslakMi}
              className="mt-1 h-4 w-4 accent-[var(--mercan)]"
            />
            <span className="text-sm text-metin-2">
              <span className="block font-bold text-metin">Metin hazır</span>
              İşaretlenmediği sürece sayfanın tepesinde &quot;bu metin taslaktır&quot; uyarısı
              görünür ve sayfa arama motorlarına kapalı kalır. Avukat onayı gelmeden
              işaretleme.
            </span>
          </label>

          <button type="submit" className={`${DUGME} self-start`}>
            Metni kaydet
          </button>
        </form>
      )}

      {/* Künye bir kere doldurulup bir daha açılmayan bir form; metin
          düzenlerken ekranın altında sürekli durmasının bir sebebi yok.
          Kaydedince ve eksik varken kendini açıyor (K-44). */}
      <Katlanir
        id="kunye"
        baslik="Künye ve ETBİS"
        acik={ac === "kunye" || kayit === "kunye" || kunyeEksikMi}
        ozet={kunyeEksikMi ? "eksik satır var" : "dolu"}
      >
      <form action={kunyeKaydet} className="flex flex-col gap-4">
        <input type="hidden" name="ac" value="kunye" />
        <p className="text-sm text-metin-2">
          Bu bilgiler alt bilgide ve yasal metinlerin altında görünür. Mesafeli satışta
          satıcının unvanı, adresi ve iletişim bilgisi ile ETBİS kayıt numarasının sitede
          bulunması zorunlu. Boş bıraktığın satır ekrana hiç basılmaz.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={ETIKET}>Unvan</span>
            <input
              name="unvan"
              defaultValue={kunye.unvan}
              placeholder="Örn. Ayşe Yılmaz — BASoftBaby"
              className={GIRDI}
            />
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={ETIKET}>Adres</span>
            <textarea
              name="sirketAdresi"
              defaultValue={kunye.sirketAdresi}
              rows={2}
              className={GIRDI}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Vergi dairesi</span>
            <input name="vergiDairesi" defaultValue={kunye.vergiDairesi} className={GIRDI} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Vergi no</span>
            <input
              name="vergiNo"
              defaultValue={kunye.vergiNo}
              className={`${GIRDI} rakam`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>MERSİS no</span>
            <input
              name="mersisNo"
              defaultValue={kunye.mersisNo}
              className={`${GIRDI} rakam`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>ETBİS no</span>
            <input name="etbisNo" defaultValue={kunye.etbisNo} className={GIRDI} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Destek telefonu</span>
            <input
              name="destekTelefon"
              defaultValue={kunye.destekTelefon}
              className={`${GIRDI} rakam`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Destek e-postası</span>
            <input
              name="destekEposta"
              type="email"
              defaultValue={kunye.destekEposta}
              className={GIRDI}
            />
          </label>
        </div>

        <button type="submit" className={`${DUGME} self-start`}>
          Künyeyi kaydet
        </button>
      </form>
      </Katlanir>
    </div>
  );
}
