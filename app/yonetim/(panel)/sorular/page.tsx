import Link from "next/link";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { soruCevapla, soruGizle } from "@/server/soru-islem";
import GonderDugmesi from "@/ui/gonder-dugmesi";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ROZET = "rounded-full border px-3 py-1.5 text-xs font-bold transition";

const SUZGECLER: [string, string][] = [
  ["bekliyor", "Cevap bekleyen"],
  ["yayinda", "Yayında"],
  ["gizli", "Gizlenmiş"],
];

function zaman(t: Date): string {
  return t.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });
}

/**
 * Ürün soruları (K-135). Cevaplanan soru ürün sayfasında yayına giriyor;
 * soran e-posta bıraktıysa ilk cevapta haber gidiyor. Spam ya da ürünle
 * ilgisiz soru gizleniyor.
 */
export default async function Sorular({ searchParams }: PageProps<"/yonetim/sorular">) {
  await yoneticiGerekli();
  const p = await searchParams;
  const secili = typeof p.durum === "string" && SUZGECLER.some(([k]) => k === p.durum) ? p.durum : "bekliyor";
  const sorular = await db.productQuestion.findMany({
    where: { durum: secili },
    orderBy: { olusturuldu: secili === "bekliyor" ? "asc" : "desc" },
    take: 50,
    include: { product: { select: { ad: true, slug: true } } },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">Ürün soruları</h1>
        <p className="mt-1 text-sm text-metin-3">
          Müşterilerin ürün sayfasından sorduğu sorular. Cevapladığın soru ürün sayfasında herkese
          görünüyor; aynı soruyu tekrar tekrar cevaplamaktan kurtarıyor.
        </p>
      </div>

      {p.kayit && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          {p.kayit === "gizlendi" ? "Soru gizlendi." : "Cevap yayında."}
        </p>
      )}
      {p.hata === "cevap" && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">Cevap boş olamaz.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {SUZGECLER.map(([kod, ad]) => (
          <Link
            key={kod}
            href={`/yonetim/sorular?durum=${kod}`}
            className={`${ROZET} ${
              secili === kod ? "border-mercan bg-mercan-soluk text-mercan-koyu" : "border-cizgi text-metin-2 hover:border-metin-3"
            }`}
          >
            {ad}
          </Link>
        ))}
      </div>

      {sorular.length === 0 ? (
        <p className="rounded-marka border border-cizgi bg-yuzey p-8 text-center text-sm text-metin-3">
          {secili === "bekliyor" ? "Cevap bekleyen soru yok." : "Burada soru yok."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorular.map((s) => (
            <li key={s.id} className="rounded-marka border border-cizgi bg-yuzey p-4">
              <p className="text-xs text-metin-3">
                <Link href={`/urun/${s.product.slug}#sorular`} className="font-bold text-mavi-koyu hover:underline">
                  {s.product.ad}
                </Link>{" "}
                · {s.adSoyad || "Ziyaretçi"} · {zaman(s.olusturuldu)}
                {s.eposta && " · e-postayla haber bekliyor"}
              </p>
              <p className="mt-2 text-sm font-bold">{s.soru}</p>
              <form action={soruCevapla} className="mt-3 flex flex-col gap-2">
                <input type="hidden" name="id" value={s.id} />
                <textarea name="cevap" rows={2} defaultValue={s.cevap} required className={GIRDI} placeholder="Cevabın" />
                <div className="flex flex-wrap items-center gap-2">
                  <GonderDugmesi
                    bekleyen="Kaydediliyor…"
                    className="rounded-full bg-dugme px-4 py-1.5 text-xs font-bold text-dugme-yazi"
                  >
                    {s.durum === "yayinda" ? "Cevabı güncelle" : "Cevapla ve yayınla"}
                  </GonderDugmesi>
                </div>
              </form>
              {s.durum !== "gizli" && (
                <form action={soruGizle} className="mt-2">
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="text-xs font-bold text-metin-3 hover:text-mercan-koyu">
                    Gizle (spam ya da ürünle ilgisiz)
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
