import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { kaldirilanUrun } from "@/server/urun-yonlendirme";
import type { Metadata } from "next";
import UrunGalerisi from "@/ui/urun-galerisi";
import UrunKarti from "@/ui/urun-karti";
import VaryantSecici from "@/ui/varyant-secici";
import { bedenOlculeri } from "@/server/bedenler";
import YorumListesi from "@/ui/yorum-listesi";
import { Yildiz } from "@/ui/yildiz";
import { urunYorumlari } from "@/server/yorum";
import YapisalVeri from "@/ui/yapisal-veri";
import { tamAdres } from "@/server/site";
import OlcumOlayi from "@/ui/olcum-olayi";
import SetIcerigi from "@/ui/set-icerigi";
import UrunSorulari from "@/ui/urun-sorulari";
import { urunSorulari } from "@/server/soru";
import { setIcerikleri } from "@/server/set";
import { sayfaYolu, urunYapisalVerisi } from "@/server/yapisal-veri";
import { ayarlariGetir } from "@/server/sepet";
import { CAYMA_GUN } from "@/ui/talep-bicim";
import {
  benzerUrunler,
  fiyatYaz,
  kategoriGetir,
  urunGetir,
  urununBedenleri,
} from "@/server/katalog";
import { paletCoz, renginFotograflari, type RenkAdi } from "@/ui/katalog-bicim";
import { FavoriDugmesi } from "@/ui/favori";
import { SonBakilanKaydet, SonBakilanlar } from "@/ui/son-bakilan";

export async function generateMetadata({ params }: PageProps<"/urun/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const urun = await urunGetir(slug);
  if (!urun) return {};
  // Paylaşım görseli `opengraph-image.tsx`'ten (K-127).
  return {
    title: urun.ad,
    description: `${urun.ozet} · ${urun.kumasIcerigi}`,
    alternates: { canonical: `/urun/${urun.slug}` },
    openGraph: {
      title: urun.ad,
      description: urun.ozet,
      type: "website",
      url: `/urun/${urun.slug}`,
    },
  };
}

