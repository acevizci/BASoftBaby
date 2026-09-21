import Link from "next/link";
import type { Metadata } from "next";
import { sifreSifirlamaIste } from "@/server/uyelik-islem";
import { ANA_DUGME, ETIKET, GIRDI, IYI_KUTU, KART } from "../hesap-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Şifremi unuttum", robots: { index: false } };

export default async function SifremiUnuttum({
  searchParams,
}: PageProps<"/sifremi-unuttum">) {
  const { gonderildi } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl sm:text-3xl">Şifremi unuttum</h1>
      <p className="mt-2 text-sm text-metin-2">
        Hesabının e-posta adresini yaz, sıfırlama bağlantısını gönderelim.
      </p>

      {gonderildi === "1" && (
        <p className={IYI_KUTU}>
          Bu adres kayıtlıysa sıfırlama bağlantısı gönderildi. Bağlantı 1 saat geçerli.
          Gelen kutunda göremezsen gereksiz (spam) klasörüne de bak.
        </p>
      )}

      <form action={sifreSifirlamaIste} className={`mt-6 flex flex-col gap-4 ${KART}`}>
        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>E-posta</span>
          <input name="eposta" type="email" required autoComplete="email" className={GIRDI} />
        </label>
        <button type="submit" className={`${ANA_DUGME} self-start`}>
          Sıfırlama bağlantısı gönder
        </button>
      </form>

      <p className="mt-5 text-sm text-metin-2">
        <Link href="/giris" className="font-bold text-mavi-koyu hover:underline">
          Giriş sayfasına dön
        </Link>
      </p>
    </div>
  );
}
