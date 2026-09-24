import { Yildiz } from "@/ui/yildiz";
import type { YorumOzeti } from "@/server/yorum";
import Sayfalama from "@/ui/sayfalama";
import { sayfaAdresi } from "@/ui/sayfalama-bicim";

function tarihYaz(t: Date): string {
  return t.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Ürün sayfasındaki değerlendirmeler.
 *
 * Hiç yorum yoksa "0,0 puan" diye bir şey yazmıyor: puan yok, onu söylüyor.
 * Dağılım çubukları, kaç kişinin kaç verdiğini gösteriyor — ortalama tek
 * başına "4,2" ne demek belli etmiyor, beşte üç mü yoksa hep dört mü.
 */
export default function YorumListesi({
  ozet,
  slug,
  renk,
}: {
  ozet: YorumOzeti;
  slug: string;
  /** Seçili renk sayfa değişirken düşmesin: galeri ona bakıyor (K-48). */
  renk?: string;
}) {
  // Sayfa bağlantısı bölüme çıpalanıyor: sayfayı değiştiren kişi en üste
  // değil, okuduğu yere dönüyor.
  const adres = (n: number) => {
    const temel = renk ? `/urun/${slug}?renk=${encodeURIComponent(renk)}` : `/urun/${slug}`;
    return `${sayfaAdresi(temel, n, "yorumSayfa")}#degerlendirmeler`;
  };

  return (
    <section id="degerlendirmeler" className="mt-10">
      <h2 className="text-xl">Değerlendirmeler</h2>

      {ozet.adet === 0 ? (
        <p className="mt-3 rounded-marka border border-cizgi bg-yuzey p-5 text-sm text-metin-2">
          Bu ürün için henüz değerlendirme yok. Değerlendirmeleri yalnızca ürünü satın alıp
          teslim alan müşteriler yazabiliyor.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-6 rounded-marka border border-cizgi bg-yuzey p-5">
            <div>
              <p className="rakam font-baslik text-4xl font-bold">
                {ozet.ortalama.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </p>
              <Yildiz puan={ozet.ortalama} />
              <p className="rakam text-xs text-metin-3">{ozet.adet} değerlendirme</p>
            </div>

            <ul className="min-w-[180px] flex-1">
              {[5, 4, 3, 2, 1].map((p) => {
                const adet = ozet.dagilim[p] ?? 0;
                const yuzde = ozet.adet > 0 ? Math.round((adet / ozet.adet) * 100) : 0;
                return (
                  <li key={p} className="flex items-center gap-2 text-xs">
                    <span className="rakam w-3 text-metin-3">{p}</span>
                    <span aria-hidden="true" className="text-sari-koyu">★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-cizgi-soluk">
                      <span
                        className="block h-full rounded-full bg-sari"
                        style={{ width: `${yuzde}%` }}
                      />
                    </span>
                    <span className="rakam w-6 text-right text-metin-3">{adet}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <ul className="mt-4 flex flex-col gap-3">
            {ozet.yorumlar.map((y) => (
              <li key={y.id} className="rounded-marka border border-cizgi bg-yuzey p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">{y.adSoyad}</p>
                  <span className="rounded-full bg-nane-soluk px-2.5 py-0.5 text-xs font-bold text-nane-koyu">
                    Doğrulanmış alışveriş
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-2 text-xs text-metin-3">
                  <Yildiz puan={y.puan} />
                  <span>{tarihYaz(y.olusturuldu)}</span>
                </p>
                <p className="mt-2 text-sm text-metin-2">{y.yorum}</p>
                {/* Müşteri fotoğrafları (K-134): panelde onaylananlar; büyük hâli yeni sekmede. */}
                {y.fotograflar.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {y.fotograflar.map((f) => (
                      <a key={f.id} href={f.yol} target="_blank" rel="noopener" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element -- yüklenirken küçültülmüş webp (K-12) */}
                        <img
                          src={f.kucukYol || f.yol}
                          alt={`${y.adSoyad} kullanıcısının fotoğrafı`}
                          loading="lazy"
                          className="h-20 w-20 rounded-[10px] object-cover ring-1 ring-cizgi"
                        />
                      </a>
                    ))}
                  </div>
                )}
                {y.yanit && (
                  <div className="mt-3 rounded-marka bg-zemin-2 px-3 py-2">
                    <p className="text-xs font-bold text-metin-2">BASoftBaby</p>
                    <p className="text-sm text-metin-2">{y.yanit}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <Sayfalama durum={ozet.durum} birim="değerlendirme" adres={adres} />
          </div>
        </>
      )}
    </section>
  );
}
