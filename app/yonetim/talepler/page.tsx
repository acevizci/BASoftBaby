import Link from "next/link";
import { db } from "@/server/veritabani";
import { talebiCevapla } from "@/server/talep-yonetim";
import { fiyatYaz } from "@/ui/katalog-bicim";
import {
  sebepAdi,
  talepDurumAdi,
  talepDurumRengi,
  turAdi,
} from "@/ui/talep-bicim";

export const dynamic = "force-dynamic";

const KART = "rounded-marka border border-cizgi bg-yuzey p-5";
const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ROZET = "rounded-full border px-3 py-1.5 text-xs font-bold transition";

function tarihYaz(t: Date): string {
  return t.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

/** Bekleyenler üstte: panelin işi sonuçlanmışları göstermek değil, bekleyeni bitirmek. */
export default async function TalepEkrani({ searchParams }: PageProps<"/yonetim/talepler">) {
  const { durum, kayit, hata } = await searchParams;
  const secili = typeof durum === "string" ? durum : "acik";

  const kosul =
    secili === "hepsi"
      ? {}
      : secili === "acik"
        ? { durum: { in: ["yeni", "onaylandi"] } }
        : { durum: secili };

  const talepler = await db.orderRequest.findMany({
    where: kosul,
    orderBy: [{ durum: "asc" }, { olusturuldu: "desc" }],
    take: 100,
    select: {
      id: true,
      tur: true,
      sebep: true,
      aciklama: true,
      durum: true,
      cevap: true,
      olusturuldu: true,
      order: {
        select: {
          numara: true,
          adSoyad: true,
          eposta: true,
          telefon: true,
          durum: true,
          odemeYontemi: true,
          odemeDurumu: true,
          toplamKurus: true,
        },
      },
      satirlar: {
        select: {
          adet: true,
          orderItem: { select: { urunAd: true, beden: true, renk: true, fiyatKurus: true } },
        },
      },
    },
  });

  const suzgecler: [string, string][] = [
    ["acik", "Bekleyen"],
    ["yeni", "Yeni"],
    ["onaylandi", "Onaylandı"],
    ["tamamlandi", "Tamamlandı"],
    ["reddedildi", "Kabul edilmedi"],
    ["hepsi", "Hepsi"],
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Talepler</h1>
      <p className="-mt-3 text-sm text-metin-3">
        Müşterilerin iptal, iade ve beden değişimi istekleri. Onaylanan iptal siparişi
        kendiliğinden iptal edip stoğu geri veriyor; iade ve değişimde ürün elinize
        geçtiğinde &quot;Tamamlandı&quot; işaretleyin.
      </p>

      {kayit === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Kaydedildi, müşteriye e-posta gönderildi.
        </p>
      )}
      {hata === "1" && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Talep işlenemedi.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {suzgecler.map(([kod, ad]) => (
          <Link
            key={kod}
            href={`/yonetim/talepler?durum=${kod}`}
            className={`${ROZET} ${
              secili === kod
                ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                : "border-cizgi text-metin-2 hover:border-metin-3"
            }`}
          >
            {ad}
          </Link>
        ))}
      </div>

      {talepler.length === 0 ? (
        <p className={`${KART} text-center text-sm text-metin-2`}>
          {secili === "acik" ? "Bekleyen talep yok." : "Bu durumda talep yok."}
        </p>
      ) : (
        talepler.map((t) => (
          <article key={t.id} className={KART}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 className="text-lg">
                  {turAdi(t.tur)} ·{" "}
                  <Link
                    href={`/yonetim/siparisler/${t.order.numara}`}
                    className="rakam hover:text-mercan-koyu"
                  >
                    {t.order.numara}
                  </Link>
                </h2>
                <p className="text-xs text-metin-3">
                  {tarihYaz(t.olusturuldu)} · {t.order.adSoyad} · {t.order.eposta} ·{" "}
                  <span className="rakam">{t.order.telefon}</span>
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${talepDurumRengi(t.durum)}`}
              >
                {talepDurumAdi(t.durum)}
              </span>
            </div>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-metin-3">Ürünler</p>
                <ul className="mt-1 text-sm">
                  {t.satirlar.map((s, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>
                        {s.orderItem.urunAd}
                        <span className="block text-xs text-metin-3">
                          {s.orderItem.beden} · {s.orderItem.renk} · {s.adet} adet
                        </span>
                      </span>
                      <span className="rakam flex-none font-semibold">
                        {fiyatYaz(s.orderItem.fiyatKurus * s.adet)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold text-metin-3">Sebep</p>
                <p className="mt-1 text-sm">{sebepAdi(t.sebep)}</p>
                {t.aciklama && (
                  <p className="mt-2 rounded-marka bg-zemin-2 px-3 py-2 text-sm text-metin-2">
                    {t.aciklama}
                  </p>
                )}
                <p className="mt-3 text-xs text-metin-3">
                  Sipariş: {t.order.durum} · {t.order.odemeYontemi} · {t.order.odemeDurumu} ·{" "}
                  <span className="rakam">{fiyatYaz(t.order.toplamKurus)}</span>
                </p>
              </div>
            </div>

            {t.cevap && (
              <p className="mt-3 rounded-marka bg-zemin-2 px-3 py-2 text-sm text-metin-2">
                <span className="font-bold">Yanıtın: </span>
                {t.cevap}
              </p>
            )}

            <form action={talebiCevapla} className="mt-4 flex flex-col gap-3">
              <input type="hidden" name="id" value={t.id} />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-metin-2">
                  Müşteriye yazılacak yanıt
                </span>
                <textarea
                  name="cevap"
                  rows={2}
                  maxLength={2000}
                  defaultValue={t.cevap}
                  placeholder={
                    t.tur === "iptal"
                      ? "Örn. Siparişin iptal edildi, ödemen 3 iş günü içinde iade edilecek."
                      : "Örn. Kargo kodunu ilettik, ürünü bu kodla ücretsiz gönderebilirsin."
                  }
                  className={GIRDI}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Sonuc ad="Onayla" deger="onaylandi" ana />
                <Sonuc ad="Tamamlandı" deger="tamamlandi" />
                <Sonuc ad="Kabul etme" deger="reddedildi" />
              </div>
            </form>
          </article>
        ))
      )}
    </div>
  );
}

function Sonuc({ ad, deger, ana = false }: { ad: string; deger: string; ana?: boolean }) {
  return (
    <button
      type="submit"
      name="sonuc"
      value={deger}
      className={
        ana
          ? "rounded-full bg-mercan px-5 py-2 text-sm font-bold text-white transition hover:brightness-95"
          : "rounded-full border border-cizgi px-5 py-2 text-sm font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
      }
    >
      {ad}
    </button>
  );
}
