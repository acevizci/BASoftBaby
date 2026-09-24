import Link from "next/link";
import { notFound } from "next/navigation";
import BelgeEngeli from "@/ui/belge-engeli";
import { faturaGetir } from "@/server/fatura";
import { belgeBasilabilirMi } from "@/server/siparis-belge";
import { siparisGetirPanel } from "@/server/siparis";
import { kunyeGetir } from "@/server/yasal";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

export const dynamic = "force-dynamic";

function tarihYaz(t: Date): string {
  return t.toLocaleDateString("tr-TR", { dateStyle: "long" });
}

/**
 * Yazdırılabilir fatura.
 *
 * Sağlayıcı bağlanana kadar resmî e-arşiv faturası dışarıda kesiliyor; bu
 * sayfa hem kutuya konacak belgeyi hem de faturayı keserken bakılacak
 * dökümü veriyor. KDV, sipariş toplamından geriye ayrıştırılıyor: fiyatlar
 * KDV dahil giriliyor.
 */
export default async function FaturaSayfasi({
  params,
}: PageProps<"/yonetim/siparisler/[numara]/fatura">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { numara } = await params;
  const [siparis, fatura, kunye] = await Promise.all([
    siparisGetirPanel(numara),
    faturaGetir(numara),
    kunyeGetir(),
  ]);
  if (!siparis) notFound();

  // Fatura satışın belgesi: ödenmemiş siparişe kesilen fatura olmamış bir
  // satışı belgeliyor. Bağlantı çıkmıyor, adres elle yazılsa da sayfa
  // reddediyor (K-54).
  const belge = belgeBasilabilirMi(siparis);
  if (!belge.basilabilir) {
    return <BelgeEngeli baslik="Fatura" sebep={belge.sebep} numara={siparis.numara} />;
  }

  if (!fatura) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl">Fatura</h1>
        <p className="text-sm text-metin-2">
          Bu sipariş için henüz fatura oluşturulmadı.
        </p>
        <Link
          href={`/yonetim/siparisler/${siparis.numara}`}
          className="text-sm font-bold text-mavi-koyu hover:underline"
        >
          Siparişe dön
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 yazdirma-gizle">
        <h1 className="text-2xl">Fatura</h1>
        <Link
          href={`/yonetim/siparisler/${siparis.numara}`}
          className="text-sm font-bold text-metin-2 hover:underline"
        >
          Siparişe dön
        </Link>
      </div>

      {fatura.durum === "taslak" && (
        <p className="rounded-marka bg-sari-soluk px-4 py-3 text-sm font-semibold text-sari-koyu yazdirma-gizle">
          Bu bir taslak. Resmî e-arşiv faturası kesildikten sonra numarasını sipariş
          ekranındaki alana yaz; belge o zaman &quot;kesildi&quot; olur.
        </p>
      )}

      <div className="belge mx-auto w-full max-w-[720px] border border-cizgi bg-white p-6 text-black">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/20 pb-4">
          <div>
            <p className="font-baslik text-xl font-bold">{kunye.unvan || "BASoftBaby"}</p>
            {kunye.sirketAdresi && <p className="text-xs">{kunye.sirketAdresi}</p>}
            <p className="rakam text-xs">
              {[
                kunye.vergiDairesi && `VD: ${kunye.vergiDairesi}`,
                kunye.vergiNo && `VKN/TCKN: ${kunye.vergiNo}`,
                kunye.mersisNo && `MERSİS: ${kunye.mersisNo}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase">e-Arşiv fatura</p>
            <p className="rakam text-lg font-bold">{fatura.numara}</p>
            <p className="rakam text-xs">{tarihYaz(fatura.tarih)}</p>
            <p className="rakam text-xs">Sipariş: {siparis.numara}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-bold uppercase">Alıcı</p>
          <p className="font-bold">{siparis.adSoyad}</p>
          <p className="text-sm">{siparis.adres}</p>
          <p className="text-sm">
            {siparis.ilce} / {siparis.il}
          </p>
          <p className="rakam text-sm">
            {siparis.telefon} · {siparis.eposta}
          </p>
        </div>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-black/20 text-left">
              <th className="py-2">Ürün</th>
              <th className="py-2 text-right">Adet</th>
              <th className="py-2 text-right">Birim</th>
              <th className="py-2 text-right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {siparis.satirlar.map((s, i) => (
              <tr key={i} className="border-b border-black/10">
                <td className="py-2">
                  {s.urunAd}
                  <span className="block text-xs opacity-70">
                    {s.beden} · {s.renkAdi}
                  </span>
                </td>
                <td className="rakam py-2 text-right">{s.adet}</td>
                <td className="rakam py-2 text-right">{fiyatYaz(s.fiyatKurus)}</td>
                <td className="rakam py-2 text-right">{fiyatYaz(s.araToplamKurus)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 ml-auto flex max-w-xs flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt>Ara toplam</dt>
            <dd className="rakam">{fiyatYaz(siparis.araToplamKurus)}</dd>
          </div>
          {siparis.indirimKurus > 0 && (
            <div className="flex justify-between">
              <dt>İndirim {siparis.kampanyaAdi ? `(${siparis.kampanyaAdi})` : ""}</dt>
              <dd className="rakam">-{fiyatYaz(siparis.indirimKurus)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Kargo</dt>
            <dd className="rakam">{fiyatYaz(siparis.kargoKurus)}</dd>
          </div>
          <div className="flex justify-between border-t border-black/20 pt-1">
            <dt>Matrah</dt>
            <dd className="rakam">{fiyatYaz(fatura.matrahKurus)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>KDV (%{fatura.kdvOrani})</dt>
            <dd className="rakam">{fiyatYaz(fatura.kdvKurus)}</dd>
          </div>
          <div className="flex justify-between border-t border-black/20 pt-1 font-bold">
            <dt>Genel toplam</dt>
            <dd className="rakam">{fiyatYaz(fatura.toplamKurus)}</dd>
          </div>
        </dl>

        <p className="mt-6 text-xs opacity-70">
          Fiyatlara KDV dahildir. Ödeme yöntemi:{" "}
          {siparis.odemeYontemi === "kart"
            ? "Kredi/banka kartı"
            : siparis.odemeYontemi === "hediye-ceki"
              ? "Hediye çeki"
              : "Havale/EFT"}
          {siparis.hediyeCekiKurus > 0 && siparis.odemeYontemi !== "hediye-ceki" && " ve hediye çeki"}.
          {kunye.etbisNo && ` ETBİS: ${kunye.etbisNo}.`}
        </p>
      </div>
    </div>
  );
}
