import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import UrunKarti from "@/ui/urun-karti";
import {
  SIRALAMALAR,
  yasEtiketleri as yasEtiketleriYap,
  SIRALAMA_ADLARI,
  kategoriGetir,
  kategorileriGetir,
  suzgecKapsami,
  urunleriGetir,
  urunSayfasi,
} from "@/server/katalog";
import { bedenler as bedenleriGetir } from "@/server/bedenler";
import { yasGruplari } from "@/server/yas-gruplari";
import { renkSecenekleri } from "@/server/renkler";
import type { RenkSecenegi } from "@/ui/katalog-bicim";
import Sayfalama from "@/ui/sayfalama";
import YapisalVeri from "@/ui/yapisal-veri";
import RehberMetni from "@/ui/rehber-metni";
import { sayfaYolu } from "@/server/yapisal-veri";
import { tamAdres } from "@/server/site";
import { sayfaAdresi, sayfaNo } from "@/ui/sayfalama-bicim";

/** "urunler" gerçek bir kategori değil; tüm katalogu gösteren liste. */
const TUMU = "urunler";

const FIYAT_ARALIKLARI = [
  { etiket: "200 ₺ altı", kurus: 20000 },
  { etiket: "400 ₺ altı", kurus: 40000 },
  { etiket: "700 ₺ altı", kurus: 70000 },
];

type Aranan = {
  yas?: string;
  beden?: string;
  renk?: string;
  fiyat?: string;
  sirala?: string;
  sayfa?: string;
};

/** Izgara iki ya da üç sütun; 24 ürün her ikisinde de tam sıra yapıyor. */
const IZGARA_BOYU = 24;

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[kategori]">): Promise<Metadata> {
  const { kategori } = await params;
  const aranan = (await searchParams) as Aranan;
  const { sayfa } = aranan;
  // Süzgeçli ya da sıralanmış liste dizine girmiyor ama içindeki bağlantılar
  // izleniyor (K-128): beden × renk × yaş × fiyat birleşimleri yüzlerce adres
  // üretiyor, Google tarama zamanını bunlarla harcamasın.
  const suzgecli = Boolean(aranan.yas || aranan.beden || aranan.renk || aranan.fiyat || aranan.sirala);
  const robots = suzgecli ? { index: false, follow: true } : undefined;

  // Süzgeçler canonical adrese girmiyor: aynı listenin onlarca kopyası
  // dizine girip birbirinin sırasını yemesin. **Sayfa numarası giriyor**:
  // ikinci sayfa başka ürünler gösteriyor, birincinin kopyası değil (K-67).
  const n = sayfaNo(sayfa);
  const ek = (yol: string) => sayfaAdresi(yol, n);

  if (kategori === TUMU) {
    return {
      title: n > 1 ? `Tüm ürünler · sayfa ${n}` : "Tüm ürünler",
      alternates: { canonical: ek(`/${TUMU}`) },
      robots,
      openGraph: { title: "Tüm ürünler · BASoftBaby", url: `/${TUMU}`, type: "website" },
    };
  }
  const k = await kategoriGetir(kategori);
  // Paylaşım kartının başlığı ve açıklaması da kategorinin; yoksa kök
  // düzenin genel "BASoftBaby"si çıkıyordu (K-127).
  return k
    ? {
        title: n > 1 ? `${k.ad} · sayfa ${n}` : k.ad,
        description: k.aciklama,
        alternates: { canonical: ek(`/${k.slug}`) },
        robots,
        openGraph: { title: `${k.ad} · BASoftBaby`, description: k.aciklama, url: `/${k.slug}`, type: "website" },
      }
    : {};
}

/**
 * Bir süzgeci açıp kapatan bağlantı adresini üretir.
 *
 * Sayfa numarası kasten taşınmıyor: süzgeci değiştiren kişi yeni bir liste
 * istiyor, o listenin yedinci sayfasını değil — hem de çoğu zaman o kadar
 * sayfa hiç olmuyor (K-67).
 */
