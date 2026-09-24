import Link from "next/link";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { hataCozuldu, hepsiCozuldu } from "@/server/hata-islem";
import { aramaCoz } from "@/ui/panel-arama-bicim";

export const dynamic = "force-dynamic";

const EN_COK = 100;

function zaman(t: Date): string {
  return t.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Hata kaydı (K-121).
 *
 * Canlıda olan hatalar, aynı hata tek satırda ve kaç kez olduğuyla. Müşteri
 * hata ekranındaki kodu söylerse arama kutusuna yazılıyor. "Çözüldü" denen
 * hata listeden çekiliyor; aynı hata yeniden olursa kendiliğinden geri
 * geliyor — düzeltmenin tutup tutmadığı böyle anlaşılıyor.
 */
export default async function HataKaydi({ searchParams }: PageProps<"/yonetim/hatalar">) {
  await yoneticiGerekli();
  const p = await searchParams;
  const ara = aramaCoz(p.ara);
  const cozulenler = p.goster === "cozulen";
  const kosul = {
    cozuldu: cozulenler,
    ...(ara
      ? {
          OR: [
            { ozet: { contains: ara } },
            { mesaj: { contains: ara, mode: "insensitive" as const } },
            { adres: { contains: ara } },
          ],
        }
      : {}),
  };
  const [hatalar, acikSayi, cozulenSayi] = await Promise.all([
    db.errorLog.findMany({ where: kosul, orderBy: { son: "desc" }, take: EN_COK }),
    db.errorLog.count({ where: { cozuldu: false } }),
    db.errorLog.count({ where: { cozuldu: true } }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl">Hata kaydı</h1>
        <p className="mt-1 text-sm text-metin-3">
          Sitede canlıda olan hatalar: sunucuda ve müşterinin tarayıcısında. Aynı hata tek satırda,
          kaç kez olduğuyla. Kayıt 90 gün tutuluyor.
        </p>
      </div>

      {p.kayit && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          {p.kayit === "hepsi" ? "Bütün hatalar çözüldü sayıldı." : "Hata çözüldü sayıldı."} Yeniden
          olursa listeye kendiliğinden döner.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/yonetim/hatalar"
          aria-current={!cozulenler ? "page" : undefined}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
            !cozulenler ? "border-mercan bg-mercan-soluk text-metin" : "border-cizgi text-metin-2"
          }`}
        >
          Açık ({acikSayi})
        </Link>
        <Link
          href="/yonetim/hatalar?goster=cozulen"
          aria-current={cozulenler ? "page" : undefined}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
            cozulenler ? "border-mercan bg-mercan-soluk text-metin" : "border-cizgi text-metin-2"
          }`}
        >
          Çözülen ({cozulenSayi})
        </Link>
        <form className="ml-auto flex gap-2" action="/yonetim/hatalar">
          {cozulenler && <input type="hidden" name="goster" value="cozulen" />}
          <input
            name="ara"
            defaultValue={ara}
            placeholder="Hata kodu, metin ya da adres"
            aria-label="Hata kaydında ara"
            className="w-56 rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-1.5 text-sm outline-none focus:border-mercan"
          />
          <button type="submit" className="rounded-full border border-cizgi px-3 text-sm font-bold">
            Ara
          </button>
        </form>
      </div>

      {hatalar.length === 0 ? (
        <p className="rounded-marka border border-cizgi bg-yuzey p-8 text-center text-sm text-metin-3">
          {ara
            ? "Bu aramaya uyan hata yok."
            : cozulenler
              ? "Çözülmüş hata yok."
              : "Açık hata yok. 🎉"}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {hatalar.map((h) => (
            <li key={h.id} className="rounded-marka border border-cizgi bg-yuzey p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-mono text-sm font-semibold text-metin">
                    {h.mesaj}
                  </p>
                  <p className="mt-1 text-xs text-metin-3">
                    <span
                      className={`mr-2 rounded-full px-2 py-0.5 font-bold ${
                        h.kaynak === "sunucu"
                          ? "bg-mercan-soluk text-metin"
                          : "bg-mavi-soluk text-mavi-koyu"
                      }`}
                    >
                      {h.kaynak === "sunucu" ? "sunucu" : "tarayıcı"}
                    </span>
                    <span className="rakam font-bold text-metin-2">{h.adet} kez</span> · son{" "}
                    {zaman(h.son)}
                    {h.adet > 1 && <> · ilk {zaman(h.ilk)}</>}
                    {h.adres && (
                      <>
                        {" "}
                        · <span className="font-mono">{h.adres}</span>
                      </>
                    )}
                    {h.ozet && (
                      <>
                        {" "}
                        · kod <span className="rakam font-mono">{h.ozet}</span>
                      </>
                    )}
                  </p>
                </div>
                {!h.cozuldu && (
                  <form action={hataCozuldu}>
                    <input type="hidden" name="id" value={h.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-nane-koyu hover:text-nane-koyu"
                    >
                      Çözüldü
                    </button>
                  </form>
                )}
              </div>
              {h.yigin && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-bold text-metin-3">
                    Teknik ayrıntı
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-[10px] bg-zemin p-3 text-[11px] leading-relaxed text-metin-2">
                    {h.yigin}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      {!cozulenler && acikSayi > 1 && (
        <form action={hepsiCozuldu}>
          <button type="submit" className="text-sm font-bold text-metin-3 hover:text-metin">
            Hepsini çözüldü say
          </button>
        </form>
      )}
    </div>
  );
}
