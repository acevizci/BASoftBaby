import Link from "next/link";
import { yuzdeYaz } from "@/server/kar";
import type { KarKirilimi, KarRaporu } from "@/server/kar-raporu";
import { fiyatYaz } from "@/ui/katalog-bicim";

const KART = "rounded-marka border border-cizgi bg-yuzey p-5";

/**
 * Satış raporunun kâr bölümü (K-113). Yalnızca ödemesi alınmış siparişler;
 * her sipariş sipariş ekranındaki dökümün aynısı (K-112).
 */
export default function KarRaporuBolumu({ r }: { r: KarRaporu }) {
  if (r.siparis === 0) {
    return (
      <section className={KART}>
        <h2 className="text-lg">Kâr</h2>
        <p className="mt-2 text-sm text-metin-2">Bu dönemde ödemesi alınmış sipariş yok.</p>
      </section>
    );
  }
  const fark = r.oncekiKatkiKurus === 0 ? null : ((r.katkiKurus - r.oncekiKatkiKurus) / Math.abs(r.oncekiKatkiKurus)) * 100;

  return (
    <>
      <section className={KART}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">Kâr</h2>
          <span className="text-xs text-metin-3">
            ödemesi alınmış {r.siparis} sipariş · KDV hariç ·{" "}
            <Link href="/yonetim/kar" className="font-bold text-mavi-koyu hover:underline">
              sabit giderlerle aylık kâr
            </Link>
          </span>
        </div>
        <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <dl className="flex flex-col gap-1.5 text-sm">
            <Satir ad="Net satış (iadeler düşülmüş)" kurus={r.netSatisKurus} />
            {r.vadeFarkiKurus > 0 && <Satir ad="Taksit vade farkı" kurus={r.vadeFarkiKurus} />}
            <Satir ad="Ürün maliyeti" kurus={-r.maliyetKurus} />
            <Satir ad="Brüt kâr" kurus={r.brutKarKurus} kalin />
            <Satir ad="Kargo" kurus={-r.kargoKurus} />
            <Satir ad="Paket" kurus={-r.paketKurus} />
            <Satir ad="Ödeme komisyonu" kurus={-r.komisyonKurus} />
            {r.iadeKargoKurus > 0 && <Satir ad="İade/değişim kargosu" kurus={-r.iadeKargoKurus} />}
            <Satir ad="Kalan (katkı payı)" kurus={r.katkiKurus} kalin />
          </dl>
          <div className="flex flex-col gap-2">
            <p className="font-baslik text-3xl font-bold">
              <span className={r.katkiKurus < 0 ? "text-mercan-koyu" : ""}>{fiyatYaz(r.katkiKurus)}</span>
            </p>
            <p className="text-sm text-metin-2">
              marj {yuzdeYaz(r.marjYuzde)}
              {fark !== null && (
                <span className={fark >= 0 ? "text-nane-koyu" : "text-mercan-koyu"}>
                  {" "}· önceki döneme göre {fark >= 0 ? "+" : ""}
                  {yuzdeYaz(fark)}
                </span>
              )}
            </p>
            {r.eksikSiparis > 0 && (
              <p className="rounded-marka bg-sari-soluk px-3 py-2 text-xs text-sari-koyu">
                {r.eksikSiparis} sipariş eksik bilgiyle hesaplandı ({r.eksikSebepler.join(", ")}). Girilmeyen
                kalem sıfır sayıldı; kâr olduğundan yüksek görünüyor olabilir.{" "}
                <Link href="/yonetim/ayarlar/giderler" className="font-bold underline">
                  Giderler
                </Link>
              </p>
            )}
            {r.tahminiSiparis > 0 && (
              <p className="text-xs text-metin-3">
                {r.tahminiSiparis} siparişte ortalama kargo, ayardaki komisyon oranı ya da sonradan yazılmış
                maliyet kullanıldı.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <KarTablosu baslik="Ürün bazında brüt kâr" satirlar={r.urunler} birim="adet" not="Alış fiyatı olan ürünler." />
        <KarTablosu baslik="Kategori bazında brüt kâr" satirlar={r.kategoriler} birim="adet" />
        <KarTablosu
          baslik="Ödeme yöntemine göre kalan"
          satirlar={r.odeme}
          birim="sipariş"
          not="Kartta komisyon ve taksit farkı düşülmüş."
        />
        <section className={KART}>
          <h2 className="text-lg">Bedava kargo</h2>
          <p className="mt-1 text-xs text-metin-3">Kargo ücretini müşteriden almadığın siparişler, alınanlarla yan yana.</p>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-metin-3">
              <tr>
                <th className="py-1.5"></th>
                <th className="py-1.5 text-right">Sipariş</th>
                <th className="py-1.5 text-right">Ort. kalan</th>
                <th className="py-1.5 text-right">Ort. kargo gideri</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi-soluk">
              {(
                [
                  ["Bedava kargo", r.kargo.bedava],
                  ["Ücretli kargo", r.kargo.ucretli],
                ] as const
              ).map(([ad, g]) => (
                <tr key={ad}>
                  <td className="py-1.5">{ad}</td>
                  <td className="rakam py-1.5 text-right">{g.siparis}</td>
                  <td className="rakam py-1.5 text-right">{g.siparis ? fiyatYaz(Math.round(g.katkiKurus / g.siparis)) : "—"}</td>
                  <td className="rakam py-1.5 text-right">
                    {g.siparis ? fiyatYaz(Math.round(g.kargoGiderKurus / g.siparis)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {r.kampanyalar.length > 0 && (
        <section className={KART}>
          <h2 className="text-lg">Kampanyalar</h2>
          <p className="mt-1 text-xs text-metin-3">Kampanyanın uygulandığı siparişler: indirime ne verildi, ne kaldı.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-cizgi text-left text-xs text-metin-3">
                <tr>
                  <th className="py-2">Kampanya</th>
                  <th className="py-2 text-right">Sipariş</th>
                  <th className="py-2 text-right">Verilen indirim</th>
                  <th className="py-2 text-right">Kalan</th>
                  <th className="py-2 text-right">Marj</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi-soluk">
                {r.kampanyalar.map((k) => (
                  <tr key={k.ad}>
                    <td className="py-2">{k.ad}</td>
                    <td className="rakam py-2 text-right">{k.adet}</td>
                    <td className="rakam py-2 text-right">{fiyatYaz(k.indirimKurus)}</td>
                    <td className={`rakam py-2 text-right ${k.karKurus < 0 ? "font-bold text-mercan-koyu" : ""}`}>
                      {fiyatYaz(k.karKurus)}
                    </td>
                    <td className="rakam py-2 text-right">{yuzdeYaz(k.marjYuzde)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {r.zararEdenler.length > 0 && (
        <section className={`${KART} border-mercan`}>
          <h2 className="text-lg">Zarar eden siparişler</h2>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {r.zararEdenler.slice(0, 20).map((z) => (
              <li key={z.numara} className="flex flex-wrap justify-between gap-2">
                <Link href={`/yonetim/siparisler/${z.numara}`} className="rakam font-bold text-mavi-koyu hover:underline">
                  {z.numara}
                </Link>
                <span className="text-metin-2">{z.sebep}</span>
                <span className="rakam font-bold text-mercan-koyu">{fiyatYaz(z.katkiKurus)}</span>
              </li>
            ))}
          </ul>
          {r.zararEdenler.length > 20 && (
            <p className="mt-2 text-xs text-metin-3">…ve {r.zararEdenler.length - 20} sipariş daha.</p>
          )}
        </section>
      )}
    </>
  );
}

function Satir({ ad, kurus, kalin }: { ad: string; kurus: number; kalin?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${kalin ? "border-t border-cizgi-soluk pt-1.5 font-bold" : ""}`}>
      <dt className={kalin ? "" : "text-metin-2"}>{ad}</dt>
      <dd className={`rakam ${kurus < 0 && kalin ? "text-mercan-koyu" : ""}`}>
        {kurus < 0 ? `−${fiyatYaz(-kurus)}` : fiyatYaz(kurus === 0 ? 0 : kurus)}
      </dd>
    </div>
  );
}

function KarTablosu({
  baslik,
  satirlar,
  birim,
  not,
}: {
  baslik: string;
  satirlar: KarKirilimi[];
  birim: string;
  not?: string;
}) {
  // Hem en kazandıranlar hem en düşük marjlılar önemli; ilk 8 kâra göre,
  // altında marjı en düşük 3 ayrıca.
  const ust = satirlar.slice(0, 8);
  const dusuk = [...satirlar]
    .filter((s) => !ust.includes(s) && s.marjYuzde !== null)
    .sort((a, b) => (a.marjYuzde ?? 0) - (b.marjYuzde ?? 0))
    .slice(0, 3);
  return (
    <section className={KART}>
      <h2 className="text-lg">{baslik}</h2>
      {not && <p className="mt-1 text-xs text-metin-3">{not}</p>}
      {satirlar.length === 0 ? (
        <p className="mt-2 text-sm text-metin-2">Hesaplanacak veri yok; ürünlere alış fiyatı girildikçe dolacak.</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-metin-3">
            <tr>
              <th className="py-1.5"></th>
              <th className="py-1.5 text-right">{birim}</th>
              <th className="py-1.5 text-right">Kâr</th>
              <th className="py-1.5 text-right">Marj</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cizgi-soluk">
            {[...ust, ...dusuk].map((s, i) => (
              <tr key={s.ad} className={i === ust.length ? "border-t-2 border-cizgi" : ""}>
                <td className="py-1.5">
                  {s.ad}
                  {i >= ust.length && <span className="block text-xs text-metin-3">en düşük marjlılardan</span>}
                </td>
                <td className="rakam py-1.5 text-right">{s.adet}</td>
                <td className={`rakam py-1.5 text-right ${s.karKurus < 0 ? "font-bold text-mercan-koyu" : ""}`}>
                  {fiyatYaz(s.karKurus)}
                </td>
                <td className="rakam py-1.5 text-right">{yuzdeYaz(s.marjYuzde)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
