import { db } from "@/server/veritabani";
import { kampanyaCevir, kampanyaKaydet, kampanyaSil } from "@/server/yonetim";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { alOdeEtiketi, kademeCoz, nciUrunEtiketi } from "@/server/kampanya";
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

/** Kapsamdaki kategori ya da ürün adları: "Zıbın, Tulum ve 3 tane daha" (K-171). */
function kapsamAdlari(idler: (string | null)[], adlar: Map<string, string>, tur: string): string {
  const liste = idler.filter((x): x is string => !!x).map((id) => adlar.get(id) ?? `silinmiş ${tur}`);
  if (liste.length === 0) return `${tur} seçili değil`;
  return liste.length > 3 ? `${liste.slice(0, 3).join(", ")} ve ${liste.length - 3} tane daha` : liste.join(", ");
}

function tarihYaz(t: Date | null): string {
  return t ? t.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" }) : "—";
}

function degerYaz(k: {
  tip: string;
  deger: number;
  alAdet: number | null;
  odeAdet: number | null;
  kademeler: unknown;
  enFazlaIndirimKurus: number | null;
}): string {
  const tavan = k.enFazlaIndirimKurus ? ` (en çok ${fiyatYaz(k.enFazlaIndirimKurus)})` : "";
  switch (k.tip) {
    case "al-ode":
      return alOdeEtiketi(k);
    case "nci-urun":
      return nciUrunEtiketi(k) + tavan;
    case "kademeli":
      return (
        (kademeCoz(k.kademeler) ?? [])
          .map((x) => `${fiyatYaz(x.esikKurus)} → ${fiyatYaz(x.indirimKurus)}`)
          .join(", ") + tavan
      );
    case "kargo":
      return "Ücretsiz kargo";
    case "yuzde":
      return `%${k.deger}${tavan}`;
    default:
      return fiyatYaz(k.deger);
  }
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
  kategori: "Kapsam \"Seçili kategoriler\" ise en az bir kategori işaretle.",
  urun: "Kapsam \"Seçili ürünler\" ise en az bir ürün işaretle.",
  tarih: "Bitiş tarihi başlangıçtan önce olamaz.",
  "nci-urun": "N. ürün 2 ile 10 arasında olmalı; yüzdeyi Değer kutusuna yaz (ör. 2. ürüne %50).",
  kademeli:
    "Kademeleri her satıra \"eşik = indirim\" diye yaz (ör. 500 = 50). İndirim eşikten küçük olmalı; aynı eşik iki kez olmaz; en çok 10 basamak.",
  tavan: "İndirim tavanı geçerli bir tutar olmalı (ör. 200).",
  sinir: "Kullanım sınırları 1 ya da daha büyük tam sayı olmalı.",
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
      // Kapsam adları aşağıda kategori ve ürün listesinden (K-171).
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
  const kategoriAdi = new Map(kategoriler.map((k) => [k.id, k.ad]));
  const urunAdi = new Map(urunler.map((u) => [u.id, u.ad]));

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
                      {/* Kullanım kuralları (K-170). */}
                      {(k.uyelereOzel || k.ilkSiparis || k.kisiBasiSinir || k.enFazlaKullanim) && (
                        <span className="block text-xs text-metin-3">
                          {[
                            k.ilkSiparis ? "ilk siparişe özel" : k.uyelereOzel ? "üyelere özel" : "",
                            k.kisiBasiSinir ? `kişi başı ${k.kisiBasiSinir}` : "",
                            k.enFazlaKullanim ? `toplam ${k.kullanim}/${k.enFazlaKullanim}` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
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
                          ? kapsamAdlari(
                              k.kategoriIdleri.length ? k.kategoriIdleri : [k.categoryId],
                              kategoriAdi,
                              "kategori",
                            )
                          : kapsamAdlari(
                              k.urunIdleri.length ? k.urunIdleri : [k.productId],
                              urunAdi,
                              "ürün",
                            )}
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
                <option value="nci-urun">N. ürüne indirim (ör. 2. ürüne %50)</option>
                <option value="kademeli">Kademeli sepet indirimi (ör. 500 ₺&apos;ye 50 ₺)</option>
                <option value="kargo">Ücretsiz kargo</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>
                Değer — yüzdede ve N. üründe 20 (%), tutarda 50,00 (öteki türlerde boş)
              </span>
              <input name="deger" inputMode="decimal" className={`${GIRDI} rakam`} />
            </label>

            {/* "N. ürüne %X" ve kademeli (K-170). */}
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>N. ürün — &quot;N. ürüne indirim&quot;de kaçıncı ürün</span>
              <input name="nciN" inputMode="numeric" placeholder="2" className={`${GIRDI} rakam`} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>İndirim tavanı (₺) — isteğe bağlı, ör. %20 en çok 200 ₺</span>
              <input name="tavan" inputMode="decimal" placeholder="boş: sınırsız" className={`${GIRDI} rakam`} />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={ETIKET}>
                Kademeler — yalnızca kademeli türde; her satır &quot;eşik = indirim&quot; (₺)
              </span>
              <textarea
                name="kademeler"
                rows={3}
                placeholder={"500 = 50\n1000 = 150\n2000 = 400"}
                className={`${GIRDI} rakam`}
              />
              <span className="text-xs text-metin-3">
                Kapsamdaki ürünlerin tutarı hangi eşiği geçtiyse o basamağın indirimi uygulanır.
                Sepette müşteriye bir sonraki basamağa ne kadar kaldığı yazılır.
              </span>
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
                <option value="kategori">Seçili kategoriler</option>
                <option value="urun">Seçili ürünler</option>
              </select>
            </label>

            {/* Çoklu kapsam (K-171): onay kutuları; JavaScript'siz çalışıyor. */}
            <fieldset className="flex flex-col gap-1.5 sm:col-span-2">
              <legend className={ETIKET}>Kategoriler — kapsam &quot;Seçili kategoriler&quot;se</legend>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5 rounded-[10px] border-[1.5px] border-cizgi p-3">
                {kategoriler.map((k) => (
                  <label key={k.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      name="kategoriIdleri"
                      value={k.id}
                      className="h-4 w-4 accent-[var(--mercan)]"
                    />
                    {kategoriEtiketleri(kategoriler).get(k.slug) ?? k.ad}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-1.5 sm:col-span-2">
              <legend className={ETIKET}>Ürünler — kapsam &quot;Seçili ürünler&quot;se</legend>
              <div className="mt-1.5 grid max-h-64 gap-1.5 overflow-y-auto rounded-[10px] border-[1.5px] border-cizgi p-3 sm:grid-cols-2">
                {urunler.map((u) => (
                  <label key={u.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      name="urunIdleri"
                      value={u.id}
                      className="h-4 w-4 accent-[var(--mercan)]"
                    />
                    {u.ad}
                  </label>
                ))}
              </div>
            </fieldset>

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
              <span className={ETIKET}>Başlangıç — saat isteğe bağlı (flaş kampanya)</span>
              <input name="baslangic" type="datetime-local" className={GIRDI} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Bitiş</span>
              <input name="bitis" type="datetime-local" className={GIRDI} />
            </label>

            {/* Kullanım kuralları (K-170). */}
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Toplam kullanım sınırı — ör. ilk 100 sipariş</span>
              <input name="enFazlaKullanim" inputMode="numeric" placeholder="boş: sınırsız" className={`${GIRDI} rakam`} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Kişi başı kullanım — bir üye en çok kaç kez</span>
              <input name="kisiBasiSinir" inputMode="numeric" placeholder="boş: sınırsız" className={`${GIRDI} rakam`} />
            </label>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="uyelereOzel" className="h-4 w-4 accent-[var(--mercan)]" />
                <span className="text-sm font-semibold">Yalnızca üyelere</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="ilkSiparis" className="h-4 w-4 accent-[var(--mercan)]" />
                <span className="text-sm font-semibold">Yalnızca ilk siparişte (hoş geldin kampanyası)</span>
              </label>
              <span className="text-xs text-metin-3">
                İlk sipariş ve kişi başı sınır, kimin kullandığını bilmek için üye girişi ister;
                bu kampanyalar yalnızca giriş yapmış müşteriye uygulanır ve ürün kartlarında
                indirimli fiyat olarak görünmez. Üyeliksiz verilmiş eski siparişler de e-posta
                adresinden sayılır.
              </span>
            </div>
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
