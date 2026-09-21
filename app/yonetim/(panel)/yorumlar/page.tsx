import Link from "next/link";
import { db } from "@/server/veritabani";
import { OLUMSUZ_PUAN } from "@/server/yorum";
import { yorumuAc, yorumuGizle, yorumuYanitla } from "@/server/yorum-yonetim";
import { Yildiz } from "@/ui/yildiz";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

export const dynamic = "force-dynamic";

const KART = "rounded-marka border border-cizgi bg-yuzey p-5";
const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ROZET = "rounded-full border px-3 py-1.5 text-xs font-bold transition";

function tarihYaz(t: Date): string {
  return t.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

export default async function YorumEkrani({ searchParams }: PageProps<"/yonetim/yorumlar">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { durum, kayit, hata } = await searchParams;
  const secili = typeof durum === "string" ? durum : "yayinda";

  const kosul =
    secili === "hepsi"
      ? {}
      : secili === "olumsuz"
        ? { durum: "yayinda", puan: { lte: OLUMSUZ_PUAN } }
        : { durum: secili };

  const yorumlar = await db.review.findMany({
    where: kosul,
    orderBy: { olusturuldu: "desc" },
    take: 100,
    select: {
      id: true,
      adSoyad: true,
      puan: true,
      yorum: true,
      yanit: true,
      durum: true,
      gizlemeSebebi: true,
      olusturuldu: true,
      product: { select: { ad: true, slug: true } },
    },
  });

  const suzgecler: [string, string][] = [
    ["yayinda", "Yayında"],
    ["olumsuz", `${OLUMSUZ_PUAN} yıldız ve altı`],
    ["gizli", "Gizlenmiş"],
    ["hepsi", "Hepsi"],
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Değerlendirmeler</h1>

      <div className="rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm text-metin-2">
        <p className="font-bold text-sari-koyu">Olumsuz yorum gizlenmez.</p>
        <p className="mt-1">
          Satıcı, değerlendirmeleri olumlu olumsuz ayrımı yapmadan yayımlamak zorunda.
          Gizleme yalnızca içerik için: hakaret, kişisel bilgi, ürünle alakasız metin.
          Sebep yazmadan gizlenemiyor ve gizlenen yorum burada durmaya devam ediyor.
          Memnuniyetsiz bir yoruma yapılacak doğru şey onu gizlemek değil,{" "}
          <span className="font-bold">yanıtlamak</span>.
        </p>
      </div>

      {kayit && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          {kayit === "gizlendi"
            ? "Yorum gizlendi."
            : kayit === "acildi"
              ? "Yorum yeniden yayında."
              : "Yanıtın kaydedildi."}
        </p>
      )}
      {hata === "sebep" && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Gizleme sebebi yazılmadan yorum gizlenemiyor.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {suzgecler.map(([kod, ad]) => (
          <Link
            key={kod}
            href={`/yonetim/yorumlar?durum=${kod}`}
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

      {yorumlar.length === 0 ? (
        <p className={`${KART} text-center text-sm text-metin-2`}>Bu listede yorum yok.</p>
      ) : (
        yorumlar.map((y) => (
          <article key={y.id} className={KART}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="text-sm font-bold">
                  <Link
                    href={`/urun/${y.product.slug}`}
                    className="hover:text-mercan-koyu"
                  >
                    {y.product.ad}
                  </Link>
                </p>
                <p className="flex items-center gap-2 text-xs text-metin-3">
                  <Yildiz puan={y.puan} />
                  {y.adSoyad} · {tarihYaz(y.olusturuldu)}
                </p>
              </div>
              {y.durum === "gizli" && (
                <span className="rounded-full bg-cizgi-soluk px-3 py-1 text-xs font-bold text-metin-3">
                  Gizli
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-metin-2">{y.yorum}</p>

            {y.gizlemeSebebi && (
              <p className="mt-2 text-xs text-metin-3">
                <span className="font-bold">Gizleme sebebi: </span>
                {y.gizlemeSebebi}
              </p>
            )}

            <form action={yorumuYanitla} className="mt-4 flex flex-col gap-2">
              <input type="hidden" name="id" value={y.id} />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-metin-2">Yanıtın (yorumun altında görünür)</span>
                <textarea
                  name="yanit"
                  rows={2}
                  maxLength={1000}
                  defaultValue={y.yanit}
                  placeholder="Örn. Bedenin küçük geldiğini duyduğumuza üzüldük; değişim kargosu bizden."
                  className={GIRDI}
                />
              </label>
              <button
                type="submit"
                className="self-start rounded-full bg-mercan px-5 py-2 text-sm font-bold text-white transition hover:brightness-95"
              >
                Yanıtı kaydet
              </button>
            </form>

            {y.durum === "yayinda" ? (
              <form action={yorumuGizle} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={y.id} />
                <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                  <span className="text-xs font-bold text-metin-2">
                    Gizleme sebebi (zorunlu)
                  </span>
                  <input
                    name="sebep"
                    minLength={5}
                    maxLength={500}
                    placeholder="Örn. Hakaret içeriyor · Başkasının telefon numarasını yazmış"
                    className={GIRDI}
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-full border border-cizgi px-5 py-2 text-sm font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
                >
                  Gizle
                </button>
              </form>
            ) : (
              <form action={yorumuAc} className="mt-3">
                <input type="hidden" name="id" value={y.id} />
                <button
                  type="submit"
                  className="rounded-full border border-cizgi px-5 py-2 text-sm font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
                >
                  Yeniden yayımla
                </button>
              </form>
            )}
          </article>
        ))
      )}
    </div>
  );
}
