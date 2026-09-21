import { BEDENLER, BEDEN_OLCULERI } from "@/ui/katalog-bicim";

/**
 * Beden - boy - kilo tablosu.
 *
 * Aynı tablo üç yerde: mağazadaki beden rehberi, ürün düzenleme ekranındaki
 * "Bedenler ve stok" bölümü ve stok ekranı. Rakamlar `BEDEN_OLCULERI`'nden
 * geliyor, yani tek kaynak — panelde yazan ölçüyle müşterinin gördüğü ölçü
 * ayrışamıyor (K-55).
 *
 * Panele girmesinin sebebi telefonla gelen soru: "18-24 ay kaç kilo?".
 * Bedeni müşteriye anlatan kişi, mağazanın rehber sayfasını ayrı bir sekmede
 * açmak zorunda kalıyordu.
 */
export default function BedenTablosu({
  baslik,
  not,
}: {
  /** Panelde `<caption>` olarak; rehber sayfasında başlık zaten var. */
  baslik?: string;
  not?: string;
}) {
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
          {BEDENLER.map((beden) => (
            <tr key={beden} className="border-b border-cizgi-soluk last:border-0">
              <th scope="row" className="px-4 py-3 text-left font-bold">
                {beden}
              </th>
              <td className="rakam px-4 py-3 text-metin-2">{BEDEN_OLCULERI[beden].boy}</td>
              <td className="rakam px-4 py-3 text-metin-2">{BEDEN_OLCULERI[beden].kilo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {not && <p className="border-t border-cizgi-soluk px-4 py-2 text-xs text-metin-3">{not}</p>}
    </div>
  );
}
