import type { Metadata } from "next";
import Link from "next/link";
import { BOLUM, KUTU, YAZI } from "../bilgi-bicim";
import { CAYMA_GUN } from "@/ui/talep-bicim";

export const metadata: Metadata = {
  title: "İade ve değişim",
  description: `${CAYMA_GUN} gün içinde koşulsuz iade, beden değişimi ve para iadesi adımları.`,
};

const ADIMLAR = [
  {
    baslik: "Sipariş takibinden talep aç",
    metin:
      "Sipariş numaran ve e-postanla sipariş takip sayfasını aç, iade ya da değişim etmek istediğin ürünü seç. Siparişin tamamını değil tek bir ürünü de iade edebilirsin. Sebep zorunlu değil, sadece kalıpları düzeltmemize yardımcı oluyor.",
  },
  {
    baslik: "Ürünü paketle",
    metin:
      "Ürünü etiketi sökülmemiş ve yıkanmamış halde, geldiği paketiyle birlikte hazırla. Kargo fişini pakete koy.",
  },
  {
    baslik: "Kargoya ver",
    metin:
      "Sana ileteceğimiz anlaşmalı kargo kodu ile ücretsiz gönder. Kod olmadan gönderilen iadelerde kargo ücreti sana ait oluyor.",
  },
  {
    baslik: "Sonuç",
    metin:
      "Talebinin durumunu sipariş takip sayfasından izleyebilirsin. Ürün elimize ulaştıktan sonra 3 iş günü içinde kontrol edip sonucu e-postayla bildiriyoruz. Değişimde yeni ürün aynı gün kargoya çıkıyor.",
  },
];

export default function IadeDegisim() {
  return (
    <>
      <h1 className="mt-6 text-2xl sm:text-3xl">İade ve değişim</h1>
      <p className={YAZI}>
        Bebek ürünlerinde beden tutturmak her zaman kolay olmuyor. Bu yüzden iade ve
        değişimi olabildiğince basit tuttuk: sebep açıklamak zorunda değilsin.
      </p>

      <div className={KUTU}>
        Teslim aldığın günden itibaren <strong>{CAYMA_GUN} gün</strong> içinde, kullanılmamış ve
        etiketi sökülmemiş ürünleri iade edebilir ya da bedenini değiştirebilirsin.
        Değişim kargosu bizden.
      </div>

      <h2 className={BOLUM}>Nasıl yapılır</h2>
      <ol className="mt-3 flex flex-col gap-3">
        {ADIMLAR.map((a, i) => (
          <li
            key={a.baslik}
            className="flex gap-3 rounded-marka border border-cizgi bg-yuzey p-4"
          >
            <span className="rakam flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mercan-soluk text-sm font-bold text-mercan-koyu">
              {i + 1}
            </span>
            <div>
              <p className="font-bold">{a.baslik}</p>
              <p className="mt-1 text-sm text-metin-2">{a.metin}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className={BOLUM}>Para iadesi ne zaman yapılır</h2>
      <p className={YAZI}>
        Ödeme havale/EFT ile alındığı için iade de havale ile yapılıyor. Ürün elimize
        ulaşıp kontrolü geçtikten sonra, sipariş verirken kullandığın isme ait hesaba en geç
        3 iş günü içinde gönderiyoruz. Başka bir kişinin hesabına iade yapılamıyor.
      </p>

      <h2 className={BOLUM}>Kargo ücreti ne oluyor</h2>
      <p className={YAZI}>
        Beden değişiminde gidiş ve dönüş kargosu bizden. Üründe hata varsa ya da yanlış ürün
        gönderdiysek yine tüm masraf bize ait. Fikir değiştirip iade ediyorsan ürün bedelini
        eksiksiz geri ödüyoruz, ilk siparişte ödediğin kargo ücreti iade edilmiyor.
      </p>

      <h2 className={BOLUM}>İade edilemeyen ürünler</h2>
      <p className={YAZI}>
        Hijyen gereği iç giyim, emzik, biberon ve benzeri ürünler ambalajı açıldıysa iade
        alınamıyor. Yıkanmış, kullanılmış ya da etiketi sökülmüş ürünler de iade kapsamı
        dışında. Ambalajı açılmamış olduğu sürece bu ürünlerde de {CAYMA_GUN} gün kuralı geçerli.
      </p>

      <h2 className={BOLUM}>Kusurlu ürün</h2>
      <p className={YAZI}>
        Dikişi açılmış, çıtçıtı kopmuş ya da kumaşında hata olan bir ürün geldiyse {CAYMA_GUN} gün
        sınırına bakmıyoruz. Fotoğrafı ile birlikte bize yaz, ürünü ücretsiz yeniliyoruz ya
        da bedelini iade ediyoruz.
      </p>

      <h2 className={BOLUM}>Siparişimi iptal etmek istiyorum</h2>
      <p className={YAZI}>
        Sipariş henüz kargoya verilmediyse tamamen iptal edilebiliyor ve ödeme yaptıysan
        tamamı iade ediliyor. İptal talebini{" "}
        <Link href="/siparis-takip" className="font-bold text-mavi-koyu hover:underline">
          sipariş takibi
        </Link>{" "}
        sayfasından kendin açabilirsin; kargoya verilmişse aynı sayfadan iade talebi
        açabilirsin.
      </p>

      <p className="mt-6 text-xs text-metin-3">
        Bu sayfa nasıl çalıştığımızı anlatıyor. Yasal metinler (mesafeli satış sözleşmesi ve
        ön bilgilendirme formu) şirket kaydı tamamlandığında eklenecek; uyuşmazlık halinde
        tüketicinin cayma hakkına ilişkin yasal düzenlemeler geçerlidir.
      </p>
    </>
  );
}
