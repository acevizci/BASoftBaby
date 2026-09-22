import Link from "next/link";
import Katlanir from "@/ui/katlanir";
import { db } from "@/server/veritabani";
import { tumBedenler } from "@/server/bedenler";
import { tumYasGruplari, type YasGrubuKaydi } from "@/server/yas-gruplari";
import {
  bedenCevir,
  bedenEkle,
  bedenKaydet,
  bedenSil,
  bedenTasi,
} from "@/server/yonetim-beden";
import {
  yasGrubuCevir,
  yasGrubuEkle,
  yasGrubuKaydet,
  yasGrubuSil,
  yasGrubuTasi,
} from "@/server/yonetim-yas";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
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

/** Beden ve yaş grubu satırları tek satırlık; sayfaya çok sayıda sığıyor. */
const LISTE_BOYU = 15;

/** Ekran metinleri koddan; adres satırından gelen yazı basılmıyor. */
const BILDIRIMLER: Record<string, string> = {
  eklendi: "Beden eklendi. Ürün sayfalarında artık seçilebiliyor.",
  kaydedildi: "Beden kaydedildi.",
  kapatildi: "Beden kapatıldı. Mağazada görünmüyor, stoklara dokunulmadı.",
  acildi: "Beden yeniden açıldı.",
  silindi: "Beden silindi.",
  sira: "Sıra değişti. Ürün sayfasında ve stok ekranında bu sırayla görünüyor.",
  yaseklendi: "Yaş grubu eklendi. Bedenlere artık bu grup seçilebiliyor.",
  yaskaydedildi: "Yaş grubu kaydedildi.",
  yaskapatildi: "Yaş grubu kapatıldı. Ana sayfada ve süzgeçte görünmüyor, bedenlere dokunulmadı.",
  yasacildi: "Yaş grubu yeniden açıldı.",
  yassilindi: "Yaş grubu silindi.",
  yassira: "Yaş grubu sırası değişti. Ana sayfadaki kutular bu sırayla diziliyor.",
};

const HATALAR: Record<string, string> = {
  ad: "Beden adı boş olamaz.",
  tekrar: "Bu adda bir beden zaten var.",
  sonbeden: "Son açık beden kapatılamıyor — mağazada satılabilir beden kalmazdı.",
  kullanimda: "Bu beden üründe kullanılıyor, silinemiyor. Bunun yerine kapatabilirsin.",
  bulunamadi: "Kayıt bulunamadı — başka biri silmiş olabilir. Liste yenilendi.",
  yaskod: "Yaş grubu kodu boş olamaz. Adres satırında görünen kısım bu: 6-12 gibi.",
  yasad: "Yaş grubu adı boş olamaz.",
  yastekrar: "Bu kodda bir yaş grubu zaten var.",
  yaskullanimda:
    "Bu yaş grubu bedenlere bağlı, silinemiyor. Bunun yerine kapatabilirsin — bedenler yerinde kalır.",
};

/**
 * Beden yönetimi.
 *
 * Beden listesi kodda sabitti (K-56). Mağazayı işleten kişi "24-36 ay"
 * ekleyemiyor, ölçüleri kendi kalıplarına göre düzeltemiyordu.
 *
 * Ekranın söylediği üç şey var ve üçü de silme/kapatma kararını veriyor:
 * bedenin kaç üründe kullanıldığı, toplam stoğu ve açık mı olduğu.
 * Kullanılan beden silinemiyor; düğme yerinde duruyor ama ne olacağını
 * yazıyor.
 *
 * Kategori ekranı gibi: sıralama ok düğmeleriyle, düzenleme `?duzenle=<id>`
 * ile dolu açılan formla — JavaScript kapalı tarayıcıda da çalışıyor.
 */
