import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import { epostaAcikMi } from "@/server/eposta";
import { SIFIRLAMA_SAAT, kullaniciVarMi, yoneticiGetir } from "@/server/yonetim-kimlik";
import { sifirlamaIste } from "@/server/yonetim-kimlik-islem";
import {
  ANA_DUGME,
  ETIKET,
  GIRDI,
  HATA_KUTUSU,
  IYI_KUTU,
  KART,
  SIFIRLAMA_HATALARI,
  kilitMetni,
} from "../panel-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Şifremi unuttum",
  robots: { index: false, follow: false },
};

/**
 * Panel şifresi sıfırlama isteği.
 *
 * **Adresin kayıtlı olup olmadığı söylenmiyor**: kayıtlıysa da değilse de
 * aynı ekran çıkıyor, yoksa bu form panelde kimlerin hesabı olduğunu
 * öğrenmenin yolu olurdu (K-47).
 */
export default async function SifremiUnuttum({
  searchParams,
}: PageProps<"/yonetim/sifremi-unuttum">) {
  const { hata, dk, gonderildi } = await searchParams;

  if (await yoneticiGetir()) redirect("/yonetim");
  // Hiç kullanıcı yokken sıfırlanacak bir şey de yok.
  if (!(await kullaniciVarMi())) notFound();

  const temel = typeof hata === "string" && Object.hasOwn(SIFIRLAMA_HATALARI, hata) ? SIFIRLAMA_HATALARI[hata] : undefined;
  const hataMetni = hata === "kilit" && temel ? kilitMetni(temel, dk) : temel;
  const acik = epostaAcikMi();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="self-center" aria-label="BASoftBaby ana sayfa">
        <Image
          src="/marka/basoftbaby-logo-256.webp"
          alt="BASoftBaby"
          width={120}
          height={120}
          priority
          unoptimized
        />
      </Link>

      <h1 className="mt-8 text-center text-2xl">Şifremi unuttum</h1>
      <p className="mt-2 text-center text-sm text-metin-2">
        Panel hesabının e-posta adresini yaz; sıfırlama bağlantısı gönderilsin.
      </p>

      {gonderildi === "1" && (
        <p className={`mt-5 ${IYI_KUTU}`}>
          Bu adrese ait bir panel hesabı varsa sıfırlama bağlantısı gönderildi. Bağlantı{" "}
          {SIFIRLAMA_SAAT} saat geçerli ve bir kez kullanılabiliyor.
        </p>
      )}
      {hataMetni && <p className={`mt-5 ${HATA_KUTUSU}`}>{hataMetni}</p>}

      {!acik && (
        <div className="mt-5 rounded-marka border border-sari bg-sari-soluk px-4 py-3 text-sm text-sari-koyu">
          <p className="font-bold">E-posta servisi henüz bağlı değil.</p>
          <p className="mt-1">
            Bağlantı gönderilemiyor. Panelde başka bir kullanıcı varsa ondan Kullanıcılar
            ekranından sana yeni bir şifre atamasını iste. Yoksa Vercel&apos;de{" "}
            <code className="rakam">RESEND_ANAHTARI</code> tanımlanınca bu sayfa çalışmaya
            başlıyor.
          </p>
        </div>
      )}

      <form action={sifirlamaIste} className={`mt-6 flex flex-col gap-4 ${KART}`}>
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>E-posta</span>
          <input
            name="eposta"
            type="email"
            required
            autoComplete="username"
            autoFocus
            className={GIRDI}
          />
        </label>

        <GonderDugmesi
          bekleyen="Gönderiliyor…"
          devreDisi={!acik}
          className={`${ANA_DUGME} mt-1 ${acik ? "" : "opacity-50"}`}
        >
          Sıfırlama bağlantısı gönder
        </GonderDugmesi>
      </form>

      <Link
        href="/yonetim/giris"
        className="mt-6 self-center text-sm font-bold text-mavi-koyu hover:underline"
      >
        Girişe dön
      </Link>
    </div>
  );
}
