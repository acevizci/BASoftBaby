import Link from "next/link";
import { stoklariKaydet } from "@/server/yonetim";
import {
  AZALAN_ESIK,
  SAYFA_BOYU,
  cakismaAyrintisi,
  cakismalariCoz,
  stokAdresi,
  stokSayfasi,
  suzgeciCoz,
  type StokDurumu,
  type StokBedeni,
  type StokUrunu,
} from "@/server/stok-ekrani";
import { bedenSirasi, sonSira } from "@/server/bedenler";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import Sayfalama from "@/ui/sayfalama";
import BarkodOkuyucu from "@/ui/barkod-okuyucu";
import { stokDegeri, type StokDegeri } from "@/server/stok-degeri";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { gunYaz, satisHizlari, type Hiz } from "@/server/satis-hizi";

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
  const [{ urunler, sayfa, sonSayfa, toplamAdet, sayaclar }, cakismalar, deger] = await Promise.all([
    stokSayfasi(suzgec),
    cakismaAyrintisi(cakismalariCoz(parametreler.cakisma)),
    stokDegeri(),
  ]);
  const [sira, hizlar] = await Promise.all([
    bedenSirasi(),
    // Sayfadaki bedenlerin "kaç gün yeter" tahmini (K-106).
    satisHizlari(urunler.flatMap((u) => u.bedenler.map((b) => b.id))),
  ]);

  const adres = (degisiklik: Partial<typeof suzgec>) =>
    stokAdresi({ ...suzgec, sayfa: 1, ...degisiklik });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Stok</h1>
      <StokDegeriKutusu d={deger} />
      <p className="text-sm text-metin-2">
        Biten ve azalan bedenler önce geliyor. Buradaki sayı stoğun kendisi; değiştirip
        kaydet, sıfır yazdığın beden mağazada seçilemez hale gelir. Gelen malı eklemek için{" "}
        <Link href="/yonetim/stok/mal-kabul" className="font-bold text-mavi-koyu hover:underline">
          mal kabulü
        </Link>
        .
      </p>

      {typeof kayit === "string" && kayit !== "0" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          {kayit === "1" ? "1 bedenin" : `${kayit} bedenin`} stoğu kaydedildi. Düzelttiğin
          bedenler &quot;sorunlular&quot; listesinden çıkar.
        </p>
      )}
      {kayit === "0" && cakismalar.length === 0 && (
        <p className="rounded-marka bg-yuzey-sicak px-4 py-3 text-sm text-metin-2">
          Hiçbir sayı değişmemiş; kaydedilecek bir şey yoktu.
        </p>
      )}

      {/* Ekran açıkken sipariş gelip stok değiştiyse o satır yazılmadı
          (K-102). Hangisi olduğu, ne yazıldığı ve şimdiki değer burada. */}
      {cakismalar.length > 0 && (
        <div className="rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm">
          <p className="font-bold text-sari-koyu">
            {cakismalar.length} bedenin stoğu sen düzenlerken değişti, o satırlar kaydedilmedi
          </p>
          <p className="mt-1 text-metin-2">
            Arada sipariş, iptal ya da başka bir kayıt stoğu değiştirdi; yazdığın sayı onu
            silerdi. Şimdiki değere bakıp gerekiyorsa yeniden kaydet.
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {cakismalar.map((c) => (
              <li key={c.id} className="rakam">
                <b>{c.ad}</b> · {c.beden} · {c.renkAdi}: ekranda {c.onceki} vardı, sen{" "}
                {c.yeni} yazdın, şu an <b>{c.simdi}</b>
              </li>
            ))}
          </ul>
        </div>
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
          placeholder="Ürün ara ya da barkod okut"
          className={`${GIRDI} min-w-[200px] flex-1`}
        />
        <button
          type="submit"
          className="rounded-full bg-dugme px-5 py-2 text-sm font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Ara
        </button>
        <BarkodOkuyucu alan="ara" />
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
              <Urun
                key={u.id}
                urun={u}
                hepsiAcik={suzgec.durum === "hepsi"}
                sira={sira}
                hizlar={hizlar}
              />
            ))}

            <button
              type="submit"
              className="sticky bottom-4 self-start rounded-full bg-dugme px-6 py-3 font-bold text-dugme-yazi shadow-md transition hover:brightness-95"
            >
              Stokları kaydet
            </button>
          </form>

          {/* Sayfa çubuğu ortak bileşen (K-67). */}
          <Sayfalama
            durum={{
              sayfa,
              sonSayfa,
              atla: (sayfa - 1) * SAYFA_BOYU,
              boy: SAYFA_BOYU,
              toplam: toplamAdet,
            }}
            birim="ürün"
            adres={(n) => stokAdresi({ ...suzgec, sayfa: n })}
          />
        </>
      )}
    </div>
  );
}

