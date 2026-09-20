import type { Metadata } from "next";
import Link from "next/link";
import { BOLUM, KUTU, YAZI } from "../bilgi-bicim";

export const metadata: Metadata = {
  title: "Beden rehberi",
  description:
    "BASoftbaby bedenleri aya göre değil boya göre seçilir. Boy, kilo ve beden karşılıkları.",
};

/**
 * Bedenler mağazada "0-3 ay" gibi ay aralıklarıyla duruyor; tablo o adları
 * boy ve kiloya bağlıyor. Değerler ürün varyantlarındaki bedenlerle birebir
 * aynı sırada, yeni bir beden eklenirse buraya da bir satır gerekiyor.
 */
const TABLO: { beden: string; boy: string; kilo: string }[] = [
  { beden: "0-3 ay", boy: "56 - 62 cm", kilo: "3 - 6 kg" },
  { beden: "3-6 ay", boy: "62 - 68 cm", kilo: "6 - 8 kg" },
  { beden: "6-9 ay", boy: "68 - 74 cm", kilo: "8 - 9 kg" },
  { beden: "9-12 ay", boy: "74 - 80 cm", kilo: "9 - 10 kg" },
  { beden: "12-18 ay", boy: "80 - 86 cm", kilo: "10 - 11 kg" },
  { beden: "18-24 ay", boy: "86 - 92 cm", kilo: "11 - 12,5 kg" },
];

export default function BedenRehberi() {
  return (
    <>
      <h1 className="mt-6 text-2xl sm:text-3xl">Beden rehberi</h1>
      <p className={YAZI}>
        Bebek bedenlerinde ay aralığı yalnızca bir işaret. Aynı yaştaki iki bebeğin boyu
        arasında rahatlıkla beş santim fark olabiliyor, bu yüzden bedeni yaşa göre değil
        <strong> boya göre</strong> seçmek daha doğru sonuç veriyor.
      </p>

      <div className={KUTU}>
        Emin değilsen bir büyüğünü al. Bebekler hızlı uzuyor ve bol duran bir tulum birkaç
        hafta içinde tam oturuyor; dar gelen bir tulumsa hiç giyilemiyor.
      </div>

      <h2 className={BOLUM}>Boy ve kilo karşılıkları</h2>
      <div className="mt-3 overflow-x-auto rounded-marka border border-cizgi bg-yuzey">
        <table className="w-full text-sm">
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
            {TABLO.map((s) => (
              <tr key={s.beden} className="border-b border-cizgi-soluk last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-bold">
                  {s.beden}
                </th>
                <td className="rakam px-4 py-3 text-metin-2">{s.boy}</td>
                <td className="rakam px-4 py-3 text-metin-2">{s.kilo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-metin-3">
        Her bedende ürün bulunmayabilir. Ürün sayfasında yalnızca stokta olan bedenler
        seçilebiliyor.
      </p>

      <h2 className={BOLUM}>Nasıl ölçülür</h2>
      <p className={YAZI}>
        Bebeği sırtüstü yatır, bacaklarını nazikçe düzelt ve topuğundan başının tepesine
        kadar olan mesafeyi ölç. Kıvrılmış bacakla yapılan ölçüm olduğundan kısa çıkıyor.
        Kilo için doğum sonrası kontrolde alınan son tartı yeterli.
      </p>

      <h2 className={BOLUM}>Kalıp notları</h2>
      <p className={YAZI}>
        Zıbın ve body kalıpları bedene yakın duruyor, alttan çıtçıtlı. Tulumlar biraz daha
        bol; ayaklı tulumlarda ayak boyu da bedenle büyüdüğü için iki beden birden büyüğünü
        almak ayakların boşta kalmasına yol açıyor. Uyku tulumlarında bolluk sorun değil,
        tersine bacakların rahat hareket etmesi için tercih ediliyor.
      </p>

      <h2 className={BOLUM}>Yıkamada çekme payı</h2>
      <p className={YAZI}>
        Ürünler %100 organik pamuk. Pamuk ilk yıkamada bir miktar çekiyor, bu yüzden
        kalıplar çekme payı bırakılarak dikiliyor. 30 derecede yıkamak ve kurutma makinesi
        yerine asarak kurutmak kalıbı koruyor.
      </p>

      <h2 className={BOLUM}>Beden tutmazsa</h2>
      <p className={YAZI}>
        Aldığın beden olmadıysa{" "}
        <Link href="/iade-degisim" className="font-bold text-mavi-koyu hover:underline">
          iade ve değişim
        </Link>{" "}
        sayfasındaki adımlarla ücretsiz değiştirebilirsin.
      </p>
    </>
  );
}
