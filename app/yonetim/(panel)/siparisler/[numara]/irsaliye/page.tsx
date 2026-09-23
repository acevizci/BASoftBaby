import Link from "next/link";
import { notFound } from "next/navigation";
import BelgeEngeli from "@/ui/belge-engeli";
import { irsaliyeGetir } from "@/server/irsaliye";
import { siparisGetirPanel } from "@/server/siparis";
import { belgeBasilabilirMi } from "@/server/siparis-belge";
import { kunyeGetir } from "@/server/yasal";
import { tasiyiciAdi } from "@/server/kargo";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

export const dynamic = "force-dynamic";

function anYaz(t: Date | null): string {
  return t
    ? t.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
    : "henüz sevk edilmedi";
}

/**
 * Yazdırılabilir sevk irsaliyesi.
 *
 * Faturanın kardeşi ama aynı belge değil: fatura satışın, irsaliye malın
 * belgesi. Kutunun yanında gidiyor, o yüzden **fiyat yazmıyor** — kutuyu
 * açan kargo görevlisinin ya da hediye alıcısının tutarı görmesi gerekmiyor
 * (K-59).
 *
 * Üstünde olması gerekenler: iki tarafın künyesi, kendi seri-sıra numarası,
 * düzenleme tarih-saati, fiili sevk tarih-saati ve malın cinsi ile miktarı.
 */
export default async function IrsaliyeSayfasi({
  params,
}: PageProps<"/yonetim/siparisler/[numara]/irsaliye">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { numara } = await params;
  const [siparis, irsaliye, kunye] = await Promise.all([
    siparisGetirPanel(numara),
    irsaliyeGetir(numara),
    kunyeGetir(),
  ]);
  if (!siparis) notFound();

  // Ödemesi tamamlanmamış siparişin malı da çıkmamalı (K-54).
  const belge = belgeBasilabilirMi(siparis);
  if (!belge.basilabilir) {
    return <BelgeEngeli baslik="Sevk irsaliyesi" sebep={belge.sebep} numara={siparis.numara} />;
  }

  if (!irsaliye) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl">Sevk irsaliyesi</h1>
        <p className="text-sm text-metin-2">
          Bu sipariş için henüz irsaliye oluşturulmadı.
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

  const parca = siparis.satirlar.reduce((t, s) => t + s.adet, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 yazdirma-gizle">
        <h1 className="text-2xl">Sevk irsaliyesi</h1>
        <Link
          href={`/yonetim/siparisler/${siparis.numara}`}
          className="text-sm font-bold text-metin-2 hover:underline"
        >
          Siparişe dön
        </Link>
      </div>

      {!irsaliye.sevk && (
        <p className="rounded-marka bg-sari-soluk px-4 py-3 text-sm font-semibold text-sari-koyu yazdirma-gizle">
          Fiili sevk tarihi henüz boş. Kargo bilgisini sipariş ekranından kaydettiğinde
          kendiliğinden doluyor — belgeyi ondan sonra basmak daha doğru.
        </p>
      )}

      <div className="belge mx-auto w-full max-w-[720px] border border-cizgi bg-white p-6 text-black">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/20 pb-4">
          <div>
            <p className="text-xs font-bold uppercase">Gönderen</p>
            <p className="font-baslik text-xl font-bold">{kunye.unvan || "BASoftBaby"}</p>
            {kunye.sirketAdresi && <p className="text-xs">{kunye.sirketAdresi}</p>}
            <p className="rakam text-xs">
              {[
                kunye.vergiDairesi && `VD: ${kunye.vergiDairesi}`,
                kunye.vergiNo && `VKN/TCKN: ${kunye.vergiNo}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase">Sevk irsaliyesi</p>
            <p className="rakam text-lg font-bold">{irsaliye.numara}</p>
            <p className="rakam text-xs">Düzenleme: {anYaz(irsaliye.tarih)}</p>
            <p className="rakam text-xs">Fiili sevk: {anYaz(irsaliye.sevk)}</p>
            <p className="rakam text-xs">Sipariş: {siparis.numara}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-bold uppercase">Alıcı</p>
          <p className="font-bold">{siparis.adSoyad}</p>
          <p className="text-sm">{siparis.adres}</p>
          <p className="text-sm">
            {siparis.ilce} / {siparis.il} {siparis.postaKodu}
          </p>
          <p className="rakam text-sm">{siparis.telefon}</p>
        </div>

        {/* Fiyat sütunu yok: irsaliye malın belgesi, satışın değil. */}
        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-black/20 text-left">
              <th className="py-2">Malın cinsi</th>
              <th className="py-2">Beden</th>
              <th className="py-2">Renk</th>
              <th className="py-2 text-right">Miktar</th>
            </tr>
          </thead>
          <tbody>
            {siparis.satirlar.map((s, i) => (
              <tr key={i} className="border-b border-black/10">
                <td className="py-2">{s.urunAd}</td>
                <td className="py-2">{s.beden}</td>
                <td className="py-2">{s.renkAdi}</td>
                <td className="rakam py-2 text-right">{s.adet} adet</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-black/20 font-bold">
              <td className="py-2" colSpan={3}>
                Toplam
              </td>
              <td className="rakam py-2 text-right">{parca} adet</td>
            </tr>
          </tfoot>
        </table>

        {/* Hediye notu irsaliyede (K-98): paketleyen kişi karta ne
            yazacağını buradan okuyor; irsaliyede zaten fiyat yok. */}
        {siparis.hediyePaketi && (
          <div className="mt-4 rounded border border-black/30 p-3 text-sm">
            <p className="font-bold">Hediye paketi</p>
            {siparis.hediyeNotu ? (
              <p className="mt-1 whitespace-pre-line">Not: {siparis.hediyeNotu}</p>
            ) : (
              <p className="mt-1">Not yok.</p>
            )}
          </div>
        )}

        {(irsaliye.tasiyici || irsaliye.takipNo) && (
          <p className="rakam mt-4 text-xs">
            Taşıyıcı: {tasiyiciAdi(irsaliye.tasiyici)}
            {irsaliye.takipNo && ` · Takip: ${irsaliye.takipNo}`}
          </p>
        )}

        <div className="mt-8 flex justify-between gap-8 text-xs">
          <div className="flex-1">
            <p className="border-t border-black/30 pt-1">Teslim eden (imza)</p>
          </div>
          <div className="flex-1">
            <p className="border-t border-black/30 pt-1">Teslim alan (imza)</p>
          </div>
        </div>

        <p className="mt-6 text-xs opacity-70">
          Bu belge sevk irsaliyesidir; fatura yerine geçmez. Faturası ayrıca
          düzenlenmiştir.
        </p>
      </div>
    </div>
  );
}
