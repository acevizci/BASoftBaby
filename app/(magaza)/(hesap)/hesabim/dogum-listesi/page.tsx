import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { girisYapan } from "@/server/uyelik";
import { gelenHediyeler, musterininListesi } from "@/server/dogum-listesi";
import { kalemAdedi, kalemSil, listeKaydet } from "@/server/dogum-listesi-islem";
import { tamAdres } from "@/server/site";
import { fiyatYaz } from "@/ui/katalog-bicim";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import KopyalaDugmesi from "@/ui/kopyala-dugmesi";
import { ANA_DUGME, ETIKET, GIRDI, IKINCIL_DUGME, IYI_KUTU, KART } from "../../hesap-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Doğum listem", robots: { index: false } };

/**
 * Doğum listesi, sahibin tarafı (K-144): başlık, ad, tarih, not; kalemlerin
 * istenen adedi; paylaşım bağlantısı. Kalemler ürün sayfasındaki "Doğum
 * listeme ekle" düğmesiyle geliyor.
 */
export default async function DogumListesiSayfasi({
  searchParams,
}: PageProps<"/hesabim/dogum-listesi">) {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?hata=giris&nereye=%2Fhesabim%2Fdogum-listesi");
  const p = await searchParams;
  const [liste, hediyeler] = await Promise.all([
    musterininListesi(musteri.id),
    gelenHediyeler(musteri.id),
  ]);
  const baglanti = liste ? tamAdres(`/liste/${liste.kod}`) : "";
  const tarih = liste?.tarih ? liste.tarih.slice(0, 10) : "";
  const whatsapp = liste
    ? `https://wa.me/?text=${encodeURIComponent(`${liste.baslik}: ${baglanti}`)}`
    : "";

  return (
    <section className="mt-6 flex flex-col gap-5">
      <div>
        <h2 className="text-lg">Doğum listem</h2>
        <p className="mt-1 text-sm text-metin-2">
          Bebeğin için istediklerini beden ve rengiyle listele, bağlantıyı yakınlarınla paylaş.
          Listeden alınanlar işaretlenir; aynı hediye iki kez gelmez. Listede adresin ya da e-postan
          görünmez.
        </p>
      </div>

      {p.eklendi && <p className={IYI_KUTU}>Ürün listene eklendi.</p>}
      {p.kayit && <p className={IYI_KUTU}>Liste kaydedildi.</p>}

      {liste && (
        <div className={`${KART} flex flex-col gap-3`}>
          <p className={ETIKET}>Paylaşım bağlantın</p>
          <p className="break-all rounded-[10px] bg-yuzey-sicak px-3 py-2 text-sm">{baglanti}</p>
          <div className="flex flex-wrap gap-2">
            <KopyalaDugmesi metin={baglanti} className={IKINCIL_DUGME} />
            <a href={whatsapp} target="_blank" rel="noopener" className={IKINCIL_DUGME}>
              WhatsApp&apos;ta paylaş
            </a>
            <Link href={`/liste/${liste.kod}`} className={IKINCIL_DUGME}>
              Listeyi görüntüle
            </Link>
          </div>
          {!liste.acik && (
            <p className="text-sm font-semibold text-mercan-koyu">
              Liste kapalı: bağlantıyı açan kişi alışveriş yapamıyor.
            </p>
          )}
        </div>
      )}

      <form action={listeKaydet} className={`${KART} grid gap-3 sm:grid-cols-2`}>
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Liste başlığı</span>
          <input
            name="baslik"
            maxLength={80}
            defaultValue={liste?.baslik ?? "Doğum listemiz"}
            className={GIRDI}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Listede görünen ad</span>
          <input
            name="sahipAdi"
            maxLength={60}
            defaultValue={liste?.sahipAdi ?? musteri.adSoyad.split(" ")[0]}
            placeholder="Ayşe & Mehmet"
            className={GIRDI}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Beklenen doğum tarihi (isteğe bağlı)</span>
          <input name="tarih" type="date" defaultValue={tarih} className={GIRDI} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-metin-2">
          <input
            type="checkbox"
            name="acik"
            defaultChecked={liste?.acik ?? true}
            className="h-4 w-4 accent-[var(--mercan)]"
          />
          Liste açık, alışveriş yapılabilir
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={ETIKET}>Yakınlarına not (isteğe bağlı)</span>
          <textarea
            name="mesaj"
            maxLength={600}
            rows={3}
            defaultValue={liste?.mesaj ?? ""}
            placeholder="Minik kızımız Ekim'de geliyor; beden tablosuna göre seçtik."
            className={GIRDI}
          />
        </label>
        <GonderDugmesi bekleyen="Kaydediliyor…" className={`${ANA_DUGME} justify-self-start`}>
          {liste ? "Kaydet" : "Listemi oluştur"}
        </GonderDugmesi>
      </form>

      {liste && liste.kalemler.length === 0 && (
        <div className={`${KART} text-sm text-metin-2`}>
          <p>Listende henüz ürün yok.</p>
          <p className="mt-1">
            Ürün sayfasında bedeni ve rengi seçip <strong>Doğum listeme ekle</strong>&apos;ye dokun.
          </p>
          <Link href="/urunler" className={`${ANA_DUGME} mt-4 inline-block text-sm`}>
            Ürünlere göz at
          </Link>
        </div>
      )}

      {liste && liste.kalemler.length > 0 && (
        <ul className={`${KART} flex flex-col divide-y divide-cizgi-soluk p-0`}>
          {liste.kalemler.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-4 p-4">
              {k.foto ? (
                // eslint-disable-next-line @next/next/no-img-element -- küçük görsel, zaten küçültülmüş
                <img
                  src={k.foto}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-[10px] object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-[10px] bg-yuzey-sicak" />
              )}
              <div className="min-w-0 flex-1 text-sm">
                <Link
                  href={`/urun/${k.slug}?renk=${encodeURIComponent(k.renk)}`}
                  className="font-bold hover:underline"
                >
                  {k.urunAd}
                </Link>
                <p className="text-xs text-metin-3">
                  {k.beden} · {k.renkAdi} · <span className="rakam">{fiyatYaz(k.fiyatKurus)}</span>
                </p>
                <p className="mt-0.5 text-xs font-semibold text-nane-koyu">
                  {k.alinan >= k.istenen ? "Tamamı alındı" : `${k.alinan} / ${k.istenen} alındı`}
                </p>
              </div>
              <form action={kalemAdedi} className="flex items-center gap-2">
                <input type="hidden" name="id" value={k.id} />
                <label className="sr-only" htmlFor={`adet-${k.id}`}>
                  İstenen adet
                </label>
                <input
                  id={`adet-${k.id}`}
                  name="istenen"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={k.istenen}
                  className={`${GIRDI} w-20`}
                />
                <button className={IKINCIL_DUGME}>Güncelle</button>
              </form>
              <form action={kalemSil}>
                <input type="hidden" name="id" value={k.id} />
                <button className="text-xs font-bold text-metin-3 hover:text-mercan-koyu hover:underline">
                  Çıkar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* Gelen hediyeler (K-146): ödemesi alınmış olanlar, hediye edenin yazdığı ad ve notla. */}
      {hediyeler.length > 0 && (
        <div className={KART}>
          <h3 className="text-base">Gelen hediyeler</h3>
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
            {hediyeler.map((h) => (
              <li key={h.numara} className="py-3 text-sm">
                <p className="font-bold">
                  {h.gonderen || "Bir yakının"}
                  <span className="ml-2 text-xs font-normal text-metin-3">
                    {new Date(h.tarih).toLocaleDateString("tr-TR", {
                      dateStyle: "medium",
                      timeZone: "Europe/Istanbul",
                    })}
                  </span>
                </p>
                <p className="text-metin-2">{h.urunler.join(", ")}</p>
                {h.not && <p className="mt-1 italic text-metin-2">&ldquo;{h.not}&rdquo;</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
