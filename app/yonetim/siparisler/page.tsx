import Link from "next/link";
import { db } from "@/server/veritabani";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { DURUMLAR, durumAdi, durumRengi, odemeAdi } from "@/ui/siparis-bicim";

export const dynamic = "force-dynamic";

function tarihYaz(t: Date): string {
  return t.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

export default async function SiparisListesi({ searchParams }: PageProps<"/yonetim/siparisler">) {
  const { durum } = await searchParams;
  const secili = typeof durum === "string" && (DURUMLAR as readonly string[]).includes(durum)
    ? durum
    : undefined;

  const siparisler = await db.order.findMany({
    where: secili ? { durum: secili } : {},
    orderBy: { olusturuldu: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Siparişler</h1>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/yonetim/siparisler"
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
            secili ? "border-cizgi text-metin-2 hover:border-metin-3" : "border-mercan bg-mercan-soluk text-mercan-koyu"
          }`}
        >
          Hepsi
        </Link>
        {DURUMLAR.map((d) => (
          <Link
            key={d}
            href={`/yonetim/siparisler?durum=${d}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              secili === d
                ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                : "border-cizgi text-metin-2 hover:border-metin-3"
            }`}
          >
            {durumAdi(d)}
          </Link>
        ))}
      </div>

      {siparisler.length === 0 ? (
        <p className="text-sm text-metin-2">
          {secili ? "Bu durumda sipariş yok." : "Henüz sipariş yok."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-marka border border-cizgi bg-yuzey">
          <table className="w-full min-w-[720px] text-sm">
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
              {siparisler.map((s) => (
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
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${durumRengi(s.durum)}`}
                    >
                      {durumAdi(s.durum)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${durumRengi(s.odemeDurumu)}`}
                    >
                      {odemeAdi(s.odemeDurumu)}
                    </span>
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
