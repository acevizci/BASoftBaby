import Link from "next/link";
import { db } from "@/server/veritabani";
import { sayimlar } from "@/server/sayim";
import { sayimBaslat } from "@/server/sayim-islem";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { fiyatYaz } from "@/ui/katalog-bicim";
import GonderDugmesi from "@/ui/gonder-dugmesi";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const DURUM_ADI: Record<string, string> = { acik: "sürüyor", tamam: "bitti", iptal: "vazgeçildi" };

/** Stok sayımları (K-107): yeni sayım ve geçmiş sayımların farkları. */
export default async function Sayimlar() {
  await yoneticiGerekli();

  const [liste, kategoriler] = await Promise.all([
    sayimlar(),
    db.category.findMany({ orderBy: { sira: "asc" }, select: { slug: true, ad: true } }),
  ]);
  const bugun = new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Sayım</h1>
      <p className="text-sm text-metin-2">
        Raftaki gerçek adedi gir, sistemle farkları gör, onaylayınca stok düzeltilsin. Kargoya
        verilmemiş siparişlerin ürünleri hâlâ rafta olduğu için hesaba katılıyor. Sayım sürerken
        satış olursa o da korunuyor.
      </p>

      <form action={sayimBaslat} className="flex flex-wrap items-end gap-3 rounded-marka border border-cizgi bg-yuzey p-4">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-bold text-metin-2">Sayımın adı</span>
          <input name="ad" defaultValue={`Sayım ${bugun}`} maxLength={80} className={GIRDI} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-metin-2">Ne sayılacak</span>
          <select name="kapsam" defaultValue="" className={GIRDI}>
            <option value="">Bütün ürünler</option>
            {kategoriler.map((k) => (
              <option key={k.slug} value={k.slug}>
                {k.ad}
              </option>
            ))}
          </select>
        </label>
        <GonderDugmesi
          bekleyen="Açılıyor…"
          className="rounded-full bg-dugme px-5 py-2 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Sayım başlat
        </GonderDugmesi>
      </form>

      {liste.length === 0 ? (
        <p className="rounded-marka border border-cizgi bg-yuzey p-8 text-center text-sm text-metin-2">
          Henüz sayım yapılmadı.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-marka border border-cizgi bg-yuzey">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
              <tr>
                <th className="px-4 py-3">Sayım</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">Sayılan</th>
                <th className="px-4 py-3 text-right">Eksik / fazla</th>
                <th className="px-4 py-3 text-right">Fark (satış)</th>
                <th className="px-4 py-3 text-right">Fark (alış)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi-soluk">
              {liste.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <Link href={`/yonetim/stok/sayim/${s.id}`} className="font-bold hover:text-mercan-koyu">
                      {s.ad}
                    </Link>
                    <span className="block text-xs text-metin-3">
                      {s.olusturuldu.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}
                      {s.yapan && ` · ${s.yapan}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">{DURUM_ADI[s.durum] ?? s.durum}</td>
                  <td className="rakam px-4 py-3 text-right">
                    {s.ozet.sayilan}/{s.ozet.toplam}
                  </td>
                  <td className="rakam px-4 py-3 text-right">
                    <span className="text-mercan-koyu">−{s.ozet.eksikAdet}</span> /{" "}
                    <span className="text-nane-koyu">+{s.ozet.fazlaAdet}</span>
                  </td>
                  <td
                    className={`rakam px-4 py-3 text-right font-bold ${s.ozet.farkKurus < 0 ? "text-mercan-koyu" : ""}`}
                  >
                    {fiyatYaz(s.ozet.farkKurus)}
                  </td>
                  <td
                    className={`rakam px-4 py-3 text-right ${s.ozet.farkMaliyetKurus < 0 ? "text-mercan-koyu" : ""}`}
                    title={s.ozet.maliyetsizFark ? `${s.ozet.maliyetsizFark} farklı satırın alış fiyatı yok` : undefined}
                  >
                    {fiyatYaz(s.ozet.farkMaliyetKurus)}
                    {s.ozet.maliyetsizFark > 0 && "*"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
