import Link from "next/link";
import type { Metadata } from "next";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { listeOzeti } from "@/server/dogum-listesi-rapor";
import { fiyatYaz } from "@/ui/katalog-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Doğum listeleri" };

function gun(t: Date): string {
  return t.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium" });
}

/**
 * Doğum listeleri özeti (K-150). Yalnızca okuma: listeyi sahibi yönetiyor.
 * Liste bağlantısı herkese açık sayfa; panelden de oradan bakılıyor.
 */
export default async function DogumListeleri() {
  await yoneticiGerekli();
  const o = await listeOzeti();
  const oran = o.istenen > 0 ? Math.round((o.alinan / o.istenen) * 100) : 0;

  const kutular = [
    { ad: "Liste", deger: String(o.liste), alt: `${o.acik} açık · ${o.dolu} ürünlü` },
    { ad: "Adres seçmiş", deger: String(o.adresli), alt: "hediye doğrudan gidebiliyor" },
    { ad: "Alınan", deger: `%${oran}`, alt: `${o.alinan} / ${o.istenen} adet` },
    { ad: "Son 30 gün", deger: fiyatYaz(o.ciro30Kurus), alt: `${o.siparis30} sipariş` },
    { ad: "Toplam satış", deger: fiyatYaz(o.ciroHepsiKurus), alt: `${o.siparisHepsi} sipariş` },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">Doğum listeleri</h1>
        <p className="mt-1 text-sm text-metin-3">
          Satış, ödemesi alınmış ve iptal edilmemiş siparişlerde listeden alınan ürünlerin tutarı
          (kampanya indirimi düşülmüş, kargo hariç).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kutular.map((k) => (
          <div key={k.ad} className="rounded-marka border border-cizgi bg-yuzey p-4">
            <p className="text-xs font-bold text-metin-2">{k.ad}</p>
            <p className="rakam mt-1 font-baslik text-2xl font-bold">{k.deger}</p>
            <p className="rakam text-xs text-metin-3">{k.alt}</p>
          </div>
        ))}
      </div>

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">En çok istenenler</h2>
        {o.enCokIstenen.length === 0 ? (
          <p className="mt-2 text-sm text-metin-3">Henüz listeye eklenmiş ürün yok.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-metin-3">
                <th className="py-1 font-bold">Ürün</th>
                <th className="py-1 text-right font-bold">Liste</th>
                <th className="py-1 text-right font-bold">İstenen</th>
                <th className="py-1 text-right font-bold">Alınan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi-soluk">
              {o.enCokIstenen.map((u) => (
                <tr key={u.slug}>
                  <td className="py-2">
                    <Link href={`/urun/${u.slug}`} className="font-semibold hover:underline">
                      {u.ad}
                    </Link>
                  </td>
                  <td className="rakam py-2 text-right">{u.liste}</td>
                  <td className="rakam py-2 text-right">{u.istenen}</td>
                  <td className="rakam py-2 text-right">{u.alinan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Son listeler</h2>
        {o.sonListeler.length === 0 ? (
          <p className="mt-2 text-sm text-metin-3">Henüz liste açılmadı.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs text-metin-3">
                  <th className="py-1 font-bold">Liste</th>
                  <th className="py-1 font-bold">Müşteri</th>
                  <th className="py-1 font-bold">Açıldı</th>
                  <th className="py-1 font-bold">Beklenen</th>
                  <th className="py-1 text-right font-bold">Ürün</th>
                  <th className="py-1 text-right font-bold">Alınan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi-soluk">
                {o.sonListeler.map((l) => (
                  <tr key={l.kod}>
                    <td className="py-2">
                      <Link
                        href={`/liste/${l.kod}`}
                        target="_blank"
                        className="font-semibold hover:underline"
                      >
                        {l.baslik}
                      </Link>
                      <span className="block text-xs text-metin-3">
                        {l.sahipAdi}
                        {!l.acik && " · kapalı"}
                      </span>
                    </td>
                    <td className="py-2">
                      <Link
                        href={`/yonetim/musteriler/${l.customerId}`}
                        className="text-mavi-koyu hover:underline"
                      >
                        {l.eposta}
                      </Link>
                    </td>
                    <td className="rakam py-2">{gun(l.olusturuldu)}</td>
                    <td className="rakam py-2">{l.tarih ? gun(l.tarih) : "—"}</td>
                    <td className="rakam py-2 text-right">{l.kalem}</td>
                    <td className="rakam py-2 text-right">
                      {l.alinan} / {l.istenen}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
