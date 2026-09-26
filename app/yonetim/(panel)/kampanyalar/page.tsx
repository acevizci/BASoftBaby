import { db } from "@/server/veritabani";
import { kampanyaCevir, kampanyaKaydet, kampanyaSil } from "@/server/yonetim";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { alOdeEtiketi } from "@/server/kampanya";
import { kampanyaZarari, type ZararliUrun } from "@/server/kar";
import { ayarlariGetir } from "@/server/sepet";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import PanelBildirim, { ORTAK_HATALAR } from "@/ui/panel-bildirim";
import SilmeOnayi, { SIL_DUGMESI } from "@/ui/silme-onayi";
import Sayfalama, { SayfaAlani } from "@/ui/sayfalama";
import { sayfaAdresi, sayfaCoz } from "@/ui/sayfalama-bicim";
import PanelArama from "@/ui/panel-arama";
import { alanAramasi, aramaCoz } from "@/ui/panel-arama-bicim";
import { kategoriEtiketleri } from "@/ui/kategori-etiketi";
import Link from "next/link";
import {
  INDIRIM_ONCESI_GUN,
  kampanyaFiyatUyarilari,
  type KampanyaFiyatUyarisi,
} from "@/server/fiyat-gecmisi";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

/** Kampanya satırı tablo satırı; sayfaya çok sayıda sığıyor. */
const LISTE_BOYU = 20;

function tarihYaz(t: Date | null): string {
  return t ? t.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" }) : "—";
}

function degerYaz(k: { tip: string; deger: number; alAdet: number | null; odeAdet: number | null }): string {
  if (k.tip === "al-ode") return alOdeEtiketi(k);
  return k.tip === "yuzde" ? `%${k.deger}` : fiyatYaz(k.deger);
}

const UYARI = <>Kampanya kalıcı olarak siliniyor; geri alınamıyor. Sepetlerde artık uygulanmayacak. Yalnızca durdurmak istiyorsan &quot;Kapat&quot; yeter.</>;

/** Bildirim metinleri koddan; adres yalnızca kodu taşıyor (K-57). */
const BILDIRIMLER: Record<string, string> = {
  "1": "Kaydedildi.",
  silindi: "Kampanya silindi. Sepetlerde artık uygulanmıyor.",
  acildi: "Kampanya yayına alındı.",
  kapatildi: "Kampanya kapatıldı.",
};

const HATALAR: Record<string, string> = {
  ...ORTAK_HATALAR,
  kupon: "Bu kupon kodu başka bir kampanyada kullanılıyor. Başka bir kod seç.",
  ad: "Kampanya adı boş olamaz.",
  gecersiz: "Tanınmayan indirim türü ya da kapsam.",
  yuzde: "Yüzde 1 ile 100 arasında bir sayı olmalı.",
  tutar: "Geçerli bir indirim tutarı yaz (ör. 50,00).",
  "al-ode":
    "\"X al Y öde\" için X en az 2, en çok 20; Y en az 1 ve X'ten küçük olmalı (ör. 3 al 2 öde).",
  "kupon-harf":
    "Kupon kodu 3-40 karakter; yalnızca Türkçe olmayan büyük harf (A-Z), rakam, tire ve alt çizgi. Ör. HOSGELDIN10.",
  kategori: "Kapsam \"Tek kategori\" seçildiyse bir kategori seç.",
  urun: "Kapsam \"Tek ürün\" seçildiyse bir ürün seç.",
  tarih: "Bitiş tarihi başlangıçtan önce olamaz.",
};

