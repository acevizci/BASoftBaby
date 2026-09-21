import Link from "next/link";
import { KISA_LISTE, KRITIK_STOK, panelOzetiGetir } from "@/server/panel-ozet";
import { RENK_ADLARI, fiyatYaz, type RenkAdi } from "@/ui/katalog-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import PanelBildirim from "@/ui/panel-bildirim";

export const dynamic = "force-dynamic";

const KART = "rounded-marka border border-cizgi bg-yuzey p-5";

function renkAdi(renk: string): string {
  return RENK_ADLARI[renk as RenkAdi] ?? renk;
}

/**
 * Sahibe özel bir sayfaya girmeye çalışan yönetici buraya yollanıyor
 * (`sahipGerekli`). Eskiden sessizce atılıyordu: bağlantı bozukmuş gibi
 * duruyordu (K-61).
 */
const HATALAR: Record<string, string> = {
  yok: "O sayfayı yalnızca sahip rolündeki kullanıcılar açabiliyor.",
};

export default async function YonetimOzeti({ searchParams }: PageProps<"/yonetim">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { yetki } = await searchParams;
  const o = await panelOzetiGetir();

  const fark = o.bugunAdet - o.dunAdet;
  const bekleyenIs = o.isler.filter((i) => i.acil);

  return (
    <div className="flex flex-col gap-6">
      <PanelBildirim hata={yetki} hatalar={HATALAR} />

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl">Özet</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/yonetim/siparisler"
            className="rounded-full border border-cizgi px-5 py-2.5 text-sm font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
          >
            Siparişler
          </Link>
          <Link
            href="/yonetim/urunler/yeni"
            className="rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
          >
            Yeni ürün
          </Link>
        </div>
      </div>

      {/* Kurulum eksikleri en üstte: mağazanın çalışmasını engelleyen ya da
          yasal olarak gereken şeyler, panelde başka yerde görünmüyor. */}
      {o.eksikler.length > 0 && (
        <section className="rounded-marka border border-sari bg-sari-soluk p-5">
          <h2 className="text-lg text-sari-koyu">Tamamlanmamış ayarlar</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {o.eksikler.map((e) => (
              <li key={e.ad} className="text-sm">
                <Link href={e.adres} className="font-bold text-sari-koyu hover:underline">
                  {e.ad} →
                </Link>
                <p className="text-metin-2">{e.aciklama}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={KART}>
        <h2 className="text-lg">Bugün</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold text-metin-3">Sipariş</p>
            <p className="font-baslik text-3xl font-bold">{o.bugunAdet}</p>
            <p className="text-xs text-metin-3">
              {o.dunAdet === 0 && o.bugunAdet === 0
                ? "dün de yoktu"
                : fark === 0
                  ? "dünle aynı"
                  : `dün ${o.dunAdet} · ${fark > 0 ? "+" : ""}${fark}`}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-metin-3">Bugünkü tutar</p>
            <p className="font-baslik text-3xl font-bold">{fiyatYaz(o.bugunKurus)}</p>
            <p className="text-xs text-metin-3">iptaller hariç</p>
          </div>
          <div>
            <p className="text-xs font-bold text-metin-3">Bu ay</p>
            <p className="font-baslik text-3xl font-bold">{fiyatYaz(o.ayKurus)}</p>
            <p className="rakam text-xs text-metin-3">{o.ayAdet} sipariş</p>
          </div>
        </div>
      </section>

      <section className={KART}>
        <h2 className="text-lg">Yapılacaklar</h2>
        <p className="mt-1 text-xs text-metin-3">
          {bekleyenIs.length === 0
            ? "Bekleyen iş yok."
            : "Her satır kendi süzülmüş listesine gidiyor."}
        </p>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {o.isler.map((i) => (
            <li key={i.ad}>
              <Link
                href={i.adres}
                className={`flex h-full items-start gap-3 rounded-marka border p-4 transition ${
                  i.acil
                    ? "border-mercan bg-mercan-soluk hover:brightness-[0.98]"
                    : "border-cizgi-soluk hover:border-cizgi"
                }`}
              >
                <span
                  className={`rakam font-baslik text-2xl font-bold ${
                    i.acil ? "text-mercan-koyu" : "text-metin-3"
                  }`}
                >
                  {i.adet}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-bold ${i.acil ? "" : "text-metin-2"}`}>
                    {i.ad}
                  </span>
                  {/* Acil kartın zemini soluk mercan; `metin-3` orada
                      2,66:1 veriyordu — eşiğin altında. Renkli zeminde bir
                      ton koyu yazı gerekiyor (K-62). */}
                  <span className={`block text-xs ${i.acil ? "text-metin-2" : "text-metin-3"}`}>
                    {i.aciklama}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {o.bekleyenler.length > 0 && (
        <section className={KART}>
          <h2 className="text-lg">Stoka girmesi beklenenler</h2>
          <p className="mt-1 text-xs text-metin-3">
            &quot;Gelince haber ver&quot; diyen müşteriler. Neyin önce sipariş edileceğinin
            en doğrudan cevabı — geldiğinde bu kişilere kendiliğinden e-posta gidiyor.
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
            {o.bekleyenler.map((b) => (
              <li
                key={`${b.slug}-${b.beden}-${b.renk}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm"
              >
                <Link
                  href={`/yonetim/urunler/${b.slug}`}
                  className="font-semibold hover:text-mercan-koyu"
                >
                  {b.urunAd}
                </Link>
                <span className="text-metin-3">
                  {b.beden} · {renkAdi(b.renk)}
                </span>
                <span className="rakam ml-auto font-bold text-mavi-koyu">{b.kisi} kişi</span>
              </li>
            ))}
          </ul>
          {o.bekleyenToplam > KISA_LISTE && (
            <p className="mt-3 text-xs text-metin-3">
              <span className="rakam font-bold">{o.bekleyenToplam}</span> bedenin en çok
              beklenen {KISA_LISTE} tanesi.
            </p>
          )}
        </section>
      )}

      <section className={KART}>
        <h2 className="text-lg">Stoğu azalanlar</h2>
        {o.azalanlar.length === 0 ? (
          <p className="mt-2 text-sm text-metin-2">
            {KRITIK_STOK} adedin altına düşen beden yok.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
            {o.azalanlar.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <Link
                  href={`/yonetim/urunler/${v.slug}`}
                  className="font-semibold hover:text-mercan-koyu"
                >
                  {v.urunAd}
                </Link>
                <span className="text-metin-3">
                  {v.beden} · {renkAdi(v.renk)}
                </span>
                <span className="rakam ml-auto font-bold text-mercan-koyu">{v.stok} adet</span>
              </li>
            ))}
          </ul>
        )}
        {o.azalanToplam > KISA_LISTE && (
          <p className="mt-3 text-xs text-metin-3">
            <span className="rakam font-bold">{o.azalanToplam}</span> bedenin en aza düşen{" "}
            {KISA_LISTE} tanesi.
          </p>
        )}
        <Link
          href="/yonetim/stok"
          className="mt-4 inline-block text-sm font-bold text-mavi-koyu hover:underline"
        >
          Stok ekranına git
        </Link>
      </section>
    </div>
  );
}
