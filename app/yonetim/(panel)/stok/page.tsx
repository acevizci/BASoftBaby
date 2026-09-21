import Link from "next/link";
import { stoklariKaydet } from "@/server/yonetim";
import {
  AZALAN_ESIK,
  SAYFA_BOYU,
  stokAdresi,
  stokSayfasi,
  suzgeciCoz,
  type StokDurumu,
  type StokBedeni,
  type StokUrunu,
} from "@/server/stok-ekrani";
import { BEDENLER, RENK_ADLARI, type RenkAdi } from "@/ui/katalog-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ROZET = "rounded-full border px-3 py-1.5 text-xs font-bold transition";

const SUZGEC_ADLARI: Record<StokDurumu, string> = {
  sorunlu: "Sorunlular",
  biten: "Bitenler",
  hepsi: "Hepsi",
};

/**
 * Stok ekranı.
 *
 * Liste süzgeçli ve sayfalı (K-44). Form yalnızca o sayfadaki ürünlerin
 * bedenlerini taşıyor; kaydetme işlemi de zaten formda geleni yazıyor, yani
 * başka sayfadaki bir bedene dokunulmuyor. Katlanmış bedenler formun içinde,
 * onlar gönderiliyor.
 */
export default async function StokEkrani({ searchParams }: PageProps<"/yonetim/stok">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const parametreler = await searchParams;
  const suzgec = suzgeciCoz(parametreler);
  const { kayit } = parametreler;
  const { urunler, sayfa, sonSayfa, toplamAdet, sayaclar } = await stokSayfasi(suzgec);

  const adres = (degisiklik: Partial<typeof suzgec>) =>
    stokAdresi({ ...suzgec, sayfa: 1, ...degisiklik });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Stok</h1>
      <p className="text-sm text-metin-2">
        Biten ve azalan bedenler önce geliyor. Değiştirip kaydet; sıfır yazdığın beden
        mağazada seçilemez hale gelir.
      </p>

      {kayit === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Stoklar kaydedildi. Düzelttiğin bedenler &quot;sorunlular&quot; listesinden çıkar.
        </p>
      )}

      {/* Düz GET formu: JavaScript kapalıyken de çalışıyor, sonuç adresi
          paylaşılabiliyor. */}
      <form
        method="get"
        action="/yonetim/stok"
        className="flex flex-wrap items-center gap-2 rounded-marka border border-cizgi bg-yuzey p-4"
      >
        {/* Arama yapılınca seçili süzgeç kaybolmasın. */}
        {suzgec.durum !== "sorunlu" && (
          <input type="hidden" name="durum" value={suzgec.durum} />
        )}
        <input
          name="ara"
          defaultValue={suzgec.ara}
          placeholder="Ürün ara"
          className={`${GIRDI} min-w-[200px] flex-1`}
        />
        <button
          type="submit"
          className="rounded-full bg-mercan px-5 py-2 text-sm font-bold text-white transition hover:brightness-95"
        >
          Ara
        </button>
        {suzgec.ara && (
          <Link href={adres({ ara: "" })} className={`${ROZET} border-cizgi text-metin-2 hover:border-metin-3`}>
            Temizle
          </Link>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["sorunlu", sayaclar.sorunlu],
            ["biten", sayaclar.biten],
            ["hepsi", sayaclar.hepsi],
          ] as [StokDurumu, number][]
        ).map(([d, adet]) => (
          <Link
            key={d}
            href={adres({ durum: d })}
            aria-current={suzgec.durum === d ? "page" : undefined}
            className={`${ROZET} ${
              suzgec.durum === d
                ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                : "border-cizgi text-metin-2 hover:border-metin-3"
            }`}
          >
            {SUZGEC_ADLARI[d]} <span className="rakam">({adet})</span>
          </Link>
        ))}
        <span className="text-xs text-metin-3">
          {suzgec.durum === "hepsi"
            ? "pasif ürünler dahil"
            : `biten ve ${AZALAN_ESIK} adet ve altına düşen bedenler`}
        </span>
      </div>

      {urunler.length === 0 ? (
        <p className="rounded-marka border border-cizgi bg-yuzey p-8 text-center text-sm text-metin-2">
          {suzgec.ara
            ? `"${suzgec.ara}" aramasına uyan ürün yok.`
            : suzgec.durum === "hepsi"
              ? "Henüz ürün yok."
              : "Biten ya da azalan beden yok — stoklar yerinde."}
        </p>
      ) : (
        <>
          <p className="text-sm text-metin-3">
            <span className="rakam font-bold text-metin-2">{toplamAdet}</span> ürün
            {sonSayfa > 1 && ` · sayfa ${sayfa}/${sonSayfa}`}
          </p>

          <form action={stoklariKaydet} className="flex flex-col gap-5">
            {/* Kaydettikten sonra aynı süzgeç ve sayfaya dönülüyor: bir
                bedeni düzeltip kaydedince listenin başına atılmak, kaldığın
                yeri her seferinde yeniden bulmak demekti. */}
            <input type="hidden" name="ara" value={suzgec.ara} />
            <input type="hidden" name="durum" value={suzgec.durum} />
            <input type="hidden" name="sayfa" value={String(sayfa)} />

            {urunler.map((u) => (
              <Urun key={u.id} urun={u} hepsiAcik={suzgec.durum === "hepsi"} />
            ))}

            <button
              type="submit"
              className="sticky bottom-4 self-start rounded-full bg-mercan px-6 py-3 font-bold text-white shadow-md transition hover:brightness-95"
            >
              Stokları kaydet
            </button>
          </form>

          {sonSayfa > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-metin-3">
                Sayfa <span className="rakam font-bold">{sayfa}</span> /{" "}
                <span className="rakam">{sonSayfa}</span> · sayfada {SAYFA_BOYU} ürün
              </p>
              <div className="flex gap-2">
                <Sayfa
                  yazi="← Önceki"
                  adres={stokAdresi({ ...suzgec, sayfa: sayfa - 1 })}
                  acik={sayfa > 1}
                />
                <Sayfa
                  yazi="Sonraki →"
                  adres={stokAdresi({ ...suzgec, sayfa: sayfa + 1 })}
                  acik={sayfa < sonSayfa}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Urun({ urun, hepsiAcik }: { urun: StokUrunu; hepsiAcik: boolean }) {
  // Biten önce, sonra azalan, sonra beden sırası: düzeltilecek olan en üstte
  // dursun diye.
  const sirali = [...urun.bedenler].sort((a, b) => {
    const oncelik = (s: number) => (s === 0 ? 0 : s <= AZALAN_ESIK ? 1 : 2);
    const fark = oncelik(a.stok) - oncelik(b.stok);
    if (fark !== 0) return fark;
    const bedenFarki =
      (BEDENLER as readonly string[]).indexOf(a.beden) -
      (BEDENLER as readonly string[]).indexOf(b.beden);
    return bedenFarki !== 0 ? bedenFarki : a.renk.localeCompare(b.renk, "tr");
  });

  const sorunlu = sirali.filter((v) => v.stok <= AZALAN_ESIK);
  const saglam = sirali.filter((v) => v.stok > AZALAN_ESIK);

  return (
    <section className="rounded-marka border border-cizgi bg-yuzey p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base">
          <Link href={`/yonetim/urunler/${urun.slug}`} className="hover:text-mercan-koyu">
            {urun.ad}
          </Link>
          {!urun.aktif && (
            <span className="ml-2 rounded-full bg-yuzey-sicak px-2 py-0.5 text-xs font-bold text-metin-3">
              pasif
            </span>
          )}
        </h2>
        <span className="flex flex-wrap items-center gap-2 text-xs">
          {urun.bitenAdedi > 0 && (
            <span className="rakam font-bold text-mercan-koyu">{urun.bitenAdedi} beden bitti</span>
          )}
          {urun.azalanAdedi > 0 && (
            <span className="rakam font-bold text-sari-koyu">
              {urun.azalanAdedi} beden azalıyor
            </span>
          )}
          <span className="rakam text-metin-3">toplam {urun.toplam} adet</span>
        </span>
      </div>

      {sirali.length === 0 ? (
        <p className="mt-3 text-sm text-metin-3">
          Bu ürüne henüz beden eklenmemiş.{" "}
          <Link
            href={`/yonetim/urunler/${urun.slug}`}
            className="font-bold text-mavi-koyu hover:underline"
          >
            Ekle
          </Link>
        </p>
      ) : (
        <>
          {sorunlu.length > 0 && <Bedenler bedenler={sorunlu} />}

          {/* Süzgeçliyken düzeltilecek bedenler açık, stoğu yerinde olanlar
              katlanmış duruyor: aradığın beden kapalı bölümün içinde kalmasın
              ama on bir beden de ekranı kaplamasın. Katlanmış da olsalar
              formun içindeler, yani "kaydet" hepsini gönderiyor (K-44). */}
          {saglam.length > 0 &&
            (hepsiAcik || sorunlu.length === 0 ? (
              <Bedenler bedenler={saglam} />
            ) : (
              <details className="group mt-3">
                <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs font-bold text-metin-2 hover:text-metin [&::-webkit-details-marker]:hidden">
                  Stoğu yerinde {saglam.length} beden
                  <span aria-hidden="true" className="transition group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <Bedenler bedenler={saglam} />
              </details>
            ))}
        </>
      )}
    </section>
  );
}

function Bedenler({ bedenler }: { bedenler: StokBedeni[] }) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {bedenler.map((v) => (
        <label key={v.id} className="flex items-center gap-3">
          <span className="flex-1 text-sm">
            {v.beden}
            <span className="text-metin-3"> · {RENK_ADLARI[v.renk as RenkAdi] ?? v.renk}</span>
          </span>
          <input
            name={`stok-${v.id}`}
            type="number"
            min={0}
            defaultValue={v.stok}
            className={`rakam w-20 rounded-[10px] border-[1.5px] px-3 py-2 text-sm outline-none focus:border-mercan ${
              v.stok === 0
                ? "border-mercan bg-mercan-soluk"
                : v.stok <= AZALAN_ESIK
                  ? "border-sari bg-sari-soluk"
                  : "border-cizgi bg-yuzey"
            }`}
          />
        </label>
      ))}
    </div>
  );
}

function Sayfa({ yazi, adres, acik }: { yazi: string; adres: string; acik: boolean }) {
  if (!acik) {
    return <span className={`${ROZET} border-cizgi text-metin-3 opacity-40`}>{yazi}</span>;
  }
  return (
    <Link
      href={adres}
      className={`${ROZET} border-cizgi text-metin-2 hover:border-mercan hover:text-metin`}
    >
      {yazi}
    </Link>
  );
}
