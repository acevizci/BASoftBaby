import Link from "next/link";
import Katlanir from "@/ui/katlanir";
import PanelBildirim, { ORTAK_HATALAR } from "@/ui/panel-bildirim";
import { bekleyenIadeOzeti, bekleyenIadeler } from "@/server/iade";
import { odemeAcikMi } from "@/server/odeme";
import { elleIadeAc, iadeyiIsaretle, karttanIadeEt } from "@/server/iade-islem";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { yontemAdi } from "@/ui/siparis-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import Sayfalama, { SayfaAlani } from "@/ui/sayfalama";
import { sayfaAdresi, sayfaCoz } from "@/ui/sayfalama-bicim";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";
const KUCUK_DUGME =
  "rounded-full border border-cizgi bg-yuzey px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin";
const ANA_DUGME =
  "rounded-full bg-dugme px-5 py-2.5 text-sm font-bold text-dugme-yazi transition hover:brightness-95";

/** İade kartı yüksek: tutar, sebep, hata metni ve iki düğme taşıyor. */
const LISTE_BOYU = 15;

const BILDIRIMLER: Record<string, string> = {
  tamamlandi: "İade işaretlendi. Sipariş kaydında da göründü.",
  kart: "İade iyzico'ya gönderildi ve kabul edildi.",
  acildi: "İade kaydı açıldı.",
  zaten: "Bu iade zaten tamamlanmıştı.",
};

const HATALAR: Record<string, string> = {
  ...ORTAK_HATALAR,
  saglayici:
    "iyzico iadeyi kabul etmedi. Kayıt duruyor ve sebebi aşağıda yazıyor; parayı elle gönderip işaretleyebilirsin.",
  numara: "Sipariş numarası gerekli.",
  tutar: "Geçerli bir tutar yaz.",
  "siparis-yok": "Bu numarada sipariş yok.",
  fazla: "İade tutarı siparişin toplamından büyük olamaz.",
  odenmemis: "Bu siparişin parası alınmamış; iade edilecek bir şey yok.",
};

