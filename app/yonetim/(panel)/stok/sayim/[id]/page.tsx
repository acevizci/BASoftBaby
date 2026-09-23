import Link from "next/link";
import { notFound } from "next/navigation";
import {
  SAYIM_SAYFA_BOYU,
  SAYIM_SUZGECLERI,
  farkliSatirlar,
  satirFarki,
  sayimGetir,
  type SayimSuzgeci,
} from "@/server/sayim";
import { sayimBitirEylem, sayimIptalEylem, sayimKaydet } from "@/server/sayim-islem";
import { renkAdlari } from "@/server/renkler";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { fiyatYaz } from "@/ui/katalog-bicim";
import StokSekmeleri from "@/ui/stok-sekmeleri";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import BarkodOkuyucu from "@/ui/barkod-okuyucu";
import Sayfalama from "@/ui/sayfalama";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const SUZGEC_ADI: Record<SayimSuzgeci, string> = { hepsi: "Hepsi", sayilmayan: "Sayılmayanlar", farkli: "Farklılar" };

/**
 * Bir sayım (K-107): sayılanları gir, farkları gör, bitir.
 *
 * Arama kutusu barkodu da kabul ediyor: SKU tam eşleşirse yalnızca o satır
 * geliyor ve imleç onun kutusunda — okut, adedi yaz, Enter.
 */
