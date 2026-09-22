import Link from "next/link";
import { notFound } from "next/navigation";
import { musteriKarti } from "@/server/musteri";
import { musteriHesabiniSil } from "@/server/yonetim-musteri";
import { fiyatYaz } from "@/ui/katalog-bicim";
import { durumAdi, durumRengi, odemeAdi } from "@/ui/siparis-bicim";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import PanelBildirim, { ORTAK_HATALAR } from "@/ui/panel-bildirim";
import SilmeOnayi, { SIL_DUGMESI } from "@/ui/silme-onayi";

export const dynamic = "force-dynamic";

const KART = "rounded-marka border border-cizgi bg-yuzey p-5";
const ETIKET = "text-xs font-bold text-metin-2";

const HATALAR: Record<string, string> = {
  ...ORTAK_HATALAR,
  onay: "Silmeyi onaylamak için kutuya SİL yazman gerekiyor. Hesap silinmedi.",
};

function tarihYaz(t: Date | null): string {
  return t ? t.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

/**
 * Müşteri kartı.
 *
 * Mağazanın bir müşteri hakkında sorduğu şeyler tek ekranda: ne kadar
 * harcadı, hangi siparişler, adresleri neler, e-posta izni var mı (K-70).
 *
 * **Panelden düzenleme yok, silme var.** Müşterinin adını, adresini ya da
 * e-postasını panelden değiştirmek, kişinin kendi verisini haberi olmadan
 * değiştirmek demek; üstelik siparişlerdeki kopyaları düzeltmiyor. Silme ise
 * KVKK yükümlülüğü: başvuru telefonla geldiğinde de yerine getirilmeli.
 */
export default async function MusteriKarti({
  params,
  searchParams,
}: PageProps<"/yonetim/musteriler/[id]">) {
  // Düzendeki kontrol istemci tarafı gezinmede çalışmıyor (K-51).
  await yoneticiGerekli();

  const { id } = await params;
  const { hata } = await searchParams;
  const m = await musteriKarti(id);
  if (!m) notFound();

  return (
    <div className="flex flex-col gap-5">
      <nav className="text-xs text-metin-3">
        <Link href="/yonetim/musteriler" className="hover:underline">
          Müşteriler
        </Link>
        <span> · {m.adSoyad || m.eposta}</span>
      </nav>

      <h1 className="text-2xl">{m.adSoyad || "Adı girilmemiş"}</h1>

      <PanelBildirim hata={hata} hatalar={HATALAR} />

      <section className={KART}>
        <h2 className="text-lg">Hesap</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Bilgi ad="E-posta" deger={m.eposta} />
          <Bilgi ad="Telefon" deger={m.telefon || "—"} rakam />
          <Bilgi ad="Üyelik tarihi" deger={tarihYaz(m.olusturuldu)} rakam />
          <Bilgi
            ad="E-posta doğrulaması"
            deger={m.epostaDogrulandi ? tarihYaz(m.epostaDogrulandi) : "doğrulanmadı"}
            rakam={Boolean(m.epostaDogrulandi)}
          />
          <Bilgi
            ad="Ödenmiş sipariş"
            deger={`${m.odenmisAdet} adet · ${fiyatYaz(m.harcamaKurus)}`}
            rakam
          />
          <Bilgi ad="Değerlendirme" deger={`${m.yorumAdedi} adet`} rakam />
          <Bilgi ad="Açık oturum" deger={`${m.acikOturum} cihaz`} rakam />
          <Bilgi
            ad="E-posta izni"
            deger={
              m.pazarlamaIzni
                ? `var · ${tarihYaz(m.pazarlamaIzniTarihi)}`
                : "yok"
            }
          />
        </dl>
        {!m.epostaDogrulandi && (
          <p className="mt-4 rounded-marka bg-sari-soluk px-4 py-3 text-sm text-sari-koyu">
            Bu adres doğrulanmadı. Aynı adresle <strong>üyeliksiz</strong> verilmiş eski
            siparişler bu hesaba bağlanmıyor — başkasının adresiyle hesap açan biri onun
            siparişlerini görebilirdi (K-14).
          </p>
        )}
      </section>

      <section className={KART}>
        <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg">
          Siparişler
          <span className="rakam text-xs font-semibold text-metin-3">
            {m.siparisler.length} kayıt
          </span>
        </h2>
        {m.siparisler.length === 0 ? (
          <p className="mt-2 text-sm text-metin-2">
            Bu hesapla hiç sipariş verilmemiş. Üyeliksiz verilmiş siparişleri sipariş
            ekranından e-postayla arayabilirsin.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="border-b border-cizgi text-left text-xs uppercase tracking-wide text-metin-3">
                <tr>
                  <th className="py-2">Numara</th>
                  <th className="py-2">Tarih</th>
                  <th className="py-2">Durum</th>
                  <th className="py-2">Ödeme</th>
                  <th className="py-2 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi-soluk">
                {m.siparisler.map((s) => (
                  <tr key={s.numara}>
                    <td className="py-2">
                      <Link
                        href={`/yonetim/siparisler/${s.numara}`}
                        className="rakam font-semibold hover:text-mercan-koyu"
                      >
                        {s.numara}
                      </Link>
                      <span className="rakam block text-xs text-metin-3">
                        {s.kalemAdedi} ürün
                      </span>
                    </td>
                    <td className="rakam py-2 text-metin-2">{tarihYaz(s.olusturuldu)}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${durumRengi(s.durum)}`}
                      >
                        {durumAdi(s.durum)}
                      </span>
                    </td>
                    <td className="py-2 text-metin-2">{odemeAdi(s.odemeDurumu)}</td>
                    <td className="rakam py-2 text-right font-semibold">
                      {fiyatYaz(s.toplamKurus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={KART}>
        <h2 className="flex flex-wrap items-baseline gap-x-3 text-lg">
          Adres defteri
          <span className="rakam text-xs font-semibold text-metin-3">
            {m.adresler.length} adres
          </span>
        </h2>
        {m.adresler.length === 0 ? (
          <p className="mt-2 text-sm text-metin-2">Kayıtlı adres yok.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {m.adresler.map((a) => (
              <li key={a.id} className="rounded-marka border border-cizgi-soluk p-4 text-sm">
                <p className="font-semibold">
                  {a.baslik}
                  {a.varsayilan && (
                    <span className="ml-2 rounded-full bg-nane-soluk px-2 py-0.5 text-xs font-bold text-nane-koyu">
                      varsayılan
                    </span>
                  )}
                </p>
                <p className="mt-1 text-metin-2">{a.adSoyad}</p>
                <p className="rakam text-xs text-metin-3">{a.telefon}</p>
                <p className="mt-1 text-metin-2">{a.adres}</p>
                <p className="text-metin-2">
                  {a.ilce} / {a.il} <span className="rakam">{a.postaKodu}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-metin-3">
          Adresler panelden değiştirilmiyor: siparişler adresin kopyasını taşıyor, buradaki
          kayıt yalnızca müşterinin kendi defteri.
        </p>
      </section>

      <section className={KART}>
        <h2 className="text-lg">Kişisel veriler (KVKK)</h2>
        <p className="mt-2 text-sm text-metin-2">
          Müşteri &quot;hakkımdaki verileri gönderin&quot; dediğinde kullanılıyor. Dosya
          üyenin kendi hesabından indirdiğiyle birebir aynı (K-39): şifre özeti ve oturum
          jetonları ikisinde de dışarıda — kimlik doğrulama sırrı, kişinin kendi verisi
          olsa bile dosyaya yazılması riski artırır.
        </p>
        <a
          href={`/yonetim/musteriler/${m.id}/veri`}
          className="mt-3 inline-block rounded-full border border-cizgi px-5 py-2 text-sm font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
        >
          Verileri JSON olarak indir
        </a>
      </section>

      <section className={`${KART} border-mercan`}>
        <h2 className="text-lg">Hesabı sil (KVKK)</h2>
        <p className="mt-2 text-sm text-metin-2">
          Müşteri &quot;verilerimi silin&quot; dediğinde kullanılıyor — üye bunu kendi
          hesabından da yapabiliyor, burası telefonla ya da e-postayla gelen başvurular
          için. <strong>Silinenler:</strong> hesap, oturumlar, e-posta jetonları, adres
          defteri ve stok bildirimi istekleri. <strong>Kalanlar:</strong> siparişler ve
          faturalar — vergi mevzuatının öngördüğü süre boyunca saklanmak zorundalar, ama
          hesapla bağları kopuyor; değerlendirmeler duruyor, adı &quot;Müşteri&quot;ye
          dönüyor.
        </p>

        <div className="mt-4">
          <SilmeOnayi etiket="Hesabı sil" uyari={
            <>
              <strong>{m.eposta}</strong> hesabı kalıcı olarak siliniyor; geri alınamıyor.
              {m.siparisler.length > 0 && (
                <>
                  {" "}
                  Bu hesapta <span className="rakam">{m.siparisler.length}</span> sipariş
                  var; kayıtları duracak ama hesapla bağları kopacak. Onaylamak için
                  kutuya <strong>SİL</strong> yaz.
                </>
              )}
            </>
          }>
            <form action={musteriHesabiniSil} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={m.id} />
              {m.siparisler.length > 0 && (
                <label className="flex flex-col gap-1">
                  <span className={ETIKET}>Onay</span>
                  <input
                    name="onay"
                    required
                    placeholder="SİL"
                    autoComplete="off"
                    className="rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2 text-sm outline-none focus:border-mercan"
                  />
                </label>
              )}
              <button type="submit" className={SIL_DUGMESI}>
                Evet, hesabı sil
              </button>
            </form>
          </SilmeOnayi>
        </div>
      </section>
    </div>
  );
}

function Bilgi({ ad, deger, rakam = false }: { ad: string; deger: string; rakam?: boolean }) {
  return (
    <div>
      <dt className={ETIKET}>{ad}</dt>
      <dd className={`mt-0.5 text-sm text-metin ${rakam ? "rakam" : ""}`}>{deger}</dd>
    </div>
  );
}
