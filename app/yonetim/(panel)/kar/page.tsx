import Link from "next/link";
import {
  GIDER_KATEGORILERI,
  ayAdi,
  ayEkle,
  ayGecerliMi,
  aylikKar,
  aySonGunu,
  buAy,
  sonAylar,
} from "@/server/sabit-gider";
import { sabitGiderEkle, sabitGiderKaldir } from "@/server/sabit-gider-islem";
import { yuzdeYaz } from "@/server/kar";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { fiyatYaz } from "@/ui/katalog-bicim";
import GonderDugmesi from "@/ui/gonder-dugmesi";

export const dynamic = "force-dynamic";

const KART = "rounded-marka border border-cizgi bg-yuzey p-5";
const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";

const BILDIRIM: Record<string, string> = {
  eklendi: "Gider eklendi.",
  silindi: "Gider silindi.",
  durduruldu: "Tekrarlı gider bu aydan itibaren durduruldu; önceki aylarda kalıyor.",
};
const HATA: Record<string, string> = {
  tutar: "Tutar okunamadı. 2500 ya da 2.500,00 gibi yaz.",
  yok: "Bu gider artık yok.",
};

/**
 * Ay sonu net kâr (K-115): siparişlerin katkı payı − sabit giderler − stok
 * kaybı ve numune (K-179).
 */
