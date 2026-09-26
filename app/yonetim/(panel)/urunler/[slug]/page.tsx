import { notFound } from "next/navigation";
import FotografYonetimi from "@/ui/fotograf-yonetimi";
import UrunFormu, { UrunKaydetDugmesi } from "@/ui/urun-formu";
import { db } from "@/server/veritabani";
import { bedenSirasi, sonSira, bedenler as bedenleriGetir } from "@/server/bedenler";
import { renkSecenekleri, tumRenkSecenekleri } from "@/server/renkler";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import UrunSilme from "@/ui/urun-silme";
import Link from "next/link";
import HareketTablosu from "@/ui/hareket-tablosu";
import { urunHareketleri } from "@/server/stok-hareket";
import { renkAdlari } from "@/server/renkler";
import { ayarlariGetir } from "@/server/sepet";
import { kategoriEtiketleri } from "@/ui/kategori-etiketi";
import SetYonetimi from "@/ui/set-yonetimi";
import { urununSetleri } from "@/server/set";
import { fiyatUyarisi, INDIRIM_ONCESI_GUN, type FiyatUyarisi } from "@/server/fiyat-gecmisi";
import { fiyatYaz } from "@/ui/katalog-bicim";

export const dynamic = "force-dynamic";

export default async function UrunDuzenle({
  params,
  searchParams,
}: PageProps<"/yonetim/urunler/[slug]">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { slug } = await params;
  const { kayit, fhata, fkayit, fsil, fsira, hata, renk: renkParam, varolan, sethata, setkayit, setadet } =
    await searchParams;

  const [urun, kategoriler, satisAyari] = await Promise.all([
    db.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: true,
        images: { orderBy: { sira: "asc" } },
      },
    }),
    db.category.findMany({ orderBy: { sira: "asc" } }),
    ayarlariGetir(),
  ]);
  if (!urun) notFound();

  // Silme kutusunda yazıyor: satılmış bir ürünü silmek geri alınamaz ve
  // değerlendirmelerini de götürüyor (K-52).
  const [siparisAdedi, uyari] = await Promise.all([
    db.orderItem.count({ where: { variant: { productId: urun.id } } }),
    fiyatUyarisi(urun.id),
  ]);

  // Fotoğraf çekiminden dönen kişi ürün ürün dolaşmak zorunda kalmasın:
  // yükleme bittiğinde sıradaki fotoğrafsız ürün gösteriliyor (K-41).
  const [sonrakiFotografsiz, fotografsizKalan] = await Promise.all([
    db.product.findFirst({
      where: { images: { none: {} }, slug: { not: slug } },
      orderBy: { olusturuldu: "asc" },
      select: { slug: true, ad: true },
    }),
    db.product.count({ where: { images: { none: {} }, slug: { not: slug } } }),
  ]);

  // Beden sırası ve yeni varyant eklerken seçilebilecek bedenler
  // veritabanından geliyor (K-56).
  const [sira, secilebilirBedenler, secilebilirRenkler, tumRenkler] = await Promise.all([
    bedenSirasi(),
    bedenleriGetir(),
    renkSecenekleri(),
    // Fotoğraf ataması ve varyant listesi kapalı renkleri de gösteriyor:
    // kapatılan bir rengin var olan varyantları duruyor, adsız kalmasınlar.
    tumRenkSecenekleri(),
  ]);

  const sirali = [...urun.variants].sort((a, b) => {
    const fark = sonSira(sira, a.beden) - sonSira(sira, b.beden);
    return fark !== 0 ? fark : a.renk.localeCompare(b.renk, "tr");
  });

  const urunRenkleri = new Set(sirali.map((v) => v.renk));

  // Fotoğraf yükleme formunda seçili gelen renk (K-91): az önce stoğu eklenen
  // renk; yoksa ürünün henüz kendi fotoğrafı olmayan ilk rengi. Böylece renk
  // renk fotoğraf yüklerken her seferinde sıradaki renk seçili geliyor.
  const fotografliRenkler = new Set(urun.images.map((g) => g.renk).filter(Boolean));
  const varsayilanRenk =
    typeof renkParam === "string" && tumRenkler.some((r) => r.kod === renkParam)
      ? renkParam
      : (tumRenkler.find((r) => urunRenkleri.has(r.kod) && !fotografliRenkler.has(r.kod))
          ?.kod ?? "");

  const eklenen = typeof fkayit === "string" ? Number(fkayit) : undefined;
  const fotografSonucu = fsil === "1" ? "silindi" : fsira === "1" ? "sira" : undefined;

  return (
    <div className="flex flex-col gap-6">
      {uyari && <FiyatUyari uyari={uyari} />}
      <UrunFormu
        kaydedildi={kayit === "1"}
        varOlanVaryant={typeof varolan === "string" ? varolan.slice(0, 80) : undefined}
        kdvOrani={satisAyari.kdvOrani}
        kategoriler={kategoriler.map((k) => ({
          slug: k.slug,
          ad: kategoriEtiketleri(kategoriler).get(k.slug) ?? k.ad,
        }))}
        bedenler={secilebilirBedenler.map((b) => ({ id: b.id, ad: b.ad }))}
        renkler={secilebilirRenkler}
        fotografVar={urun.images.length > 0}
        urun={{
          slug: urun.slug,
          ad: urun.ad,
          ozet: urun.ozet,
          kategoriSlug: urun.category.slug,
          fiyatKurus: urun.fiyatKurus,
          eskiFiyatKurus: urun.eskiFiyatKurus,
          alisFiyatKurus: urun.alisFiyatKurus,
          kumasIcerigi: urun.kumasIcerigi,
          yikamaTalimati: urun.yikamaTalimati,
          ozellikler: urun.ozellikler,
          rozetTon: urun.rozetTon,
          rozetYazi: urun.rozetYazi,
          gorsel: urun.gorsel,
          palet: urun.palet,
          aktif: urun.aktif,
          variants: sirali.map((v) => ({
            id: v.id,
            beden: v.beden,
            renk: v.renk,
            stok: v.stok,
          })),
        }}
      />

      <FotografYonetimi
        slug={urun.slug}
        hata={typeof fhata === "string" ? fhata : undefined}
        sonuc={fotografSonucu}
        eklenen={Number.isFinite(eklenen) ? eklenen : undefined}
        sonraki={
          sonrakiFotografsiz
            ? { ...sonrakiFotografsiz, kalan: fotografsizKalan }
            : undefined
        }
        fotograflar={urun.images.map((g) => ({
          id: g.id,
          yol: g.yol,
          kucukYol: g.kucukYol || g.yol,
          altMetin: g.altMetin,
          genislik: g.genislik,
          yukseklik: g.yukseklik,
          boyutBayt: g.boyutBayt,
          renk: g.renk,
        }))}
        // Ürünün kendi renkleri listenin başında; mağazanın öteki açık
        // renkleri ayrı grupta, uyarısıyla (K-71).
        renkler={tumRenkler.filter((r) => urunRenkleri.has(r.kod))}
        digerRenkler={secilebilirRenkler.filter((r) => !urunRenkleri.has(r.kod))}
        varsayilanRenk={varsayilanRenk}
      />

      {/* Kaydet düğmesi sayfanın sonunda: form yukarıda bitiyor ama
          altındaki bölümler yüzünden düğme sayfanın ortasında kalıyordu
          (K-61). Silme bölümü en altta kalmaya devam ediyor (K-53). */}
      <UrunKaydetDugmesi />

      <SetBolumu
        productId={urun.id}
        hata={typeof sethata === "string" ? sethata : undefined}
        kayit={typeof setkayit === "string" ? setkayit : undefined}
        islemAdedi={typeof setadet === "string" ? setadet : undefined}
      />

      <StokGecmisi productId={urun.id} slug={urun.slug} />

      <UrunSilme
        slug={urun.slug}
        ad={urun.ad}
        siparisAdedi={siparisAdedi}
        yorumSayisi={urun.yorumSayisi}
        fotografAdedi={urun.images.length}
        onayHatasi={hata === "onay"}
      />
    </div>
  );
}

