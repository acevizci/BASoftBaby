import type { Metadata } from "next";
import Link from "next/link";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { ayarlariGetir } from "@/server/sepet";
import { BOLUM, YAZI } from "../bilgi-bicim";
import { CAYMA_GUN } from "@/ui/talep-bicim";

export const metadata: Metadata = {
  title: "Sıkça sorulanlar",
  description: "Sipariş, ödeme, kargo, iade ve ürünlerle ilgili en çok sorulan sorular.",
};

/** Kargo rakamları ayardan geliyor; önbellek ayar kaydedilince düşüyor (K-131). */
export const revalidate = 300;

type Soru = { soru: string; cevap: React.ReactNode };

export default async function SikcaSorulanlar() {
  const ayar = await ayarlariGetir();
  const kargo = fiyatYaz(ayar.kargoKurus);
  const esik = fiyatYaz(ayar.bedavaKargoEsigi);

  const BOLUMLER: { baslik: string; sorular: Soru[] }[] = [
    {
      baslik: "Sipariş ve ödeme",
      sorular: [
        {
          soru: "Üye olmadan sipariş verebilir miyim?",
          cevap:
            "Evet. Üyelik yok; sepete ekleyip adres ve e-postanı yazman yeterli. Siparişini daha sonra numara ve e-posta ile sorgulayabiliyorsun.",
        },
        {
          soru: "Hangi ödeme yöntemleri var?",
          cevap:
            "Şu an yalnızca havale/EFT. Kredi kartıyla ödeme, şirket kaydı ve ödeme altyapısı anlaşması tamamlandığında eklenecek.",
        },
        {
          soru: "Havale yaptım, sipariş ne zaman hazırlanır?",
          cevap:
            "Para hesaba geçtiği gün. Ödemeni gördüğümüzde sipariş durumu 'Hazırlanıyor' oluyor ve bunu sipariş takibi sayfasından izleyebiliyorsun.",
        },
        {
          soru: "Fatura alabilir miyim?",
          cevap:
            "Evet, her siparişe fatura kesiliyor ve e-posta ile gönderiliyor. Kurumsal fatura istiyorsan sipariş notuna vergi bilgilerini yazman yeterli.",
        },
      ],
    },
    {
      baslik: "Kargo",
      sorular: [
        {
          soru: "Kargo ücreti ne kadar?",
          cevap: (
            <>
              <span className="rakam">{kargo}</span>.{" "}
              {ayar.bedavaKargoEsigi > 0 ? (
                <>
                  <span className="rakam">{esik}</span> ve üzeri siparişlerde ücretsiz.
                </>
              ) : (
                <>Şu an bedava kargo sınırı uygulanmıyor.</>
              )}
            </>
          ),
        },
        {
          soru: "Ne kadar sürede elime geçer?",
          cevap: (
            <>
              Kargoya verildikten sonra büyük şehirlerde 1-2, diğer illerde 2-4 iş günü.
              Ayrıntısı{" "}
              <Link href="/kargo-teslimat" className="font-bold text-mavi-koyu hover:underline">
                kargo ve teslimat
              </Link>{" "}
              sayfasında.
            </>
          ),
        },
        {
          soru: "Kargo takip numaramı nereden görürüm?",
          cevap: (
            <>
              Sipariş kargoya verildiğinde{" "}
              <Link href="/siparis-takip" className="font-bold text-mavi-koyu hover:underline">
                sipariş takibi
              </Link>{" "}
              sayfasında görünüyor.
            </>
          ),
        },
      ],
    },
    {
      baslik: "Beden ve ürünler",
      sorular: [
        {
          soru: "Hangi bedeni almalıyım?",
          cevap: (
            <>
              Bebeğin yaşına değil boyuna bak.{" "}
              <Link href="/beden-rehberi" className="font-bold text-mavi-koyu hover:underline">
                Beden rehberinde
              </Link>{" "}
              boy ve kilo karşılıkları var; ikisi arasında kaldıysan büyük olanı al.
            </>
          ),
        },
        {
          soru: "Kumaşlar gerçekten organik mi?",
          cevap:
            "Ürünlerde %100 organik pamuk kullanılıyor, dikişsiz bantlar ve nikelsiz çıtçıtlar tercih ediliyor. Sertifika bilgileri ürün sayfalarındaki kumaş içeriği bölümünde yazıyor.",
        },
        {
          soru: "Ürün yıkanınca çeker mi?",
          cevap:
            "Pamuk ilk yıkamada bir miktar çekiyor, kalıplar bu pay bırakılarak dikiliyor. 30 derecede yıkamak ve asarak kurutmak kalıbı koruyor.",
        },
        {
          soru: "Stokta olmayan ürün gelecek mi?",
          cevap:
            "Tükenen ürünlerin çoğu yeniden üretiliyor. Belirli bir ürünü bekliyorsan bize yaz, geldiğinde haber verelim.",
        },
      ],
    },
    {
      baslik: "İade ve değişim",
      sorular: [
        {
          soru: "Beden tutmazsa değiştirebilir miyim?",
          cevap: (
            <>
              Evet, {CAYMA_GUN} gün içinde ve değişim kargosu bizden. Adımlar{" "}
              <Link href="/iade-degisim" className="font-bold text-mavi-koyu hover:underline">
                iade ve değişim
              </Link>{" "}
              sayfasında.
            </>
          ),
        },
        {
          soru: "Param ne zaman iade edilir?",
          cevap:
            "Ürün elimize ulaşıp kontrolü geçtikten sonra en geç 3 iş günü içinde, sipariş verirken kullandığın isme ait hesaba havale ile.",
        },
      ],
    },
    {
      baslik: "İndirimler",
      sorular: [
        {
          soru: "İki indirim üst üste kullanılabilir mi?",
          cevap:
            "Hayır. Sepetine birden fazla kampanya uyuyorsa en çok indirim sağlayan tek kampanya uygulanıyor ve hangisi olduğunu sepette adıyla görüyorsun.",
        },
        {
          soru: "Kupon kodumu yazdım ama indirim değişmedi",
          cevap:
            "Kuponun geçerli olsa bile sepetinde zaten daha çok indiren bir kampanya varsa o uygulanıyor. Sepet sayfasında bunun açıklaması çıkıyor.",
        },
      ],
    },
  ];

  return (
    <>
      <h1 className="mt-6 text-2xl sm:text-3xl">Sıkça sorulanlar</h1>
      <p className={YAZI}>
        En çok sorulanları başlıklara ayırdık. Sorunun cevabını göremezsen bize yazabilirsin.
      </p>

      {BOLUMLER.map((b) => (
        <section key={b.baslik}>
          <h2 className={BOLUM}>{b.baslik}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {b.sorular.map((s) => (
              <details
                key={s.soru}
                className="group rounded-marka border border-cizgi bg-yuzey px-4 py-3"
              >
                <summary className="cursor-pointer list-none text-sm font-bold marker:content-none">
                  {/* Pastel mercan beyaz üzerinde 2,94:1; koyu karşılığı
                      5,85. Marka belgesinin kendi kuralı: pastel tonlar
                      yazıda kullanılmıyor (K-62). */}
                  <span className="text-mercan-koyu group-open:hidden">+ </span>
                  <span className="hidden text-mercan-koyu group-open:inline">- </span>
                  {s.soru}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-metin-2">{s.cevap}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
