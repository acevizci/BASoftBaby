import Link from "next/link";
import { db } from "@/server/veritabani";
import { renkAdlari } from "@/server/renkler";
import { bedenSirasi, sonSira } from "@/server/bedenler";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { barkodMetni, code128Svg } from "@/server/barkod";
import { fiyatYaz } from "@/ui/katalog-bicim";

export const dynamic = "force-dynamic";

/** Tek seferde en fazla bu kadar etiket; stok kadar basarken kâğıt kaçmasın. */
const EN_FAZLA = 400;

/**
 * Ürün barkod etiketleri (K-107).
 *
 * Her beden-renk için ürün adı, beden, renk, fiyat ve SKU barkodu. "Stok
 * kadar" seçilirse her adet için bir etiket (mal kabulünden sonra). Tarayıcının
 * yazdır komutuyla basılıyor; etiket boyu 50×30 mm, A4'e dizili ya da etiket
 * yazıcısına tek tek.
 */
export default async function Etiketler({ searchParams }: PageProps<"/yonetim/stok/etiketler">) {
  await yoneticiGerekli();
  const p = await searchParams;
  const urun = typeof p.urun === "string" ? p.urun : "";
  const stokKadar = p.kadar === "stok";

  const [kayit, adlar, sira] = await Promise.all([
    urun
      ? db.product.findUnique({
          where: { slug: urun },
          select: {
            ad: true,
            slug: true,
            fiyatKurus: true,
            variants: {
              select: { id: true, beden: true, renk: true, sku: true, stok: true, fiyatKurus: true, barkodNo: true },
            },
          },
        })
      : null,
    renkAdlari(),
    bedenSirasi(),
  ]);

  const varyantlar = (kayit?.variants ?? []).sort(
    (a, b) => sonSira(sira, a.beden) - sonSira(sira, b.beden) || a.renk.localeCompare(b.renk, "tr"),
  );
  const etiketler = varyantlar
    .flatMap((v) => Array.from({ length: stokKadar ? v.stok : 1 }, () => v))
    .slice(0, EN_FAZLA);

  return (
    <div className="flex flex-col gap-4">
      <div className="yazdirma-gizle flex flex-col gap-3">
        <h1 className="text-2xl">Barkod etiketleri</h1>
        {!kayit ? (
          <p className="text-sm text-metin-2">
            Etiket basılacak ürünü seç: stok ekranında ürünün yanındaki &quot;etiket&quot;
            bağlantısından gel.{" "}
            <Link href="/yonetim/stok?durum=hepsi" className="font-bold text-mavi-koyu hover:underline">
              Stok ekranı
            </Link>
          </p>
        ) : (
          <>
            <p className="text-sm text-metin-2">
              <b>{kayit.ad}</b> · <span className="rakam">{etiketler.length}</span> etiket. Tarayıcının
              yazdır komutuyla (Ctrl/⌘ + P) bas. Barkod bedenin kısa numarasını (B…) taşıyor;
              mal kabulünde, sayımda ve stok ekranında okutunca doğrudan bu beden gelir.
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <Link
                href={`/yonetim/stok/etiketler?urun=${encodeURIComponent(kayit.slug)}`}
                aria-current={!stokKadar ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 ${!stokKadar ? "border-mercan bg-mercan-soluk text-mercan-koyu" : "border-cizgi text-metin-2"}`}
              >
                Her bedenden bir
              </Link>
              <Link
                href={`/yonetim/stok/etiketler?urun=${encodeURIComponent(kayit.slug)}&kadar=stok`}
                aria-current={stokKadar ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 ${stokKadar ? "border-mercan bg-mercan-soluk text-mercan-koyu" : "border-cizgi text-metin-2"}`}
              >
                Stok kadar
              </Link>
            </div>
          </>
        )}
      </div>

      {kayit && (
        <div className="barkod-etiketleri">
          {etiketler.map((v, i) => {
            const metin = barkodMetni(v.barkodNo);
            return (
              <div key={`${v.id}-${i}`} className="barkod-etiket">
                <p className="truncate text-[11px] font-bold leading-tight">{kayit.ad}</p>
                <p className="flex justify-between text-[10px] leading-tight">
                  <span>
                    {v.beden} · {adlar[v.renk] ?? v.renk}
                  </span>
                  <span className="rakam font-bold">{fiyatYaz(v.fiyatKurus ?? kayit.fiyatKurus)}</span>
                </p>
                {/* SVG sunucuda üretiliyor; içerik yalnızca ASCII ve kaçırılmış. */}
                <div className="barkod" dangerouslySetInnerHTML={{ __html: code128Svg(metin) }} />
                <p className="rakam flex justify-between gap-1 text-[9px] leading-none">
                  <span className="font-bold">{metin}</span>
                  <span className="truncate">{v.sku}</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
