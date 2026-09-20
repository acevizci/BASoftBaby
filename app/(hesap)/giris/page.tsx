import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { girisYap } from "@/server/uyelik-islem";
import { girisYapan } from "@/server/uyelik";
import { ANA_DUGME, ETIKET, GIRDI, HATALAR, HATA_KUTUSU, KART } from "../hesap-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Giriş yap", robots: { index: false } };

/**
 * Giriş. `nereye` ile geldiği yere dönüyor — ödeme sırasında giriş yapan
 * müşteri sepetinin başına geri gelsin diye.
 */
export default async function GirisSayfasi({ searchParams }: PageProps<"/giris">) {
  const { hata, nereye } = await searchParams;
  if (await girisYapan()) redirect("/hesabim");

  const hedef = typeof nereye === "string" && nereye.startsWith("/") ? nereye : "/hesabim";
  const hataMetni = typeof hata === "string" ? HATALAR[hata] : undefined;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl sm:text-3xl">Giriş yap</h1>
      <p className="mt-2 text-sm text-metin-2">
        Siparişlerini ve adreslerini görmek için hesabına gir.
      </p>

      {hataMetni && <p className={HATA_KUTUSU}>{hataMetni}</p>}

      <form action={girisYap} className={`mt-6 flex flex-col gap-4 ${KART}`}>
        <input type="hidden" name="nereye" value={hedef} />

        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>E-posta</span>
          <input name="eposta" type="email" required autoComplete="email" className={GIRDI} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Şifre</span>
          <input
            name="sifre"
            type="password"
            required
            autoComplete="current-password"
            className={GIRDI}
          />
        </label>

        <button type="submit" className={`${ANA_DUGME} mt-1 self-start`}>
          Giriş yap
        </button>
      </form>

      <p className="mt-5 text-sm text-metin-2">
        Hesabın yok mu?{" "}
        <Link
          href={`/kayit?nereye=${encodeURIComponent(hedef)}`}
          className="font-bold text-mavi-koyu hover:underline"
        >
          Hesap oluştur
        </Link>
      </p>

      <p className="mt-2 text-sm text-metin-2">
        <Link href="/sifremi-unuttum" className="font-bold text-mavi-koyu hover:underline">
          Şifreni mi unuttun?
        </Link>
      </p>

      <p className="mt-2 text-sm text-metin-3">
        Üye olmadan verdiğin siparişleri{" "}
        <Link href="/siparis-takip" className="font-bold text-mavi-koyu hover:underline">
          sipariş takibi
        </Link>{" "}
        sayfasından numara ve e-postanla görebilirsin.
      </p>
    </div>
  );
}