export default async function AylikKarEkrani({ searchParams }: PageProps<"/yonetim/kar">) {
  await yoneticiGerekli();
  const p = await searchParams;
  const simdiki = buAy();
  const ay = ayGecerliMi(p.ay) && p.ay <= simdiki ? p.ay : simdiki;
  const [a, gecmis] = await Promise.all([aylikKar(ay), sonAylar(12)]);
  const kayit = typeof p.kayit === "string" ? BILDIRIM[p.kayit] : undefined;
  const hata = typeof p.hata === "string" ? HATA[p.hata] : undefined;
  const raporAdresi = `/yonetim/rapor?baslangic=${ay}-01&bitis=${aySonGunu(ay)}`;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Aylık kâr</h1>
      <p className="text-sm text-metin-2">
        Siparişlerin kalanı (katkı payı: satış − maliyet − kargo, paket, komisyon) eksi kira,
        reklam, maaş gibi sabit giderler, eksi stok kaybı (hasarlı, kayıp, sayımda eksik, numune;
        alış fiyatıyla). Yalnızca ödemesi alınmış siparişler, KDV hariç.
      </p>

      {kayit && <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">{kayit}</p>}
      {hata && <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">{hata}</p>}

      <div className="flex items-center gap-3">
        <Link href={`/yonetim/kar?ay=${ayEkle(ay, -1)}`} className="rounded-full border border-cizgi px-3 py-1.5 text-sm font-bold text-metin-2 hover:border-metin-3" aria-label="Önceki ay">
          ‹
        </Link>
        <h2 className="min-w-[9rem] text-center text-lg">{ayAdi(ay)}</h2>
        {ay < simdiki ? (
          <Link href={`/yonetim/kar?ay=${ayEkle(ay, 1)}`} className="rounded-full border border-cizgi px-3 py-1.5 text-sm font-bold text-metin-2 hover:border-metin-3" aria-label="Sonraki ay">
            ›
          </Link>
        ) : (
          <span className="px-3 py-1.5 text-sm text-metin-3">bu ay</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={KART}>
          <p className="text-xs font-bold text-metin-3">Siparişlerden kalan</p>
          <p className="rakam mt-1 text-2xl font-bold">{fiyatYaz(a.kar.katkiKurus)}</p>
          <p className="mt-0.5 text-xs text-metin-3">
            {a.kar.siparis} sipariş ·{" "}
            <Link href={raporAdresi} className="font-bold text-mavi-koyu hover:underline">
              dökümü
            </Link>
          </p>
        </div>
        <div className={KART}>
          <p className="text-xs font-bold text-metin-3">Sabit giderler</p>
          <p className="rakam mt-1 text-2xl font-bold">−{fiyatYaz(a.sabitKurus)}</p>
          <p className="mt-0.5 text-xs text-metin-3">{a.giderler.length} kalem</p>
        </div>
        <div className={KART}>
          <p className="text-xs font-bold text-metin-3">Stok kaybı</p>
          <p className="rakam mt-1 text-2xl font-bold">
            −{fiyatYaz(a.kayip.kayipKurus + a.kayip.numuneKurus)}
          </p>
          <p className="rakam mt-0.5 text-xs text-metin-3">
            {a.kayip.kayipAdet} kayıp/hasar
            {a.kayip.numuneAdet > 0 && ` · ${a.kayip.numuneAdet} numune (${fiyatYaz(a.kayip.numuneKurus)})`}
            {a.kayip.maliyetsizAdet > 0 && ` · ${a.kayip.maliyetsizAdet} adedin alışı yok`}
            {" · "}
            <Link
              href={`/yonetim/stok/hareketler?baslangic=${ay}-01&bitis=${aySonGunu(ay)}`}
              className="font-bold text-mavi-koyu hover:underline"
            >
              hareketler
            </Link>
          </p>
        </div>
        <div className={`${KART} ${a.netKurus < 0 ? "border-mercan" : "border-nane"}`}>
          <p className="text-xs font-bold text-metin-3">Net kâr</p>
          <p className={`rakam mt-1 text-2xl font-bold ${a.netKurus < 0 ? "text-mercan-koyu" : "text-nane-koyu"}`}>
            {fiyatYaz(a.netKurus)}
          </p>
          <p className="mt-0.5 text-xs text-metin-3">net satışın {yuzdeYaz(a.netMarjYuzde)}</p>
        </div>
      </div>

      {a.kar.eksikSiparis > 0 && (
        <p className="rounded-marka bg-sari-soluk px-4 py-3 text-sm text-sari-koyu">
          {a.kar.eksikSiparis} sipariş eksik bilgiyle hesaplandı ({a.kar.eksikSebepler.join(", ")}). Kâr
          olduğundan yüksek görünüyor olabilir.{" "}
          <Link href="/yonetim/ayarlar/giderler" className="font-bold underline">
            Giderler
          </Link>
        </p>
      )}
      {ay === simdiki && (
        <p className="text-xs text-metin-3">Ay bitmedi; rakamlar ay sonuna kadar değişecek.</p>
      )}

      <section id="giderler" className={KART}>
        <h2 className="text-lg">{ayAdi(ay)} sabit giderleri</h2>
        {a.giderler.length === 0 ? (
          <p className="mt-2 text-sm text-metin-3">Bu ay için girilmiş sabit gider yok.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-cizgi-soluk">
              {a.giderler.map((g) => (
                <tr key={g.id}>
                  <td className="py-2">
                    <span className="font-semibold">
                      {GIDER_KATEGORILERI[g.kategori as keyof typeof GIDER_KATEGORILERI] ?? g.kategori}
                    </span>
                    {g.aciklama && <span className="text-metin-2"> · {g.aciklama}</span>}
                    {g.tekrarli && (
                      <span className="ml-2 rounded-full bg-mavi-soluk px-2 py-0.5 text-xs font-bold text-mavi-koyu">
                        her ay · {ayAdi(g.ay)}&apos;dan beri
                      </span>
                    )}
                  </td>
                  <td className="rakam py-2 text-right">{fiyatYaz(g.tutarKurus)}</td>
                  <td className="py-2 text-right">
                    <form action={sabitGiderKaldir}>
                      <input type="hidden" name="id" value={g.id} />
                      <input type="hidden" name="ay" value={ay} />
                      <button type="submit" className="text-xs font-bold text-metin-2 hover:text-mercan-koyu hover:underline">
                        {g.tekrarli && g.ay < ay ? "bu aydan durdur" : "sil"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form action={sabitGiderEkle} className="mt-4 flex flex-wrap items-end gap-3 border-t border-cizgi-soluk pt-4">
          <input type="hidden" name="ay" value={ay} />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-metin-2">Kategori</span>
            <select name="kategori" className={GIRDI} defaultValue="kira">
              {Object.entries(GIDER_KATEGORILERI).map(([k, ad]) => (
                <option key={k} value={k}>
                  {ad}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
            <span className="text-xs font-bold text-metin-2">Açıklama</span>
            <input name="aciklama" maxLength={120} placeholder="örn. depo kirası, Instagram reklamı" className={GIRDI} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-metin-2">Tutar (₺, KDV hariç)</span>
            <input name="tutar" inputMode="decimal" required className={`${GIRDI} rakam w-32`} />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="tekrarli" className="h-4 w-4 accent-[var(--mercan)]" />
            her ay tekrarla
          </label>
          <GonderDugmesi bekleyen="Ekleniyor…" className="rounded-full bg-dugme px-5 py-2 text-sm font-bold text-dugme-yazi">
            Ekle
          </GonderDugmesi>
        </form>
        <p className="mt-2 text-xs text-metin-3">
          Tekrarlı gider eklendiği aydan itibaren her ay sayılır. Tutarı değişirse bu aydan durdurup
          yenisini ekle; geçmiş aylar değişmez.
        </p>
      </section>

      <section className={KART}>
        <h2 className="text-lg">Son 12 ay</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
              <tr>
                <th className="py-2">Ay</th>
                <th className="py-2 text-right">Sipariş</th>
                <th className="py-2 text-right">Net satış</th>
                <th className="py-2 text-right">Siparişlerden kalan</th>
                <th className="py-2 text-right">Sabit gider</th>
                <th className="py-2 text-right">Stok kaybı</th>
                <th className="py-2 text-right">Net kâr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi-soluk">
              {gecmis.map((g) => (
                <tr key={g.ay} className={g.ay === ay ? "bg-yuzey-sicak" : ""}>
                  <td className="py-2">
                    <Link href={`/yonetim/kar?ay=${g.ay}`} className="font-semibold hover:text-mercan-koyu">
                      {ayAdi(g.ay)}
                    </Link>
                    {g.eksik > 0 && <span className="ml-1 text-xs text-sari-koyu" title="eksik bilgili sipariş var">*</span>}
                  </td>
                  <td className="rakam py-2 text-right">{g.siparis}</td>
                  <td className="rakam py-2 text-right">{fiyatYaz(g.netSatisKurus)}</td>
                  <td className="rakam py-2 text-right">{fiyatYaz(g.katkiKurus)}</td>
                  <td className="rakam py-2 text-right">{g.sabitKurus ? `−${fiyatYaz(g.sabitKurus)}` : "—"}</td>
                  <td className="rakam py-2 text-right">{g.kayipKurus ? `−${fiyatYaz(g.kayipKurus)}` : "—"}</td>
                  <td className={`rakam py-2 text-right font-bold ${g.netKurus < 0 ? "text-mercan-koyu" : ""}`}>
                    {fiyatYaz(g.netKurus)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-metin-3">* eksik bilgiyle hesaplanmış sipariş var.</p>
      </section>
    </div>
  );
}
