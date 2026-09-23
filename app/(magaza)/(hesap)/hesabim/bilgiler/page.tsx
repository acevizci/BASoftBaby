import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { bilgileriKaydet, sifreDegistir } from "@/server/uyelik-islem";
import { EN_KISA_SIFRE, girisYapan } from "@/server/uyelik";
import {
  ANA_DUGME,
  BILDIRIMLER,
  ETIKET,
  GIRDI,
  HATALAR,
  HATA_KUTUSU,
  IYI_KUTU,
  KART,
} from "../../hesap-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bilgilerim", robots: { index: false } };

export default async function BilgilerSayfasi({ searchParams }: PageProps<"/hesabim/bilgiler">) {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?hata=giris&nereye=%2Fhesabim%2Fbilgiler");

  const { hata, kayit } = await searchParams;
  const hataMetni = typeof hata === "string" ? HATALAR[hata] : undefined;
  const bildirim = typeof kayit === "string" ? BILDIRIMLER[kayit] : undefined;

  return (
    <section className="mt-6">
      <h2 className="text-lg">Bilgilerim</h2>

      {hataMetni && <p className={HATA_KUTUSU}>{hataMetni}</p>}
      {bildirim && <p className={IYI_KUTU}>{bildirim}</p>}

      <form action={bilgileriKaydet} className={`mt-5 ${KART}`}>
        <h3 className="font-baslik font-bold">İletişim</h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Ad soyad</span>
            <input
              name="adSoyad"
              required
              defaultValue={musteri.adSoyad}
              autoComplete="name"
              className={GIRDI}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Telefon</span>
            <input
              name="telefon"
              type="tel"
              defaultValue={musteri.telefon}
              autoComplete="tel"
              placeholder="0555 000 00 00"
              className={`${GIRDI} rakam`}
            />
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={ETIKET}>E-posta</span>
            <input value={musteri.eposta} disabled className={`${GIRDI} opacity-60`} />
            <span className="text-xs text-metin-3">
              E-posta adresi şimdilik değiştirilemiyor: değişikliği doğrulayacak e-posta servisi
              henüz yok.
            </span>
          </label>
        </div>

        <label className="mt-4 flex items-start gap-2.5">
          <input
            type="checkbox"
            name="pazarlamaIzni"
            defaultChecked={musteri.pazarlamaIzni}
            className="mt-0.5 h-4 w-4 flex-none accent-[var(--mercan)]"
          />
          <span className="text-sm text-metin-2">
            Kampanya, sepet hatırlatma ve favori haberi e-postaları
            <span className="block text-xs text-metin-3">
              Kaldırırsan tanıtım e-postası gelmez. Sipariş onayı, kargo bildirimi ve
              şifre sıfırlama gelmeye devam eder; onlar tanıtım değil, işlemin parçası.
            </span>
          </span>
        </label>

        <button type="submit" className={`${ANA_DUGME} mt-5`}>
          Kaydet
        </button>
      </form>

      <form action={sifreDegistir} className={`mt-6 ${KART}`}>
        <h3 className="font-baslik font-bold">Şifre değiştir</h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Mevcut şifren</span>
            <input
              name="eskiSifre"
              type="password"
              required
              autoComplete="current-password"
              className={GIRDI}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Yeni şifren</span>
            <input
              name="yeniSifre"
              type="password"
              required
              minLength={EN_KISA_SIFRE}
              autoComplete="new-password"
              className={GIRDI}
            />
            <span className="text-xs text-metin-3">En az {EN_KISA_SIFRE} karakter.</span>
          </label>
        </div>

        <button type="submit" className={`${ANA_DUGME} mt-5`}>
          Şifremi değiştir
        </button>
      </form>
    </section>
  );
}
