import Link from "next/link";
import type { Metadata } from "next";
import { sifreyiSifirla } from "@/server/uyelik-islem";
import { EN_KISA_SIFRE } from "@/server/uyelik";
import { ANA_DUGME, ETIKET, GIRDI, HATA_KUTUSU, KART } from "../hesap-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Şifreni sıfırla", robots: { index: false } };

const HATALAR: Record<string, string> = {
  kisa: `Şifre en az ${EN_KISA_SIFRE} karakter olmalı.`,
  jeton:
    "Bağlantı geçersiz ya da süresi dolmuş. Bağlantılar 1 saat geçerli ve bir kez kullanılabiliyor; yeni bir tane isteyebilirsin.",
};

/**
 * Şifre sıfırlama formu. Jeton adres satırında gelip forma gizli alan olarak
 * konuyor; harcanması gönderimde oluyor, sayfa açılışında değil.
 */
export default async function SifreSifirla({ searchParams }: PageProps<"/sifre-sifirla">) {
  const { jeton, hata } = await searchParams;
  const jetonMetni = typeof jeton === "string" ? jeton : "";
  const hataMetni = typeof hata === "string" ? HATALAR[hata] : undefined;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl sm:text-3xl">Şifreni sıfırla</h1>

      {hataMetni && <p className={HATA_KUTUSU}>{hataMetni}</p>}

      {jetonMetni ? (
        <form action={sifreyiSifirla} className={`mt-6 flex flex-col gap-4 ${KART}`}>
          <input type="hidden" name="jeton" value={jetonMetni} />
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
          <p className="text-xs text-metin-3">
            Şifren değişince diğer cihazlardaki oturumların kapanacak.
          </p>
          <button type="submit" className={`${ANA_DUGME} self-start`}>
            Şifremi değiştir
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-metin-2">
          Bu sayfa e-postandaki bağlantıyla açılıyor.{" "}
          <Link href="/sifremi-unuttum" className="font-bold text-mavi-koyu hover:underline">
            Yeni bağlantı iste
          </Link>
        </p>
      )}
    </div>
  );
}
