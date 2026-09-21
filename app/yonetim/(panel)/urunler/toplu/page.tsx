import Link from "next/link";
import { db } from "@/server/veritabani";
import { planYap, type Hata, type Satir } from "@/server/toplu-urun";
import { topluOnizle, topluUygula, topluVazgec } from "@/server/toplu-urun-islem";
import { BEDENLER, RENK_ADLARI, fiyatYaz } from "@/ui/katalog-bicim";

export const dynamic = "force-dynamic";

const KART = "rounded-marka border border-cizgi bg-yuzey p-5";
const ANA_DUGME =
  "rounded-full bg-mercan px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95";
const KUCUK_DUGME =
  "rounded-full border border-cizgi bg-yuzey px-4 py-2 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin";

/** Beklenen sütunlar; ekranda da burada da tek liste. */
const SUTUN_ACIKLAMA: [string, string][] = [
  ["Ürün adı", "Zorunlu. Aynı adı taşıyan satırlar tek ürün olur."],
  ["Kategori", "Zorunlu. Panelde açık bir kategorinin adı ya da adresi."],
  ["Fiyat", "Yeni üründe zorunlu. 249,90 ya da 249.90."],
  ["Eski fiyat", "İsteğe bağlı. Üstü çizili gösterilen fiyat."],
  ["Özet", "Kartta ve ürün sayfasının başında görünen tek cümle."],
  ["Açıklama", "İsteğe bağlı, uzun metin."],
  ["Kumaş içeriği", "Yeni üründe zorunlu — bebek tekstilinde yasal."],
  ["Yıkama talimatı", "Yeni üründe zorunlu."],
  ["Üretici", "İsteğe bağlı."],
  ["Özellikler", "Madde madde; aralarına | koy."],
  ["Beden", `Zorunlu. ${BEDENLER.join(", ")}.`],
  ["Renk", `Zorunlu. ${Object.values(RENK_ADLARI).join(", ")}.`],
  ["Stok", "Zorunlu. Tam sayı."],
  ["SKU", "Boş bırakılırsa üretilir."],
  ["Görsel", "Çizim tipi. Boşsa zıbın."],
  ["Palet", "Kart rengi. Boşsa nane."],
  ["Aktif", "Evet/Hayır. Boşsa evet."],
];

