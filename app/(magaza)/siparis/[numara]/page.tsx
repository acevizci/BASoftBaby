import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiparisKarti from "@/ui/siparis-karti";
import { ayarlariGetir } from "@/server/sepet";
import { SON_SIPARIS_CEREZI, siparisGetirPanel } from "@/server/siparis";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Siparişin alındı", robots: { index: false } };

/**
 * Sipariş onay sayfası. Sadece siparişi az önce veren kişiye açılır: adresteki
 * numara, tarayıcıdaki `son-siparis` çerezindeki numarayla aynı olmak zorunda.
 * Başkası numarayı tahmin etse bile adresi göremez; onlar için e-posta soran
 * takip sayfası var.
 */
export default async function SiparisOnayi({
  params,
  searchParams,
}: PageProps<"/siparis/[numara]">) {
  const { numara } = await params;
  const { odeme } = await searchParams;
  const kavanoz = await cookies();

  if (kavanoz.get(SON_SIPARIS_CEREZI)?.value !== numara) notFound();

  const [siparis, ayar] = await Promise.all([siparisGetirPanel(numara), ayarlariGetir()]);
  if (!siparis) notFound();

  // Kartla ödemede müşteri buraya iyzico'dan dönüyor. Sonucu adres satırından
  // değil siparişin kendi durumundan okuyoruz: adres satırı kurcalanabilir.
  const kartla = siparis.odemeYontemi === "kart";
  const odendi = siparis.odemeDurumu === "odendi";
  const sonHata = siparis.sonOdemeHatasi;

  /**
   * İade durumları ayrı ele alınıyor.
   *
   * Eskiden ölçüt yalnızca `odendi` idi ve iade durumları ona düşünce sayfa
   * **yanlış** konuşuyordu: parası alınıp iptal edilmiş kartlı siparişte
   * "Ödeme tamamlanamadı, kartından bir tahsilat yapılmadı" yazıyordu —
   * para alınmıştı ve iade bekliyordu. Havalede daha kötüsü oluyordu:
   * müşteriden parayı **tekrar yatırması** isteniyordu (K-61).
   */
  const iadeBekliyor = siparis.odemeDurumu === "iade-bekliyor";
  const iadeEdildi = siparis.odemeDurumu === "iade";
  const iadeli = iadeBekliyor || iadeEdildi;
  const odemeBasarisiz = kartla && !odendi && !iadeli;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div
        className={`rounded-marka px-5 py-6 text-center ${
          odemeBasarisiz ? "bg-mercan-soluk" : iadeli ? "bg-yuzey-sicak" : "bg-nane-soluk"
        }`}
      >
        <h1 className="text-2xl sm:text-3xl">
          {odemeBasarisiz
            ? "Ödeme tamamlanamadı"
            : iadeEdildi
              ? "Ödemen iade edildi"
              : iadeBekliyor
                ? "Siparişin iptal edildi"
                : odendi
                  ? "Ödemen alındı"
                  : "Siparişin alındı"}
        </h1>
        <p className="mt-2 text-metin-2">
          Sipariş numaran <span className="rakam font-bold text-metin">{siparis.numara}</span>
        </p>
      </div>

      <section className="mt-6 rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Ödeme</h2>
        {iadeli ? (
          <p className="mt-2 text-sm text-metin-2">
            {iadeEdildi ? (
              <>
                Ödemen iade edildi.{" "}
                {kartla
                  ? "Kartına geçmesi bankana göre birkaç iş günü sürebiliyor."
                  : "Bildirdiğin hesaba gönderildi."}
              </>
            ) : (
              <>
                Bu siparişin ödemesi alınmıştı ve iade edilecek.{" "}
                {kartla
                  ? "İade kartına yapılacak; bankana göre birkaç iş günü sürebiliyor."
                  : "Havale ile gönderilecek."}{" "}
                <span className="font-semibold">Tekrar ödeme yapmana gerek yok.</span>
              </>
            )}
          </p>
        ) : kartla ? (
          odendi ? (
            <p className="mt-2 text-sm text-metin-2">
              Kartından ödeme alındı, siparişin hazırlanmaya başlıyor. Ödeme sağlayıcımız
              iyzico; kart bilgilerin bize hiç ulaşmadı.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-metin-2">
                Ödeme tamamlanmadığı için sipariş iptal edildi ve ürünler stoğa geri
                döndü. <span className="font-semibold">Kartından bir tahsilat yapılmadı.</span>
                {odeme === "basarisiz" && sonHata ? ` Sebep: ${sonHata}` : ""}
              </p>
              <Link
                href="/sepet"
                className="mt-4 inline-block rounded-full bg-mercan px-6 py-2.5 font-bold text-white transition hover:brightness-95"
              >
                Sepete dön, tekrar dene
              </Link>
            </>
          )
        ) : ayar.havaleBilgisi ? (
          <>
            <p className="mt-2 text-sm text-metin-2">
              Aşağıdaki hesaba havale/EFT yaparken açıklama kısmına sipariş numaranı yaz.
            </p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-[10px] bg-yuzey-sicak p-4 font-govde text-sm">
              {ayar.havaleBilgisi}
            </pre>
          </>
        ) : (
          <p className="mt-2 text-sm text-metin-2">
            Ödeme bilgilerini en kısa sürede e-posta ile ileteceğiz.
          </p>
        )}
      </section>

      <SiparisKarti siparis={siparis} className="mt-6" />

      <p className="mt-6 text-center text-sm text-metin-2">
        Siparişini sonradan{" "}
        <Link href="/siparis-takip" className="font-bold text-mavi-koyu hover:underline">
          sipariş takip
        </Link>{" "}
        sayfasından numaran ve e-postanla görebilirsin.
      </p>
    </div>
  );
}