export default async function UrunSayfasi({
  params,
  searchParams,
}: PageProps<"/urun/[slug]">) {
  const { slug } = await params;
  // "Stoka girince haber ver" formunun sonucu adres satırında dönüyor.
  const { bildirim, renk, yorumSayfa, soru } = await searchParams;
  const urun = await urunGetir(slug);
  if (!urun) {
    // Pasif ya da silinmiş ürün kategorisine gidiyor, 404 değil (K-128).
    const yon = await kaldirilanUrun(slug);
    if (!yon) notFound();
    if (yon.kalici) permanentRedirect(yon.hedef);
    redirect(yon.hedef);
  }

  const [kategori, benzerler, yorumOzeti, ayar, setler, sorular] = await Promise.all([
    kategoriGetir(urun.kategori),
    benzerUrunler(urun),
    urunYorumlari(urun.id, yorumSayfa),
    ayarlariGetir(),
    setIcerikleri(urun.id),
    urunSorulari(urun.id),
  ]);
  const bedenler = urununBedenleri(urun);
  // Boy-kilo bilgisi istemci bileşenine sunucudan geçiyor: bedenler artık
  // veritabanında (K-56).
  const olculer = await bedenOlculeri();

  // Renk adres satırında taşınıyor: seçim JavaScript'siz çalışıyor, galeri
  // sunucuda süzülüyor ve "mavisi" diye bağlantı paylaşılabiliyor (K-48).
  // Adresten gelen değer ürünün kendi renkleriyle doğrulanıyor.
  const seciliRenk: RenkAdi =
    typeof renk === "string" && urun.renkler.some((r) => r.kod === renk)
      ? renk
      : (urun.varyantlar.find((v) => v.stok > 0) ?? urun.varyantlar[0]).renk;

  const galeriFotograflari = renginFotograflari(urun.fotograflar, seciliRenk);

  // Kampanya varsa asıl fiyat kampanyalı fiyattır, üstü çizilen de liste
  // fiyatı olur. Kampanya yoksa ürüne elle girilmiş eski fiyat kullanılır.
  const satisKurus = urun.kampanya ? urun.kampanya.indirimliFiyatKurus : urun.fiyatKurus;
  const ustuCizili = urun.kampanya ? urun.fiyatKurus : urun.eskiFiyatKurus;
  const indirimYuzdesi = ustuCizili
    ? Math.round((1 - satisKurus / ustuCizili) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Google ürünü fiyatı, stoğu, bedenleri, kargo ve iade koşulları ve
          (varsa) gerçek müşteri puanıyla tanısın; veri ekrandakiyle aynı
          kaynaktan (K-126). */}
      <YapisalVeri
        veri={urunYapisalVerisi(urun, {
          adres: tamAdres,
          satisKurus,
          ustuCiziliKurus: ustuCizili,
          kargoKurus: ayar.kargoKurus,
          bedavaKargoEsigi: ayar.bedavaKargoEsigi,
          iadeGun: CAYMA_GUN,
          yorum: { ortalama: yorumOzeti.ortalama, adet: yorumOzeti.adet, ornekler: yorumOzeti.yorumlar },
        })}
      />
      <YapisalVeri
        veri={sayfaYolu(
          [
            { ad: "Ana sayfa", yol: "/" },
            ...(kategori ? [{ ad: kategori.ad, yol: `/${kategori.slug}` }] : []),
            { ad: urun.ad, yol: `/urun/${urun.slug}` },
          ],
          tamAdres,
        )}
      />

      <OlcumOlayi
        ad="urun-goruntuleme"
        veri={{ tutarKurus: satisKurus, urunIdleri: [urun.id], grup: true, urunAdi: urun.ad }}
      />

      <nav className="text-xs text-metin-3">
        <Link href="/" className="hover:underline">
          Ana sayfa
        </Link>
        {kategori && (
          <>
            <span> · </span>
            <Link href={`/${kategori.slug}`} className="hover:underline">
              {kategori.ad}
            </Link>
          </>
        )}
        <span> · {urun.ad}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <UrunGalerisi
          fotograflar={galeriFotograflari}
          gorsel={urun.gorsel}
          palet={paletCoz(urun.renkler, seciliRenk)}
          renkler={urun.renkler}
          ad={urun.ad}
        />

        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-2xl sm:text-3xl">{urun.ad}</h1>
            <p className="mt-1 text-sm text-metin-2">{urun.ozet}</p>
            <div className="mt-3">
              <FavoriDugmesi urunId={urun.id} urunAd={urun.ad} />
            </div>
            {/* Hiç değerlendirme yoksa puan satırı hiç yok: "0,0 puan"
                yazmak, olmayan bir bilgiyi varmış gibi göstermek olurdu. */}
            {urun.yorumSayisi > 0 && (
              <p className="mt-2 flex items-center gap-2 text-sm text-metin-3">
                <Yildiz puan={urun.puan} />
                <span className="rakam font-semibold text-metin-2">
                  {urun.puan.toLocaleString("tr-TR", { minimumFractionDigits: 1 })}
                </span>
                <span className="rakam">· {urun.yorumSayisi} değerlendirme</span>
              </p>
            )}
          </div>

          <div>
            <p className="flex flex-wrap items-baseline gap-3">
              <span className="rakam font-baslik text-3xl font-bold text-mercan-koyu">
                {fiyatYaz(satisKurus)}
              </span>
              {ustuCizili && (
                <>
                  <span className="rakam text-lg text-metin-3 line-through">
                    {fiyatYaz(ustuCizili)}
                  </span>
                  <span className="rakam rounded-full bg-nane-soluk px-2.5 py-1 text-sm font-bold text-nane-koyu">
                    %{indirimYuzdesi} indirim
                  </span>
                </>
              )}
            </p>
            {urun.kampanya && (
              <p className="mt-1 text-sm font-bold text-nane-koyu">{urun.kampanya.ad}</p>
            )}
          </div>

          <VaryantSecici
            bedenler={bedenler}
            olculer={olculer}
            renkler={urun.renkler}
            seciliRenk={seciliRenk}
            varyantlar={urun.varyantlar}
            slug={urun.slug}
            bildirimDurumu={typeof bildirim === "string" ? bildirim : undefined}
          />

          {/* Set ise içindekiler: seçili rengin ilk bedeninin içeriği (K-133). */}
          <SetIcerigi
            kalemler={
              setler[urun.varyantlar.find((v) => v.renk === seciliRenk && setler[v.id])?.id ?? ""] ?? []
            }
            setFiyatKurus={satisKurus}
            renkAdi={(k) => urun.renkler.find((r) => r.kod === k)?.ad ?? k}
          />

          <div className="flex flex-col gap-3 rounded-marka border border-cizgi bg-yuzey p-4 text-sm">
            <div>
              <p className="font-bold">Ürün özellikleri</p>
              <ul className="mt-1.5 flex flex-col gap-1 text-metin-2">
                {urun.ozellikler.map((o) => (
                  <li key={o}>· {o}</li>
                ))}
              </ul>
            </div>
            <div className="border-t border-cizgi-soluk pt-3">
              <p className="font-bold">Kumaş içeriği</p>
              <p className="mt-1 text-metin-2">{urun.kumasIcerigi}</p>
            </div>
            <div className="border-t border-cizgi-soluk pt-3">
              <p className="font-bold">Yıkama talimatı</p>
              <p className="mt-1 text-metin-2">{urun.yikamaTalimati}</p>
            </div>
          </div>
        </div>
      </div>

      <YorumListesi ozet={yorumOzeti} slug={urun.slug} renk={seciliRenk} />

      <UrunSorulari slug={urun.slug} sorular={sorular} sonuc={typeof soru === "string" ? soru : undefined} />

      <section className="mt-14">
        <h2 className="text-xl">Bunlara da bakabilirsin</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {benzerler.map((u) => (
            <UrunKarti key={u.slug} urun={u} />
          ))}
        </div>
      </section>

      {/* Tarayıcıda tutuluyor; bu ürün de listeye yazılıyor ama kendi
          sayfasında gösterilmiyor (K-95). */}
      <SonBakilanKaydet slug={urun.slug} />
      <SonBakilanlar haric={urun.slug} className="mt-14" />
    </div>
  );
}
