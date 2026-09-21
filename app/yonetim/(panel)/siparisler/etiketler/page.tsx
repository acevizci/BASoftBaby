import Link from "next/link";
import KargoEtiketi from "@/ui/kargo-etiketi";
import { gonderiGetir } from "@/server/kargo";
import { belgeBasilabilirMi } from "@/server/siparis-belge";
import { siparisGetirPanel } from "@/server/siparis";
import { kunyeGetir } from "@/server/yasal";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

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
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

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

  // Toplu seçimde ödemesi gelmemiş bir sipariş araya karışması en kolay
  // yer: elli satırı işaretleyip yazdırıyorsun. O etiketler basılmıyor,
  // numaraları ayrıca yazıyor — sessizce düşürmek daha kötü olurdu (K-54).
  const basilacaklar = bulunanlar.filter((k) => belgeBasilabilirMi(k.siparis!).basilabilir);
  const atlananlar = bulunanlar
    .filter((k) => !belgeBasilabilirMi(k.siparis!).basilabilir)
    .map((k) => k.siparis!.numara);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 yazdirma-gizle">
        <h1 className="text-2xl">
          Kargo etiketleri{" "}
          <span className="rakam text-base font-semibold text-metin-3">
            {basilacaklar.length} adet
          </span>
        </h1>
        <Link
          href="/yonetim/siparisler"
          className="text-sm font-bold text-metin-2 hover:underline"
        >
          Listeye dön
        </Link>
      </div>

      {atlananlar.length > 0 && (
        <div className="rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm text-sari-koyu yazdirma-gizle">
          <p className="font-bold">
            {atlananlar.length} siparişin etiketi basılmadı.
          </p>
          <p className="mt-1">
            Ödemesi tamamlanmamış ya da iptal edilmiş siparişe kargo etiketi basılmıyor:{" "}
            <span className="rakam">{atlananlar.join(", ")}</span>. Havale geldiyse ödeme
            durumunu siparişten &quot;Ödendi&quot; yap.
          </p>
        </div>
      )}

      {basilacaklar.length === 0 ? (
        <p className="rounded-marka border border-cizgi bg-yuzey p-8 text-center text-sm text-metin-2 yazdirma-gizle">
          {atlananlar.length > 0
            ? "Seçilen siparişlerin hiçbirinin etiketi basılamıyor: ödemesi tamamlanmamış ya da iptal edilmiş."
            : "Hiç sipariş seçilmemiş. Listeden seçip “Etiketleri yazdır” düğmesine bas."}
        </p>
      ) : (
        <>
          <p className="text-sm text-metin-2 yazdirma-gizle">
            Tarayıcının yazdır komutuyla (Ctrl/⌘ + P) bas. Her etiket ayrı sayfaya çıkıyor.
            {numaralar.length === EN_FAZLA && ` Tek seferde en fazla ${EN_FAZLA} etiket.`}
          </p>

          <div className="flex flex-col gap-6">
            {basilacaklar.map(({ siparis, gonderi }) => (
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
