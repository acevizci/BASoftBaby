import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import SiparisKarti from "@/ui/siparis-karti";
import TalepFormu from "@/ui/talep-formu";
import DegerlendirmeFormu from "@/ui/degerlendirme-formu";
import { buHesabaBagliMi, girisYapan } from "@/server/uyelik";
import { siparisGetir } from "@/server/siparis";
import { talepDurumu } from "@/server/talep";
import { degerlendirilebilirler } from "@/server/yorum";
import { IKINCIL_DUGME } from "../../../hesap-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sipariş ayrıntısı", robots: { index: false } };

/**
 * Üyenin kendi sipariş ayrıntısı.
 *
 * Önceden burası yoktu: üye, hesabındaki siparişin ayrıntısı için sipariş
 * takip sayfasına gönderiliyor ve **numarasıyla e-postasını yeniden yazmak**
 * zorunda kalıyordu. Zaten giriş yapmış birinden kimliğini tekrar istemek
 * gereksiz; üstelik iptal, iade ve değerlendirme formları yalnızca o sayfada
 * olduğu için üye hesabından bunlara hiç ulaşamıyordu (K-36).
 *
 * **Kimlik oturumdan:** sipariş bu üyeye ait değilse sayfa yokmuş gibi
 * davranıyor. Numara deneyerek başkasının siparişi görülemiyor.
 */
export default async function UyeSiparisAyrintisi({
  params,
  searchParams,
}: PageProps<"/hesabim/siparis/[numara]">) {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?hata=giris&nereye=%2Fhesabim");

  const { numara } = await params;
  const aranan = await searchParams;

  // İki koşul birden: sipariş bu hesaba **bağlı** olmalı ve e-posta tutmalı.
  // Yalnızca e-postaya bakmak yetmezdi — aynı adresle üyeliksiz verilmiş ve
  // henüz hesaba bağlanmamış siparişler burada değil takip sayfasında
  // görünüyor; bağlama ancak e-posta doğrulandıktan sonra oluyor (K-14).
  const bagliMi = await buHesabaBagliMi(musteri.id, numara);
  const siparis = bagliMi ? await siparisGetir(numara, musteri.eposta) : undefined;
  if (!siparis) notFound();

  const [talepBilgisi, degerlendirilebilir] = await Promise.all([
    talepDurumu(siparis.numara),
    degerlendirilebilirler(siparis.numara),
  ]);

  const donus = `/hesabim/siparis/${encodeURIComponent(siparis.numara)}`;

  const tek = (ad: string) => (typeof aranan[ad] === "string" ? (aranan[ad] as string) : undefined);

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">
          Sipariş <span className="rakam">{siparis.numara}</span>
        </h2>
        <Link href="/hesabim" className={IKINCIL_DUGME}>
          ← Siparişlerim
        </Link>
      </div>

      <SiparisKarti siparis={siparis} className="mt-4" />

      <DegerlendirmeFormu
        numara={siparis.numara}
        eposta={musteri.eposta}
        donus={donus}
        satirlar={degerlendirilebilir}
        sonuc={tek("yorum")}
        mesaj={tek("ymesaj")}
      />

      {talepBilgisi && (
        <TalepFormu
          numara={siparis.numara}
          eposta={musteri.eposta}
          donus={donus}
          bilgi={talepBilgisi}
          sonuc={tek("talep")}
          mesaj={tek("mesaj")}
        />
      )}
    </section>
  );
}