/** Set içeriği ve set hazırlama (K-133). */
async function SetBolumu(p: { productId: string; hata?: string; kayit?: string; islemAdedi?: string }) {
  const [varyantlar, adlar, sira] = await Promise.all([urununSetleri(p.productId), renkAdlari(), bedenSirasi()]);
  const sirali = [...varyantlar].sort(
    (a, b) => sonSira(sira, a.beden) - sonSira(sira, b.beden) || a.renk.localeCompare(b.renk, "tr"),
  );
  return <SetYonetimi varyantlar={sirali} renkAdi={(k) => adlar[k] ?? k} hata={p.hata} kayit={p.kayit} islemAdedi={p.islemAdedi} />;
}

/** Ürünün son stok hareketleri (K-103); tamamı hareketler ekranında. */
async function StokGecmisi({ productId, slug }: { productId: string; slug: string }) {
  const [satirlar, adlar] = await Promise.all([urunHareketleri(productId), renkAdlari()]);
  return (
    <section className="rounded-marka border border-cizgi bg-yuzey p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg">Son stok hareketleri</h2>
        <Link
          href={`/yonetim/stok/hareketler?urun=${encodeURIComponent(slug)}`}
          className="text-sm font-bold text-mavi-koyu hover:underline"
        >
          Hepsi
        </Link>
      </div>
      {satirlar.length === 0 ? (
        <p className="mt-2 text-sm text-metin-3">Bu ürünün henüz kayıtlı stok hareketi yok.</p>
      ) : (
        <div className="mt-3">
          <HareketTablosu satirlar={satirlar} renkAdlari={adlar} urunGoster={false} />
        </div>
      )}
    </section>
  );
}

