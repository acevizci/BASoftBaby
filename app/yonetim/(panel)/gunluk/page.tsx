import Link from "next/link";
import { gunlukListe } from "@/server/gunluk";
import { RENK_ADLARI, fiyatYaz, type RenkAdi } from "@/ui/katalog-bicim";
import { durumAdi, durumRengi, yontemAdi } from "@/ui/siparis-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

export const dynamic = "force-dynamic";

const KART = "rounded-marka border border-cizgi bg-yuzey p-5";

function tarihYaz(t: Date): string {
  return t.toLocaleDateString("tr-TR", { dateStyle: "short" });
}

/**
 * Günün işi: hazırlanacak siparişler ve toplama listesi.
 *
 * Panelde her parça ayrı ayrı vardı ama "bugün ne hazırlayacağım" sorusunun
 * tek bir cevabı yoktu (K-59). Ekran yazdırılabiliyor: elinde kâğıtla rafa
 * gidilen bir iş bu.
 *
 * Toplama listesi **birleştirilmiş**: beş siparişte geçen aynı bedeni beş kez
 * değil bir kez alıyorsun. Sipariş listesi ise ayrı duruyor — hangi kutuya ne
 * gireceği oradan.
 */
export default async function GunlukEkrani() {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const g = await gunlukListe();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3 yazdirma-gizle">
        <h1 className="text-2xl">Günün işi</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/yonetim/siparisler?odeme=odendi"
            className="text-sm font-bold text-metin-2 hover:underline"
          >
            Sipariş listesi
          </Link>
          {g.siparisler.length > 0 && (
            <form method="get" action="/yonetim/siparisler/etiketler" target="_blank">
              {g.siparisler.map((s) => (
                <input key={s.numara} type="hidden" name="secili" value={s.numara} />
              ))}
              <button
                type="submit"
                className="rounded-full bg-mercan px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
              >
                Hepsinin etiketini yazdır
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="text-sm text-metin-2 yazdirma-gizle">
        Ödemesi tamamlanmış ve henüz kargoya verilmemiş siparişler. Ödemesi gelmemiş
        sipariş burada yok: onun için raftan ürün ayırmak, parayı almadan malı bağlamak
        olurdu. Bu sayfayı yazdırıp yanına alabilirsin (Ctrl/⌘ + P).
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kutu baslik="Hazırlanacak sipariş" deger={String(g.siparisler.length)} />
        <Kutu baslik="Toplanacak ürün" deger={String(g.toplamUrun)} />
        <Kutu baslik="Toplam tutar" deger={fiyatYaz(g.toplamKurus)} />
      </div>

      {g.siparisler.length === 0 ? (
        <p className={`${KART} text-center text-sm text-metin-2`}>
          Hazırlanacak sipariş yok. Ödemesi gelen her sipariş buraya düşüyor.
          {g.bugunOdenen > 0 && (
            <>
              {" "}
              Bugün <span className="rakam font-bold">{g.bugunOdenen}</span> siparişin
              ödemesi onaylanmış; hepsi kargoya verilmiş görünüyor.
            </>
          )}
        </p>
      ) : (
        <>
          <section className={KART}>
            <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg">
              Toplama listesi
              <span className="rakam text-xs font-semibold text-metin-3">
                {g.toplama.length} çeşit · {g.toplamUrun} adet
              </span>
            </h2>
            <p className="mt-1 text-xs text-metin-3 yazdirma-gizle">
              Aynı beden ve renk birleştirildi: rafa bir kez gidiyorsun.
            </p>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
                  <tr>
                    <th className="py-2">Ürün</th>
                    <th className="py-2">Beden</th>
                    <th className="py-2">Renk</th>
                    <th className="py-2 text-right">Adet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cizgi-soluk">
                  {g.toplama.map((s) => (
                    <tr key={`${s.urunAd}|${s.beden}|${s.renk}`}>
                      <td className="py-2">
                        {s.urunAd}
                        {s.siparisAdedi > 1 && (
                          <span className="rakam ml-2 text-xs text-metin-3">
                            {s.siparisAdedi} siparişte
                          </span>
                        )}
                      </td>
                      <td className="py-2">{s.beden}</td>
                      <td className="py-2">{RENK_ADLARI[s.renk as RenkAdi] ?? s.renk}</td>
                      <td className="rakam py-2 text-right font-bold">{s.adet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={KART}>
            <h2 className="text-lg">Siparişler</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
                  <tr>
                    <th className="py-2">Numara</th>
                    <th className="py-2">Tarih</th>
                    <th className="py-2">Müşteri</th>
                    <th className="py-2">Ürün</th>
                    <th className="py-2">Tutar</th>
                    <th className="py-2">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cizgi-soluk">
                  {g.siparisler.map((s) => (
                    <tr key={s.numara}>
                      <td className="py-2">
                        <Link
                          href={`/yonetim/siparisler/${s.numara}`}
                          className="rakam font-semibold hover:text-mercan-koyu"
                        >
                          {s.numara}
                        </Link>
                      </td>
                      <td className="rakam py-2 text-metin-2">{tarihYaz(s.olusturuldu)}</td>
                      <td className="py-2">
                        {s.adSoyad}
                        <span className="block text-xs text-metin-3">
                          {s.ilce} / {s.il}
                        </span>
                      </td>
                      <td className="rakam py-2">{s.urunAdedi}</td>
                      <td className="rakam py-2 font-semibold">{fiyatYaz(s.toplamKurus)}</td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${durumRengi(s.durum)}`}
                        >
                          {durumAdi(s.durum)}
                        </span>
                        <span className="mt-0.5 block text-xs text-metin-3">
                          {yontemAdi(s.odemeYontemi)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Kutu({ baslik, deger }: { baslik: string; deger: string }) {
  return (
    <div className="rounded-marka border border-cizgi bg-yuzey px-4 py-3">
      <p className="text-xs font-bold text-metin-3">{baslik}</p>
      <p className="rakam mt-1 text-xl font-bold">{deger}</p>
    </div>
  );
}
