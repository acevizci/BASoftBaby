import Link from "next/link";
import { notFound } from "next/navigation";
import BelgeEngeli from "@/ui/belge-engeli";
import KargoEtiketi from "@/ui/kargo-etiketi";
import { gonderiGetir } from "@/server/kargo";
import { belgeBasilabilirMi } from "@/server/siparis-belge";
import { siparisGetirPanel } from "@/server/siparis";
import { kunyeGetir } from "@/server/yasal";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

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
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { numara } = await params;
  const [siparis, gonderi, kunye] = await Promise.all([
    siparisGetirPanel(numara),
    gonderiGetir(numara),
    kunyeGetir(),
  ]);
  if (!siparis) notFound();

  // Etiket basmak “bunu kargoya veriyorum” demek: ödemesi gelmemiş bir
  // siparişte bağlantı zaten çıkmıyor, adres elle yazılırsa da burada
  // duruyor (K-54).
  const belge = belgeBasilabilirMi(siparis);
  if (!belge.basilabilir) {
    return <BelgeEngeli baslik="Kargo etiketi" sebep={belge.sebep} numara={siparis.numara} />;
  }

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
