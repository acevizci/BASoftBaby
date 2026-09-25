import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { girisYapan } from "@/server/uyelik";
import { davetAyari, davetOzeti } from "@/server/davet";
import { tamAdres } from "@/server/site";
import { fiyatYaz } from "@/ui/katalog-bicim";
import KopyalaDugmesi from "@/ui/kopyala-dugmesi";
import { ETIKET, IKINCIL_DUGME, KART } from "../../hesap-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Arkadaşını davet et", robots: { index: false } };

/** Arkadaşını davet et (K-152): bağlantı, nasıl işlediği ve kazanılan çekler. */
export default async function DavetSayfasi() {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?hata=giris&nereye=%2Fhesabim%2Fdavet");
  const ayar = await davetAyari();
  if (ayar.odulKurus <= 0) notFound();

  const ozet = await davetOzeti(musteri.id);
  const baglanti = tamAdres(`/davet/${ozet.kod}`);
  const metin =
    ayar.yuzde > 0
      ? `BASoftBaby'de ilk siparişine %${ayar.yuzde} indirim: ${baglanti}`
      : `BASoftBaby: ${baglanti}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(metin)}`;

  return (
    <section className="mt-6 flex flex-col gap-5">
      <div>
        <h2 className="text-lg">Arkadaşını davet et</h2>
        <p className="mt-1 text-sm text-metin-2">
          Bağlantını paylaş.{" "}
          {ayar.yuzde > 0 && <>Arkadaşın üye olunca ilk siparişine %{ayar.yuzde} indirim alır; </>}
          ilk siparişi eline ulaşıp iade süresi (14 gün) geçince sana{" "}
          <strong className="rakam">{fiyatYaz(ayar.odulKurus)}</strong> hediye çeki tanımlanır.
        </p>
      </div>

      <div className={`${KART} flex flex-col gap-3`}>
        <p className={ETIKET}>Davet bağlantın</p>
        <p className="break-all rounded-[10px] bg-yuzey-sicak px-3 py-2 text-sm">{baglanti}</p>
        <div className="flex flex-wrap gap-2">
          <KopyalaDugmesi metin={baglanti} className={IKINCIL_DUGME} />
          <a href={whatsapp} target="_blank" rel="noopener" className={IKINCIL_DUGME}>
            WhatsApp&apos;ta paylaş
          </a>
        </div>
        <p className="text-xs text-metin-3">
          Bağlantıyla üye olan arkadaşın: <strong className="rakam">{ozet.davetEdilen}</strong>.
          Aynı telefon ya da adresle verilen siparişler ödül kazandırmaz; yılda en fazla{" "}
          <span className="rakam">{ayar.enFazla}</span> ödül.
        </p>
      </div>

      {ozet.odul.length > 0 && (
        <div className={KART}>
          <h3 className="text-base">Kazandığın hediye çekleri</h3>
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk text-sm">
            {ozet.odul.map((c) => (
              <li key={c.kod} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="rakam select-all font-bold">{c.kod}</span>
                  {c.arkadas && (
                    <span className="ml-2 text-xs text-metin-3">{c.arkadas} sayesinde</span>
                  )}
                </span>
                <span className="rakam text-metin-2">
                  {fiyatYaz(c.bakiyeKurus)} / {fiyatYaz(c.tutarKurus)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-metin-3">
            Ödeme sayfasındaki &ldquo;Hediye çeki&rdquo; alanına yaz; kalan bakiye sonraki
            siparişlerde kullanılır.
          </p>
        </div>
      )}
    </section>
  );
}
