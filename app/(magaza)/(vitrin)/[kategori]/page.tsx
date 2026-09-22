import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import UrunKarti from "@/ui/urun-karti";
import {
  SIRALAMALAR,
  SIRALAMA_ADLARI,
  kategoriGetir,
  urunleriGetir,
} from "@/server/katalog";
import { bedenler as bedenleriGetir } from "@/server/bedenler";
import { yasGruplari } from "@/server/yas-gruplari";
import { renkSecenekleri } from "@/server/renkler";

/** "urunler" gerçek bir kategori değil; tüm katalogu gösteren liste. */
const TUMU = "urunler";

const FIYAT_ARALIKLARI = [
  { etiket: "200 ₺ altı", kurus: 20000 },
  { etiket: "400 ₺ altı", kurus: 40000 },
  { etiket: "700 ₺ altı", kurus: 70000 },
];

type Aranan = { yas?: string; beden?: string; renk?: string; fiyat?: string; sirala?: string };

export async function generateMetadata({
  params,
}: PageProps<"/[kategori]">): Promise<Metadata> {
  const { kategori } = await params;
  // Süzgeçler canonical adrese girmiyor: aynı listenin onlarca kopyası
  // dizine girip birbirinin sırasını yemesin.
  if (kategori === TUMU) {
    return { title: "Tüm ürünler", alternates: { canonical: `/${TUMU}` } };
  }
  const k = await kategoriGetir(kategori);
  return k
    ? { title: k.ad, description: k.aciklama, alternates: { canonical: `/${k.slug}` } }
    : {};
}

/** Bir süzgeci açıp kapatan bağlantı adresini üretir. */
function baglanti(kategori: string, aranan: Aranan, alan: keyof Aranan, deger: string): string {
  const yeni = new URLSearchParams();
  for (const [ad, d] of Object.entries(aranan)) {
    if (d) yeni.set(ad, d);
  }
  if (yeni.get(alan) === deger) yeni.delete(alan);
  else yeni.set(alan, deger);
  const sorgu = yeni.toString();
  return `/${kategori}${sorgu ? `?${sorgu}` : ""}`;
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
  const urunler = await urunleriGetir({
    kategori: tumu ? undefined : kategori,
    yas: aranan.yas,
    beden: aranan.beden,
    renk: aranan.renk,
    enFazlaKurus: Number.isFinite(enFazlaKurus) ? enFazlaKurus : undefined,
    sirala: aranan.sirala,
  });

  const suzgecVar = Boolean(aranan.yas || aranan.beden || aranan.renk || aranan.fiyat);
  const [bedenSecenekleri, yasSecenekleri, renkler] = await Promise.all([
    bedenleriGetir(),
    yasGruplari(),
    renkSecenekleri(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
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
        <aside className="flex flex-col gap-6">
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
                  {y.aciklama}
                </SuzgecDugmesi>
              ))}
            </div>
          </div>
          )}

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

          <div>
            <p className="text-sm font-bold">Fiyat</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {FIYAT_ARALIKLARI.map((f) => (
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

          {suzgecVar && (
            <Link href={`/${kategori}`} className="text-sm font-bold text-mavi-koyu hover:underline">
              Süzgeçleri temizle
            </Link>
          )}
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="rakam text-sm text-metin-3">{urunler.length} ürün listeleniyor</p>

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

          {urunler.length === 0 ? (
            <div className="mt-4 rounded-marka border border-cizgi bg-yuzey p-8 text-center">
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
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
              {urunler.map((u) => (
                <UrunKarti key={u.slug} urun={u} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
