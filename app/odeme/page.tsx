import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { sepetGetir } from "@/server/sepet";
import { siparisiTamamla } from "@/server/siparis-islem";
import { fiyatYaz } from "@/ui/katalog-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sipariş bilgileri", robots: { index: false } };

const GIRDI =
  "rounded-[10px] border-[1.5px] border-cizgi bg-yuzey px-3 py-2.5 text-sm text-metin outline-none focus:border-mercan";
const ETIKET = "text-xs font-bold text-metin-2";

/** Hata metni koddan üretilir; adres satırından gelen yazı ekrana basılmaz. */
const HATALAR: Record<string, string> = {
  eksik: "Formda eksik ya da hatalı alan var. Ad soyad, e-posta, telefon ve adresi kontrol et.",
  bos: "Sepetin boş göründüğü için sipariş oluşturulamadı.",
  stok: "Sepetindeki ürünlerden biri sen formu doldururken tükendi. Sepetini kontrol edip tekrar dene.",
};

export default async function OdemeSayfasi({ searchParams }: PageProps<"/odeme">) {
  const { hata } = await searchParams;
  const sepet = await sepetGetir();

  if (sepet.satirlar.length === 0) redirect("/sepet");

  const hataMetni = typeof hata === "string" ? HATALAR[hata] : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="text-xs text-metin-3">
        <Link href="/sepet" className="hover:underline">
          Sepetim
        </Link>
        <span> · Sipariş bilgileri</span>
      </nav>

      <h1 className="mt-2 text-2xl sm:text-3xl">Sipariş bilgileri</h1>

      {hataMetni && (
        <p className="mt-4 rounded-marka bg-mercan-soluk px-4 py-3 text-sm font-semibold text-mercan-koyu">
          {hataMetni}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <form action={siparisiTamamla} className="flex flex-col gap-5">
          <section className="rounded-marka border border-cizgi bg-yuzey p-5">
            <h2 className="text-lg">Teslimat adresi</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={ETIKET}>Ad soyad</span>
                <input name="adSoyad" required autoComplete="name" className={GIRDI} />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={ETIKET}>E-posta</span>
                <input
                  name="eposta"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="ornek@eposta.com"
                  className={GIRDI}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={ETIKET}>Telefon</span>
                <input
                  name="telefon"
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder="0555 000 00 00"
                  className={`${GIRDI} rakam`}
                />
              </label>

              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={ETIKET}>Adres</span>
                <textarea
                  name="adres"
                  required
                  rows={3}
                  autoComplete="street-address"
                  placeholder="Mahalle, sokak, bina ve daire no"
                  className={GIRDI}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={ETIKET}>İlçe</span>
                <input name="ilce" required autoComplete="address-level2" className={GIRDI} />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={ETIKET}>İl</span>
                <input name="il" required autoComplete="address-level1" className={GIRDI} />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={ETIKET}>Posta kodu</span>
                <input
                  name="postaKodu"
                  autoComplete="postal-code"
                  placeholder="isteğe bağlı"
                  className={`${GIRDI} rakam`}
                />
              </label>

              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={ETIKET}>Sipariş notu</span>
                <input
                  name="not"
                  maxLength={500}
                  placeholder="Hediye paketi olsun, zile basmayın gibi"
                  className={GIRDI}
                />
              </label>
            </div>
          </section>

          <section className="rounded-marka border border-cizgi bg-yuzey p-5">
            <h2 className="text-lg">Ödeme</h2>
            <label className="mt-3 flex items-start gap-3 rounded-[10px] border-[1.5px] border-mercan bg-mercan-soluk p-4">
              <input
                type="radio"
                name="odemeYontemi"
                value="havale"
                defaultChecked
                className="mt-1 h-4 w-4 accent-[var(--mercan)]"
              />
              <span>
                <span className="block font-bold">Havale / EFT</span>
                <span className="mt-1 block text-sm text-metin-2">
                  Siparişi verdikten sonra banka bilgileri ekranda çıkar. Ödemen bize ulaşınca
                  siparişin hazırlanmaya başlar.
                </span>
              </span>
            </label>
            <p className="mt-3 text-xs text-metin-3">
              Kredi kartıyla ödeme çok yakında eklenecek.
            </p>
          </section>

          <button
            type="submit"
            className="self-start rounded-full bg-mercan px-8 py-3.5 font-bold text-white transition hover:brightness-95"
          >
            Siparişi ver
          </button>
        </form>

        <aside className="h-fit rounded-marka border border-cizgi bg-yuzey p-5 lg:sticky lg:top-4">
          <h2 className="text-lg">Sipariş özeti</h2>

          <ul className="mt-3 flex flex-col divide-y divide-cizgi-soluk text-sm">
            {sepet.satirlar.map((s) => (
              <li key={s.variantId} className="flex justify-between gap-3 py-2">
                <span className="min-w-0">
                  {s.ad}
                  <span className="block text-xs text-metin-3">
                    {s.beden} · {s.renkAdi} · {s.adet} adet
                  </span>
                </span>
                <span className="rakam flex-none font-semibold">{fiyatYaz(s.araToplamKurus)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-3 flex flex-col gap-2 border-t border-cizgi pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-metin-2">Ara toplam</dt>
              <dd className="rakam font-semibold">{fiyatYaz(sepet.araToplamKurus)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-metin-2">Kargo</dt>
              <dd className="rakam font-semibold">
                {sepet.kargoKurus === 0 ? (
                  <span className="text-nane-koyu">Bedava</span>
                ) : (
                  fiyatYaz(sepet.kargoKurus)
                )}
              </dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-cizgi pt-3">
              <dt className="font-baslik font-bold">Toplam</dt>
              <dd className="rakam font-baslik text-lg font-bold text-mercan-koyu">
                {fiyatYaz(sepet.toplamKurus)}
              </dd>
            </div>
          </dl>

          <Link
            href="/sepet"
            className="mt-4 block text-center text-sm font-bold text-mavi-koyu hover:underline"
          >
            Sepeti düzenle
          </Link>
        </aside>
      </div>
    </div>
  );
}
