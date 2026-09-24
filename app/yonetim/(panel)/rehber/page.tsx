import Link from "next/link";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { rehberKaydet, rehberSil } from "@/server/rehber-islem";
import { kelimeSayisi } from "@/ui/rehber-bicim";
import GonderDugmesi from "@/ui/gonder-dugmesi";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";
const KART = "rounded-marka border border-cizgi bg-yuzey p-5";

const ORNEK = `Hastaneye giderken çantanda bebeğin için şunlar olsun.

## Kıyafet
- 3 zıbın ve 3 body: [zıbın ve body](/zibin-body)
- 2 tulum, mevsime göre
- Şapka ve patik

## Sen için
- Emzirme sütyeni
- Rahat bir pijama

Tam liste için [yenidoğan ürünlerimize](/yenidogan) bakabilirsin.`;

/**
 * Rehber yazıları (K-132): liste ve düzenleme tek ekranda.
 */
export default async function RehberYonetimi({ searchParams }: PageProps<"/yonetim/rehber">) {
  await yoneticiGerekli();
  const p = await searchParams;
  const yazilar = await db.article.findMany({ orderBy: { olusturuldu: "desc" } });
  const duzenlenen = typeof p.duzenle === "string" ? yazilar.find((y) => y.id === p.duzenle) : undefined;
  const yeni = p.yeni === "1";
  const formAcik = yeni || Boolean(duzenlenen);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Rehber yazıları</h1>
          <p className="mt-1 text-sm text-metin-3">
            &quot;Hastane çantası listesi&quot; gibi yazılar: Google&apos;dan gelen ziyaretçinin en büyük
            kaynağı. Mağazada{" "}
            <Link href="/rehber" className="font-bold text-mavi-koyu hover:underline">
              /rehber
            </Link>
            .
          </p>
        </div>
        {!formAcik && (
          <Link
            href="/yonetim/rehber?yeni=1"
            className="rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
          >
            Yeni yazı
          </Link>
        )}
      </div>

      {p.kayit === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">Kaydedildi.</p>
      )}
      {p.kayit === "silindi" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">Yazı silindi.</p>
      )}
      {p.hata === "baslik" && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Başlık boş olamaz.
        </p>
      )}

      {formAcik && (
        <form action={rehberKaydet} className={`flex flex-col gap-4 ${KART}`}>
          {duzenlenen && <input type="hidden" name="id" value={duzenlenen.id} />}
          <h2 className="text-lg">{duzenlenen ? "Yazıyı düzenle" : "Yeni yazı"}</h2>
          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Başlık</span>
            <input
              name="baslik"
              required
              maxLength={120}
              defaultValue={duzenlenen?.baslik}
              placeholder="Hastane çantası listesi: yenidoğan için neler lazım?"
              className={GIRDI}
            />
            {duzenlenen && (
              <span className="text-xs text-metin-3">
                Adres: <span className="font-mono">/rehber/{duzenlenen.slug}</span> — başlık değişse de
                sabit kalıyor.
              </span>
            )}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Kısa açıklama (arama sonucunda görünür)</span>
            <input name="ozet" maxLength={200} defaultValue={duzenlenen?.ozet} className={GIRDI} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Metin</span>
            <textarea
              name="metin"
              rows={16}
              defaultValue={duzenlenen?.metin}
              placeholder={ORNEK}
              className={`${GIRDI} font-mono`}
            />
            <span className="text-xs text-metin-3">
              Boş satır paragraf · &quot;## &quot; ara başlık · &quot;- &quot; madde ·
              [yazı](/adres) bağlantı. Kategori ve ürün sayfalarına bağlantı ver: hem müşteri hem Google
              için. 600-1500 kelime iyi bir uzunluk.
              {duzenlenen?.metin ? ` Şu an ${kelimeSayisi(duzenlenen.metin)} kelime.` : ""}
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Yazının altında gösterilecek ürünler</span>
            <textarea
              name="urunler"
              rows={3}
              defaultValue={duzenlenen?.urunSluglari.join("\n")}
              placeholder={"Ürün adresleri, her satıra bir tane:\n/urun/pamuklu-tulum"}
              className={`${GIRDI} font-mono`}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="yayinda" defaultChecked={duzenlenen?.yayinda ?? false} />
            Yayında
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <GonderDugmesi
              bekleyen="Kaydediliyor…"
              className="rounded-full bg-dugme px-6 py-2.5 font-bold text-dugme-yazi transition hover:brightness-95"
            >
              Kaydet
            </GonderDugmesi>
            {duzenlenen?.yayinda && (
              <Link href={`/rehber/${duzenlenen.slug}`} className="text-sm font-bold text-mavi-koyu hover:underline">
                Mağazada gör
              </Link>
            )}
            <Link href="/yonetim/rehber" className="text-sm font-bold text-metin-3 hover:text-metin">
              Kapat
            </Link>
          </div>
        </form>
      )}

      {duzenlenen && (
        <form action={rehberSil} className="self-start">
          <input type="hidden" name="id" value={duzenlenen.id} />
          <button type="submit" className="text-sm font-bold text-mercan-koyu hover:underline">
            Bu yazıyı sil
          </button>
        </form>
      )}

      <section className={KART}>
        <h2 className="text-lg">Yazılar</h2>
        {yazilar.length === 0 ? (
          <p className="mt-2 text-sm text-metin-3">Henüz yazı yok.</p>
        ) : (
          <ul className="mt-3 divide-y divide-cizgi-soluk">
            {yazilar.map((y) => (
              <li key={y.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <Link href={`/yonetim/rehber?duzenle=${y.id}`} className="font-semibold hover:underline">
                  {y.baslik}
                </Link>
                <span className="text-xs text-metin-3">
                  {y.yayinda ? "yayında" : "taslak"} · {kelimeSayisi(y.metin)} kelime
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
