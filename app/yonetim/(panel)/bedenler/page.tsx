import Link from "next/link";
import Katlanir from "@/ui/katlanir";
import { db } from "@/server/veritabani";
import { tumBedenler } from "@/server/bedenler";
import { YAS_GRUPLARI, yasGrubuYaz } from "@/ui/katalog-bicim";
import {
  bedenCevir,
  bedenEkle,
  bedenKaydet,
  bedenSil,
  bedenTasi,
} from "@/server/yonetim-beden";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import SilmeOnayi, { SIL_DUGMESI } from "@/ui/silme-onayi";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";
const KUCUK_DUGME =
  "rounded-full border border-cizgi bg-yuzey px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin disabled:opacity-40";
const ANA_DUGME =
  "rounded-full bg-mercan px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-95";

/** Ekran metinleri koddan; adres satırından gelen yazı basılmıyor. */
const BILDIRIMLER: Record<string, string> = {
  eklendi: "Beden eklendi. Ürün sayfalarında artık seçilebiliyor.",
  kaydedildi: "Beden kaydedildi.",
  kapatildi: "Beden kapatıldı. Mağazada görünmüyor, stoklara dokunulmadı.",
  acildi: "Beden yeniden açıldı.",
  silindi: "Beden silindi.",
  sira: "Sıra değişti. Ürün sayfasında ve stok ekranında bu sırayla görünüyor.",
};

const HATALAR: Record<string, string> = {
  ad: "Beden adı boş olamaz.",
  tekrar: "Bu adda bir beden zaten var.",
  sonbeden: "Son açık beden kapatılamıyor — mağazada satılabilir beden kalmazdı.",
  kullanimda: "Bu beden üründe kullanılıyor, silinemiyor. Bunun yerine kapatabilirsin.",
  bulunamadi: "Kayıt bulunamadı — başka biri silmiş olabilir. Liste yenilendi.",
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

  const { duzenle, kayit, hata, adet } = await searchParams;
  const bedenler = await tumBedenler();

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

  const bildirim = typeof kayit === "string" ? BILDIRIMLER[kayit] : undefined;
  const hataMetni = typeof hata === "string" ? HATALAR[hata] : undefined;
  const kullanimAdedi = typeof adet === "string" ? Number(adet) : undefined;

  const acikSayisi = bedenler.filter((b) => b.aktif).length;

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
            {bedenler.map((b, i) => {
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

                    <span className="text-xs text-metin-3">{yasGrubuYaz(b.yasKodu)}</span>

                    <span className="rakam text-xs text-metin-3">
                      {k ? `${k.varyant} varyant · ${k.stok} adet` : "kullanılmıyor"}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        b.aktif
                          ? "bg-nane-soluk text-nane-koyu"
                          : "bg-cizgi-soluk text-metin-3"
                      }`}
                    >
                      {b.aktif ? "Açık" : "Kapalı"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <form action={bedenTasi}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="yon" value="yukari" />
                      <button type="submit" className={KUCUK_DUGME} disabled={i === 0}>
                        ↑ yukarı
                      </button>
                    </form>
                    <form action={bedenTasi}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="yon" value="asagi" />
                      <button
                        type="submit"
                        className={KUCUK_DUGME}
                        disabled={i === bedenler.length - 1}
                      >
                        ↓ aşağı
                      </button>
                    </form>

                    <Link href={`/yonetim/bedenler?duzenle=${b.id}`} className={KUCUK_DUGME}>
                      Düzenle
                    </Link>

                    <form action={bedenCevir}>
                      <input type="hidden" name="id" value={b.id} />
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
                      <Alanlar
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
                        <Link href="/yonetim/bedenler" className={KUCUK_DUGME}>
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
      </section>

      <Katlanir
        id="yeni-beden"
        baslik="Yeni beden ekle"
        eylem
        acik={hata !== undefined && duzenle === undefined}
      >
        <form action={bedenEkle} className="flex flex-col gap-4">
          <Alanlar />
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
  ad = "",
  boy = "",
  kilo = "",
  yasKodu = null,
}: {
  ad?: string;
  boy?: string;
  kilo?: string;
  yasKodu?: string | null;
}) {
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
          {YAS_GRUPLARI.map((y) => (
            <option key={y.kod} value={y.kod}>
              {y.ad} · {y.aciklama}
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
