import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import { ilkKurulum, yonetimGirisi } from "@/server/yonetim-kimlik-islem";
import { kullaniciVarMi, kurulumSifresi, yoneticiGetir } from "@/server/yonetim-kimlik";
import { EN_KISA_SIFRE } from "@/server/uyelik";
import {
  ANA_DUGME,
  ETIKET,
  GIRDI,
  GIRIS_HATALARI,
  HATA_KUTUSU,
  IYI_KUTU,
  KART,
  kilitMetni,
} from "../panel-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Panele giriş",
  robots: { index: false, follow: false },
};

/**
 * Panel giriş ekranı.
 *
 * Tarayıcının kendi şifre kutusunun yerini aldı: o kutu biçimlendirilemiyor,
 * Türkçe değil ve çıkış yapmanın yolu yok (K-45).
 *
 * Hiç kullanıcı yokken sayfa "ilk kullanıcıyı oluştur" hâline geçiyor ve
 * `YONETIM_SIFRE` ile korunuyor. O değişken de tanımlı değilse sayfa hiç
 * yok: ayar unutulursa panel açıkta kalmasın — eski davranışın korunan yanı.
 */
export default async function YonetimGirisi({ searchParams }: PageProps<"/yonetim/giris">) {
  const { hata, nereye, dk, cikis } = await searchParams;

  if (await yoneticiGetir()) redirect("/yonetim");

  const kurulumVarMi = await kullaniciVarMi();
  const kurulum = kurulumSifresi();
  if (!kurulumVarMi && !kurulum) notFound();

  const hedef =
    typeof nereye === "string" && nereye.startsWith("/yonetim") && !nereye.startsWith("/yonetim/giris")
      ? nereye
      : "/yonetim";

  const temel = typeof hata === "string" ? GIRIS_HATALARI[hata] : undefined;
  const hataMetni = hata === "kilit" && temel ? kilitMetni(temel, dk) : temel;

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

      <h1 className="mt-8 text-center text-2xl">
        {kurulumVarMi ? "Panele giriş" : "İlk kullanıcıyı oluştur"}
      </h1>
      <p className="mt-2 text-center text-sm text-metin-2">
        {kurulumVarMi
          ? "Mağaza yönetimi için hesabına gir."
          : "Panelde henüz kullanıcı yok. Kurulum şifresiyle ilk sahibi oluştur."}
      </p>

      {cikis === "1" && <p className={`mt-5 ${IYI_KUTU}`}>Çıkış yapıldı.</p>}
      {hataMetni && <p className={`mt-5 ${HATA_KUTUSU}`}>{hataMetni}</p>}

      {kurulumVarMi ? (
        <form action={yonetimGirisi} className={`mt-6 flex flex-col gap-4 ${KART}`}>
          <input type="hidden" name="nereye" value={hedef} />

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

          <GonderDugmesi bekleyen="Giriş yapılıyor…" className={`${ANA_DUGME} mt-1`}>
            Giriş yap
          </GonderDugmesi>

          <p className="text-xs text-metin-3">
            Şifreni unuttuysan panel sahibinden yeni bir şifre atamasını iste. Panelde şifre
            sıfırlama e-postası yok — e-posta servisi bağlanınca eklenecek.
          </p>
        </form>
      ) : (
        <form action={ilkKurulum} className={`mt-6 flex flex-col gap-4 ${KART}`}>
          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Kurulum şifresi</span>
            <input
              name="kurulumSifresi"
              type="password"
              required
              autoFocus
              className={GIRDI}
            />
            <span className="text-xs text-metin-3">
              Vercel&apos;de tanımladığın <code className="rakam">YONETIM_SIFRE</code> değeri.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Ad soyad</span>
            <input name="adSoyad" required autoComplete="name" className={GIRDI} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>E-posta</span>
            <input name="eposta" type="email" required autoComplete="username" className={GIRDI} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={ETIKET}>Şifre</span>
            <input
              name="sifre"
              type="password"
              required
              minLength={EN_KISA_SIFRE}
              autoComplete="new-password"
              className={GIRDI}
            />
            <span className="text-xs text-metin-3">En az {EN_KISA_SIFRE} karakter.</span>
          </label>

          <GonderDugmesi bekleyen="Oluşturuluyor…" className={`${ANA_DUGME} mt-1`}>
            Oluştur ve gir
          </GonderDugmesi>

          <p className="text-xs text-metin-3">
            Bu hesap açıldıktan sonra kurulum şifresiyle giriş yapılamaz; panele yalnızca
            kullanıcı hesaplarıyla giriliyor.
          </p>
        </form>
      )}

      <Link
        href="/"
        className="mt-6 self-center text-sm font-bold text-mavi-koyu hover:underline"
      >
        Mağazaya dön
      </Link>
    </div>
  );
}
