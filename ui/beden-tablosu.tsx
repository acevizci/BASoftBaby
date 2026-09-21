import { bedenler as bedenleriGetir } from "@/server/bedenler";

/**
 * Beden - boy - kilo tablosu.
 *
 * Aynı tablo üç yerde: mağazadaki beden rehberi, ürün düzenleme ekranındaki
 * "Bedenler ve stok" bölümü ve stok ekranı. Satırlar `Size` tablosundan
 * geliyor, yani tek kaynak — panelde düzenlenen ölçüyle müşterinin gördüğü
 * ölçü ayrışamıyor (K-55, K-56). Kapalı bedenler çıkmıyor: müşteriye
 * satılmayan bir bedeni anlatmanın anlamı yok.
 *
 * Panele girmesinin sebebi telefonla gelen soru: "18-24 ay kaç kilo?".
 * Bedeni müşteriye anlatan kişi, mağazanın rehber sayfasını ayrı bir sekmede
 * açmak zorunda kalıyordu.
 */
export default async function BedenTablosu({
  baslik,
  not,
}: {
  /** Panelde `<caption>` olarak; rehber sayfasında başlık zaten var. */
  baslik?: string;
  not?: string;
}) {
  const satirlar = await bedenleriGetir();

  if (satirlar.length === 0) {
    return (
      <p className="rounded-marka border border-cizgi bg-yuzey px-4 py-3 text-sm text-metin-2">
        Henüz beden tanımlanmamış.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-marka border border-cizgi bg-yuzey">
      <table className="w-full text-sm">
        {baslik && (
          <caption className="px-4 pt-3 pb-1 text-left text-xs font-bold text-metin-2">
            {baslik}
          </caption>
        )}
        <thead className="border-b border-cizgi bg-yuzey-sicak text-left">
          <tr>
            <th scope="col" className="px-4 py-3 font-bold">
              Beden
            </th>
            <th scope="col" className="px-4 py-3 font-bold">
              Boy
            </th>
            <th scope="col" className="px-4 py-3 font-bold">
              Kilo
            </th>
          </tr>
        </thead>
        <tbody>
          {satirlar.map((b) => (
            <tr key={b.id} className="border-b border-cizgi-soluk last:border-0">
              <th scope="row" className="px-4 py-3 text-left font-bold">
                {b.ad}
              </th>
              <td className="rakam px-4 py-3 text-metin-2">{b.boy}</td>
              <td className="rakam px-4 py-3 text-metin-2">{b.kilo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {not && <p className="border-t border-cizgi-soluk px-4 py-2 text-xs text-metin-3">{not}</p>}
    </div>
  );
}
