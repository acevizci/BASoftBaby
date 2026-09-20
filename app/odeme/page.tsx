import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { sepetGetir } from "@/server/sepet";
import { siparisiTamamla } from "@/server/siparis-islem";
import { adresleriGetir, EN_KISA_SIFRE, girisYapan } from "@/server/uyelik";
import { odemeAcikMi } from "@/server/odeme";
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
  "sifre-kisa": `Hesap şifresi en az ${EN_KISA_SIFRE} karakter olmalı. Hesap istemiyorsan şifre alanını boş bırakabilirsin.`,
  "eposta-kayitli":
    "Bu e-posta ile bir hesap zaten var. Giriş yapıp devam edebilir ya da şifre alanını boş bırakıp üyeliksiz sipariş verebilirsin.",
  sozlesme:
    "Siparişi tamamlamak için ön bilgilendirme formunu ve mesafeli satış sözleşmesini onaylaman gerekiyor.",
  "odeme-baslatilamadi":
    "Ödeme sayfası açılamadı ve siparişin oluşturulmadı; kartından bir tahsilat yapılmadı. Tekrar deneyebilir ya da havale/EFT ile ödeyebilirsin.",
};

export default async function OdemeSayfasi({ searchParams }: PageProps<"/odeme">) {
  const { hata, adres: adresSecimi } = await searchParams;
  const [sepet, musteri] = await Promise.all([sepetGetir(), girisYapan()]);
  // Anahtarlar tanımlı değilse kart seçeneği hiç gösterilmiyor; havale tek
  // başına çalışmaya devam ediyor.
  const kartAcik = odemeAcikMi();

  if (sepet.satirlar.length === 0) redirect("/sepet");

  const hataMetni = typeof hata === "string" ? HATALAR[hata] : undefined;

  // Giriş yapan müşterinin adres defteri: seçilen adres, yoksa varsayılanı
  // forma yazılıyor. Seçim JavaScript'siz çalışsın diye bağlantıyla yapılıyor.
  const adresler = musteri ? await adresleriGetir(musteri.id) : [];
  const secili =
    (typeof adresSecimi === "string" ? adresler.find((a) => a.id === adresSecimi) : undefined) ??
    adresler.find((a) => a.varsayilan) ??
    adresler[0];

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
          {!musteri && (
            <p className="rounded-marka border border-cizgi bg-yuzey-sicak px-4 py-3 text-sm text-metin-2">
              Hesabın var mı?{" "}
              <Link href="/giris?nereye=%2Fodeme" className="font-bold text-mavi-koyu hover:underline">
                Giriş yap
              </Link>{" "}
              — adresin forma kendiliğinden gelsin. Üye olmadan da devam edebilirsin.
            </p>
          )}

          {adresler.length > 0 && (
            <section className="rounded-marka border border-cizgi bg-yuzey p-5">
              <h2 className="text-lg">Kayıtlı adreslerim</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {adresler.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/odeme?adres=${a.id}`}
                      className={`block rounded-[10px] border-[1.5px] px-3 py-2 text-xs font-bold transition ${
                        a.id === secili?.id
                          ? "border-mercan bg-mercan-soluk text-mercan-koyu"
                          : "border-cizgi bg-yuzey text-metin-2 hover:border-mercan"
                      }`}
                    >
                      {a.baslik}
                      <span className="mt-0.5 block font-semibold text-metin-3">
                        {a.ilce} / {a.il}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-metin-3">
                Seçtiğin adres aşağıdaki forma yazılır; formda değiştirirsen sipariş değiştirdiğin
                hâliyle gider.
              </p>
            </section>
          )}

          <section className="rounded-marka border border-cizgi bg-yuzey p-5">
            <h2 className="text-lg">Teslimat adresi</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className={ETIKET}>Ad soyad</span>
                <input
                  name="adSoyad"
                  required
                  defaultValue={secili?.adSoyad ?? musteri?.adSoyad ?? ""}
                  autoComplete="name"
                  className={GIRDI}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={ETIKET}>E-posta</span>
                <input
                  name="eposta"
                  type="email"
                  required
                  defaultValue={musteri?.eposta ?? ""}
                  readOnly={Boolean(musteri)}
                  autoComplete="email"
                  placeholder="ornek@eposta.com"
                  className={`${GIRDI}${musteri ? " opacity-70" : ""}`}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={ETIKET}>Telefon</span>
                <input
                  name="telefon"
                  type="tel"
                  required
                  defaultValue={secili?.telefon ?? musteri?.telefon ?? ""}
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
                  defaultValue={secili?.adres ?? ""}
                  autoComplete="street-address"
                  placeholder="Mahalle, sokak, bina ve daire no"
                  className={GIRDI}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={ETIKET}>İlçe</span>
                <input
                  name="ilce"
                  required
                  defaultValue={secili?.ilce ?? ""}
                  autoComplete="address-level2"
                  className={GIRDI}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={ETIKET}>İl</span>
                <input
                  name="il"
                  required
                  defaultValue={secili?.il ?? ""}
                  autoComplete="address-level1"
                  className={GIRDI}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={ETIKET}>Posta kodu</span>
                <input
                  name="postaKodu"
                  defaultValue={secili?.postaKodu ?? ""}
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

            {kartAcik && (
              <label className="mt-3 flex items-start gap-3 rounded-[10px] border-[1.5px] border-mercan bg-mercan-soluk p-4">
                <input
                  type="radio"
                  name="odemeYontemi"
                  value="kart"
                  defaultChecked
                  className="mt-1 h-4 w-4 accent-[var(--mercan)]"
                />
                <span>
                  <span className="block font-bold">Kredi / banka kartı</span>
                  <span className="mt-1 block text-sm text-metin-2">
                    Siparişi verdikten sonra iyzico&apos;nun güvenli ödeme ekranına
                    gidiyorsun; kartını orada giriyor, bankanın 3D Secure doğrulamasını
                    orada geçiyorsun. Taksit seçenekleri kartına göre o ekranda çıkıyor.
                    Kart bilgilerin bize hiç ulaşmıyor.
                  </span>
                </span>
              </label>
            )}

            <label
              className={`mt-3 flex items-start gap-3 rounded-[10px] border-[1.5px] p-4 ${
                kartAcik ? "border-cizgi" : "border-mercan bg-mercan-soluk"
              }`}
            >
              <input
                type="radio"
                name="odemeYontemi"
                value="havale"
                defaultChecked={!kartAcik}
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

            {!kartAcik && (
              <p className="mt-3 text-xs text-metin-3">
                Kredi kartıyla ödeme çok yakında eklenecek.
              </p>
            )}
          </section>

          <section className="rounded-marka border border-cizgi bg-yuzey p-5">
            <h2 className="text-lg">Hesap</h2>
            {musteri ? (
              <label className="mt-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  name="adresiKaydet"
                  defaultChecked={adresler.length === 0}
                  className="mt-1 h-4 w-4 accent-[var(--mercan)]"
                />
                <span className="text-sm text-metin-2">
                  Bu adresi adres defterime kaydet
                  <input
                    name="adresBasligi"
                    maxLength={40}
                    placeholder="Adres başlığı: Ev, İş…"
                    className={`${GIRDI} mt-2 block w-full sm:w-64`}
                  />
                </span>
              </label>
            ) : (
              <>
                <p className="mt-2 text-sm text-metin-2">
                  İstersen bu siparişle birlikte hesabın açılsın: siparişlerini tek yerden takip
                  eder, adresini bir daha yazmazsın.
                </p>
                <label className="mt-3 flex flex-col gap-1.5 sm:max-w-xs">
                  <span className={ETIKET}>Şifre belirle</span>
                  <input
                    name="yeniSifre"
                    type="password"
                    minLength={EN_KISA_SIFRE}
                    autoComplete="new-password"
                    placeholder="isteğe bağlı"
                    className={GIRDI}
                  />
                  <span className="text-xs text-metin-3">
                    En az {EN_KISA_SIFRE} karakter. Boş bırakırsan üyeliksiz devam edersin.
                  </span>
                </label>
              </>
            )}
          </section>

          <section className="rounded-marka border border-cizgi bg-yuzey p-5">
            <h2 className="text-lg">Sözleşmeler</h2>
            <label className="mt-3 flex items-start gap-3">
              <input
                type="checkbox"
                name="sozlesme"
                required
                className="mt-1 h-4 w-4 accent-[var(--mercan)]"
              />
              <span className="text-sm text-metin-2">
                <Link
                  href="/yasal/on-bilgilendirme-formu"
                  target="_blank"
                  className="font-bold text-mavi-koyu hover:underline"
                >
                  Ön bilgilendirme formunu
                </Link>{" "}
                ve{" "}
                <Link
                  href="/yasal/mesafeli-satis-sozlesmesi"
                  target="_blank"
                  className="font-bold text-mavi-koyu hover:underline"
                >
                  mesafeli satış sözleşmesini
                </Link>{" "}
                okudum, onaylıyorum.
              </span>
            </label>
            <p className="mt-3 text-xs text-metin-3">
              Kişisel verilerinin nasıl işlendiğini{" "}
              <Link href="/yasal/gizlilik-kvkk" className="font-bold text-mavi-koyu hover:underline">
                Gizlilik ve KVKK
              </Link>{" "}
              sayfasında bulabilirsin.
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
            {sepet.kampanya && (
              <div className="flex justify-between">
                <dt className="text-nane-koyu">
                  İndirim
                  <span className="block text-xs text-metin-3">{sepet.kampanya.ad}</span>
                </dt>
                <dd className="rakam font-semibold text-nane-koyu">
                  -{fiyatYaz(sepet.indirimKurus)}
                </dd>
              </div>
            )}
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
