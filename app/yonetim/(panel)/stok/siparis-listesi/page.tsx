import Link from "next/link";
import { EN_AZ_SATIS, PENCERE_GUN, gunYaz, siparisListesi } from "@/server/satis-hizi";
import { renkAdlari } from "@/server/renkler";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { HEDEFLER, hedefCoz } from "./hedef";

export const dynamic = "force-dynamic";

/**
 * Ne sipariş vermeli (K-106).
 *
 * Son 30 günün satış hızı, "gelince haber ver" diyenler ve şimdiki stok
 * birleşip "şundan şu kadar al" listesine dönüşüyor. Hedef, stoğun kaç gün
 * yetmesi istendiği; adreste taşınıyor.
 */
export default async function SiparisListesi({
  searchParams,
}: PageProps<"/yonetim/stok/siparis-listesi">) {
  await yoneticiGerekli();

  const hedef = hedefCoz((await searchParams).hedef);
  const [satirlar, adlar] = await Promise.all([siparisListesi(hedef), renkAdlari()]);
  const toplam = satirlar.reduce((t, s) => t + s.oneri, 0);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Sipariş listesi</h1>
      <p className="text-sm text-metin-2">
        Son {PENCERE_GUN} günün satışına göre stoğun seçtiğin süre yetmesi için ne kadar
        alman gerektiği. Stoksuz geçen günler hıza katılmıyor; &quot;gelince haber ver&quot;
        diyenler de ekleniyor. {PENCERE_GUN} günde {EN_AZ_SATIS} satıştan azı &quot;az
        veri&quot;: öneri yine var ama kaba.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-metin-2">Stok yetsin:</span>
        {HEDEFLER.map((h) => (
          <Link
            key={h}
            href={`/yonetim/stok/siparis-listesi?hedef=${h}`}
            aria-current={hedef === h ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              hedef === h
                ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                : "border-cizgi text-metin-2 hover:border-metin-3"
            }`}
          >
            {h} gün
          </Link>
        ))}
      </div>

      {satirlar.length === 0 ? (
        <p className="rounded-marka border border-cizgi bg-yuzey p-8 text-center text-sm text-metin-2">
          Stok {hedef} gün yetiyor; şu an sipariş vermen gereken bir şey görünmüyor.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-metin-2">
              <span className="rakam font-bold">{satirlar.length}</span> beden-renk, toplam{" "}
              <span className="rakam font-bold">{toplam}</span> adet öneriliyor.
            </p>
            {/* Dosya indirme: Link istemci tarafında gezinmeye çalışır. */}
            <a
              href={`/yonetim/stok/siparis-listesi/csv?hedef=${hedef}`}
              download
              className="rounded-full border border-cizgi bg-yuzey px-4 py-1.5 text-xs font-bold text-metin-2 hover:border-metin-3"
            >
              CSV indir (tedarikçi için)
            </a>
          </div>
          <div className="overflow-x-auto rounded-marka border border-cizgi bg-yuzey">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
                <tr>
                  <th className="px-4 py-3">Ürün</th>
                  <th className="px-4 py-3">Beden · renk</th>
                  <th className="px-4 py-3 text-right">Stok</th>
                  <th className="px-4 py-3 text-right">{PENCERE_GUN} gün satış</th>
                  <th className="px-4 py-3">Yeter</th>
                  <th className="px-4 py-3 text-right">Haber bekleyen</th>
                  <th className="px-4 py-3 text-right">Öneri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi-soluk">
                {satirlar.map((s) => (
                  <tr key={s.variantId}>
                    <td className="px-4 py-3">
                      <Link href={`/yonetim/urunler/${s.slug}`} className="font-bold hover:text-mercan-koyu">
                        {s.urunAd}
                      </Link>
                      <span className="rakam block text-xs text-metin-3">{s.sku}</span>
                    </td>
                    <td className="px-4 py-3">
                      {s.beden} · {adlar[s.renk] ?? s.renk}
                    </td>
                    <td className={`rakam px-4 py-3 text-right ${s.stok === 0 ? "font-bold text-mercan-koyu" : ""}`}>
                      {s.stok}
                    </td>
                    <td className="rakam px-4 py-3 text-right">{s.hiz.satilan}</td>
                    <td
                      className={`rakam px-4 py-3 ${
                        s.stok === 0
                          ? "font-bold text-mercan-koyu"
                          : s.hiz.kacGun !== null && s.hiz.kacGun <= 7
                            ? "font-bold text-mercan-koyu"
                            : "text-metin-2"
                      }`}
                    >
                      {s.stok === 0 ? "tükendi" : gunYaz(s.hiz)}
                    </td>
                    <td className="rakam px-4 py-3 text-right">{s.bekleyen || "—"}</td>
                    <td className="rakam px-4 py-3 text-right text-base font-bold">{s.oneri}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