export default async function KampanyaEkrani({
  searchParams,
}: PageProps<"/yonetim/kampanyalar">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { kayit, hata, sayfa, ara } = await searchParams;
  const arama = aramaCoz(ara);
  // Kişiye özel kuponlar (K-151) listeyi doldurmasın; e-postayla gidiyorlar.
  const kosul = { ...alanAramasi(arama, ["ad", "kuponKodu"]), customerId: null };

  // Kategori ve ürün listeleri kampanya formunun açılır menüleri; onlar
  // sayfalanmıyor, yalnızca kampanya tablosu (K-67).
  const toplamAdet = await db.campaign.count({ where: kosul });
  const durum = sayfaCoz(sayfa, toplamAdet, LISTE_BOYU);
  const temel = arama
    ? `/yonetim/kampanyalar?ara=${encodeURIComponent(arama)}`
    : "/yonetim/kampanyalar";
  const adres = (n: number) => sayfaAdresi(temel, n);

  const [kampanyalar, kategoriler, urunler, maliyetliler, satisAyari] = await Promise.all([
    db.campaign.findMany({
      where: kosul,
      orderBy: { olusturuldu: "desc" },
      include: { category: { select: { ad: true } }, product: { select: { ad: true } } },
      skip: durum.atla,
      take: durum.boy,
    }),
    db.category.findMany({
      orderBy: { sira: "asc" },
      select: { id: true, slug: true, ad: true, aktif: true },
    }),
    db.product.findMany({ orderBy: { ad: "asc" }, select: { id: true, ad: true } }),
    // Zarar uyarısı için: satıştaki, alış fiyatı girilmiş ürünler (K-113).
    db.product.findMany({
      where: { aktif: true, alisFiyatKurus: { not: null } },
      select: { id: true, ad: true, categoryId: true, fiyatKurus: true, alisFiyatKurus: true },
    }),
    ayarlariGetir(),
  ]);
  const fiyatUyarilari = await kampanyaFiyatUyarilari(kampanyalar.map((k) => k.id));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">Kampanyalar</h1>
      <p className="text-sm text-metin-2">
        İndirimler üst üste binmez. Bir sepete birden çok kampanya uyarsa yalnızca en çok
        indiren uygulanır, müşteri de hangisinin uygulandığını sepette görür.
      </p>

      <PanelBildirim kayit={kayit} hata={hata} bildirimler={BILDIRIMLER} hatalar={HATALAR} />

      <PanelArama
        yol="/yonetim/kampanyalar"
        ara={arama}
        yerTutucu="Kampanya ara: ad ya da kupon kodu"
      />

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Tanımlı kampanyalar</h2>
        {toplamAdet === 0 ? (
          <p className="mt-2 text-sm text-metin-3">
            {arama ? `"${arama}" aramasına uyan kampanya yok.` : "Henüz kampanya yok."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
                <tr>
                  <th className="py-2">Kampanya</th>
                  <th className="py-2">İndirim</th>
                  <th className="py-2">Kapsam</th>
                  <th className="py-2">Kupon</th>
                  <th className="py-2">Tarih</th>
                  <th className="py-2">Kullanım</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi-soluk">
                {kampanyalar.map((k) => (
                  <tr key={k.id}>
                    <td className="py-2">
                      <span className="font-semibold">{k.ad}</span>
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                          k.aktif
                            ? "bg-nane-soluk text-nane-koyu"
                            : "bg-cizgi-soluk text-metin-2"
                        }`}
                      >
                        {k.aktif ? "Açık" : "Kapalı"}
                      </span>
                      {k.enAzSepetKurus > 0 && (
                        <span className="rakam block text-xs text-metin-3">
                          en az {fiyatYaz(k.enAzSepetKurus)} sepet
                        </span>
                      )}
                      <ZararUyarisi zararlilar={kampanyaZarari(k, maliyetliler, satisAyari.kdvOrani)} tutarMi={k.tip === "tutar"} />
                      <FiyatUyarisi urunler={fiyatUyarilari.get(k.id) ?? []} />
                    </td>
                    <td className="rakam py-2 font-semibold">{degerYaz(k)}</td>
                    <td className="py-2 text-metin-2">
                      {k.kapsam === "tumu"
                        ? "Tüm ürünler"
                        : k.kapsam === "kategori"
                          ? (k.category?.ad ?? "kategori silinmiş")
                          : (k.product?.ad ?? "ürün silinmiş")}
                    </td>
                    <td className="rakam py-2">{k.kuponKodu ?? "—"}</td>
                    <td className="rakam py-2 text-xs text-metin-3">
                      {tarihYaz(k.baslangic)} → {tarihYaz(k.bitis)}
                    </td>
                    <td className="rakam py-2">{k.kullanim}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-2">
                        <form action={kampanyaCevir}>
                          <SayfaAlani sayfa={durum.sayfa} />
                          <input type="hidden" name="id" value={k.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-metin-3"
                          >
                            {k.aktif ? "Kapat" : "Aç"}
                          </button>
                        </form>
                        <SilmeOnayi uyari={UYARI}>
                          <form action={kampanyaSil}>
                            <SayfaAlani sayfa={durum.sayfa} />
                            <input type="hidden" name="id" value={k.id} />
                            <button type="submit" className={SIL_DUGMESI}>
                              Evet, sil
                            </button>
                          </form>
                        </SilmeOnayi>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <Sayfalama durum={durum} birim="kampanya" adres={adres} />
        </div>
      </section>

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Yeni kampanya</h2>
        <form action={kampanyaKaydet} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ETIKET}>Kampanya adı — müşteri bunu görür</span>
              <input
                name="ad"
                required
                placeholder="Sonbahar indirimi"
                className={GIRDI}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>İndirim türü</span>
              <select name="tip" defaultValue="yuzde" className={GIRDI}>
                <option value="yuzde">Yüzde</option>
                <option value="tutar">Tutar (₺)</option>
                <option value="al-ode">X al Y öde (ör. 3 al 2 öde)</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Değer — yüzdede 20, tutarda 50,00 (X al Y öde&apos;de boş)</span>
              <input name="deger" inputMode="decimal" className={`${GIRDI} rakam`} />
            </label>

            {/* "X al Y öde" (K-168): en ucuz ürünler bedava. */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ETIKET}>X al Y öde — yalnızca bu tür seçiliyse</span>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <input
                  name="alAdet"
                  inputMode="numeric"
                  placeholder="3"
                  aria-label="Alınan adet"
                  className={`${GIRDI} rakam w-20`}
                />
                <span>al</span>
                <input
                  name="odeAdet"
                  inputMode="numeric"
                  placeholder="2"
                  aria-label="Ödenen adet"
                  className={`${GIRDI} rakam w-20`}
                />
                <span>öde</span>
              </div>
              <span className="text-xs text-metin-3">
                Kapsamdaki ürünlerden her X adette Y tanesi ücretli; bedava olanlar sepetteki en
                ucuz ürünler. Farklı ürünler karışabilir (kapsamı kategori ya da tek ürün yaparak
                sınırlayabilirsin). 5 ürün alan 3 al 2 öde&apos;de 1, 6 ürün alan 2 ürün bedava alır.
              </span>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Kapsam</span>
              <select name="kapsam" defaultValue="tumu" className={GIRDI}>
                <option value="tumu">Tüm ürünler</option>
                <option value="kategori">Tek kategori</option>
                <option value="urun">Tek ürün</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Kategori — kapsam kategoriyse</span>
              <select name="categoryId" defaultValue="" className={GIRDI}>
                <option value="">seçilmedi</option>
                {kategoriler.map((k) => (
                  <option key={k.id} value={k.id}>
                    {kategoriEtiketleri(kategoriler).get(k.slug) ?? k.ad}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ETIKET}>Ürün — kapsam ürünse</span>
              <select name="productId" defaultValue="" className={GIRDI}>
                <option value="">seçilmedi</option>
                {urunler.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.ad}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Kupon kodu — boşsa kendiliğinden uygulanır</span>
              <input
                name="kuponKodu"
                placeholder="HOSGELDIN"
                className={`${GIRDI} rakam uppercase`}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>En az sepet tutarı (₺)</span>
              <input
                name="enAzSepet"
                inputMode="decimal"
                placeholder="0"
                className={`${GIRDI} rakam`}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Başlangıç</span>
              <input name="baslangic" type="date" className={GIRDI} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Bitiş</span>
              <input name="bitis" type="date" className={GIRDI} />
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="aktif"
              defaultChecked
              className="h-4 w-4 accent-[var(--mercan)]"
            />
            <span className="text-sm font-semibold">Kampanya açık</span>
          </label>

          <p className="text-xs text-metin-3">
            Ürün fiyatına yalnızca kuponsuz, sepet alt sınırı olmayan <strong>yüzde</strong>{" "}
            kampanyaları yansır. Tutar indirimi ve &quot;X al Y öde&quot; sepette hesaplanır;
            &quot;X al Y öde&quot; ürün sayfasında ve kartta etiket olarak görünür. Kupon isteyen ya
            da alt sınırı olan kampanyalar yalnızca sepette çıkar. İndirimler üst üste binmez:
            sepete uyan kampanyalardan en çok indireni uygulanır.
          </p>

          <button
            type="submit"
            className="self-start rounded-full bg-dugme px-6 py-3 font-bold text-dugme-yazi transition hover:brightness-95"
          >
            Kampanyayı oluştur
          </button>
        </form>
      </section>
    </div>
  );
}

/**
 * Kampanya bazı ürünleri maliyetin altına indiriyorsa (K-113). Katlı: tablo
 * satırını büyütmesin, ama sayısı her zaman görünsün.
 */
function ZararUyarisi({ zararlilar, tutarMi }: { zararlilar: ZararliUrun[]; tutarMi: boolean }) {
  if (zararlilar.length === 0) return null;
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer font-bold text-mercan-koyu">
        ⚠ {zararlilar.length} üründe maliyetin altında
      </summary>
      <ul className="mt-1 flex flex-col gap-0.5 text-metin-2">
        {zararlilar.slice(0, 10).map((z) => (
          <li key={z.ad} className="rakam">
            {z.ad}: indirimli {fiyatYaz(z.indirimliKurus)} (KDV hariç {fiyatYaz(z.netKurus)}), alış{" "}
            {fiyatYaz(z.alisKurus)}
          </li>
        ))}
        {zararlilar.length > 10 && <li>…ve {zararlilar.length - 10} ürün daha</li>}
      </ul>
      {tutarMi && <p className="mt-1 text-metin-3">Tutar indiriminde sepette yalnızca o ürün varsa.</p>}
    </details>
  );
}

/**
 * Fiyat Etiketi Yönetmeliği (K-164): kampanyada üstü çizili görünen liste
 * fiyatı, kampanya başlangıcından önceki on günün en düşük fiyatını aşıyor
 * ya da o döneme ait fiyat kaydı yok.
 */
function FiyatUyarisi({ urunler }: { urunler: KampanyaFiyatUyarisi[] }) {
  if (urunler.length === 0) return null;
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer font-bold text-sari-koyu">
        İndirim öncesi fiyat: {urunler.length} üründe uyarı
      </summary>
      <p className="mt-1 max-w-md text-metin-2">
        Üstü çizili liste fiyatı, kampanya başlangıcından önceki {INDIRIM_ONCESI_GUN} günde uygulanan
        en düşük fiyattan yüksek olamaz. Kaydı olmayan üründe fiyatın uygulandığı gösterilemiyor.
      </p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {urunler.slice(0, 10).map((u) => (
          <li key={u.slug}>
            <Link href={`/yonetim/urunler/${u.slug}`} className="font-semibold hover:underline">
              {u.ad}
            </Link>{" "}
            <span className="rakam text-metin-3">
              {fiyatYaz(u.ustuCiziliKurus)}
              {u.enDusukKurus !== undefined
                ? ` · en düşük ${fiyatYaz(u.enDusukKurus)}`
                : " · kayıt yok"}
            </span>
          </li>
        ))}
        {urunler.length > 10 && <li className="text-metin-3">ve {urunler.length - 10} ürün daha</li>}
      </ul>
    </details>
  );
}
