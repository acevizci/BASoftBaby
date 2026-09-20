import Link from "next/link";
import type { Metadata } from "next";
import { epostayiDogrula } from "@/server/uyelik-islem";
import { ANA_DUGME, HATA_KUTUSU, KART } from "../hesap-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "E-posta doğrulama", robots: { index: false } };

/**
 * E-posta doğrulama.
 *
 * Jeton sayfa açılır açılmaz harcanmıyor, düğmeye basılınca harcanıyor:
 * kurumsal e-posta tarayıcıları gelen bağlantıları kendiliğinden ziyaret
 * ediyor ve jeton müşteri görmeden harcanmış olurdu.
 */
export default async function EpostaDogrula({ searchParams }: PageProps<"/eposta-dogrula">) {
  const { jeton, hata } = await searchParams;
  const jetonMetni = typeof jeton === "string" ? jeton : "";

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl sm:text-3xl">E-posta doğrulama</h1>

      {hata === "jeton" && (
        <p className={HATA_KUTUSU}>
          Bağlantı geçersiz ya da süresi dolmuş. Hesabına girip yeni bir doğrulama
          bağlantısı isteyebilirsin.
        </p>
      )}

      {jetonMetni ? (
        <form action={epostayiDogrula} className={`mt-6 flex flex-col gap-4 ${KART}`}>
          <input type="hidden" name="jeton" value={jetonMetni} />
          <p className="text-sm text-metin-2">
            Adresini doğrulamak için aşağıdaki düğmeye bas. Doğrulandığında, üye olmadan bu
            adresle verdiğin eski siparişler de hesabına bağlanır.
          </p>
          <button type="submit" className={`${ANA_DUGME} self-start`}>
            Adresimi doğrula
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-metin-2">
          Bu sayfa e-postandaki bağlantıyla açılıyor.{" "}
          <Link href="/hesabim" className="font-bold text-mavi-koyu hover:underline">
            Hesabıma git
          </Link>
        </p>
      )}
    </div>
  );
}
