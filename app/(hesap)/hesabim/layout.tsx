import Link from "next/link";
import { redirect } from "next/navigation";
import { cikisYap } from "@/server/uyelik-islem";
import { girisYapan } from "@/server/uyelik";
import { HESAP_SAYFALARI, IKINCIL_DUGME } from "../hesap-bicim";

/**
 * Hesap sayfalarının ortak çerçevesi: selamlama, sekmeler ve çıkış.
 *
 * Giriş kontrolü burada yapılıyor, ama sayfaların her biri kendi verisini
 * yine `girisYapan()` üzerinden okuyor — kimlik tek bir yerde unutulursa
 * veri sızmasın.
 */
export default async function HesapDuzeni({ children }: { children: React.ReactNode }) {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?hata=giris&nereye=%2Fhesabim");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl">Hesabım</h1>
          <p className="mt-1 text-sm text-metin-2">
            {musteri.adSoyad} · <span className="text-metin-3">{musteri.eposta}</span>
          </p>
        </div>
        <form action={cikisYap}>
          <button type="submit" className={IKINCIL_DUGME}>
            Çıkış yap
          </button>
        </form>
      </div>

      <nav aria-label="Hesap sayfaları" className="mt-5 flex flex-wrap gap-2">
        {HESAP_SAYFALARI.map((s) => (
          <Link
            key={s.yol}
            href={s.yol}
            className="rounded-full border border-cizgi bg-yuzey px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
          >
            {s.ad}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