function baglanti(kategori: string, aranan: Aranan, alan: keyof Aranan, deger: string): string {
  const yeni = new URLSearchParams();
  for (const [ad, d] of Object.entries(aranan)) {
    if (d && ad !== "sayfa") yeni.set(ad, d);
  }
  if (yeni.get(alan) === deger) yeni.delete(alan);
  else yeni.set(alan, deger);
  const sorgu = yeni.toString();
  return `/${kategori}${sorgu ? `?${sorgu}` : ""}`;
}

/** Başka bir kategoriye geçen adres; açık süzgeçler korunuyor, sayfa düşüyor. */
function kategoriBaglantisi(hedef: string, aranan: Aranan): string {
  const sorgu = new URLSearchParams();
  for (const [ad, d] of Object.entries(aranan)) {
    if (d && ad !== "sayfa") sorgu.set(ad, d);
  }
  return `/${hedef}${sorgu.toString() ? `?${sorgu}` : ""}`;
}

function SuzgecDugmesi({
  secili,
  href,
  children,
}: {
  secili: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={secili}
      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
        secili
          ? "border-mercan bg-mercan-soluk text-mercan-koyu"
          : "border-cizgi bg-yuzey text-metin-2 hover:border-metin-3"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function KategoriSayfasi({
  params,
  searchParams,
}: PageProps<"/[kategori]">) {
  const { kategori } = await params;
  const aranan = (await searchParams) as Aranan;

  const tumu = kategori === TUMU;
  const bilgi = tumu ? undefined : await kategoriGetir(kategori);
  if (!tumu && !bilgi) notFound();

  const enFazlaKurus = aranan.fiyat ? Number(aranan.fiyat) : undefined;
  const { urunler, durum } = await urunSayfasi(
    {
      kategori: tumu ? undefined : kategori,
      yas: aranan.yas,
      beden: aranan.beden,
      renk: aranan.renk,
      enFazlaKurus: Number.isFinite(enFazlaKurus) ? enFazlaKurus : undefined,
      sirala: aranan.sirala,
    },
    aranan.sayfa,
    IZGARA_BOYU,
  );

  // Sayfa bağlantısı açık süzgeçleri koruyor: üçüncü sayfaya geçerken
  // "mavi" seçimi düşmemeli.
  const sayfaBaglantisi = (n: number) => {
    const sorgu = new URLSearchParams();
    for (const [ad, d] of Object.entries(aranan)) {
      if (d && ad !== "sayfa") sorgu.set(ad, d);
    }
    const temel = `/${kategori}${sorgu.toString() ? `?${sorgu}` : ""}`;
    return sayfaAdresi(temel, n);
  };

  const acikSuzgecAdedi = [aranan.yas, aranan.beden, aranan.renk, aranan.fiyat].filter(
    Boolean,
  ).length;
  const suzgecVar = acikSuzgecAdedi > 0;
  const [tumBedenler, tumYaslar, renkler, kapsamdakiler, kategoriler] = await Promise.all([
    bedenleriGetir(),
    yasGruplari(),
    renkSecenekleri(),
    // Süzgeç seçenekleri bu kategorinin yayındaki ürünlerinden çıkıyor
    // (K-78). Liste önbellekte; aynı sorgu zaten sayfalama için yapıldı.
    urunleriGetir({ kategori: tumu ? undefined : kategori }),
    // Yalnızca içinde yayında ürün olan kategoriler (K-73).
    kategorileriGetir(),
  ]);

  // Karşılığı olmayan seçenek gösterilmiyor: "Aksesuar"da 0-3 ay bedeni
  // seçen müşteri boş bir listeye düşüyordu. Seçili olan her hâlükârda
  // kalıyor, yoksa adresle gelen bir süzgeç kaldırılamazdı (K-78).
  const kapsam = suzgecKapsami(kapsamdakiler);
  const bedenSecenekleri = tumBedenler.filter(
    (b) => kapsam.bedenler.has(b.ad) || aranan.beden === b.ad,
  );
  // Yaş grubu, seçilince en az bir ürün getirecekse görünüyor: grubun
  // kategorisi (varsa) ve stokta bedeni (varsa) aynı üründe tutmalı. Başka
  // kategoriye bağlı grup bu sayfada çıkmıyor (K-80).
  const yasSecenekleri = tumYaslar.filter((y) => {
    if (aranan.yas === y.kod) return true;
    const grupBedenleri = new Set(
      tumBedenler.filter((b) => b.yasKodu === y.kod).map((b) => b.ad),
    );
    if (grupBedenleri.size === 0 && !y.kategori) return false;
    return kapsamdakiler.some(
      (u) =>
        (!y.kategori || u.kategori === y.kategori) &&
        (grupBedenleri.size === 0 ||
          u.varyantlar.some((v) => v.stok > 0 && grupBedenleri.has(v.beden))),
    );
  });
  const gorunenRenkler = renkler.filter(
    (r) => kapsam.renkler.has(r.kod) || aranan.renk === r.kod,
  );
  const fiyatSecenekleri = FIYAT_ARALIKLARI.filter(
    (f) =>
      aranan.fiyat === String(f.kurus) ||
      (kapsam.enDusukKurus !== undefined && kapsam.enDusukKurus <= f.kurus),
  );

  const yasEtiketleri = yasEtiketleriYap(tumYaslar);

  // Açık süzgeçlerin ekrandaki karşılıkları; her biri kendini kaldıran bir
  // bağlantıya dönüşüyor (K-72).
  type AcikSuzgec = { alan: keyof Aranan; deger: string; etiket: string };
  const acikSuzgecler: AcikSuzgec[] = [];
  if (aranan.yas) {
    acikSuzgecler.push({
      alan: "yas",
      deger: aranan.yas,
      etiket: yasEtiketleri.get(aranan.yas) ?? aranan.yas,
    });
  }
  if (aranan.beden) {
    acikSuzgecler.push({ alan: "beden", deger: aranan.beden, etiket: aranan.beden });
  }
  if (aranan.renk) {
    acikSuzgecler.push({
      alan: "renk",
      deger: aranan.renk,
      etiket: renkler.find((r) => r.kod === aranan.renk)?.ad ?? aranan.renk,
    });
  }
  if (aranan.fiyat) {
    acikSuzgecler.push({
      alan: "fiyat",
      deger: aranan.fiyat,
      etiket:
        FIYAT_ARALIKLARI.find((f) => String(f.kurus) === aranan.fiyat)?.etiket ?? aranan.fiyat,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Sayfa yolu Google için de (K-126). */}
      <YapisalVeri
        veri={sayfaYolu(
          [
            { ad: "Ana sayfa", yol: "/" },
            tumu ? { ad: "Tüm ürünler", yol: `/${TUMU}` } : { ad: bilgi!.ad, yol: `/${bilgi!.slug}` },
          ],
          tamAdres,
        )}
      />
      <nav className="text-xs text-metin-3">
        <Link href="/" className="hover:underline">
          Ana sayfa
        </Link>
        <span> · {tumu ? "Tüm ürünler" : bilgi!.ad}</span>
      </nav>

      <h1 className="mt-2 text-2xl sm:text-3xl">{tumu ? "Tüm ürünler" : bilgi!.ad}</h1>
      <p className="mt-1 text-sm text-metin-2">
        {tumu ? "Katalogdaki bütün ürünler" : bilgi!.aciklama}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[210px_1fr]">
        {/*
          Telefonda süzgeçler kapalı bir panelde, ürünler hemen altında.
          Eskiden yan sütun telefonda ürünlerin **üstüne** yığılıyordu: ilk
          ürün kartı sayfanın 1322 piksel altında kalıyordu, yani 844
          piksellik bir ekranda bir buçuk ekran boyu süzgeç kaydırmadan tek
          bir ürün görünmüyordu (K-72).

          Masaüstünde yan sütun olduğu gibi duruyor. Aynı süzgeçler iki kez
          yazılıyor ama aynı anda yalnızca biri çiziliyor: `hidden`
          `display:none` demek, yani öteki erişilebilirlik ağacında da yok.
          Tek bir `<details>` kullanıp masaüstünde CSS ile açık tutmak
          denenmedi — kapalı `<details>` içeriğini geri getirmek tarayıcıdan
          tarayıcıya değişiyor, bu yol her yerde aynı çalışıyor.
        */}
        <aside className="flex flex-col gap-6">
          {/*
            Panel süzgeç seçiliyken de **kapalı** açılıyor. Bir aralık açık
            gelsin diye denendi ama tam tersi oluyordu: süzgece dokunan
            müşteri sonucu görmek istiyor, panel açık gelince ürünler 1445
            piksel aşağı düşüyordu — düzeltmeye çalıştığımız şeyin kendisi.
            Neyin açık olduğunu başlıktaki sayı ve ürünlerin üstündeki
            rozetler söylüyor (K-72).
          */}
          <details className="rounded-marka border border-cizgi bg-yuzey lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
              <span>
                Süzgeçler
                {acikSuzgecAdedi > 0 && (
                  <span className="rakam ml-2 rounded-full bg-mercan-soluk px-2 py-0.5 text-xs text-mercan-koyu">
                    {acikSuzgecAdedi}
                  </span>
                )}
              </span>
              <span aria-hidden="true" className="text-metin-3">
                ▾
              </span>
            </summary>
            <div className="flex flex-col gap-6 border-t border-cizgi-soluk px-4 py-4">
              <Suzgecler
                kategori={kategori}
                aranan={aranan}
                yasSecenekleri={yasSecenekleri}
                bedenSecenekleri={bedenSecenekleri}
                renkler={gorunenRenkler}
                fiyatSecenekleri={fiyatSecenekleri}
                yasEtiketleri={yasEtiketleri}
                kategoriler={kategoriler}
              />
              {suzgecVar && (
                <Link
                  href={`/${kategori}`}
                  className="text-sm font-bold text-mavi-koyu hover:underline"
                >
                  Süzgeçleri temizle
                </Link>
              )}
            </div>
          </details>

          <div className="hidden flex-col gap-6 lg:flex">
            <Suzgecler
              kategori={kategori}
              aranan={aranan}
              yasSecenekleri={yasSecenekleri}
              bedenSecenekleri={bedenSecenekleri}
              renkler={gorunenRenkler}
              fiyatSecenekleri={fiyatSecenekleri}
              yasEtiketleri={yasEtiketleri}
              kategoriler={kategoriler}
            />
            {suzgecVar && (
              <Link
                href={`/${kategori}`}
                className="text-sm font-bold text-mavi-koyu hover:underline"
              >
                Süzgeçleri temizle
              </Link>
            )}
          </div>
        </aside>

        <div>
          {/* Açık süzgeçler ürünlerin üstünde, tek dokunuşla kalkıyor.
              Yalnızca telefonda: masaüstünde yan sütun zaten gösteriyor. */}
          {suzgecVar && (
            <div className="mb-4 flex flex-wrap items-center gap-2 lg:hidden">
              {acikSuzgecler.map((a) => (
                <Link
                  key={a.alan}
                  href={baglanti(kategori, aranan, a.alan, a.deger)}
                  className="flex items-center gap-1.5 rounded-full border border-mercan bg-mercan-soluk px-3 py-1.5 text-xs font-bold text-mercan-koyu"
                >
                  {a.etiket}
                  <span aria-hidden="true">✕</span>
                  <span className="sr-only">süzgecini kaldır</span>
                </Link>
              ))}
              <Link
                href={`/${kategori}`}
                className="text-xs font-bold text-mavi-koyu hover:underline"
              >
                Hepsini temizle
              </Link>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="rakam text-sm text-metin-3">{durum.toplam} ürün listeleniyor</p>

            {/* Sıralama da bağlantı: süzgeçlerle aynı düzen, JavaScript
                kapalıyken de çalışıyor. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-metin-3">Sırala:</span>
              {SIRALAMALAR.map((sr) => {
                const seciliSr = (aranan.sirala ?? "onerilen") === sr;
                return (
                  <Link
                    key={sr}
                    href={baglanti(kategori, aranan, "sirala", sr)}
                    aria-pressed={seciliSr}
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                      seciliSr
                        ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                        : "border-cizgi text-metin-2 hover:border-metin-3"
                    }`}
                  >
                    {SIRALAMA_ADLARI[sr]}
                  </Link>
                );
              })}
            </div>
          </div>

          {durum.toplam === 0 ? (
            <div className="mt-4 rounded-marka border border-cizgi bg-yuzey p-8 text-center">
              {/* Süzgeç yokken "bir süzgeci kaldırmayı dene" demek anlamsız:
                  kaldıracak süzgeç yok, kategori boş. İki durum ayrı (K-73). */}
              {suzgecVar ? (
                <>
                  <p className="font-baslik text-lg font-bold">Bu seçimle ürün bulunamadı</p>
                  <p className="mt-2 text-sm text-metin-2">
                    Bir süzgeci kaldırmayı dene; stokta olmayan bedenler listeye girmiyor.
                  </p>
                  <Link
                    href={`/${kategori}`}
                    className="mt-4 inline-block rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
                  >
                    Süzgeçleri temizle
                  </Link>
                </>
              ) : (
                <>
                  <p className="font-baslik text-lg font-bold">
                    Bu kategoride henüz ürün yok
                  </p>
                  <p className="mt-2 text-sm text-metin-2">
                    Yakında ekleniyor. O zamana kadar kataloğun tamamına göz atabilirsin.
                  </p>
                  <Link
                    href="/urunler"
                    className="mt-4 inline-block rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi"
                  >
                    Tüm ürünler
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
              {urunler.map((u) => (
                <UrunKarti key={u.slug} urun={u} />
              ))}
            </div>
          )}

          <div className="mt-8">
            <Sayfalama durum={durum} birim="ürün" adres={sayfaBaglantisi} />
          </div>
        </div>
      </div>

      {/* Rehber yazısı yalnızca ilk sayfada: ikinci sayfada tekrarlanırsa
          aynı metin iki adreste olur (K-130). */}
      {!tumu && durum.sayfa === 1 && bilgi?.rehberMetni && (
        <RehberMetni
          baslik={`${bilgi.ad} seçerken`}
          metin={bilgi.rehberMetni}
          className="mt-12 max-w-3xl border-t border-cizgi-soluk pt-8 text-sm"
        />
      )}
    </div>
  );
}

/**
 * Süzgeç blokları: kategori, yaş, beden, renk, fiyat.
 *
 * Telefondaki açılır panel ve masaüstündeki yan sütun aynı bileşeni
 * çiziyor; ikisinden yalnızca biri görünür oluyor (K-72).
 */
function Suzgecler({
  kategori,
  aranan,
  yasSecenekleri,
  bedenSecenekleri,
  renkler,
  fiyatSecenekleri,
  yasEtiketleri,
  kategoriler,
}: {
  kategori: string;
  aranan: Aranan;
  yasSecenekleri: { kod: string; ad: string; aciklama: string }[];
  bedenSecenekleri: { id: string; ad: string; boy: string }[];
  renkler: RenkSecenegi[];
  fiyatSecenekleri: typeof FIYAT_ARALIKLARI;
  /** Yaş grubu kodu → etiket; aynı açıklamalı gruplar ayrışsın diye (K-72). */
  yasEtiketleri: Map<string, string>;
  kategoriler: { slug: string; ad: string }[];
}) {
  return (
    <>
          {/* Kategori süzgeci: "Tüm ürünler"de kategori seçmenin yolu yoktu,
              müşteri üst çubuğa dönmek zorundaydı. Kategori bir sorgu
              değeri değil, adresin kendisi (`/kiz-cocuk`); öteki süzgeçler
              geçişte korunuyor, sayfa numarası düşüyor (K-81). */}
          {kategoriler.length > 1 && (
          <div>
            <p className="text-sm font-bold">Kategori</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <SuzgecDugmesi
                secili={kategori === TUMU}
                href={kategoriBaglantisi(TUMU, aranan)}
              >
                Tümü
              </SuzgecDugmesi>
              {kategoriler.map((k) => (
                <SuzgecDugmesi
                  key={k.slug}
                  secili={kategori === k.slug}
                  href={kategoriBaglantisi(k.slug, aranan)}
                >
                  {k.ad}
                </SuzgecDugmesi>
              ))}
            </div>
          </div>
          )}

          {/* Hiç yaş grubu tanımlı değilse başlık da çizilmiyor: boş bir
              süzgeç bölümü müşteriye seçenek varmış gibi görünür (K-65). */}
          {yasSecenekleri.length > 0 && (
          <div>
            <p className="text-sm font-bold">Yaş</p>
            <p className="mt-1 text-xs text-metin-3">
              Bebeğin kaç aylık olduğunu biliyorsan buradan seç.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {yasSecenekleri.map((y) => (
                <SuzgecDugmesi
                  key={y.kod}
                  secili={aranan.yas === y.kod}
                  href={baglanti(kategori, aranan, "yas", y.kod)}
                >
                  {yasEtiketleri.get(y.kod) ?? y.aciklama}
                </SuzgecDugmesi>
              ))}
            </div>
          </div>
          )}

          {bedenSecenekleri.length > 0 && (
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-bold">Beden</p>
              <Link
                href="/beden-rehberi"
                className="text-xs font-bold text-mavi-koyu hover:underline"
              >
                Beden rehberi
              </Link>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {bedenSecenekleri.map((b) => (
                <SuzgecDugmesi
                  key={b.id}
                  secili={aranan.beden === b.ad}
                  href={baglanti(kategori, aranan, "beden", b.ad)}
                >
                  {b.ad}
                  {/* Boy-kilo karşılığı burada duruyor: beden rehberine gitmeden
                      doğru bedeni seçebilmek iadelerin çoğunu önlüyor. */}
                  <span className="ml-2 font-semibold text-metin-3">{b.boy}</span>
                </SuzgecDugmesi>
              ))}
            </div>
          </div>
          )}

          {renkler.length > 0 && (
          <div>
            <p className="text-sm font-bold">Renk</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {renkler.map((r) => (
                <Link
                  key={r.kod}
                  href={baglanti(kategori, aranan, "renk", r.kod)}
                  aria-pressed={aranan.renk === r.kod}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    aranan.renk === r.kod
                      ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                      : "border-cizgi bg-yuzey text-metin-2 hover:border-metin-3"
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-black/10"
                    style={{ background: r.palet.c1 }}
                  />
                  {r.ad}
                </Link>
              ))}
            </div>
          </div>
          )}

          {fiyatSecenekleri.length > 0 && (
          <div>
            <p className="text-sm font-bold">Fiyat</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {fiyatSecenekleri.map((f) => (
                <SuzgecDugmesi
                  key={f.kurus}
                  secili={aranan.fiyat === String(f.kurus)}
                  href={baglanti(kategori, aranan, "fiyat", String(f.kurus))}
                >
                  {f.etiket}
                </SuzgecDugmesi>
              ))}
            </div>
          </div>
          )}
    </>
  );
}
