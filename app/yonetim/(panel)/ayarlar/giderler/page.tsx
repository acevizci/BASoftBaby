import Link from "next/link";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { giderAyari } from "@/server/siparis-kari";
import { giderAyariKaydet } from "@/server/gider-islem";

export const dynamic = "force-dynamic";

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

function kurusYaz(kurus: number): string {
  return (kurus / 100).toFixed(2).replace(".", ",");
}

/**
 * Kâr hesabının giderleri (K-112). Satış ayarlarının içindeydi; menü iki
 * seviyeye geçince kendi sayfası oldu (K-116).
 */
export default async function GiderAyarlari({ searchParams }: PageProps<"/yonetim/ayarlar/giderler">) {
  await yoneticiGerekli();
  const { kayit } = await searchParams;
  const gider = await giderAyari();
  const bosYaz = (k: number | null) => (k === null ? "" : kurusYaz(k));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Giderler</h1>
      {kayit === "1" && (
        <p className="rounded-marka bg-nane-soluk px-4 py-3 text-sm font-semibold text-nane-koyu">
          Giderler kaydedildi. Siparişlerin kâr dökümü bunlarla hesaplanıyor.
        </p>
      )}
      <p className="text-sm text-metin-2">
        Kira, reklam gibi aylık sabit giderler{" "}
        <Link href="/yonetim/kar" className="font-bold text-mavi-koyu hover:underline">
          Aylık kâr
        </Link>{" "}
        ekranında giriliyor; burası siparişe bağlı giderler.
      </p>
      {/* Kâr hesabının giderleri ayrı form: satış ayarları mağazayı
          etkiliyor, bunlar yalnızca panelin hesabını (K-112). */}
      <form
        action={giderAyariKaydet}
        className="flex flex-col gap-4 rounded-marka border border-cizgi bg-yuzey p-5"
      >
        <div>
          <h2 className="text-lg">Giderler (kâr hesabı için)</h2>
          <p className="mt-1 text-xs text-metin-3">
            Yalnızca panelde, siparişin ve raporun kâr dökümünde kullanılır; müşteri görmez.
            Bilmediğin kutuyu boş bırak: o kalem hesaba girmez ve dökümde &quot;girilmedi&quot;
            yazar. Sıfır &quot;bu gider yok&quot; demek. Tutarlar KDV hariç.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <GiderKutusu ad="kargoGider" etiket="Kargo firmasına gönderi başı (₺)" deger={bosYaz(gider.kargoGiderKurus)}
            aciklama="Ortalama. Siparişte gerçek ücret girilirse o kullanılır." />
          <GiderKutusu ad="paketGider" etiket="Sipariş başı paket (₺)" deger={bosYaz(gider.paketGiderKurus)}
            aciklama="Kutu, poşet, etiket." />
          <GiderKutusu ad="hediyePaketGider" etiket="Hediye paketi ek (₺)" deger={bosYaz(gider.hediyePaketGiderKurus)}
            aciklama="Hediye paketi istenen siparişte pakete eklenir." />
          <GiderKutusu ad="iadeKargoGider" etiket="İade kargosu, paket başı (₺)" deger={bosYaz(gider.iadeKargoGiderKurus)}
            aciklama="Müşterinin geri gönderdiği paket; değişimde yeniden gönderim gönderi ücretiyle." />
          <GiderKutusu
            ad="kartKomisyon"
            etiket="Kart komisyonu (%)"
            deger={gider.kartKomisyonOnbinde === null ? "" : (gider.kartKomisyonOnbinde / 100).toString().replace(".", ",")}
            aciklama="iyzico'nun gerçek kesintisi ödeme cevabından okunur; bu yalnızca yedek."
          />
          <GiderKutusu ad="kartSabit" etiket="Kart işlem başı sabit (₺)" deger={bosYaz(gider.kartKomisyonSabitKurus)}
            aciklama="Varsa işlem başı ücret." />
        </div>
        <button
          type="submit"
          className="self-start rounded-full bg-dugme px-6 py-3 font-bold text-dugme-yazi transition hover:brightness-95"
        >
          Giderleri kaydet
        </button>
      </form>
    </div>
  );
}

function GiderKutusu({ ad, etiket, deger, aciklama }: { ad: string; etiket: string; deger: string; aciklama: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={ETIKET}>{etiket}</span>
      <input name={ad} inputMode="decimal" defaultValue={deger} placeholder="girilmedi" className={`${GIRDI} rakam`} />
      <span className="text-xs text-metin-3">{aciklama}</span>
    </label>
  );
}
