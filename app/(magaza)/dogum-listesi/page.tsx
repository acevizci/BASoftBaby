import Link from "next/link";
import type { Metadata } from "next";

/**
 * Doğum listesi tanıtım sayfası (K-145). Menüden, ana sayfadan ve banner'dan
 * buraya geliniyor; liste hesap sayfasında kuruluyor. Arama motorlarına açık:
 * "doğum listesi" aranan bir kelime.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Doğum listesi",
  description:
    "Bebeğin için istediklerini beden ve rengiyle listele, bağlantıyı yakınlarınla paylaş. Alınan hediyeler işaretlenir, aynı hediye iki kez gelmez.",
  alternates: { canonical: "/dogum-listesi" },
  openGraph: { title: "Doğum listesi · BASoftBaby", url: "/dogum-listesi", type: "website" },
};

const ADIMLAR = [
  {
    baslik: "Listeni kur",
    metin:
      "Beğendiğin ürünün sayfasında bedeni ve rengi seç, “Doğum listeme ekle”ye dokun. Hangisinden kaç adet istediğini sen belirlersin.",
  },
  {
    baslik: "Bağlantıyı paylaş",
    metin:
      "Hesabındaki doğum listesi sayfasından bağlantıyı kopyala ya da WhatsApp'tan gönder. Listede yalnızca seçtiğin ad görünür; adresin ve e-postan görünmez.",
  },
  {
    baslik: "Hediyeler gelsin",
    metin:
      "Yakınların listeden seçip alır; alınanlar listede kendiliğinden işaretlenir. Aynı hediye iki kez gelmez, beden de tam istediğin olur.",
  },
];

const SORULAR = [
  {
    s: "Liste ücretli mi?",
    c: "Hayır. Üye olman yeterli; liste ve paylaşım ücretsiz.",
  },
  {
    s: "Hediyeler kime gönderiliyor?",
    c: "Listende bir adresini seçersen hediye eden ödemede “liste sahibinin adresine gönder”i seçebilir; kargo doğrudan sana gelir, adresin ona hiçbir yerde görünmez. Seçmezsen kendi adresine alır, getirir ya da sana ulaştırır. Hediye paketi ve not da ekleyebilir.",
  },
  {
    s: "Tükenen bir ürünü listeye ekleyebilir miyim?",
    c: "Evet. Stoğa girdiğinde listeden alınabilir hale gelir.",
  },
  {
    s: "Listeyi kapatabilir miyim?",
    c: "Evet. Hesabındaki listeden “Liste açık” kutusunu kaldırman yeterli; bağlantıyı açan kişi alışveriş yapamaz.",
  },
];

export default function DogumListesiTanitim() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-marka bg-nane-soluk px-6 py-10 text-center">
        <p className="text-sm font-bold text-nane-koyu">Ücretsiz</p>
        <h1 className="mt-1 text-3xl sm:text-4xl">Doğum listesi</h1>
        <p className="mx-auto mt-3 max-w-xl text-metin-2">
          Bebeğin için istediklerini beden ve rengiyle listele, yakınlarınla paylaş. Aynı hediye iki
          kez gelmesin, beden de tam istediğin olsun.
        </p>
        <Link
          href="/giris?nereye=%2Fhesabim%2Fdogum-listesi"
          className="mt-6 inline-block rounded-full bg-dugme px-7 py-3 font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Listemi oluştur
        </Link>
        <p className="mt-3 text-xs text-metin-3">
          Üye değilsen önce birkaç saniyede hesap açarsın.
        </p>
      </div>

      <ol className="mt-10 grid gap-4 sm:grid-cols-3">
        {ADIMLAR.map((a, i) => (
          <li key={a.baslik} className="rounded-marka border border-cizgi bg-yuzey p-5">
            <span className="rakam flex h-8 w-8 items-center justify-center rounded-full bg-mercan-soluk font-baslik font-bold text-mercan-koyu">
              {i + 1}
            </span>
            <h2 className="mt-3 text-lg">{a.baslik}</h2>
            <p className="mt-1 text-sm text-metin-2">{a.metin}</p>
          </li>
        ))}
      </ol>

      <section className="mt-10">
        <h2 className="text-xl">Sık sorulanlar</h2>
        <dl className="mt-4 flex flex-col divide-y divide-cizgi-soluk rounded-marka border border-cizgi bg-yuzey">
          {SORULAR.map((x) => (
            <div key={x.s} className="p-5">
              <dt className="font-bold">{x.s}</dt>
              <dd className="mt-1 text-sm text-metin-2">{x.c}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link
          href="/giris?nereye=%2Fhesabim%2Fdogum-listesi"
          className="rounded-full bg-dugme px-6 py-2.5 font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Listemi oluştur
        </Link>
        <Link
          href="/urunler"
          className="rounded-full border-[1.5px] border-cizgi bg-yuzey px-6 py-2.5 font-bold text-metin-2 transition hover:border-mercan"
        >
          Ürünlere göz at
        </Link>
      </div>
    </div>
  );
}
