import Link from "next/link";
import { notFound } from "next/navigation";
import KargoEtiketi from "@/ui/kargo-etiketi";
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
export default async function EtiketSayfasi({
  params,
}: PageProps<"/yonetim/siparisler/[numara]/etiket">) {
  const { numara } = await params;
  const [siparis, gonderi, kunye] = await Promise.all([
    siparisGetirPanel(numara),
    gonderiGetir(numara),
    kunyeGetir(),
  ]);
  if (!siparis) notFound();

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

      <KargoEtiketi
        siparis={{
          numara: siparis.numara,
          adSoyad: siparis.adSoyad,
          adres: siparis.adres,
          ilce: siparis.ilce,
          il: siparis.il,
          postaKodu: siparis.postaKodu,
          telefon: siparis.telefon,
          odemeDurumu: siparis.odemeDurumu,
          odemeYontemi: siparis.odemeYontemi,
          parca: siparis.satirlar.reduce((t, s) => t + s.adet, 0),
        }}
        kunye={kunye}
        tasiyiciAdi={gonderi?.tasiyiciAdi}
        takipNo={gonderi?.takipNo}
      />
    </div>
  );
}