function tarihYaz(t: Date): string {
  return t.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * İadeler — mağazanın müşteriye borçlu olduğu paranın listesi.
 *
 * Bu ekran olmadan iade borcu hiçbir yerde görünmüyordu: sipariş iptal
 * ediliyor, stok geri dönüyor, ama parayı geri göndermek kimsenin aklına
 * gelmiyordu (K-57, K-58).
 *
 * Liste **en eski önce**: bekleyen bir iade her geçen gün daha büyük bir
 * sorun. Havalede para elle gönderilip işaretleniyor; kartta iyzico'ya tek
 * düğmeyle gidiyor.
 */
export default async function IadeEkrani({ searchParams }: PageProps<"/yonetim/iadeler">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { kayit, hata, sayfa } = await searchParams;

  const ozet = await bekleyenIadeOzeti();
  const durum = sayfaCoz(sayfa, ozet.adet, LISTE_BOYU);
  const iadeler = await bekleyenIadeler(durum.atla, durum.boy);
  const adres = (n: number) => sayfaAdresi("/yonetim/iadeler", n);
  const kartAcik = odemeAcikMi();


  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">İadeler</h1>
      <p className="text-sm text-metin-2">
        Müşteriye geri gönderilmesi gereken paralar. İptal edilen ya da iade edilen her
        ödenmiş sipariş buraya düşüyor; para gönderildiğinde işaretleniyor.
      </p>

      <PanelBildirim kayit={kayit} hata={hata} bildirimler={BILDIRIMLER} hatalar={HATALAR} />

      <section className="rounded-marka border border-cizgi bg-yuzey p-5">
        <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg">
          Bekleyen iadeler
          <span className="rakam text-xs font-semibold text-metin-3">
            {ozet.adet} kayıt · {fiyatYaz(ozet.toplamKurus)}
          </span>
        </h2>

        {ozet.adet === 0 ? (
          <p className="mt-3 text-sm text-metin-2">
            Bekleyen iade yok. Müşteriye borcun görünmüyor.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk">
            {iadeler.map((i) => (
              <li key={i.id} className="flex flex-col gap-3 py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/yonetim/siparisler/${i.numara}`}
                      className="rakam font-semibold hover:text-mercan-koyu"
                    >
                      {i.numara}
                    </Link>
                    <span className="block truncate text-xs text-metin-3">
                      {i.adSoyad} · {i.aciklama || "—"}
                    </span>
                  </span>

                  <span className="rakam text-base font-bold">{fiyatYaz(i.tutarKurus)}</span>

                  <span className="rounded-full bg-yuzey-sicak px-2.5 py-1 text-xs font-bold text-metin-2">
                    {yontemAdi(i.yontem)}
                  </span>

                  <span className="rakam text-xs text-metin-3">{tarihYaz(i.olusturuldu)}</span>
                </div>

                {/* Sağlayıcı reddettiyse sebebi burada: kayıt duruyor,
                    para elle gönderilip işaretlenebiliyor (K-58). */}
                {i.durum === "basarisiz" && i.hata && (
                  <p className="rounded-marka bg-mercan-soluk px-3 py-2 text-xs text-mercan-koyu">
                    iyzico reddetti: {i.hata}
                  </p>
                )}

                <div className="flex flex-wrap items-end gap-2">
                  {i.yontem === "kart" && kartAcik && (
                    <form action={karttanIadeEt}>
                      <input type="hidden" name="id" value={i.id} />
                      <SayfaAlani sayfa={durum.sayfa} />
                      <button type="submit" className={ANA_DUGME}>
                        iyzico ile iade et
                      </button>
                    </form>
                  )}

                  <form action={iadeyiIsaretle} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={i.id} />
                    <SayfaAlani sayfa={durum.sayfa} />
                    <label className="flex flex-col gap-1.5">
                      <span className={ETIKET}>Dekont / açıklama</span>
                      <input
                        name="saglayiciRef"
                        placeholder="isteğe bağlı"
                        className={`${GIRDI} w-56`}
                      />
                    </label>
                    <button type="submit" className={KUCUK_DUGME}>
                      Parayı gönderdim, işaretle
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <Sayfalama durum={durum} birim="iade" adres={adres} />
        </div>
      </section>

      {/* Kart kapalıyken "iyzico ile iade et" düğmesi hiç çıkmıyor; sebebini
          yazmak gerekiyor, yoksa eksik görünür. */}
      {!kartAcik && iadeler.some((i) => i.yontem === "kart") && (
        <p className="rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm text-sari-koyu">
          Kartla ödeme şu an kapalı (iyzico anahtarları tanımlı değil), bu yüzden kart
          iadeleri otomatik gönderilemiyor. Parayı elle gönderip işaretleyebilirsin.
        </p>
      )}

      <Katlanir id="elle-iade" baslik="Elle iade kaydı aç" eylem acik={hata !== undefined}>
        <form action={elleIadeAc} className="flex flex-col gap-4">
          <p className="text-xs text-metin-3">
            Her iade bir talepten doğmuyor: telefonda anlaşılan bir indirim, geç kalan
            kargonun bedeli ya da kısmi bir jest de olabiliyor. Sipariş ödenmiş olmalı.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Sipariş numarası</span>
              <input name="numara" required placeholder="BA-2026-0001" className={`${GIRDI} rakam`} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Tutar (₺)</span>
              <input name="tutar" required placeholder="49,90" className={`${GIRDI} rakam`} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={ETIKET}>Açıklama</span>
              <input name="aciklama" placeholder="Kargo bedeli iadesi" className={GIRDI} />
            </label>
          </div>
          <button type="submit" className={`${ANA_DUGME} self-start`}>
            İade kaydı aç
          </button>
        </form>
      </Katlanir>
    </div>
  );
}
