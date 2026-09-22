import Link from "next/link";
import { type SayfaDurumu } from "@/ui/sayfalama-bicim";

const DUGME = "rounded-full border px-3 py-1.5 text-xs font-bold transition";

/**
 * Liste altındaki sayfa çubuğu.
 *
 * Tek sayfalık listede hiç çizilmiyor: "Sayfa 1/1" hiçbir şey söylemiyor,
 * yalnızca yer kaplıyordu.
 *
 * Numaralı düğmeler yok, ileri-geri var. Panelde listeler sıralı ve
 * aranabilir; "yedinci sayfa" diye bir hedef yok, "devamı" var. Toplam kayıt
 * ve kaçıncı sayfada olunduğu yazıyla söyleniyor.
 */
export default function Sayfalama({
  durum,
  birim,
  adres,
}: {
  durum: SayfaDurumu;
  /** "ürün", "beden", "sipariş" — sayının yanında görünen sözcük */
  birim: string;
  adres: (sayfa: number) => string;
}) {
  if (durum.sonSayfa <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-metin-3">
        Sayfa <span className="rakam font-bold">{durum.sayfa}</span> /{" "}
        <span className="rakam">{durum.sonSayfa}</span> ·{" "}
        <span className="rakam">{durum.toplam}</span> {birim}, sayfada{" "}
        <span className="rakam">{durum.boy}</span>
      </p>
      <div className="flex gap-2">
        <Adim
          yazi="← Önceki"
          adres={adres(durum.sayfa - 1)}
          acik={durum.sayfa > 1}
          etiket="Önceki sayfa"
        />
        <Adim
          yazi="Sonraki →"
          adres={adres(durum.sayfa + 1)}
          acik={durum.sayfa < durum.sonSayfa}
          etiket="Sonraki sayfa"
        />
      </div>
    </div>
  );
}

/**
 * Sınırdaki düğme bağlantı değil, soluk bir yazı.
 *
 * Tıklanabilir ama hiçbir şey yapmayan bir bağlantı bırakmak yerine
 * öğe tamamen bağlantı olmaktan çıkıyor: ekran okuyucu da onu "bağlantı"
 * diye okumuyor.
 */
function Adim({
  yazi,
  adres,
  acik,
  etiket,
}: {
  yazi: string;
  adres: string;
  acik: boolean;
  etiket: string;
}) {
  if (!acik) {
    return (
      <span aria-hidden="true" className={`${DUGME} border-cizgi text-metin-3 opacity-40`}>
        {yazi}
      </span>
    );
  }
  return (
    <Link
      href={adres}
      aria-label={etiket}
      className={`${DUGME} border-cizgi text-metin-2 hover:border-mercan hover:text-metin`}
    >
      {yazi}
    </Link>
  );
}

/**
 * Formun içine listedeki yerini gizli alan olarak koyar: sayfa ve arama.
 *
 * Sıra değiştirme, kapatma ve silme birer form gönderimi; sunucu işi bitince
 * nereye döneceğini böyle biliyor. Aradığın listede bir kaydı kapatınca tam
 * listenin ilk sayfasına atılmak, hem sayfayı hem aramayı yeniden yazmak
 * demekti (K-67, K-69).
 *
 * Boş değerler hiç yazılmıyor — adres sade kalsın.
 */
export function SayfaAlani({
  sayfa,
  boy,
  ara,
  ad = "sayfa",
}: {
  sayfa: number;
  /** Sıra değiştiren formlarda: kaydın yeni sayfası buradan hesaplanıyor. */
  boy?: number;
  /** Açık arama metni; varsa dönüş adresinde korunuyor. */
  ara?: string;
  ad?: string;
}) {
  return (
    <>
      {sayfa > 1 && <input type="hidden" name={ad} value={String(sayfa)} />}
      {boy !== undefined && <input type="hidden" name="boy" value={String(boy)} />}
      {ara ? <input type="hidden" name="ara" value={ara} /> : null}
    </>
  );
}