export default async function Sayim({ params, searchParams }: PageProps<"/yonetim/stok/sayim/[id]">) {
  await yoneticiGerekli();
  const { id } = await params;
  const p = await searchParams;
  const tek = (ad: string) => (typeof p[ad] === "string" ? (p[ad] as string) : "");
  const suzgec = (SAYIM_SUZGECLERI as readonly string[]).includes(tek("suzgec"))
    ? (tek("suzgec") as SayimSuzgeci)
    : "hepsi";
  const ara = tek("ara").slice(0, 120);
  const sayfaNo = Number(tek("sayfa")) || 1;

  const [veri, adlar] = await Promise.all([sayimGetir(id, { ara, suzgec, sayfa: sayfaNo }), renkAdlari()]);
  if (!veri) notFound();
  const { sayim, ozet } = veri;
  const acik = sayim.durum === "acik";
  const onay = tek("onay") === "1" && acik;
  const farklar = onay ? await farkliSatirlar(id) : [];

  const adres = (d: { suzgec?: SayimSuzgeci; ara?: string; sayfa?: number }) => {
    const q = new URLSearchParams();
    const s = d.suzgec ?? suzgec;
    const a = d.ara ?? ara;
    if (s !== "hepsi") q.set("suzgec", s);
    if (a) q.set("ara", a);
    if (d.sayfa && d.sayfa > 1) q.set("sayfa", String(d.sayfa));
    const m = q.toString();
    return `/yonetim/stok/sayim/${id}${m ? `?${m}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">{sayim.ad}</h1>
      <StokSekmeleri secili="/yonetim/stok/sayim" />

      {tek("bitti") && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Sayım bitti; <span className="rakam">{tek("bitti")}</span> bedenin stoğu düzeltildi.
          Farklar stok hareketlerinde &quot;Sayım farkı&quot; olarak duruyor.
        </p>
      )}
      {tek("kayit") && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          <span className="rakam">{tek("kayit")}</span> satır kaydedildi.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Kutu ad="Sayılan" deger={`${ozet.sayilan} / ${ozet.toplam}`} />
        <Kutu ad="Eksik" deger={`${ozet.eksikAdet} adet`} ton={ozet.eksikAdet ? "mercan" : undefined} />
        <Kutu ad="Fazla" deger={`${ozet.fazlaAdet} adet`} ton={ozet.fazlaAdet ? "nane" : undefined} />
        <Kutu ad="Fark tutarı" deger={fiyatYaz(ozet.farkKurus)} ton={ozet.farkKurus < 0 ? "mercan" : undefined} />
      </div>

      {!acik && (
        <p className="rounded-marka bg-yuzey-sicak px-4 py-3 text-sm text-metin-2">
          Bu sayım {sayim.durum === "tamam" ? "bitti" : "iptal edildi"}
          {sayim.bitti && ` (${sayim.bitti.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })})`}; artık
          değiştirilemiyor.
        </p>
      )}

      {onay ? (
        <section className="flex flex-col gap-4 rounded-marka border border-sari bg-sari-soluk p-5">
          <h2 className="text-lg">Sayımı bitir</h2>
          <p className="text-sm text-metin-2">
            {farklar.length === 0
              ? "Sayılan bedenlerin hepsi sistemle tutuyor; stok değişmeyecek."
              : `${farklar.length} bedende fark var; aşağıdaki farklar stoğa uygulanacak.`}{" "}
            Sayılmayan {ozet.toplam - ozet.sayilan} bedene dokunulmayacak. Geri alınamıyor.
          </p>
          {farklar.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {farklar.map((s) => {
                const f = satirFarki(s) ?? 0;
                return (
                  <li key={s.id} className="rakam">
                    {s.urunAd} · {s.beden} · {adlar[s.renk] ?? s.renk}:{" "}
                    <b className={f < 0 ? "text-mercan-koyu" : "text-nane-koyu"}>{f > 0 ? `+${f}` : f}</b>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-3">
            <form action={sayimBitirEylem}>
              <input type="hidden" name="id" value={id} />
              <GonderDugmesi bekleyen="Uygulanıyor…" className="rounded-full bg-dugme px-5 py-2 text-sm font-bold text-dugme-yazi">
                Farkları stoğa uygula ve bitir
              </GonderDugmesi>
            </form>
            <Link href={adres({})} className="rounded-full border border-cizgi bg-yuzey px-5 py-2 text-sm font-bold text-metin-2">
              Saymaya devam et
            </Link>
          </div>
        </section>
      ) : (
        <>
          <form method="get" action={`/yonetim/stok/sayim/${id}`} className="flex flex-wrap items-end gap-3 rounded-marka border border-cizgi bg-yuzey p-4">
            {suzgec !== "hepsi" && <input type="hidden" name="suzgec" value={suzgec} />}
            <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
              <span className="text-xs font-bold text-metin-2">Ürün adı ya da barkod</span>
              <input name="ara" defaultValue={ara} autoFocus={!ara} placeholder="Okut ya da yaz" className={GIRDI} />
            </label>
            <button type="submit" className="rounded-full bg-dugme px-5 py-2 text-sm font-bold text-dugme-yazi">
              Bul
            </button>
            <BarkodOkuyucu alan="ara" />
            {ara && (
              <Link href={adres({ ara: "" })} className="text-sm font-bold text-metin-2 hover:underline">
                Temizle
              </Link>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {SAYIM_SUZGECLERI.map((s) => (
              <Link
                key={s}
                href={adres({ suzgec: s, sayfa: 1 })}
                aria-current={suzgec === s ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  suzgec === s ? "border-mercan bg-mercan-soluk text-mercan-koyu" : "border-cizgi text-metin-2 hover:border-metin-3"
                }`}
              >
                {SUZGEC_ADI[s]}
              </Link>
            ))}
          </div>

          {veri.satirlar.length === 0 ? (
            <p className="rounded-marka border border-cizgi bg-yuzey p-8 text-center text-sm text-metin-2">
              {ara ? `"${ara}" ile eşleşen satır yok.` : "Bu süzgeçte satır yok."}
            </p>
          ) : (
            <form action={sayimKaydet} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="ara" value={ara} />
              <input type="hidden" name="suzgec" value={suzgec === "hepsi" ? "" : suzgec} />
              <input type="hidden" name="sayfa" value={veri.sayfa > 1 ? String(veri.sayfa) : ""} />
              <div className="overflow-x-auto rounded-marka border border-cizgi bg-yuzey">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
                    <tr>
                      <th className="px-4 py-3">Ürün · beden · renk</th>
                      <th className="px-4 py-3 text-right">Rafta olmalı</th>
                      <th className="px-4 py-3">Sayılan</th>
                      <th className="px-4 py-3 text-right">Fark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cizgi-soluk">
                    {veri.satirlar.map((s) => {
                      const f = satirFarki(s);
                      return (
                        <tr key={s.id}>
                          <td className="px-4 py-2">
                            <b>{s.urunAd}</b> · {s.beden} · {adlar[s.renk] ?? s.renk}
                            <span className="rakam block text-xs text-metin-3">{s.sku}</span>
                          </td>
                          <td className="rakam px-4 py-2 text-right text-metin-2">
                            {s.sistem === null ? (
                              "—"
                            ) : (
                              <span title={`Stok ${s.sistem} + kargolanmamış siparişte ${s.ayrilan ?? 0}`}>
                                {s.sistem + (s.ayrilan ?? 0)}
                                {(s.ayrilan ?? 0) > 0 && (
                                  <span className="block text-xs text-metin-3">
                                    {s.sistem} + {s.ayrilan} siparişte
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              name={`say-${s.id}`}
                              type="number"
                              min={0}
                              max={100000}
                              inputMode="numeric"
                              defaultValue={s.sayilan ?? ""}
                              disabled={!acik}
                              autoFocus={veri.tamEslesme && veri.satirlar.length === 1}
                              className="rakam w-20 rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm outline-none focus:border-mercan"
                            />
                          </td>
                          <td
                            className={`rakam px-4 py-2 text-right font-bold ${
                              f === null || f === 0 ? "text-metin-3" : f < 0 ? "text-mercan-koyu" : "text-nane-koyu"
                            }`}
                          >
                            {f === null ? "" : f === 0 ? "tutuyor" : f > 0 ? `+${f}` : f}
                            {s.uygulanan !== null && s.uygulanan !== f && (
                              <span className="block text-xs font-normal text-metin-3">uygulanan {s.uygulanan}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {acik && (
                <GonderDugmesi
                  bekleyen="Kaydediliyor…"
                  className="sticky bottom-4 self-start rounded-full bg-dugme px-6 py-3 font-bold text-dugme-yazi shadow-md"
                >
                  Sayılanları kaydet
                </GonderDugmesi>
              )}
            </form>
          )}

          <Sayfalama
            durum={{
              sayfa: veri.sayfa,
              sonSayfa: veri.sonSayfa,
              atla: (veri.sayfa - 1) * SAYIM_SAYFA_BOYU,
              boy: SAYIM_SAYFA_BOYU,
              toplam: veri.toplamSatir,
            }}
            birim="satır"
            adres={(n) => adres({ sayfa: n })}
          />

          {acik && (
            <div className="flex flex-wrap items-center gap-3 border-t border-cizgi pt-4">
              <Link
                href={`/yonetim/stok/sayim/${id}?onay=1`}
                className="rounded-full bg-nane-koyu px-5 py-2 text-sm font-bold text-white"
              >
                Sayımı bitir…
              </Link>
              <form action={sayimIptalEylem}>
                <input type="hidden" name="id" value={id} />
                <button type="submit" className="text-sm font-bold text-metin-2 hover:underline">
                  Sayımdan vazgeç (stok değişmez)
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Kutu({ ad, deger, ton }: { ad: string; deger: string; ton?: "mercan" | "nane" }) {
  return (
    <div className="rounded-marka border border-cizgi bg-yuzey p-4">
      <p className="text-xs font-bold text-metin-3">{ad}</p>
      <p
        className={`rakam mt-1 text-lg font-bold ${ton === "mercan" ? "text-mercan-koyu" : ton === "nane" ? "text-nane-koyu" : ""}`}
      >
        {deger}
      </p>
    </div>
  );
}
