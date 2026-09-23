import Link from "next/link";
import { sebepAdi, type HareketSatiri } from "@/server/stok-hareket";

/**
 * Stok hareketleri tablosu (K-103): hareketler ekranında ve ürün ekranında.
 *
 * Giriş yeşil, çıkış mercan; sipariş numarası siparişe gidiyor.
 */
export default function HareketTablosu({
  satirlar,
  renkAdlari,
  urunGoster = true,
}: {
  satirlar: HareketSatiri[];
  renkAdlari: Record<string, string>;
  /** Ürün ekranında ürün adı zaten başlıkta. */
  urunGoster?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
          <tr>
            <th className="py-2 pr-3">Tarih</th>
            {urunGoster && <th className="py-2 pr-3">Ürün</th>}
            <th className="py-2 pr-3">Beden · renk</th>
            <th className="py-2 pr-3 text-right">Değişim</th>
            <th className="py-2 pr-3 text-right">Sonra</th>
            <th className="py-2 pr-3">Sebep</th>
            <th className="py-2">Kim / ne</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cizgi-soluk">
          {satirlar.map((h) => (
            <tr key={h.id}>
              <td className="rakam whitespace-nowrap py-2 pr-3 text-metin-2">
                {h.olusturuldu.toLocaleString("tr-TR", {
                  timeZone: "Europe/Istanbul",
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </td>
              {urunGoster && <td className="py-2 pr-3">{h.urunAd}</td>}
              <td className="py-2 pr-3">
                {h.beden} · {renkAdlari[h.renk] ?? h.renk}
              </td>
              <td
                className={`rakam py-2 pr-3 text-right font-bold ${h.degisim > 0 ? "text-nane-koyu" : "text-mercan-koyu"}`}
              >
                {h.degisim > 0 ? `+${h.degisim}` : h.degisim}
              </td>
              <td className="rakam py-2 pr-3 text-right">{h.sonra}</td>
              <td className="py-2 pr-3">{sebepAdi(h.sebep)}</td>
              <td className="py-2 text-metin-2">
                {h.siparisNo && (
                  <Link
                    href={`/yonetim/siparisler/${h.siparisNo}`}
                    className="rakam font-bold text-mavi-koyu hover:underline"
                  >
                    {h.siparisNo}
                  </Link>
                )}
                {h.yapan && <span className="block">{h.yapan}</span>}
                {!h.siparisNo && !h.yapan && "—"}
                {h.not && <span className="block text-xs text-metin-3">{h.not}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
