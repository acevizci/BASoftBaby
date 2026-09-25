import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { kodlaListe } from "@/server/dogum-listesi";
import { listedenSepete } from "@/server/dogum-listesi-islem";
import { fiyatYaz } from "@/ui/katalog-bicim";
import GonderDugmesi from "@/ui/gonder-dugmesi";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/liste/[kod]">): Promise<Metadata> {
  const { kod } = await params;
  const liste = await kodlaListe(kod);
  // Kişiye özel sayfa: arama motorlarına kapalı (K-144).
  return {
    title: liste ? `${liste.baslik} · ${liste.sahipAdi}` : "Doğum listesi",
    robots: { index: false, follow: false },
  };
}

/**
 * Paylaşılan doğum listesi (K-144). Yalnızca sahibin seçtiği ad, başlık,
 * tarih ve not; adres ve e-posta yok. Kalan adedi olan kalem hediye edenin
 * sepetine liste bağlantısıyla gidiyor.
 */
export default async function PaylasilanListe({ params, searchParams }: PageProps<"/liste/[kod]">) {
  const { kod } = await params;
  const { durum } = await searchParams;
  const liste = await kodlaListe(kod);
  if (!liste) notFound();

  const tarih = liste.tarih
    ? new Date(liste.tarih).toLocaleDateString("tr-TR", {
        dateStyle: "long",
        timeZone: "Europe/Istanbul",
      })
    : null;
  const kalan = liste.kalemler.filter((k) => k.alinan < k.istenen).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="rounded-marka bg-yuzey-sicak px-6 py-8 text-center">
        <p className="text-sm font-bold text-mercan-koyu">Doğum listesi</p>
        <h1 className="mt-1 text-3xl">{liste.baslik}</h1>
        <p className="mt-2 text-metin-2">
          {liste.sahipAdi}
          {tarih && <> · beklenen tarih {tarih}</>}
        </p>
        {liste.mesaj && (
          <p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-sm text-metin-2">
            {liste.mesaj}
          </p>
        )}
      </div>

      {durum === "yok" && (
        <p className="mt-5 rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Bu ürün az önce alındı ya da stokta kalmadı. Listeden başka bir şey seçebilirsin.
        </p>
      )}

      {!liste.acik ? (
        <p className="mt-6 rounded-marka border border-cizgi bg-yuzey p-6 text-center text-sm text-metin-2">
          Bu liste sahibi tarafından kapatıldı.
        </p>
      ) : liste.kalemler.length === 0 ? (
        <p className="mt-6 rounded-marka border border-cizgi bg-yuzey p-6 text-center text-sm text-metin-2">
          Listede henüz ürün yok.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-metin-2">
            {kalan > 0
              ? "Seçtiğin hediye sepetine eklenir; siparişi kendi adresine ya da hediye paketiyle istediğin adrese gönderebilirsin. Alındığında listede işaretlenir."
              : "Listedeki her şey alınmış. Teşekkürler!"}
          </p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {liste.kalemler.map((k) => {
              const kalanAdet = k.istenen - k.alinan;
              const tamam = kalanAdet <= 0;
              const alinamaz = !k.aktif || k.stok <= 0;
              return (
                <li
                  key={k.id}
                  className="flex gap-4 rounded-marka border border-cizgi bg-yuzey p-4"
                >
                  {k.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element -- küçük görsel, zaten küçültülmüş
                    <img
                      src={k.foto}
                      alt=""
                      width={96}
                      height={96}
                      className="h-24 w-24 flex-none rounded-[12px] object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 flex-none rounded-[12px] bg-yuzey-sicak" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                    <Link
                      href={`/urun/${k.slug}?renk=${encodeURIComponent(k.renk)}`}
                      className="font-bold hover:underline"
                    >
                      {k.urunAd}
                    </Link>
                    <p className="text-xs text-metin-3">
                      {k.beden} · {k.renkAdi}
                    </p>
                    <p className="rakam font-semibold">{fiyatYaz(k.fiyatKurus)}</p>
                    <p className={`text-xs font-bold ${tamam ? "text-nane-koyu" : "text-metin-2"}`}>
                      {tamam
                        ? "Alındı"
                        : k.istenen > 1
                          ? `${k.istenen} adet isteniyor · ${kalanAdet} kaldı`
                          : "Henüz alınmadı"}
                    </p>
                    {!tamam && (
                      <form action={listedenSepete} className="mt-auto pt-1">
                        <input type="hidden" name="kalemId" value={k.id} />
                        <input type="hidden" name="kod" value={liste.kod} />
                        <GonderDugmesi
                          devreDisi={alinamaz}
                          bekleyen="Ekleniyor…"
                          className={`rounded-full px-4 py-2 text-xs font-bold ${
                            alinamaz
                              ? "cursor-not-allowed bg-cizgi-soluk text-metin-2"
                              : "bg-dugme text-dugme-yazi hover:brightness-95"
                          }`}
                        >
                          {alinamaz ? "Şu an stokta yok" : "Hediye olarak al"}
                        </GonderDugmesi>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="mt-10 text-center text-xs text-metin-3">
        Sen de bebeğin için liste hazırlamak ister misin?{" "}
        <Link href="/hesabim/dogum-listesi" className="font-bold text-mavi-koyu hover:underline">
          Doğum listesi oluştur
        </Link>
      </p>
    </div>
  );
}
