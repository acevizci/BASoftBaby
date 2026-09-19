import Image from "next/image";

const HAZIRLIK = [
  { baslik: "Katalog", not: "Ürünler, bedenler, renkler ve stok" },
  { baslik: "Sepet ve ödeme", not: "Kartla ödeme, 3D Secure, taksit" },
  { baslik: "Kargo ve fatura", not: "Barkodlu etiket, takip bildirimi, e-arşiv" },
];

export default function AnaSayfa() {
  return (
    <>
      <section className="bg-gradient-to-b from-sari-soluk to-zemin">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
          <Image
            src="/marka/basoftbaby-amblem.svg"
            alt=""
            width={132}
            height={132}
            priority
            unoptimized
          />
          <h1 className="max-w-xl text-3xl sm:text-5xl">Minik bedenlere, yumuşacık kumaşlar</h1>
          <p className="max-w-lg text-base text-metin-2 sm:text-lg">
            %100 organik pamuk, dikişsiz bantlar, kolay çıtçıtlı kalıplar. Bebeğin hassas cildi
            için seçilmiş ürünler.
          </p>
          <p className="rounded-full bg-yuzey px-4 py-2 text-sm font-semibold text-metin-2 shadow-sm">
            Mağaza hazırlanıyor · çok yakında açılıyoruz
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-xl">Şu an ne yapılıyor</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {HAZIRLIK.map((h) => (
            <div
              key={h.baslik}
              className="rounded-marka border border-cizgi bg-yuzey p-5 shadow-sm"
            >
              <p className="font-baslik text-base font-bold">{h.baslik}</p>
              <p className="mt-1.5 text-sm text-metin-2">{h.not}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
