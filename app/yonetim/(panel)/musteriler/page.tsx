import Link from "next/link";
import { musteriAdedi, musteriler } from "@/server/musteri";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import PanelBildirim, { ORTAK_HATALAR } from "@/ui/panel-bildirim";
import PanelArama from "@/ui/panel-arama";
import { aramaCoz } from "@/ui/panel-arama-bicim";
import Sayfalama from "@/ui/sayfalama";
import { sayfaAdresi, sayfaCoz } from "@/ui/sayfalama-bicim";

export const dynamic = "force-dynamic";

/** Satırda e-posta, ad, harcama ve tarih var; sayfaya bu kadarı sığıyor. */
const LISTE_BOYU = 20;

const BILDIRIMLER: Record<string, string> = {
  silindi: "Hesap silindi. Siparişler yasal saklama süresince duruyor, hesapla bağları koptu.",
};

const HATALAR: Record<string, string> = {
  ...ORTAK_HATALAR,
  onay: "Silmeyi onaylamak için kutuya SİL yazman gerekiyor.",
};

function tarihYaz(t: Date | null): string {
  return t ? t.toLocaleDateString("tr-TR", { dateStyle: "medium" }) : "—";
}

/**
 * Müşteriler.
 *
 * `Customer` tablosu vardı ama panelde hiçbir yerde görünmüyordu (K-70).
 * Liste **en yeni üye önce**: mağazanın merak ettiği şey genelde "kim
 * geldi". Harcama sütunu yalnızca ödenmiş siparişleri sayıyor.
 *
 * Üyeliksiz siparişler burada yok — onlar bir hesaba bağlı değil, sipariş
 * ekranından aranıyor. Ekran bunu yazıyor ki liste eksik sanılmasın.
 */
export default async function MusteriListesi({
  searchParams,
}: PageProps<"/yonetim/musteriler">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor: Next.js yalnızca
  // değişen parçayı çiziyor. Her sayfa kendisi soruyor (K-51).
  await yoneticiGerekli();

  const { sayfa, ara, kayit, hata } = await searchParams;
  const arama = aramaCoz(ara);

  const toplamAdet = await musteriAdedi(arama);
  const durum = sayfaCoz(sayfa, toplamAdet, LISTE_BOYU);
  const liste = await musteriler(durum.atla, durum.boy, arama);

  const temel = arama
    ? `/yonetim/musteriler?ara=${encodeURIComponent(arama)}`
    : "/yonetim/musteriler";
  const adres = (n: number) => sayfaAdresi(temel, n);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Müşteriler</h1>
      <p className="text-sm text-metin-2">
        Hesap açmış müşteriler. Harcama sütunu yalnızca <strong>ödemesi tamamlanmış</strong>{" "}
        siparişleri sayıyor. Üyeliksiz verilen siparişler bir hesaba bağlı olmadığı için
        burada görünmüyor; onları{" "}
        <Link href="/yonetim/siparisler" className="font-bold text-mavi-koyu hover:underline">
          siparişlerden
        </Link>{" "}
        arayabilirsin.
      </p>

      <PanelBildirim kayit={kayit} hata={hata} bildirimler={BILDIRIMLER} hatalar={HATALAR} />

      <PanelArama
        yol="/yonetim/musteriler"
        ara={arama}
        yerTutucu="Müşteri ara: e-posta, ad ya da telefon"
      />

      {toplamAdet === 0 ? (
        <p className="rounded-marka border border-cizgi bg-yuzey p-5 text-sm text-metin-2">
          {arama
            ? `"${arama}" aramasına uyan müşteri yok.`
            : "Henüz hesap açan müşteri yok. Üyeliksiz siparişler sipariş ekranında görünüyor."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-marka border border-cizgi bg-yuzey">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
              <tr>
                <th className="p-3">Müşteri</th>
                <th className="p-3">Sipariş</th>
                <th className="p-3">Harcama</th>
                <th className="p-3">Son sipariş</th>
                <th className="p-3">Üyelik</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi-soluk">
              {liste.map((m) => (
                <tr key={m.id}>
                  <td className="p-3">
                    <Link
                      href={`/yonetim/musteriler/${m.id}`}
                      className="font-semibold hover:text-mercan-koyu"
                    >
                      {m.adSoyad || "—"}
                    </Link>
                    <span className="block text-xs text-metin-3">{m.eposta}</span>
                  </td>
                  <td className="rakam p-3">{m.siparisAdedi}</td>
                  <td className="rakam p-3 font-semibold">{fiyatYaz(m.harcamaKurus)}</td>
                  <td className="rakam p-3 text-metin-2">{tarihYaz(m.sonSiparis)}</td>
                  <td className="p-3">
                    <span className="rakam block text-xs text-metin-3">
                      {tarihYaz(m.olusturuldu)}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {/* Doğrulanmamış adres önemli: o hesaba üyeliksiz
                          siparişler bağlanmıyor (K-14). */}
                      {!m.epostaDogrulandi && (
                        <span className="rounded-full bg-sari-soluk px-2 py-0.5 text-xs font-bold text-sari-koyu">
                          e-posta doğrulanmadı
                        </span>
                      )}
                      {m.pazarlamaIzni && (
                        <span className="rounded-full bg-nane-soluk px-2 py-0.5 text-xs font-bold text-nane-koyu">
                          e-posta izni var
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/yonetim/musteriler/${m.id}`}
                      className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
                    >
                      Aç
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sayfalama durum={durum} birim="müşteri" adres={adres} />
    </div>
  );
}
