import { db } from "@/server/veritabani";
import { kampanyaCevir, kampanyaKaydet, kampanyaSil } from "@/server/yonetim";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

function tarihYaz(t: Date | null): string {
  return t ? t.toLocaleDateString("tr-TR") : "—";
}

function degerYaz(tip: string, deger: number): string {
  return tip === "yuzde" ? `%${deger}` : fiyatYaz(deger);
}

export default async function KampanyaEkrani({
  searchParams,
}: PageProps<"/yonetim/kampanyalar">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { kayit, hata } = await searchParams;

  const [kampanyalar, kategoriler, urunler] = await Promise.all([
    db.campaign.findMany({
      orderBy: { olusturuldu: "desc" },
      include: { category: { select: { ad: true } }, product: { select: { ad: true } } },
    }),
    db.category.findMany({ orderBy: { sira: "asc" }, select: { id: true, ad: true } }),
    db.product.findMany({ orderBy: { ad: "asc" }, select: { id: true, ad: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl">Kampanyalar</h1>
      <p className="text-sm text-metin-2">
        İndirimler üst üste binmez. Bir sepete birden çok kampanya uyarsa yalnızca en çok
        indiren uygulanır, müşteri de hangisinin uygulandığını sepette görür.
      </p>

      {kayit === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Kaydedildi.
        </p>
      )}

      {hata === "kupon" && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          Bu kupon kodu başka bir kampanyada kullanılıyor. Başka bir kod seç.
        </p>
      )}

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="text-lg">Tanımlı kampanyalar</h2>
        {kampanyalar.length === 0 ? (
          <p className="mt-2 text-sm text-metin-3">Henüz kampanya yok.</p>
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
                            : "bg-cizgi-soluk text-metin-3"
                        }`}
                      >
                        {k.aktif ? "Açık" : "Kapalı"}
                      </span>
                      {k.enAzSepetKurus > 0 && (
                        <span className="rakam block text-xs text-metin-3">
                          en az {fiyatYaz(k.enAzSepetKurus)} sepet
                        </span>
                      )}
                    </td>
                    <td className="rakam py-2 font-semibold">{degerYaz(k.tip, k.deger)}</td>
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
                          <input type="hidden" name="id" value={k.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-metin-3"
                          >
                            {k.aktif ? "Kapat" : "Aç"}
                          </button>
                        </form>
                        <form action={kampanyaSil}>
                          <input type="hidden" name="id" value={k.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 hover:border-mercan hover:text-mercan-koyu"
                          >
                            Sil
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Değer — yüzdede 20, tutarda 50,00</span>
              <input name="deger" required inputMode="decimal" className={`${GIRDI} rakam`} />
            </label>

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
                    {k.ad}
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
            Sepet alt sınırı olan ve kupon isteyen kampanyalar ürün kartlarında indirimli fiyat
            olarak görünmez; onlar sepette hesaplanır. Alt sınırsız ve kuponsuz kampanyalar ise
            ürün fiyatına doğrudan yansır.
          </p>

          <button
            type="submit"
            className="self-start rounded-full bg-mercan px-6 py-3 font-bold text-white transition hover:brightness-95"
          >
            Kampanyayı oluştur
          </button>
        </form>
      </section>
    </div>
  );
}
