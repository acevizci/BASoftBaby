import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { girisYapan } from "@/server/uyelik";
import { hesabimiSil } from "@/server/uyelik-islem";
import { ANA_DUGME, ETIKET, GIRDI, HATALAR, HATA_KUTUSU, KART } from "../../hesap-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verilerim", robots: { index: false } };

/**
 * KVKK hakları: verilere erişme ve hesabı silme.
 *
 * Gizlilik metni ikisini de sayıyordu ama tek yolu "bize yaz"dı. Burada
 * ikisi de üyenin kendi yapabileceği bir şey.
 *
 * Silme ekranı **ne silinmeyeceğini de** yazıyor: sipariş ve fatura kayıtları
 * vergi mevzuatı gereği saklanıyor. "Her şeyi sildik" demek kolay olurdu ama
 * doğru olmazdı (K-39).
 */
export default async function VerilerimSayfasi({ searchParams }: PageProps<"/hesabim/verilerim">) {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?hata=giris&nereye=%2Fhesabim%2Fverilerim");

  const { hata } = await searchParams;
  const hataMetni = typeof hata === "string" ? HATALAR[hata] : undefined;

  return (
    <section className="mt-6 flex flex-col gap-5">
      {hataMetni && <p className={HATA_KUTUSU}>{hataMetni}</p>}

      <div className={KART}>
        <h2 className="text-lg">Verilerimi indir</h2>
        <p className="mt-2 text-sm text-metin-2">
          Hesabınla ilgili tuttuğumuz bütün kaydı tek bir dosyada indirebilirsin: hesap
          bilgilerin, adres defterin, siparişlerin ve satırları, açtığın talepler,
          yazdığın değerlendirmeler.
        </p>
        <p className="mt-2 text-xs text-metin-3">
          Şifrenin özeti ve oturum jetonları dosyaya yazılmıyor — ikisi de kimlik
          doğrulama sırrı; indirilen dosya e-postayla paylaşılabiliyor, bulutta
          durabiliyor.
        </p>
        {/* Dosya indirme: Link istemci tarafında gezinmeye çalışır. */}
        <a
          href="/hesabim/verilerim/indir"
          download
          className={`${ANA_DUGME} mt-4 inline-block`}
        >
          JSON olarak indir
        </a>
      </div>

      <div className={`${KART} border-mercan`}>
        <h2 className="text-lg text-mercan-koyu">Hesabımı sil</h2>

        <p className="mt-2 text-sm text-metin-2">Silindiğinde geri alınamaz. Silinenler:</p>
        <ul className="mt-1 text-sm text-metin-2">
          <li>· Hesabın, şifren ve açık oturumların</li>
          <li>· Adres defterin</li>
          <li>· Kampanya e-postası iznin ve bekleyen stok bildirimlerin</li>
        </ul>

        <p className="mt-3 text-sm font-bold">Silinmeyenler:</p>
        <ul className="mt-1 text-sm text-metin-2">
          <li>
            · <span className="font-semibold">Sipariş ve fatura kayıtların.</span> Vergi
            mevzuatı bunları belirli bir süre saklamayı zorunlu kılıyor; hesabın
            silinmesiyle bu kayıtlarla bağın kopuyor ama kayıtlar duruyor.
          </li>
          <li>
            · <span className="font-semibold">Yazdığın değerlendirmeler.</span> Yorumun
            kendisi başka müşteriler için bilgi, o yüzden kalıyor; adın
            &quot;Müşteri&quot;ye dönüyor.
          </li>
        </ul>

        <p className="mt-3 text-xs text-metin-3">
          Siparişlerini silmemizi istiyorsan ya da başka bir talebin varsa künyedeki
          kanallardan yazabilirsin; başvurular en geç 30 gün içinde yanıtlanıyor.
        </p>

        <form action={hesabimiSil} className="mt-5 flex flex-col gap-3">
          <label className="flex max-w-xs flex-col gap-1.5">
            <span className={ETIKET}>Şifren</span>
            <input
              name="sifre"
              type="password"
              required
              autoComplete="current-password"
              className={GIRDI}
            />
          </label>
          <label className="flex max-w-xs flex-col gap-1.5">
            <span className={ETIKET}>
              Onaylamak için kutuya <span className="font-bold">SİL</span> yaz
            </span>
            <input name="onay" required placeholder="SİL" className={GIRDI} />
          </label>
          <button
            type="submit"
            className="self-start rounded-full bg-dugme px-6 py-2.5 font-bold text-dugme-yazi transition hover:brightness-110"
          >
            Hesabımı kalıcı olarak sil
          </button>
        </form>
      </div>
    </section>
  );
}