function Urun({
  urun,
  hepsiAcik,
  sira,
  hizlar,
}: {
  urun: StokUrunu;
  hepsiAcik: boolean;
  hizlar: Map<string, Hiz>;
  /** Beden sırası; liste veritabanından geliyor (K-56). */
  sira: Map<string, number>;
}) {
  // Biten önce, sonra azalan, sonra beden sırası: düzeltilecek olan en üstte
  // dursun diye.
  const sirali = [...urun.bedenler].sort((a, b) => {
    const oncelik = (s: number) => (s === 0 ? 0 : s <= AZALAN_ESIK ? 1 : 2);
    const fark = oncelik(a.stok) - oncelik(b.stok);
    if (fark !== 0) return fark;
    const bedenFarki = sonSira(sira, a.beden) - sonSira(sira, b.beden);
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
          <Link
            href={`/yonetim/stok/hareketler?urun=${encodeURIComponent(urun.slug)}`}
            className="font-bold text-mavi-koyu hover:underline"
          >
            hareketler
          </Link>
          <Link
            href={`/yonetim/stok/etiketler?urun=${encodeURIComponent(urun.slug)}`}
            className="font-bold text-mavi-koyu hover:underline"
          >
            etiket
          </Link>
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
          {sorunlu.length > 0 && <Bedenler bedenler={sorunlu} hizlar={hizlar} />}

          {/* Süzgeçliyken düzeltilecek bedenler açık, stoğu yerinde olanlar
              katlanmış duruyor: aradığın beden kapalı bölümün içinde kalmasın
              ama on bir beden de ekranı kaplamasın. Katlanmış da olsalar
              formun içindeler, yani "kaydet" hepsini gönderiyor (K-44). */}
          {saglam.length > 0 &&
            (hepsiAcik || sorunlu.length === 0 ? (
              <Bedenler bedenler={saglam} hizlar={hizlar} />
            ) : (
              <details className="group mt-3">
                <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs font-bold text-metin-2 hover:text-metin [&::-webkit-details-marker]:hidden">
                  Stoğu yerinde {saglam.length} beden
                  <span aria-hidden="true" className="transition group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <Bedenler bedenler={saglam} hizlar={hizlar} />
              </details>
            ))}
        </>
      )}
    </section>
  );
}

function Bedenler({ bedenler, hizlar }: { bedenler: StokBedeni[]; hizlar: Map<string, Hiz> }) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {bedenler.map((v) => (
        <label key={v.id} className="flex items-center gap-3">
          {/* Ekranın açıldığı andaki değer: kaydederken arada değişip
              değişmediği buna bakılarak anlaşılıyor (K-102). */}
          <input type="hidden" name={`once-${v.id}`} value={v.stok} />
          <span className="flex-1 text-sm">
            {v.beden}
            <span className="text-metin-3"> · {v.renkAdi}</span>
            <HizNotu hiz={hizlar.get(v.id)} stok={v.stok} />
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

/**
 * "~4 gün yeter" notu (K-106). Bir hafta ve altı mercan: sabit eşiğin
 * yakalayamadığı, çok satan ve yakında bitecek beden.
 */
function HizNotu({ hiz, stok }: { hiz?: Hiz; stok: number }) {
  // Yalnızca tahmin varken: her bedende "satış yok" yazmak gürültü.
  if (!hiz || stok === 0 || hiz.kacGun === null) return null;
  const yakin = hiz.kacGun !== null && hiz.kacGun <= 7;
  return (
    <span
      className={`rakam block text-xs ${yakin ? "font-bold text-mercan-koyu" : "text-metin-3"}`}
      title={`Son 30 günde ${hiz.satilan} satış`}
    >
      {gunYaz(hiz)}
    </span>
  );
}

/** Raftaki malın maliyetle değeri ve ay başına göre değişim (K-114). */
function StokDegeriKutusu({ d }: { d: StokDegeri }) {
  if (d.adet === 0) {
    return d.alissizAdet > 0 ? (
      <p className="text-xs text-metin-3">
        Raftaki malın değerini görmek için ürünlere alış fiyatı gir.
      </p>
    ) : null;
  }
  const fark = d.degerKurus - d.ayBasiKurus;
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-marka border border-cizgi bg-yuzey px-4 py-3 text-sm">
      <span>
        Raftaki mal (alış fiyatıyla): <b className="rakam">{fiyatYaz(d.degerKurus)}</b>
        <span className="rakam text-metin-3"> · {d.adet} adet</span>
      </span>
      <span className={`rakam text-xs ${fark >= 0 ? "text-nane-koyu" : "text-mercan-koyu"}`}>
        ay başına göre {fark >= 0 ? "+" : "−"}
        {fiyatYaz(Math.abs(fark))}
      </span>
      {d.alissizAdet > 0 && (
        <span className="rakam text-xs text-metin-3">{d.alissizAdet} adedin alış fiyatı yok, değere girmedi</span>
      )}
    </div>
  );
}
