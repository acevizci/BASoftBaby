import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { girisYap } from "@/server/uyelik-islem";
import { girisYapan } from "@/server/uyelik";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import {
  ANA_DUGME,
  BILDIRIMLER,
  ETIKET,
  GIRDI,
  HATALAR,
  HATA_KUTUSU,
  IYI_KUTU,
  KART,
} from "../hesap-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Giriş yap", robots: { index: false } };

/**
 * Giriş. `nereye` ile geldiği yere dönüyor — ödeme sırasında giriş yapan
 * müşteri sepetinin başına geri gelsin diye.
 */
export default async function GirisSayfasi({ searchParams }: PageProps<"/giris">) {
  const { hata, kayit, nereye, dk } = await searchParams;
  const hedef =
    typeof nereye === "string" &&
    nereye.startsWith("/") &&
    !nereye.startsWith("//") &&
    !nereye.includes("\\")
      ? nereye
      : "/hesabim";
  // Zaten girişliyse gideceği yere (K-145: doğum listesi düğmesi buradan geçiyor).
  if (await girisYapan()) redirect(hedef);
  const temelHata = typeof hata === "string" && Object.hasOwn(HATALAR, hata) ? HATALAR[hata] : undefined;
  const bildirim = typeof kayit === "string" && Object.hasOwn(BILDIRIMLER, kayit) ? BILDIRIMLER[kayit] : undefined;

  // Kilit süresi adres satırında sayı olarak geliyor; metin taşınsaydı biri
  // hazırladığı bağlantıyla sayfamızda istediği yazıyı gösterebilirdi.
  const kalanDk = Number(typeof dk === "string" ? dk : "");
  const hataMetni =
    hata === "kilit" && Number.isInteger(kalanDk) && kalanDk > 0 && kalanDk <= 60
      ? `${temelHata} ${kalanDk} dakika sonra yeniden deneyebilirsin. Şifreni unuttuysan sıfırlayabilirsin.`
      : temelHata;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl sm:text-3xl">Giriş yap</h1>
      <p className="mt-2 text-sm text-metin-2">
        Siparişlerini ve adreslerini görmek için hesabına gir.
      </p>

      {bildirim && <p className={`${IYI_KUTU} mt-4`}>{bildirim}</p>}
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

        <GonderDugmesi bekleyen="Giriş yapılıyor…" className={`${ANA_DUGME} mt-1 self-start`}>
          Giriş yap
        </GonderDugmesi>
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
