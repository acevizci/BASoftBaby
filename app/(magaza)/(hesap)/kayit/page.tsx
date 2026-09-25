import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { kayitOl } from "@/server/uyelik-islem";
import { EN_KISA_SIFRE, girisYapan } from "@/server/uyelik";
import GonderDugmesi from "@/ui/gonder-dugmesi";
import { ANA_DUGME, ETIKET, GIRDI, HATALAR, HATA_KUTUSU, KART } from "../hesap-bicim";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hesap oluştur", robots: { index: false } };

export default async function KayitSayfasi({ searchParams }: PageProps<"/kayit">) {
  const { hata, nereye } = await searchParams;
  const hedef =
    typeof nereye === "string" &&
    nereye.startsWith("/") &&
    !nereye.startsWith("//") &&
    !nereye.includes("\\")
      ? nereye
      : "/hesabim";
  if (await girisYapan()) redirect(hedef);
  const hataMetni = typeof hata === "string" ? HATALAR[hata] : undefined;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl sm:text-3xl">Hesap oluştur</h1>
      <p className="mt-2 text-sm text-metin-2">
        Siparişlerin bir arada dursun, adresini her seferinde yazma.
      </p>

      {hataMetni && <p className={HATA_KUTUSU}>{hataMetni}</p>}

      <form action={kayitOl} className={`mt-6 flex flex-col gap-4 ${KART}`}>
        <input type="hidden" name="nereye" value={hedef} />

        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Ad soyad</span>
          <input name="adSoyad" required autoComplete="name" className={GIRDI} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>E-posta</span>
          <input name="eposta" type="email" required autoComplete="email" className={GIRDI} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={ETIKET}>Telefon</span>
          <input
            name="telefon"
            type="tel"
            autoComplete="tel"
            placeholder="isteğe bağlı"
            className={`${GIRDI} rakam`}
          />
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

        <label className="mt-1 flex items-start gap-2.5">
          <input
            type="checkbox"
            name="pazarlamaIzni"
            className="mt-0.5 h-4 w-4 flex-none accent-[var(--mercan)]"
          />
          <span className="text-sm text-metin-2">
            Kampanyalardan, sepetimde unuttuklarımdan ve favorilerimdeki indirimlerden
            e-postayla haberim olsun.
            <span className="block text-xs text-metin-3">
              İşaretlemesen de siparişinle ilgili e-postalar (onay, kargo) gelir. İstediğin
              an tek tıkla çıkabilirsin.
            </span>
          </span>
        </label>

        <GonderDugmesi bekleyen="Hesabın açılıyor…" className={`${ANA_DUGME} mt-1 self-start`}>
          Hesabımı oluştur
        </GonderDugmesi>
      </form>

      <p className="mt-5 text-sm text-metin-2">
        Hesabın var mı?{" "}
        <Link
          href={`/giris?nereye=${encodeURIComponent(hedef)}`}
          className="font-bold text-mavi-koyu hover:underline"
        >
          Giriş yap
        </Link>
      </p>

      <p className="mt-2 text-sm text-metin-3">
        Üye olmadan da alışveriş yapabilirsin; hesap yalnızca işini kolaylaştırmak için.
      </p>
    </div>
  );
}
