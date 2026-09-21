import Link from "next/link";
import { notFound } from "next/navigation";
import Barkod from "@/ui/barkod";
import { gonderiGetir } from "@/server/kargo";
import { siparisGetirPanel } from "@/server/siparis";
import { kunyeGetir } from "@/server/yasal";

export const dynamic = "force-dynamic";

/**
 * Yazdırılabilir kargo etiketi.
 *
 * Barkod, taşıyıcının verdiği takip numarasını taşıyor; henüz takip numarası
 * yoksa sipariş numarasını. Sayfa doğrudan yazdırılabiliyor: yazdırmada
 * yalnızca etiket kalıyor, kenar çubuğu ve düğmeler çıkmıyor.
 */
export default async function KargoEtiketi({
  params,
}: PageProps<"/yonetim/siparisler/[numara]/etiket">) {
  const { numara } = await params;
  const [siparis, gonderi, kunye] = await Promise.all([
    siparisGetirPanel(numara),
    gonderiGetir(numara),
    kunyeGetir(),
  ]);
  if (!siparis) notFound();

  const barkod = gonderi?.takipNo || siparis.numara;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 yazdirma-gizle">
        <h1 className="text-2xl">Kargo etiketi</h1>
        <Link
          href={`/yonetim/siparisler/${siparis.numara}`}
          className="text-sm font-bold text-metin-2 hover:underline"
        >
          Siparişe dön
        </Link>
      </div>

      <p className="text-sm text-metin-2 yazdirma-gizle">
        Tarayıcının yazdır komutuyla (Ctrl/⌘ + P) bas. Etiketi kutunun üstüne yapıştır.
      </p>

      <div className="etiket mx-auto w-full max-w-[420px] border-2 border-black bg-white p-4 text-black">
        <div className="flex items-start justify-between gap-3 border-b-2 border-black pb-2">
          <div>
            <p className="font-baslik text-lg font-bold">BASoftBaby</p>
            {kunye.unvan && <p className="text-[11px]">{kunye.unvan}</p>}
            {kunye.sirketAdresi && <p className="text-[11px]">{kunye.sirketAdresi}</p>}
            {kunye.destekTelefon && <p className="rakam text-[11px]">{kunye.destekTelefon}</p>}
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold">
              {gonderi?.tasiyiciAdi ?? "Kargo firması"}
            </p>
            <p className="rakam text-[11px]">{siparis.numara}</p>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[11px] font-bold uppercase">Alıcı</p>
          <p className="text-base font-bold">{siparis.adSoyad}</p>
          <p className="text-sm leading-snug">{siparis.adres}</p>
          <p className="text-sm">
            {siparis.ilce} / {siparis.il}{" "}
            {siparis.postaKodu && <span className="rakam">{siparis.postaKodu}</span>}
          </p>
          <p className="rakam text-sm">{siparis.telefon}</p>
        </div>

        <div className="mt-3 border-t-2 border-black pt-3 text-center">
          <Barkod deger={barkod} yukseklik={80} />
          <p className="rakam mt-1 text-sm font-bold tracking-widest">{barkod}</p>
          <p className="text-[11px]">
            {gonderi?.takipNo ? "Takip numarası" : "Takip numarası girilmedi — sipariş numarası"}
          </p>
        </div>

        <div className="mt-3 flex justify-between border-t border-black pt-2 text-[11px]">
          <span>{siparis.satirlar.reduce((t, s) => t + s.adet, 0)} parça</span>
          <span>
            {siparis.odemeDurumu === "odendi" ? "Ödendi" : "Ödeme bekliyor"} ·{" "}
            {siparis.odemeYontemi === "kart" ? "Kart" : "Havale"}
          </span>
        </div>
      </div>
    </div>
  );
}
