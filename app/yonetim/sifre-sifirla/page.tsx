import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import { EN_KISA_SIFRE } from "@/server/uyelik";
import { yoneticiGetir } from "@/server/yonetim-kimlik";
import { sifreyiSifirla } from "@/server/yonetim-kimlik-islem";
import {
  ANA_DUGME,
  ETIKET,
  GIRDI,
  HATA_KUTUSU,
  KART,
  SIFIRLAMA_HATALARI,
} from "../panel-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Yeni şifre",
  robots: { index: false, follow: false },
};

/**
 * Sıfırlama bağlantısından gelinen ekran.
 *
 * Jeton burada **harcanmıyor**: sayfa açılınca değil, form gönderilince
 * harcanıyor. Yoksa e-posta istemcisinin bağlantıyı önizlemek için açması
 * bile jetonu tüketirdi (K-47).
 */
export default async function PanelSifreSifirla({
  searchParams,
}: PageProps<"/yonetim/sifre-sifirla">) {
  const { jeton, hata } = await searchParams;

  if (await yoneticiGetir()) redirect("/yonetim");

  const jetonMetni = typeof jeton === "string" ? jeton : "";
  const hataMetni = typeof hata === "string" ? SIFIRLAMA_HATALARI[hata] : undefined;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="self-center" aria-label="BASoftBaby ana sayfa">
        <Image
          src="/marka/basoftbaby-logo-yatay.svg"
          alt="BASoftBaby"
          width={186}
          height={42}
          priority
          unoptimized
        />
      </Link>

      <h1 className="mt-8 text-center text-2xl">Yeni şifre</h1>

      {hataMetni && <p className={`mt-5 ${HATA_KUTUSU}`}>{hataMetni}</p>}

      {jetonMetni === "" ? (
        <p className="mt-5 text-center text-sm text-metin-2">
          Bağlantı eksik ya da bozuk.{" "}
          <Link href="/yonetim/sifremi-unuttum" className="font-bold text-mavi-koyu hover:underline">
            Yeni bağlantı iste
          </Link>
          .
        </p>
      ) : (
        <form action={sifreyiSifirla} className={`mt-6 flex flex-col gap-4 ${KART}`}>
          <input type="hidden" name="jeton" value={jetonMetni} />

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Yeni şifre</span>
            <input
              name="sifre"
              type="password"
              required
              minLength={EN_KISA_SIFRE}
              autoComplete="new-password"
              autoFocus
              className={GIRDI}
            />
            <span className="text-xs text-metin-3">En az {EN_KISA_SIFRE} karakter.</span>
          </label>

          <GonderDugmesi bekleyen="Kaydediliyor…" className={`${ANA_DUGME} mt-1`}>
            Şifreyi değiştir
          </GonderDugmesi>

          <p className="text-xs text-metin-3">
            Şifre değişince bütün cihazlardaki panel oturumların kapanıyor.
          </p>
        </form>
      )}

      <Link
        href="/yonetim/giris"
        className="mt-6 self-center text-sm font-bold text-mavi-koyu hover:underline"
      >
        Girişe dön
      </Link>
    </div>
  );
}
