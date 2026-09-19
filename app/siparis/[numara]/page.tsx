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
export default async function SiparisOnayi({ params }: PageProps<"/siparis/[numara]">) {
  const { numara } = await params;
  const kavanoz = await cookies();

  if (kavanoz.get(SON_SIPARIS_CEREZI)?.value !== numara) notFound();

  const [siparis, ayar] = await Promise.all([siparisGetirPanel(numara), ayarlariGetir()]);
  if (!siparis) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-marka bg-nane-soluk px-5 py-6 text-center">
        <h1 className="text-2xl sm:text-3xl">Siparişin alındı</h1>
        <p className="mt-2 text-metin-2">
          Sipariş numaran <span className="rakam font-bold text-metin">{siparis.numara}</span>
        </p>
      </div>

      <section className="mt-6 rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Ödeme</h2>
        {ayar.havaleBilgisi ? (
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
