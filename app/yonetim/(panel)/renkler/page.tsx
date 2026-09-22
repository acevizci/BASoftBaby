import Link from "next/link";
import Katlanir from "@/ui/katlanir";
import { db } from "@/server/veritabani";
import { tumRenkler } from "@/server/renkler";
import { renkCevir, renkEkle, renkKaydet, renkSil, renkTasi } from "@/server/yonetim-renk";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import UrunGorseli from "@/ui/urun-gorseli";
import SilmeOnayi, { SIL_DUGMESI } from "@/ui/silme-onayi";
import Sayfalama, { SayfaAlani } from "@/ui/sayfalama";
import { dilimle, sayfaAdresi, sayfaCoz } from "@/ui/sayfalama-bicim";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";
const KUCUK_DUGME =
  "rounded-full border border-cizgi bg-yuzey px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin disabled:opacity-40";
const ANA_DUGME =
  "rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi transition hover:brightness-95";

/** Renk satırı tek satırlık; sayfaya çok sayıda sığıyor. */
const LISTE_BOYU = 15;

/** Ekran metinleri koddan; adres satırından gelen yazı basılmıyor. */
const BILDIRIMLER: Record<string, string> = {
  eklendi: "Renk eklendi. Ürünlerde artık seçilebiliyor.",
  kaydedildi: "Renk kaydedildi.",
  kapatildi: "Renk kapatıldı. Yeni varyantta seçilemiyor, var olan stoklara dokunulmadı.",
  acildi: "Renk yeniden açıldı.",
  silindi: "Renk silindi.",
  sira: "Sıra değişti. Süzgeçte ve ürün sayfasında bu sırayla görünüyor.",
};

const HATALAR: Record<string, string> = {
  kod: "Renk kodu boş olamaz. Adres satırında görünen kısım bu: mint gibi.",
  ad: "Renk adı boş olamaz.",
  tekrar: "Bu kodda bir renk zaten var.",
  sonrenk: "Son açık renk kapatılamıyor — ürüne varyant eklenemez hâle gelirdi.",
  kullanimda:
    "Bu renk üründe, fotoğrafta ya da afişte kullanılıyor, silinemiyor. Bunun yerine kapatabilirsin.",
  bulunamadi: "Kayıt bulunamadı — başka biri silmiş olabilir. Liste yenilendi.",
};

/**
 * Renk yönetimi.
 *
 * Renk listesi kodda sabitti (K-66): mağazayı işleten kişi "Pudra"
 * ekleyemiyor, "Nane"nin adını değiştiremiyordu. Beden ekranının kardeşi;
 * fazladan olan tek şey **palet**: fotoğrafı olmayan ürünün çizimi bu dört
 * renkle boyandığı için önizleme formun yanında duruyor.
 */