export default async function TopluYukleme({
  searchParams,
}: PageProps<"/yonetim/urunler/toplu">) {
  const { yukleme, hata, mesaj, urun, varyant } = await searchParams;

  const kayit =
    typeof yukleme === "string"
      ? await db.productImport.findUnique({ where: { id: yukleme } })
      : null;

  const satirlar = (kayit?.satirlar ?? []) as unknown as Satir[];
  const bicimHatalari = (kayit?.hatalar ?? []) as unknown as Hata[];
  const plan = kayit ? await planYap(satirlar) : null;
  const hatalar = [...bicimHatalari, ...(plan?.hatalar ?? [])].sort(
    (a, b) => a.satirNo - b.satirNo,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl">Toplu ürün yükleme</h1>
        <Link href="/yonetim/urunler" className={KUCUK_DUGME}>
          Ürün listesi
        </Link>
      </div>

      {urun && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Yüklendi: {urun} ürün, {varyant} beden-renk satırı işlendi.
        </p>
      )}
      {hata === "dosya" && <Uyari>Bir dosya seçilmedi.</Uyari>}
      {hata === "buyuk" && <Uyari>Dosya çok büyük. En fazla 5 MB.</Uyari>}
      {hata === "yok" && <Uyari>Bu yükleme kaydı artık yok. Dosyayı yeniden yükle.</Uyari>}
      {hata === "zaten" && <Uyari>Bu dosya zaten işlenmiş. İkinci kez yazılmadı.</Uyari>}
      {(hata === "okuma" || hata === "yazma") && (
        <Uyari>{typeof mesaj === "string" ? mesaj : "Dosya okunamadı."}</Uyari>
      )}

      {!kayit && (
        <>
          <form action={topluOnizle} className={`${KART} flex flex-col gap-4`}>
            <div>
              <h2 className="text-lg">Dosya seç</h2>
              <p className="mt-1 text-xs text-metin-3">
                Excel (.xlsx) ya da CSV. Her satır bir beden-renk; aynı ürün adını taşıyan
                satırlar tek ürün olur. Dosya önce okunup ne olacağı gösterilir, kataloğa
                onayladıktan sonra yazılır.
              </p>
            </div>
            <input
              type="file"
              name="dosya"
              required
              accept=".xlsx,.csv,.txt"
              className="text-sm text-metin-2 file:mr-3 file:rounded-full file:border-0 file:bg-cizgi-soluk file:px-4 file:py-2 file:text-sm file:font-bold file:text-metin"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className={ANA_DUGME}>
                Dosyayı oku
              </button>
              {/* Dosya indirme: Link istemci tarafında gezinmeye çalışır,
                  burada gereken tarayıcının indirmesi. */}
              <a href="/yonetim/urunler/toplu/sablon" download className={KUCUK_DUGME}>
                Boş şablonu indir (.xlsx)
              </a>
            </div>
          </form>

          <section className={KART}>
            <h2 className="text-lg">Sütunlar</h2>
            <p className="mt-1 text-xs text-metin-3">
              Sütun sırası önemli değil, başlıkların adı önemli. Tanınmayan sütunlar
              yok sayılır. Var olan bir ürünü güncellerken boş bıraktığın hücre eski
              değeri siler değil, olduğu gibi bırakır — yalnızca stok yazılı bir dosya
              da yükleyebilirsin.
            </p>
            <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {SUTUN_ACIKLAMA.map(([ad, aciklama]) => (
                <div key={ad} className="text-sm">
                  <dt className="font-bold">{ad}</dt>
                  <dd className="text-xs text-metin-3">{aciklama}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}

      {kayit && plan && (
        <>
          <section className={KART}>
            <h2 className="text-lg">{kayit.dosyaAdi}</h2>
            <p className="mt-1 text-sm text-metin-2">
              {satirlar.length} satır okundu, {plan.urunler.length} ürüne ayrıldı.
            </p>

            {hatalar.length > 0 ? (
              <div className="mt-4">
                <p className="text-sm font-bold text-mercan-koyu">
                  {hatalar.length} hata var; hiçbir şey yazılmadı. Dosyayı düzeltip yeniden
                  yükle.
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {hatalar.slice(0, 50).map((h, i) => (
                    <li key={i} className="text-metin-2">
                      <span className="rakam font-bold">{h.satirNo}. satır</span> ·{" "}
                      {h.sutun}: {h.mesaj}
                    </li>
                  ))}
                </ul>
                {hatalar.length > 50 && (
                  <p className="mt-2 text-xs text-metin-3">
                    …ve {hatalar.length - 50} hata daha.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-metin-2">
                Hata yok. Aşağıdakiler yazılacak; dosyada olmayan ürün ve varyantlara
                dokunulmayacak.
              </p>
            )}
          </section>

          <section className={KART}>
            <h2 className="text-lg">Ne olacak</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
                  <tr>
                    <th className="py-2 pr-4">Ürün</th>
                    <th className="py-2 pr-4">Durum</th>
                    <th className="py-2 pr-4">Fiyat</th>
                    <th className="py-2 pr-4">Beden-renk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cizgi-soluk">
                  {plan.urunler.map((u) => {
                    const fiyat = satirlar
                      .filter((s) => s.ad === u.ad)
                      .map((s) => s.fiyatKurus)
                      .find((f) => f !== null);
                    return (
                      <tr key={u.slug}>
                        <td className="py-2 pr-4 font-bold">{u.ad}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              u.yeniMi
                                ? "bg-nane-soluk text-nane-koyu"
                                : "bg-cizgi-soluk text-metin-3"
                            }`}
                          >
                            {u.yeniMi ? "yeni" : "güncellenecek"}
                          </span>
                        </td>
                        <td className="py-2 pr-4 rakam">
                          {fiyat != null ? fiyatYaz(fiyat) : "değişmiyor"}
                        </td>
                        <td className="py-2 pr-4 rakam">
                          {u.varyant}
                          {u.yeniVaryant > 0 && !u.yeniMi && (
                            <span className="ml-1 text-xs text-nane-koyu">
                              ({u.yeniVaryant} yeni)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {hatalar.length === 0 && !kayit.uygulandi && (
                <form action={topluUygula}>
                  <input type="hidden" name="id" value={kayit.id} />
                  <button type="submit" className={ANA_DUGME}>
                    Kataloğa yaz
                  </button>
                </form>
              )}
              <form action={topluVazgec}>
                <input type="hidden" name="id" value={kayit.id} />
                <button type="submit" className={KUCUK_DUGME}>
                  Vazgeç
                </button>
              </form>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Uyari({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
      {children}
    </p>
  );
}
