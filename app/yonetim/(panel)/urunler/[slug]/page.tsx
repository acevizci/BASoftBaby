import { notFound } from "next/navigation";
import FotografYonetimi from "@/ui/fotograf-yonetimi";
import type { RenkAdi } from "@/ui/katalog-bicim";
import UrunFormu, { UrunKaydetDugmesi } from "@/ui/urun-formu";
import { db } from "@/server/veritabani";
import { bedenSirasi, sonSira, bedenler as bedenleriGetir } from "@/server/bedenler";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import UrunSilme from "@/ui/urun-silme";

export const dynamic = "force-dynamic";

export default async function UrunDuzenle({
  params,
  searchParams,
}: PageProps<"/yonetim/urunler/[slug]">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { slug } = await params;
  const { kayit, fhata, fkayit, fsil, fsira, hata } = await searchParams;

  const [urun, kategoriler] = await Promise.all([
    db.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: true,
        images: { orderBy: { sira: "asc" } },
      },
    }),
    db.category.findMany({ orderBy: { sira: "asc" } }),
  ]);
  if (!urun) notFound();

  // Silme kutusunda yazıyor: satılmış bir ürünü silmek geri alınamaz ve
  // değerlendirmelerini de götürüyor (K-52).
  const siparisAdedi = await db.orderItem.count({
    where: { variant: { productId: urun.id } },
  });

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
  const [sira, secilebilirBedenler] = await Promise.all([bedenSirasi(), bedenleriGetir()]);

  const sirali = [...urun.variants].sort((a, b) => {
    const fark = sonSira(sira, a.beden) - sonSira(sira, b.beden);
    return fark !== 0 ? fark : a.renk.localeCompare(b.renk, "tr");
  });

  const eklenen = typeof fkayit === "string" ? Number(fkayit) : undefined;
  const fotografSonucu = fsil === "1" ? "silindi" : fsira === "1" ? "sira" : undefined;

  return (
    <div className="flex flex-col gap-6">
      <UrunFormu
        kaydedildi={kayit === "1"}
        kategoriler={kategoriler.map((k) => ({ slug: k.slug, ad: k.ad }))}
        bedenler={secilebilirBedenler.map((b) => ({ id: b.id, ad: b.ad }))}
        urun={{
          slug: urun.slug,
          ad: urun.ad,
          ozet: urun.ozet,
          kategoriSlug: urun.category.slug,
          fiyatKurus: urun.fiyatKurus,
          eskiFiyatKurus: urun.eskiFiyatKurus,
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
        // Fotoğrafa yalnızca ürünün kendi renkleri atanabiliyor.
        renkler={[...new Set(sirali.map((v) => v.renk))] as RenkAdi[]}
      />

      {/* Kaydet düğmesi sayfanın sonunda: form yukarıda bitiyor ama
          altındaki bölümler yüzünden düğme sayfanın ortasında kalıyordu
          (K-61). Silme bölümü en altta kalmaya devam ediyor (K-53). */}
      <UrunKaydetDugmesi />

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