/**
 * Üstü çizili fiyat yönetmeliğe uymuyor ya da kanıtlanamıyor (K-164).
 * Fiyat kendiliğinden değiştirilmiyor; ne yapılacağını yazıyor.
 */
function FiyatUyari({ uyari }: { uyari: FiyatUyarisi }) {
  const tarih = uyari.baslangic.toLocaleDateString("tr-TR", {
    dateStyle: "long",
    timeZone: "Europe/Istanbul",
  });
  const kaynak =
    uyari.tur === "kampanya"
      ? `"${uyari.kampanyaAdi}" kampanyasında üstü çizili görünen liste fiyatı`
      : "Üstü çizili (eski) fiyat";
  return (
    <div role="alert" className="rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm">
      <p className="font-bold text-sari-koyu">İndirim öncesi fiyat yönetmeliğe uymayabilir</p>
      <p className="mt-1 text-metin-2">
        {kaynak} <span className="rakam font-bold">{fiyatYaz(uyari.ustuCiziliKurus)}</span>.{" "}
        {uyari.enDusukKurus !== undefined ? (
          <>
            İndirimin başladığı {tarih} öncesindeki {INDIRIM_ONCESI_GUN} günde uygulanan en düşük
            fiyat <span className="rakam font-bold">{fiyatYaz(uyari.enDusukKurus)}</span>. Fiyat
            Etiketi Yönetmeliği&apos;ne göre indirim öncesi fiyat bundan yüksek yazılamaz.
          </>
        ) : (
          <>
            İndirimin başladığı {tarih} öncesindeki {INDIRIM_ONCESI_GUN} güne ait fiyat kaydı yok;
            bu fiyatın gerçekten uygulandığı gösterilemiyor. İspat yükü satıcıda.
          </>
        )}
      </p>
      <p className="mt-1 text-metin-2">
        {uyari.tur === "kampanya"
          ? "Liste fiyatını indirimden önceki en düşük fiyata çek ya da kampanyayı ürünü o fiyattan en az 10 gün sattıktan sonra başlat."
          : "Eski fiyatı indirimden önceki en düşük fiyata çek ya da boşalt."}
      </p>
    </div>
  );
}
