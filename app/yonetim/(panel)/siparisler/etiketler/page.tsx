import Link from "next/link";
import KargoEtiketi from "@/ui/kargo-etiketi";
import { gonderiGetir } from "@/server/kargo";
import { siparisGetirPanel } from "@/server/siparis";
import { kunyeGetir } from "@/server/yasal";

export const dynamic = "force-dynamic";

/** Tek seferde bu kadar etiket; kazara yüzlerce sayfa açılmasın. */
const EN_FAZLA = 50;

/**
 * Seçili siparişlerin etiketlerini tek sayfada yazdırır.
 *
 * Sipariş listesinden onay kutularıyla geliniyor; numaralar adres satırında
 * taşınıyor, yani düz bir GET formu yetiyor ve JavaScript gerekmiyor (K-48).
 * Her etiket kendi sayfasına basılıyor.
 */
export default async function TopluEtiket({
  searchParams,
}: PageProps<"/yonetim/siparisler/etiketler">) {
  const { secili } = await searchParams;

  const numaralar = [
    ...new Set(
      (Array.isArray(secili) ? secili : secili ? [secili] : [])
        .map((d) => d.trim().toUpperCase())
        .filter(Boolean),
    ),
  ].slice(0, EN_FAZLA);

  const kunye = await kunyeGetir();
  const kayitlar = await Promise.all(
    numaralar.map(async (n) => ({
      siparis: await siparisGetirPanel(n),
      gonderi: await gonderiGetir(n),
    })),
  );
  const bulunanlar = kayitlar.filter((k) => k.siparis !== undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 yazdirma-gizle">
        <h1 className="text-2xl">
          Kargo etiketleri{" "}
          <span className="rakam text-base font-semibold text-metin-3">
            {bulunanlar.length} adet
          </span>
        </h1>
        <Link
          href="/yonetim/siparisler"
          className="text-sm font-bold text-metin-2 hover:underline"
        >
          Listeye dön
        </Link>
      </div>

      {bulunanlar.length === 0 ? (
        <p className="rounded-marka border border-cizgi bg-yuzey p-8 text-center text-sm text-metin-2 yazdirma-gizle">
          Hiç sipariş seçilmemiş. Listeden seçip &quot;Etiketleri yazdır&quot; düğmesine bas.
        </p>
      ) : (
        <>
          <p className="text-sm text-metin-2 yazdirma-gizle">
            Tarayıcının yazdır komutuyla (Ctrl/⌘ + P) bas. Her etiket ayrı sayfaya çıkıyor.
            {numaralar.length === EN_FAZLA && ` Tek seferde en fazla ${EN_FAZLA} etiket.`}
          </p>

          <div className="flex flex-col gap-6">
            {bulunanlar.map(({ siparis, gonderi }) => (
              <div key={siparis!.numara} className="etiket-sayfa">
                <KargoEtiketi
                  siparis={{
                    numara: siparis!.numara,
                    adSoyad: siparis!.adSoyad,
                    adres: siparis!.adres,
                    ilce: siparis!.ilce,
                    il: siparis!.il,
                    postaKodu: siparis!.postaKodu,
                    telefon: siparis!.telefon,
                    odemeDurumu: siparis!.odemeDurumu,
                    odemeYontemi: siparis!.odemeYontemi,
                    parca: siparis!.satirlar.reduce((t, s) => t + s.adet, 0),
                  }}
                  kunye={kunye}
                  tasiyiciAdi={gonderi?.tasiyiciAdi}
                  takipNo={gonderi?.takipNo}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
