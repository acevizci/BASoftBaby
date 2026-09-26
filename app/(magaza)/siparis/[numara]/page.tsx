import { fiyatYaz } from "@/ui/katalog-bicim";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiparisKarti from "@/ui/siparis-karti";
import { ayarlariGetir } from "@/server/sepet";
import { kunyeGetir } from "@/server/yasal";
import { SON_SIPARIS_CEREZI, aliciyaGoster, siparisGetirPanel } from "@/server/siparis";
import OlcumOlayi from "@/ui/olcum-olayi";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import { odemeAcikMi } from "@/server/odeme";
import { odemeyiTamamla } from "@/server/siparis-islem";

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

  // Liste sahibinin adresine gidiyorsa adres hediye edene gösterilmiyor (K-149).
  const [siparis, ayar, kunye] = await Promise.all([
    siparisGetirPanel(numara).then((s) => s && aliciyaGoster(s)),
    ayarlariGetir(),
    kunyeGetir(),
  ]);
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
  // Kart ödemesinin sonucu henüz belli değil: sipariş açık, ödeme bekliyor
  // (iyzico'ya ulaşılamadı ya da dönüş gelmedi, K-165). "Tahsilat yapılmadı"
  // demek yanlış olabilir.
  const odemeKontrolde = kartla && siparis.odemeDurumu === "bekliyor" && siparis.durum !== "iptal";
  const odemeBasarisiz = kartla && !odendi && !iadeli && !odemeKontrolde;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Satış bir kez sayılıyor; ödemesi alınamayan kartlı sipariş satış değil
          (K-124). Havale siparişi sipariş anında sayılıyor: reklam açısından
          dönüşüm o an. */}
      {!odemeBasarisiz && !iadeli && !odemeKontrolde && (
        <OlcumOlayi
          ad="satis"
          tekSeferlik={`satis:${siparis.numara}`}
          veri={{
            tutarKurus: siparis.toplamKurus,
            siparisNo: siparis.numara,
            adet: siparis.satirlar.reduce((t, s) => t + s.adet, 0),
          }}
        />
      )}
      <div
        className={`rounded-marka px-5 py-6 text-center ${
          odemeBasarisiz
            ? "bg-mercan-soluk"
            : iadeli || odemeKontrolde
              ? "bg-yuzey-sicak"
              : "bg-nane-soluk"
        }`}
      >
        <h1 className="text-2xl sm:text-3xl">
          {odemeKontrolde
            ? odeme === "bekliyor"
              ? "Ödemen kontrol ediliyor"
              : "Ödemeni tamamla"
            : odemeBasarisiz
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
        {iadeli && siparis.odemeYontemi === "hediye-ceki" ? (
          <p className="mt-2 text-sm text-metin-2">
            Siparişin iptal edildi; çekle ödediğin tutar hediye çekinin bakiyesine geri yüklendi.
            Aynı kodla yeniden kullanabilirsin.
          </p>
        ) : iadeli ? (
          <p className="mt-2 text-sm text-metin-2">
            {siparis.hediyeCekiKurus > 0 &&
              "Hediye çekiyle ödediğin kısım çekinin bakiyesine geri yüklendi. "}
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
        ) : siparis.odemeYontemi === "hediye-ceki" ? (
          <p className="mt-2 text-sm text-metin-2">
            Siparişinin tamamı hediye çekinle ödendi; hazırlanmaya başlıyor.
          </p>
        ) : odemeKontrolde ? (
          <>
            <p className="mt-2 text-sm text-metin-2">
              {odeme === "bekliyor"
                ? "Ödemenin sonucunu ödeme sağlayıcımızdan henüz alamadık. Kartından tahsilat yapıldıysa siparişin hazırlanmaya başlayacak ve e-postayla haber vereceğiz."
                : "Kart ödemesi henüz tamamlanmadı. Ürünlerin 30 dakika boyunca senin için ayrılmış durumda; ödemeyi aşağıdan tamamlayabilirsin. Tamamlanmazsa sipariş kendiliğinden iptal olur."}{" "}
              <span className="font-semibold">Lütfen aynı siparişi yeniden verme.</span>
            </p>
            {odeme === "baslatilamadi" && (
              <p className="mt-2 text-sm font-semibold text-mercan-koyu">
                Ödeme sayfası açılamadı; kartından bir tahsilat yapılmadı. Biraz sonra tekrar dene.
              </p>
            )}
            {odeme === "cok" && (
              <p className="mt-2 text-sm font-semibold text-mercan-koyu">
                Kısa sürede çok fazla deneme oldu; birkaç dakika sonra tekrar dene.
              </p>
            )}
            {/* Aynı siparişin ödemesi yeniden açılıyor (K-167); önce önceki
                deneme iyzico'ya soruluyor, çift ödeme olmuyor. */}
            {odemeAcikMi() && (
              <form action={odemeyiTamamla} className="mt-4">
                <input type="hidden" name="numara" value={siparis.numara} />
                <GonderDugmesi
                  bekleyen="Ödeme sayfası açılıyor…"
                  className="rounded-full bg-dugme px-6 py-2.5 font-bold text-dugme-yazi transition hover:brightness-95"
                >
                  Ödemeyi tamamla
                </GonderDugmesi>
              </form>
            )}
          </>
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
                className="mt-4 inline-block rounded-full bg-dugme px-6 py-2.5 font-bold text-dugme-yazi transition hover:brightness-95"
              >
                Sepete dön, tekrar dene
              </Link>
            </>
          )
        ) : ayar.havaleBilgisi ? (
          <>
            <p className="mt-2 text-sm text-metin-2">
              Aşağıdaki hesaba havale/EFT yaparken açıklama kısmına sipariş numaranı yaz.
              {siparis.hediyeCekiKurus > 0 && (
                <>
                  {" "}Hediye çekin düşüldü; yatıracağın tutar{" "}
                  <span className="rakam font-bold text-metin">
                    {fiyatYaz(siparis.toplamKurus - siparis.hediyeCekiKurus)}
                  </span>
                  .
                </>
              )}
            </p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-[10px] bg-yuzey-sicak p-4 font-govde text-sm">
              {ayar.havaleBilgisi}
            </pre>
          </>
        ) : (
          /* Havale bilgisi sonradan boşaltılmış olabilir. Eskiden burada
             "en kısa sürede e-posta ile ileteceğiz" yazıyordu; e-posta
             servisi tanımlı değilken bu söz tutulamıyordu (K-76). Artık
             müşteriye ulaşabileceği bir kanal gösteriliyor. */
          <p className="mt-2 text-sm text-metin-2">
            Ödeme bilgileri için bizimle iletişime geç
            {kunye.destekTelefon && (
              <>
                : <span className="rakam font-bold">{kunye.destekTelefon}</span>
              </>
            )}
            {kunye.destekEposta && (
              <>
                {kunye.destekTelefon ? " · " : ": "}
                <span className="font-bold">{kunye.destekEposta}</span>
              </>
            )}
            . Siparişin duruyor, numaran{" "}
            <span className="rakam font-bold">{siparis.numara}</span>.
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
