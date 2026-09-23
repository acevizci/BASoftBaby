import Link from "next/link";
import { yuzdeYaz, type Kalem, type SiparisKari } from "@/server/kar";
import { fiyatYaz } from "@/ui/katalog-bicim";

/**
 * Siparişin kâr dökümü (K-112). Yalnızca panelde.
 *
 * Tahmini kalemler (ortalama kargo, ayardaki komisyon oranı, sonradan yazılan
 * maliyet) "≈" ile, girilmemiş kalemler "girilmedi" diye yazıyor: eksik
 * bilgiyle hesaplanan bir kâr kesin gibi görünmesin.
 */
export default function KarDokumu({ kar, iptal }: { kar?: SiparisKari; iptal?: boolean }) {
  if (!kar) {
    return (
      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Kâr</h2>
        <p className="mt-2 text-sm text-metin-3">
          {iptal ? "İptal edilen siparişin kârı hesaplanmıyor." : "Hesaplanamadı."}
        </p>
      </section>
    );
  }

  const satir = (ad: string, k: Kalem, eksi = true) => (
    <div className="flex justify-between gap-3">
      <dt className="text-metin-2">{ad}</dt>
      <dd className="rakam">
        {k.kurus === null ? (
          <span className="text-metin-3">girilmedi</span>
        ) : (
          <>
            {k.tahmini && <span title="tahmini">≈ </span>}
            {eksi && k.kurus > 0 ? "−" : ""}
            {fiyatYaz(k.kurus)}
          </>
        )}
      </dd>
    </div>
  );

  return (
    <section className="rounded-marka border border-cizgi bg-yuzey p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">Kâr</h2>
        <span
          className={`rakam text-lg font-bold ${kar.katkiKurus < 0 ? "text-mercan-koyu" : "text-nane-koyu"}`}
        >
          {fiyatYaz(kar.katkiKurus)} · {yuzdeYaz(kar.marjYuzde)}
        </span>
      </div>
      <dl className="mt-3 flex max-w-md flex-col gap-1.5 text-sm">
        {satir("Net satış (KDV hariç, iadeler düşülmüş)", { kurus: kar.netSatisKurus, tahmini: false }, false)}
        {kar.vadeFarkiKurus > 0 &&
          satir("Taksit vade farkı", { kurus: kar.vadeFarkiKurus, tahmini: false }, false)}
        {satir("Ürün maliyeti", kar.maliyet)}
        <div className="flex justify-between gap-3 border-t border-cizgi-soluk pt-1.5 font-bold">
          <dt>Brüt kâr</dt>
          <dd className="rakam">{fiyatYaz(kar.brutKarKurus)}</dd>
        </div>
        {satir("Kargo", kar.kargo)}
        {satir("Paket", kar.paket)}
        {satir("Ödeme komisyonu", kar.komisyon)}
        {(kar.iadeKargo.kurus === null || kar.iadeKargo.kurus > 0) && satir("İade/değişim kargosu", kar.iadeKargo)}
        <div className="flex justify-between gap-3 border-t border-cizgi-soluk pt-1.5 font-bold">
          <dt>Kalan (katkı payı)</dt>
          <dd className={`rakam ${kar.katkiKurus < 0 ? "text-mercan-koyu" : ""}`}>{fiyatYaz(kar.katkiKurus)}</dd>
        </div>
      </dl>
      {kar.eksikler.length > 0 && (
        <p className="mt-3 rounded-marka bg-sari-soluk px-3 py-2 text-xs text-sari-koyu">
          Eksik: {kar.eksikler.join(", ")}. Girilmeyen kalem sıfır sayıldı; kâr olduğundan
          yüksek görünüyor olabilir.{" "}
          <Link href="/yonetim/ayarlar#giderler" className="font-bold underline">
            Giderleri gir
          </Link>
        </p>
      )}
      {(kar.maliyet.tahmini || kar.kargo.tahmini || kar.komisyon.tahmini || kar.iadeKargo.tahmini) && (
        <p className="mt-2 text-xs text-metin-3">≈ tahmini: ortalama ya da sonradan yazılmış değer.</p>
      )}
    </section>
  );
}