export default async function BedenEkrani({
  searchParams,
}: PageProps<"/yonetim/bedenler">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { duzenle, duzenleYas, kayit, hata, adet, sayfa, yasSayfa } = await searchParams;
  const [bedenler, gruplar] = await Promise.all([tumBedenler(), tumYasGruplari()]);

  // İki liste, iki ayrı sayfa numarası: yaş gruplarında gezinirken beden
  // listesinin başına atılmak istemiyoruz (K-67).
  const bDurum = sayfaCoz(sayfa, bedenler.length, LISTE_BOYU);
  const yDurum = sayfaCoz(yasSayfa, gruplar.length, LISTE_BOYU);
  const sayfadakiBedenler = dilimle(bedenler, bDurum);
  const sayfadakiGruplar = dilimle(gruplar, yDurum);

  // Düzenlenen kayıt başka bir sayfadaysa formu açmanın anlamı yok; bağlantı
  // zaten o sayfaya gidiyor, burada yalnızca görünürlük kontrolü.
  const bAdres = (n: number) => sayfaAdresi("/yonetim/bedenler", n);
  const yAdres = (n: number) => sayfaAdresi("/yonetim/bedenler", n, "yasSayfa");

  // Beden satırındaki grup adı: `yasGrubuYaz` artık veritabanına gidiyor,
  // liste içinde beden başına bir sorgu olmasın diye tek harita kuruluyor.
  const grupAdlari = new Map(gruplar.map((g) => [g.kod, `${g.ad} · ${g.aciklama}`]));

  // Hangi beden kaç üründe ve kaç adet stokla kullanılıyor: silinebilir mi
  // sorusunun cevabı bu. Tek sorguda, beden başına ayrı sorgu olmadan.
  const kullanim = await db.productVariant.groupBy({
    by: ["beden"],
    _count: { _all: true },
    _sum: { stok: true },
  });
  const kullanimHaritasi = new Map(
    kullanim.map((k) => [k.beden, { varyant: k._count._all, stok: k._sum.stok ?? 0 }]),
  );

  const duzenlenen =
    typeof duzenle === "string" ? bedenler.find((b) => b.id === duzenle) : undefined;
  const duzenlenenGrup =
    typeof duzenleYas === "string" ? gruplar.find((g) => g.id === duzenleYas) : undefined;

  const bildirim = typeof kayit === "string" ? BILDIRIMLER[kayit] : undefined;
  const hataMetni = typeof hata === "string" ? HATALAR[hata] : undefined;
  const kullanimAdedi = typeof adet === "string" ? Number(adet) : undefined;

  const acikSayisi = bedenler.filter((b) => b.aktif).length;
  const acikGrupSayisi = gruplar.filter((g) => g.aktif).length;

  // Hangi grup kaç bedene bağlı: silinebilir mi sorusunun cevabı.
  const grupKullanimi = new Map<string, number>();
  for (const b of bedenler) {
    if (b.yasKodu) grupKullanimi.set(b.yasKodu, (grupKullanimi.get(b.yasKodu) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Bedenler</h1>
      <p className="text-sm text-metin-2">
        Mağazadaki beden listesi, sırası ve boy-kilo karşılıkları. Buradaki ölçüler
        müşterinin gördüğü{" "}
        <Link href="/beden-rehberi" className="font-bold text-mavi-koyu hover:underline">
          beden rehberinde
        </Link>
        , ürün sayfasında ve süzgeçte aynen görünüyor.
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
            <span className="rakam font-normal"> ({kullanimAdedi} varyantta geçiyor.)</span>
          )}
        </p>
      )}

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg">
          Beden listesi
          <span className="rakam text-xs font-semibold text-metin-3">
            {bedenler.length} beden · {acikSayisi} açık
          </span>
        </h2>

        {bedenler.length === 0 ? (
          <p className="mt-3 text-sm text-metin-2">
            Hiç beden yok. Aşağıdan ekleyerek başla; beden olmadan ürüne varyant
            eklenemiyor.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
            {sayfadakiBedenler.map((b, yer) => {
              // Ok düğmeleri listenin tamamına göre: sayfanın son kaydı
              // listenin sonu değil.
              const i = bDurum.atla + yer;
              const k = kullanimHaritasi.get(b.ad);
              const silinebilir = !k || k.varyant === 0;
              return (
                <li key={b.id} className="flex flex-col gap-3 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{b.ad}</span>
                      <span className="rakam block text-xs text-metin-3">
                        boy {b.boy || "—"} · kilo {b.kilo || "—"}
                      </span>
                    </span>

                    <span className="text-xs text-metin-3">
                      {(b.yasKodu && grupAdlari.get(b.yasKodu)) || "—"}
                    </span>

                    <span className="rakam text-xs text-metin-3">
                      {k ? `${k.varyant} varyant · ${k.stok} adet` : "kullanılmıyor"}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        b.aktif
                          ? "bg-nane-soluk text-nane-koyu"
                          : "bg-cizgi-soluk text-metin-2"
                      }`}
                    >
                      {b.aktif ? "Açık" : "Kapalı"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <form action={bedenTasi}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="yon" value="yukari" />
                      <SayfaAlani sayfa={bDurum.sayfa} boy={LISTE_BOYU} />
                      <button type="submit" className={KUCUK_DUGME} disabled={i === 0}>
                        ↑ yukarı
                      </button>
                    </form>
                    <form action={bedenTasi}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="yon" value="asagi" />
                      <SayfaAlani sayfa={bDurum.sayfa} boy={LISTE_BOYU} />
                      <button
                        type="submit"
                        className={KUCUK_DUGME}
                        disabled={i === bedenler.length - 1}
                      >
                        ↓ aşağı
                      </button>
                    </form>

                    <Link
                      href={sayfaAdresi(`/yonetim/bedenler?duzenle=${b.id}`, bDurum.sayfa)}
                      className={KUCUK_DUGME}
                    >
                      Düzenle
                    </Link>

                    <form action={bedenCevir}>
                      <input type="hidden" name="id" value={b.id} />
                      <SayfaAlani sayfa={bDurum.sayfa} />
                      <button type="submit" className={KUCUK_DUGME}>
                        {b.aktif ? "Kapat" : "Aç"}
                      </button>
                    </form>

                    {/* Kullanılan beden silinemiyor. Düğmeyi hiç göstermemek
                        yerine sebebini yazıyor: yoksa "silme nerede" diye
                        aranırdı (K-52, K-56). */}
                    {silinebilir ? (
                      <SilmeOnayi
                        uyari={
                          <>
                            Beden kalıcı olarak siliniyor; geri alınamıyor. Hiçbir üründe
                            kullanılmadığı için stok kaybı olmuyor. Yalnızca mağazadan
                            kaldırmak istiyorsan &quot;Kapat&quot; yeter.
                          </>
                        }
                      >
                        <form action={bedenSil}>
                          <input type="hidden" name="id" value={b.id} />
                          <SayfaAlani sayfa={bDurum.sayfa} />
                          <button type="submit" className={SIL_DUGMESI}>
                            Evet, sil
                          </button>
                        </form>
                      </SilmeOnayi>
                    ) : (
                      <span className="text-xs text-metin-3">
                        Üründe kullanılıyor — silmek yerine kapat.
                      </span>
                    )}
                  </div>

                  {duzenlenen?.id === b.id && (
                    <form
                      action={bedenKaydet}
                      className="rounded-marka border border-cizgi-soluk bg-yuzey-sicak p-4"
                    >
                      <input type="hidden" name="id" value={b.id} />
                      <SayfaAlani sayfa={bDurum.sayfa} />
                      <Alanlar
                        gruplar={gruplar}
                        ad={b.ad}
                        boy={b.boy}
                        kilo={b.kilo}
                        yasKodu={b.yasKodu}
                      />
                      <p className="mt-3 text-xs text-metin-3">
                        Adı değiştirirsen bu bedendeki ürünler de yeni ada geçer; satılmış
                        siparişlerin kaydı olduğu gibi kalır.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button type="submit" className={ANA_DUGME}>
                          Kaydet
                        </button>
                        <Link href={bAdres(bDurum.sayfa)} className={KUCUK_DUGME}>
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
          <Sayfalama durum={bDurum} birim="beden" adres={bAdres} />
        </div>
      </section>

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg">
          Yaş grupları
          <span className="rakam text-xs font-semibold text-metin-3">
            {gruplar.length} grup · {acikGrupSayisi} açık
          </span>
        </h2>
        <p className="mt-1 text-sm text-metin-2">
          Ana sayfadaki &quot;Yaşa göre&quot; kutuları ve süzgeçteki yaş etiketleri.
          Bir gruba birden çok beden girebiliyor; hangi bedenin hangi gruba girdiğini
          yukarıdaki beden listesinden seçiyorsun.
        </p>

        {gruplar.length === 0 ? (
          <p className="mt-3 text-sm text-metin-2">
            Hiç yaş grubu yok. Ana sayfadaki &quot;Yaşa göre&quot; bölümü ve süzgeçteki
            yaş başlığı şu an görünmüyor; aşağıdan ekleyince geri geliyor.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
            {sayfadakiGruplar.map((g, yer) => {
              const i = yDurum.atla + yer;
              const bagliBeden = grupKullanimi.get(g.kod) ?? 0;
              return (
                <li key={g.id} className="flex flex-col gap-3 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">
                        {g.ad} · {g.aciklama}
                      </span>
                      {/* Kod adresin parçası: /urunler?yas=6-12. Ekranda
                          görünmesi gerekiyor, değiştirmenin bağlantıyı da
                          değiştirdiği buradan anlaşılsın. */}
                      <span className="rakam block text-xs text-metin-3">
                        adres kodu: {g.kod}
                      </span>
                    </span>

                    <span className="rakam text-xs text-metin-3">
                      {bagliBeden > 0 ? `${bagliBeden} beden bağlı` : "bedene bağlı değil"}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        g.aktif
                          ? "bg-nane-soluk text-nane-koyu"
                          : "bg-cizgi-soluk text-metin-2"
                      }`}
                    >
                      {g.aktif ? "Açık" : "Kapalı"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <form action={yasGrubuTasi}>
                      <input type="hidden" name="id" value={g.id} />
                      <input type="hidden" name="yon" value="yukari" />
                      <SayfaAlani sayfa={yDurum.sayfa} boy={LISTE_BOYU} ad="yasSayfa" />
                      <button type="submit" className={KUCUK_DUGME} disabled={i === 0}>
                        ↑ yukarı
                      </button>
                    </form>
                    <form action={yasGrubuTasi}>
                      <input type="hidden" name="id" value={g.id} />
                      <input type="hidden" name="yon" value="asagi" />
                      <SayfaAlani sayfa={yDurum.sayfa} boy={LISTE_BOYU} ad="yasSayfa" />
                      <button
                        type="submit"
                        className={KUCUK_DUGME}
                        disabled={i === gruplar.length - 1}
                      >
                        ↓ aşağı
                      </button>
                    </form>

                    <Link
                      href={sayfaAdresi(
                        `/yonetim/bedenler?duzenleYas=${g.id}`,
                        yDurum.sayfa,
                        "yasSayfa",
                      )}
                      className={KUCUK_DUGME}
                    >
                      Düzenle
                    </Link>

                    <form action={yasGrubuCevir}>
                      <input type="hidden" name="id" value={g.id} />
                      <SayfaAlani sayfa={yDurum.sayfa} ad="yasSayfa" />
                      <button type="submit" className={KUCUK_DUGME}>
                        {g.aktif ? "Kapat" : "Aç"}
                      </button>
                    </form>

                    {bagliBeden === 0 ? (
                      <SilmeOnayi
                        uyari={
                          <>
                            Yaş grubu kalıcı olarak siliniyor; geri alınamıyor. Hiçbir
                            bedene bağlı olmadığı için beden kaybı olmuyor, ama bu gruba
                            giden <span className="rakam">?yas={g.kod}</span> bağlantısı
                            artık sonuç getirmez. Yalnızca vitrinden kaldırmak istiyorsan
                            &quot;Kapat&quot; yeter.
                          </>
                        }
                      >
                        <form action={yasGrubuSil}>
                          <input type="hidden" name="id" value={g.id} />
                          <SayfaAlani sayfa={yDurum.sayfa} ad="yasSayfa" />
                          <button type="submit" className={SIL_DUGMESI}>
                            Evet, sil
                          </button>
                        </form>
                      </SilmeOnayi>
                    ) : (
                      <span className="text-xs text-metin-3">
                        Bedenlere bağlı — silmek yerine kapat.
                      </span>
                    )}
                  </div>

                  {duzenlenenGrup?.id === g.id && (
                    <form
                      action={yasGrubuKaydet}
                      className="rounded-marka border border-cizgi-soluk bg-yuzey-sicak p-4"
                    >
                      <input type="hidden" name="id" value={g.id} />
                      <SayfaAlani sayfa={yDurum.sayfa} ad="yasSayfa" />
                      <YasAlanlari kod={g.kod} ad={g.ad} aciklama={g.aciklama} />
                      <p className="mt-3 text-xs text-metin-3">
                        Kodu değiştirirsen bu gruba bağlı bedenler de yeni koda geçer;
                        ama eski <span className="rakam">?yas={g.kod}</span> bağlantısı
                        artık sonuç getirmez.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button type="submit" className={ANA_DUGME}>
                          Kaydet
                        </button>
                        <Link href={yAdres(yDurum.sayfa)} className={KUCUK_DUGME}>
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
          <Sayfalama durum={yDurum} birim="yaş grubu" adres={yAdres} />
        </div>
      </section>

      <Katlanir
        id="yeni-yas-grubu"
        baslik="Yeni yaş grubu ekle"
        eylem
        acik={duzenleYas === undefined && typeof hata === "string" && hata.startsWith("yas")}
      >
        <form action={yasGrubuEkle} className="flex flex-col gap-4">
          <YasAlanlari />
          <button type="submit" className={`${ANA_DUGME} self-start`}>
            Yaş grubunu ekle
          </button>
        </form>
      </Katlanir>

      <Katlanir
        id="yeni-beden"
        baslik="Yeni beden ekle"
        eylem
        acik={
          duzenle === undefined &&
          typeof hata === "string" &&
          !hata.startsWith("yas")
        }
      >
        <form action={bedenEkle} className="flex flex-col gap-4">
          <Alanlar gruplar={gruplar} />
          <button type="submit" className={`${ANA_DUGME} self-start`}>
            Bedeni ekle
          </button>
        </form>
      </Katlanir>

      <p className="text-xs text-metin-3">
        Sıra listedeki sıradır: ürün sayfasında, stok ekranında ve süzgeçte bedenler
        burada dizdiğin gibi görünüyor. Yaş grubu ana sayfadaki kutular ve süzgeçteki
        yaş etiketleri için; boş bırakılan beden yaş süzgecinde çıkmaz ama her yerde
        normal çalışır.
      </p>
    </div>
  );
}

/** Ekleme ve düzenleme formu aynı alanları kullanıyor. */
function Alanlar({
  gruplar,
  ad = "",
  boy = "",
  kilo = "",
  yasKodu = null,
}: {
  gruplar: YasGrubuKaydi[];
  ad?: string;
  boy?: string;
  kilo?: string;
  yasKodu?: string | null;
}) {
  // Kapalı gruplar listede yok ama bedene bağlıysa seçenek olarak duruyor:
  // yoksa bedeni kaydetmek sessizce grubunu düşürürdü.
  const secenekler = gruplar.filter((g) => g.aktif || g.kod === yasKodu);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className={ETIKET}>Beden adı</span>
        <input name="ad" defaultValue={ad} required placeholder="24-36 ay" className={GIRDI} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={ETIKET}>Yaş grubu</span>
        <select name="yasKodu" defaultValue={yasKodu ?? ""} className={GIRDI}>
          <option value="">— hiçbiri —</option>
          {secenekler.map((y) => (
            <option key={y.kod} value={y.kod}>
              {y.ad} · {y.aciklama}
              {y.aktif ? "" : " (kapalı)"}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={ETIKET}>Boy</span>
        <input name="boy" defaultValue={boy} placeholder="92 - 98 cm" className={GIRDI} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={ETIKET}>Kilo</span>
        <input name="kilo" defaultValue={kilo} placeholder="12,5 - 14 kg" className={GIRDI} />
      </label>
    </div>
  );
}

/**
 * Yaş grubu formu; ekleme ve düzenlemede aynı.
 *
 * Kod alanı serbest metin ama sunucu onu adres güvenli hâle getiriyor
 * ("6-12 Ay" → "6-12-ay"). Bunu yazıyoruz: kullanıcı kaydettikten sonra
 * kodun değişmiş olmasına şaşırmasın.
 */
function YasAlanlari({
  kod = "",
  ad = "",
  aciklama = "",
}: {
  kod?: string;
  ad?: string;
  aciklama?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="flex flex-col gap-1.5">
        <span className={ETIKET}>Grup adı</span>
        <input name="ad" defaultValue={ad} required placeholder="Yürüyen" className={GIRDI} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={ETIKET}>Yaş aralığı</span>
        <input
          name="aciklama"
          defaultValue={aciklama}
          placeholder="2-4 yaş"
          className={GIRDI}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={ETIKET}>Adres kodu</span>
        <input name="kod" defaultValue={kod} required placeholder="24-48" className={GIRDI} />
        <span className="text-xs text-metin-3">
          Bağlantıda görünür: /urunler?yas=<span className="rakam">24-48</span>. Türkçe
          harf ve boşluk kullanırsan sade hâline çevrilir.
        </span>
      </label>
    </div>
  );
}
