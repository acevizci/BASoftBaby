import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { girisYapan, siparisAdedim, siparislerimiGetir } from "@/server/uyelik";
import Sayfalama from "@/ui/sayfalama";
import { sayfaAdresi, sayfaCoz } from "@/ui/sayfalama-bicim";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { durumAdi, durumRengi, odemeAdi } from "@/ui/siparis-bicim";
import { BILDIRIMLER, HATALAR, HATA_KUTUSU, IYI_KUTU, KART } from "../hesap-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Siparişlerim", robots: { index: false } };

/** Sipariş satırı iki satırlık; sayfa başına bu kadarı rahat okunuyor. */
const LISTE_BOYU = 10;

function tarihYaz(t: Date): string {
  return t.toLocaleDateString("tr-TR", { dateStyle: "long" });
}

/**
 * Siparişlerim.
 *
 * Yalnızca üye olarak verilen siparişler görünüyor. E-postası tutan eski
 * siparişler kendiliğinden bağlanmıyor: e-posta henüz doğrulanmadığı için
 * başkasının adresiyle hesap açan biri onun siparişlerini görebilirdi
 * (docs/04-kararlar.md, K-14).
 */
export default async function SiparislerimSayfasi({ searchParams }: PageProps<"/hesabim">) {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?hata=giris&nereye=%2Fhesabim");

  const { kayit, baglanan, sayfa, hata } = await searchParams;
  const toplamAdet = await siparisAdedim(musteri.id);
  const durum = sayfaCoz(sayfa, toplamAdet, LISTE_BOYU);
  const siparisler = await siparislerimiGetir(musteri.id, durum.atla, durum.boy);
  const adres = (n: number) => sayfaAdresi("/hesabim", n);

  const bildirim = typeof kayit === "string" ? BILDIRIMLER[kayit] : undefined;
  const hataMetni = typeof hata === "string" ? HATALAR[hata] : undefined;
  // Doğrulamadan sonra kaç eski siparişin bağlandığını söylüyoruz; müşteri
  // listenin neden uzadığını anlasın.
  const baglananSayisi = Number(baglanan);
  const baglamaNotu =
    kayit === "dogrulandi" && Number.isFinite(baglananSayisi) && baglananSayisi > 0
      ? ` Üye olmadan verdiğin ${baglananSayisi} sipariş hesabına bağlandı.`
      : "";

  return (
    <section className="mt-6">
      {hataMetni && <p className={HATA_KUTUSU}>{hataMetni}</p>}
      {bildirim && (
        <p className={IYI_KUTU}>
          {bildirim}
          {baglamaNotu}
        </p>
      )}

      <h2 className="mt-4 text-lg">Siparişlerim</h2>

      {toplamAdet === 0 ? (
        <div className={`mt-4 ${KART}`}>
          <p className="text-sm text-metin-2">
            Hesabınla verilmiş bir siparişin henüz yok.
          </p>
          <p className="mt-2 text-sm text-metin-3">
            Üye olmadan verdiğin siparişler burada görünmez; onları{" "}
            <Link href="/siparis-takip" className="font-bold text-mavi-koyu hover:underline">
              sipariş takibi
            </Link>{" "}
            sayfasından numara ve e-postanla görebilirsin.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-full bg-dugme px-6 py-2.5 font-bold text-dugme-yazi transition hover:brightness-95"
          >
            Alışverişe başla
          </Link>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {siparisler.map((s) => (
            <li key={s.numara} className={KART}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="rakam font-baslik text-lg font-bold">{s.numara}</span>
                <span className="text-xs text-metin-3">{tarihYaz(s.olusturuldu)}</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${durumRengi(s.durum)}`}>
                  {durumAdi(s.durum)}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${durumRengi(s.odemeDurumu)}`}
                >
                  {odemeAdi(s.odemeDurumu)}
                </span>
              </div>

              <p className="mt-3 text-sm text-metin-2">
                {s.ilkUrun}
                {s.kalemAdedi > 1 && (
                  <span className="text-metin-3"> ve toplam {s.kalemAdedi} ürün</span>
                )}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-cizgi-soluk pt-3">
                <span className="rakam font-bold">{fiyatYaz(s.toplamKurus)}</span>
                <Link
                  href={`/hesabim/siparis/${encodeURIComponent(s.numara)}`}
                  className="text-sm font-bold text-mavi-koyu hover:underline"
                >
                  Ayrıntı
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Sayfalama durum={durum} birim="sipariş" adres={adres} />
      </div>
    </section>
  );
}
