import type { Metadata } from "next";
import Link from "next/link";
import { BOLUM, KUTU, YAZI } from "../bilgi-bicim";
import BedenTablosu from "@/ui/beden-tablosu";

export const metadata: Metadata = {
  title: "Beden rehberi",
  description:
    "BASoftbaby bedenleri aya göre değil boya göre seçilir. Boy, kilo ve beden karşılıkları.",
};

/**
 * Tablo artık burada değil, ui/beden-tablosu.tsx içinde: aynı boy-kilo
 * bilgisi süzgeçte, ürün sayfasında ve yönetim panelinde de gösteriliyor.
 * Tek kaynak olmasa er geç ayrışırlardı (K-55).
 */

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
      <div className="mt-3">
        <BedenTablosu />
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
