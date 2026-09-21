import Link from "next/link";
import { db } from "@/server/veritabani";
import {
  SAYFA_BOYU,
  siparisleriAra,
  suzgecAdresi,
  suzgeciCoz,
  type SiparisSuzgeci,
} from "@/server/siparis-arama";
import { fiyatYaz } from "@/ui/katalog-bicim";
import {
  DURUMLAR,
  ODEME_ADLARI,
  ODEME_DURUMLARI,
  YONTEMLER,
  YONTEM_ADLARI,
  durumAdi,
  durumRengi,
  odemeAdi,
  yontemAdi,
} from "@/ui/siparis-bicim";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";
const ROZET = "rounded-full border px-3 py-1.5 text-xs font-bold transition";

function tarihYaz(t: Date): string {
  return t.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

/** YYYY-MM-DD; tarih girdilerinin beklediği biçim. */
function gunYaz(t: Date): string {
  return t.toISOString().slice(0, 10);
}

export default async function SiparisListesi({ searchParams }: PageProps<"/yonetim/siparisler">) {
  const suzgec = suzgeciCoz(await searchParams);
  const sonuc = await siparisleriAra(suzgec);

  // Süzgeçsiz toplam: "hiç sipariş yok" ile "bu süzgece uyan yok" farkı
  // ekranda ayrılsın diye.
  const hepsininAdedi = await db.order.count();

  const suzgecVarMi = Boolean(
    suzgec.ara || suzgec.durum || suzgec.odeme || suzgec.yontem || suzgec.baslangic || suzgec.bitis,
  );

  const simdi = new Date();
  const gunOnce = (g: number) => gunYaz(new Date(simdi.getTime() - g * 86_400_000));
  const kisayollar: [string, Partial<SiparisSuzgeci>][] = [
    ["Bugün", { baslangic: gunYaz(simdi) }],
    ["Son 7 gün", { baslangic: gunOnce(7) }],
    ["Son 30 gün", { baslangic: gunOnce(30) }],
  ];

  /** Şu anki süzgecin üstüne tek bir alanı değiştirerek adres üretir. */
  const adres = (degisiklik: Partial<SiparisSuzgeci>) =>
    suzgecAdresi({ ...suzgec, sayfa: 1, ...degisiklik });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Siparişler</h1>

      {/* Düz GET formu: JavaScript kapalıyken de çalışıyor, sonuç adresi
          paylaşılabiliyor. */}
      <form
        method="get"
        action="/yonetim/siparisler"
        className="flex flex-col gap-4 rounded-marka border border-cizgi bg-yuzey p-5"
      >
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Ara</span>
          <div className="flex flex-wrap gap-2">
            <input
              name="ara"
              defaultValue={suzgec.ara}
              placeholder="Sipariş numarası, ad, e-posta, telefon ya da kargo takip no"
              className={`${GIRDI} min-w-[240px] flex-1`}
            />
            <button
              type="submit"
              className="rounded-full bg-mercan px-5 py-2 text-sm font-bold text-white transition hover:brightness-95"
            >
              Ara
            </button>
            {suzgecVarMi && (
              <Link href="/yonetim/siparisler" className={`${ROZET} border-cizgi self-center text-metin-2 hover:border-metin-3`}>
                Temizle
              </Link>
            )}
          </div>
        </label>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Ödeme durumu</span>
            <select name="odeme" defaultValue={suzgec.odeme ?? ""} className={GIRDI}>
              <option value="">Hepsi</option>
              {ODEME_DURUMLARI.map((o) => (
                <option key={o} value={o}>
                  {ODEME_ADLARI[o]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Ödeme yöntemi</span>
            <select name="yontem" defaultValue={suzgec.yontem ?? ""} className={GIRDI}>
              <option value="">Hepsi</option>
              {YONTEMLER.map((y) => (
                <option key={y} value={y}>
                  {YONTEM_ADLARI[y]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Başlangıç</span>
            <input
              type="date"
              name="baslangic"
              defaultValue={suzgec.baslangic ?? ""}
              className={`${GIRDI} rakam`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Bitiş</span>
            <input
              type="date"
              name="bitis"
              defaultValue={suzgec.bitis ?? ""}
              className={`${GIRDI} rakam`}
            />
          </label>
        </div>

        {/* Durum rozetleri formun dışında bir bağlantı olduğu için seçili
            durum forma gizli alanla taşınıyor; yoksa arama yapınca düşerdi. */}
        {suzgec.durum && <input type="hidden" name="durum" value={suzgec.durum} />}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-metin-3">Hızlı:</span>
          {kisayollar.map(([ad, d]) => (
            <Link key={ad} href={adres({ ...d, bitis: undefined })} className={`${ROZET} border-cizgi text-metin-2 hover:border-metin-3`}>
              {ad}
            </Link>
          ))}
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <Link
          href={adres({ durum: undefined })}
          className={`${ROZET} ${
            suzgec.durum
              ? "border-cizgi text-metin-2 hover:border-metin-3"
              : "border-mercan bg-mercan-soluk text-mercan-koyu"
          }`}
        >
          Hepsi
        </Link>
        {DURUMLAR.map((d) => (
          <Link
            key={d}
            href={adres({ durum: d })}
            className={`${ROZET} ${
              suzgec.durum === d
                ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                : "border-cizgi text-metin-2 hover:border-metin-3"
            }`}
          >
            {durumAdi(d)}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <p className="text-metin-2">
          <span className="rakam font-bold">{sonuc.toplamAdet}</span> sipariş
          {suzgecVarMi && hepsininAdedi > 0 && (
            <span className="text-metin-3"> · toplam {hepsininAdedi} içinden</span>
          )}
        </p>
        <p className="text-metin-2">
          Tutar toplamı:{" "}
          <span className="rakam font-bold">{fiyatYaz(sonuc.toplamTutarKurus)}</span>
        </p>
      </div>

      {sonuc.satirlar.length === 0 ? (
        <p className="rounded-marka border border-cizgi bg-yuzey px-4 py-6 text-center text-sm text-metin-2">
          {hepsininAdedi === 0
            ? "Henüz sipariş yok."
            : "Bu aramaya uyan sipariş yok. Süzgeçleri gevşetmeyi dene."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-marka border border-cizgi bg-yuzey">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
                <tr>
                  <th className="px-4 py-3">Numara</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Müşteri</th>
                  <th className="px-4 py-3">Tutar</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Ödeme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi-soluk">
                {sonuc.satirlar.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/yonetim/siparisler/${s.numara}`}
                        className="rakam font-semibold hover:text-mercan-koyu"
                      >
                        {s.numara}
                      </Link>
                    </td>
                    <td className="rakam px-4 py-3 text-metin-2">{tarihYaz(s.olusturuldu)}</td>
                    <td className="px-4 py-3">
                      {s.adSoyad}
                      <span className="block text-xs text-metin-3">
                        {s.ilce} / {s.il}
                      </span>
                    </td>
                    <td className="rakam px-4 py-3 font-semibold">{fiyatYaz(s.toplamKurus)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${durumRengi(s.durum)}`}>
                        {durumAdi(s.durum)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${durumRengi(s.odemeDurumu)}`}>
                        {odemeAdi(s.odemeDurumu)}
                      </span>
                      <span className="mt-0.5 block text-xs text-metin-3">
                        {yontemAdi(s.odemeYontemi)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sonuc.sonSayfa > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-metin-3">
                Sayfa <span className="rakam font-bold">{sonuc.sayfa}</span> /{" "}
                <span className="rakam">{sonuc.sonSayfa}</span> · sayfada {SAYFA_BOYU} kayıt
              </p>
              <div className="flex gap-2">
                <Sayfa
                  yazi="← Önceki"
                  adres={suzgecAdresi({ ...suzgec, sayfa: sonuc.sayfa - 1 })}
                  acik={sonuc.sayfa > 1}
                />
                <Sayfa
                  yazi="Sonraki →"
                  adres={suzgecAdresi({ ...suzgec, sayfa: sonuc.sayfa + 1 })}
                  acik={sonuc.sayfa < sonuc.sonSayfa}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Sayfa({ yazi, adres, acik }: { yazi: string; adres: string; acik: boolean }) {
  if (!acik) {
    return <span className={`${ROZET} border-cizgi text-metin-3 opacity-40`}>{yazi}</span>;
  }
  return (
    <Link href={adres} className={`${ROZET} border-cizgi text-metin-2 hover:border-mercan hover:text-metin`}>
      {yazi}
    </Link>
  );
}