export default async function RenkEkrani({ searchParams }: PageProps<"/yonetim/renkler">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { duzenle, kayit, hata, adet, sayfa } = await searchParams;
  const renkler = await tumRenkler();

  const durum = sayfaCoz(sayfa, renkler.length, LISTE_BOYU);
  const sayfadakiler = dilimle(renkler, durum);
  const adres = (n: number) => sayfaAdresi("/yonetim/renkler", n);

  // Hangi renk nerede kullanılıyor: silinebilir mi sorusunun cevabı. Dört
  // yerde geçiyor, dördü de tek sorguda toplanıyor.
  const [varyantlar, fotograflar, urunler, afisler] = await Promise.all([
    db.productVariant.groupBy({ by: ["renk"], _count: { _all: true }, _sum: { stok: true } }),
    db.productImage.groupBy({ by: ["renk"], _count: { _all: true } }),
    db.product.groupBy({ by: ["palet"], _count: { _all: true } }),
    db.heroBanner.groupBy({ by: ["palet"], _count: { _all: true } }),
  ]);

  const kullanim = new Map<string, { varyant: number; stok: number; foto: number; cizim: number }>();
  const al = (k: string) =>
    kullanim.get(k) ?? { varyant: 0, stok: 0, foto: 0, cizim: 0 };
  for (const v of varyantlar) {
    kullanim.set(v.renk, { ...al(v.renk), varyant: v._count._all, stok: v._sum.stok ?? 0 });
  }
  for (const f of fotograflar) {
    if (!f.renk) continue;
    kullanim.set(f.renk, { ...al(f.renk), foto: f._count._all });
  }
  for (const u of [...urunler, ...afisler]) {
    kullanim.set(u.palet, { ...al(u.palet), cizim: al(u.palet).cizim + u._count._all });
  }

  const duzenlenen =
    typeof duzenle === "string" ? renkler.find((r) => r.id === duzenle) : undefined;

  const bildirim = typeof kayit === "string" ? BILDIRIMLER[kayit] : undefined;
  const hataMetni = typeof hata === "string" ? HATALAR[hata] : undefined;
  const kullanimAdedi = typeof adet === "string" ? Number(adet) : undefined;

  const acikSayisi = renkler.filter((r) => r.aktif).length;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Renkler</h1>
      <p className="text-sm text-metin-2">
        Mağazadaki renk listesi, sırası ve çizim paleti. Buradaki adlar ürün sayfasında,
        süzgeçte, sepette, faturada ve e-postalarda aynen görünüyor; palet ise fotoğrafı
        olmayan ürünlerin çizimini boyuyor.
      </p>

      {bildirim && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          {bildirim}
        </p>
      )}
      {hataMetni && (
        <p className="rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          {hataMetni}
          {hata === "kullanimda" && Number.isFinite(kullanimAdedi) && (
            <span className="rakam font-normal"> ({kullanimAdedi} kayıtta geçiyor.)</span>
          )}
        </p>
      )}

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg">
          Renk listesi
          <span className="rakam text-xs font-semibold text-metin-3">
            {renkler.length} renk · {acikSayisi} açık
          </span>
        </h2>

        {renkler.length === 0 ? (
          <p className="mt-3 text-sm text-metin-2">
            Hiç renk yok. Aşağıdan ekleyerek başla; renk olmadan ürüne varyant eklenemiyor.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
            {sayfadakiler.map((r, yer) => {
              // Ok düğmeleri listenin tamamına göre: sayfanın son kaydı
              // listenin sonu değil (K-67).
              const i = durum.atla + yer;
              const k = kullanim.get(r.kod);
              const toplam = k ? k.varyant + k.foto + k.cizim : 0;
              return (
                <li key={r.id} className="flex flex-col gap-3 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    {/* Rengin kendisi: adı okumaktan daha hızlı anlatıyor. */}
                    <span
                      aria-hidden="true"
                      className="h-7 w-7 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ background: r.c1 }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{r.ad}</span>
                      <span className="rakam block text-xs text-metin-3">
                        adres kodu: {r.kod}
                      </span>
                    </span>

                    <span className="rakam text-xs text-metin-3">
                      {toplam === 0
                        ? "kullanılmıyor"
                        : [
                            k!.varyant > 0 && `${k!.varyant} varyant · ${k!.stok} adet`,
                            k!.foto > 0 && `${k!.foto} fotoğraf`,
                            k!.cizim > 0 && `${k!.cizim} çizim`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        r.aktif
                          ? "bg-nane-soluk text-nane-koyu"
                          : "bg-cizgi-soluk text-metin-2"
                      }`}
                    >
                      {r.aktif ? "Açık" : "Kapalı"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <form action={renkTasi}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="yon" value="yukari" />
                      <SayfaAlani sayfa={durum.sayfa} boy={LISTE_BOYU} />
                      <button type="submit" className={KUCUK_DUGME} disabled={i === 0}>
                        ↑ yukarı
                      </button>
                    </form>
                    <form action={renkTasi}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="yon" value="asagi" />
                      <SayfaAlani sayfa={durum.sayfa} boy={LISTE_BOYU} />
                      <button
                        type="submit"
                        className={KUCUK_DUGME}
                        disabled={i === renkler.length - 1}
                      >
                        ↓ aşağı
                      </button>
                    </form>

                    <Link
                      href={sayfaAdresi(`/yonetim/renkler?duzenle=${r.id}`, durum.sayfa)}
                      className={KUCUK_DUGME}
                    >
                      Düzenle
                    </Link>

                    <form action={renkCevir}>
                      <input type="hidden" name="id" value={r.id} />
                      <SayfaAlani sayfa={durum.sayfa} />
                      <button type="submit" className={KUCUK_DUGME}>
                        {r.aktif ? "Kapat" : "Aç"}
                      </button>
                    </form>

                    {/* Kullanılan renk silinemiyor. Düğmeyi gizlemek yerine
                        sebebini yazıyor (K-52, K-56). */}
                    {toplam === 0 ? (
                      <SilmeOnayi
                        uyari={
                          <>
                            Renk kalıcı olarak siliniyor; geri alınamıyor. Hiçbir üründe,
                            fotoğrafta ve afişte kullanılmadığı için stok kaybı olmuyor,
                            ama bu renge giden{" "}
                            <span className="rakam">?renk={r.kod}</span> bağlantısı artık
                            sonuç getirmez. Yalnızca mağazadan kaldırmak istiyorsan
                            &quot;Kapat&quot; yeter.
                          </>
                        }
                      >
                        <form action={renkSil}>
                          <input type="hidden" name="id" value={r.id} />
                          <SayfaAlani sayfa={durum.sayfa} />
                          <button type="submit" className={SIL_DUGMESI}>
                            Evet, sil
                          </button>
                        </form>
                      </SilmeOnayi>
                    ) : (
                      <span className="text-xs text-metin-3">
                        Kullanılıyor — silmek yerine kapat.
                      </span>
                    )}
                  </div>

                  {duzenlenen?.id === r.id && (
                    <form
                      action={renkKaydet}
                      className="rounded-marka border border-cizgi-soluk bg-yuzey-sicak p-4"
                    >
                      <input type="hidden" name="id" value={r.id} />
                      <SayfaAlani sayfa={durum.sayfa} />
                      <Alanlar
                        kod={r.kod}
                        ad={r.ad}
                        zemin={r.zemin}
                        c1={r.c1}
                        c2={r.c2}
                        c3={r.c3}
                      />
                      <p className="mt-3 text-xs text-metin-3">
                        Kodu değiştirirsen bu renkteki varyantlar, fotoğraflar, ürün
                        çizimleri ve afişler de yeni koda geçer; satılmış siparişlerin
                        kaydı olduğu gibi kalır. Eski{" "}
                        <span className="rakam">?renk={r.kod}</span> bağlantısı artık
                        sonuç getirmez.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button type="submit" className={ANA_DUGME}>
                          Kaydet
                        </button>
                        <Link href={adres(durum.sayfa)} className={KUCUK_DUGME}>
                          Vazgeç
                        </Link>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4">
          <Sayfalama durum={durum} birim="renk" adres={adres} />
        </div>
      </section>

      <Katlanir id="yeni-renk" baslik="Yeni renk ekle" eylem acik={hata !== undefined && duzenle === undefined}>
        <form action={renkEkle} className="flex flex-col gap-4">
          <Alanlar />
          <button type="submit" className={`${ANA_DUGME} self-start`}>
            Rengi ekle
          </button>
        </form>
      </Katlanir>

      <p className="text-xs text-metin-3">
        Sıra listedeki sıradır: süzgeçte ve ürün sayfasındaki renk noktaları burada
        dizdiğin gibi görünüyor. Palet yalnızca fotoğrafı olmayan ürünlerin çizimini
        etkiliyor; fotoğraf yüklenince çizim zaten görünmüyor.
      </p>
    </div>
  );
}

/**
 * Ekleme ve düzenleme formu aynı alanları kullanıyor.
 *
 * Renk alanları `type="color"` ama **yanlarında metin kutusu yok**: tarayıcı
 * bu alanı desteklemezse düz metin kutusuna düşüyor ve `#rrggbb` yazılabiliyor
 * — JavaScript'siz de çalışan tek çözüm bu. Sunucu geçersiz değeri reddetmek
 * yerine eskisini koruyor, tek harf hatası dört alanı sildirmesin.
 */
function Alanlar({
  kod = "",
  ad = "",
  zemin = "#f4efe6",
  c1 = "#d9cfc0",
  c2 = "#eae3d6",
  c3 = "#8c8378",
}: {
  kod?: string;
  ad?: string;
  zemin?: string;
  c1?: string;
  c2?: string;
  c3?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Renk adı</span>
          <input name="ad" defaultValue={ad} required placeholder="Pudra" className={GIRDI} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Adres kodu</span>
          <input name="kod" defaultValue={kod} required placeholder="pudra" className={GIRDI} />
          <span className="text-xs text-metin-3">
            Bağlantıda ve Excel dosyasında görünür. Türkçe harf ve boşluk kullanırsan
            sade hâline çevrilir.
          </span>
        </label>
      </div>

      <div>
        <p className={ETIKET}>Çizim paleti</p>
        <p className="mt-1 text-xs text-metin-3">
          Fotoğrafı olmayan ürünün çizimi bu dört renkle boyanıyor: zemin arka plan, c2
          gövde, c1 vurgu, c3 çizgi.
        </p>
        <div className="mt-2 grid items-end gap-4 sm:grid-cols-[repeat(4,1fr)_auto]">
          <RenkAlani ad="zemin" etiket="Zemin" deger={zemin} />
          <RenkAlani ad="c2" etiket="Gövde (c2)" deger={c2} />
          <RenkAlani ad="c1" etiket="Vurgu (c1)" deger={c1} />
          <RenkAlani ad="c3" etiket="Çizgi (c3)" deger={c3} />
          {/* Önizleme sayfa yüklendiğindeki değerlerle çiziliyor; kaydedince
              doğrusu görünüyor. Anlık güncellemek JavaScript isterdi. */}
          <UrunGorseli
            tip="zibin"
            palet={{ zemin, c1, c2, c3 }}
            className="h-24 w-24 shrink-0"
          />
        </div>
      </div>
    </div>
  );
}

function RenkAlani({ ad, etiket, deger }: { ad: string; etiket: string; deger: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={ETIKET}>{etiket}</span>
      <input
        name={ad}
        type="color"
        defaultValue={deger}
        className="h-10 w-full cursor-pointer rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-1.5 py-1"
      />
      <span className="rakam text-xs text-metin-3">{deger}</span>
    </label>
  );
}
