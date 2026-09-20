import Link from "next/link";
import { girisYapan } from "@/server/uyelik";

/** Üst çubuktaki hesap bağlantısı: giriş yapılmışsa hesabım, değilse giriş. */
export default async function HesapBaglantisi() {
  const musteri = await girisYapan();

  return (
    <Link
      href={musteri ? "/hesabim" : "/giris"}
      className="rounded-full border border-cizgi px-3 py-1.5 text-xs font-bold text-metin-2 transition hover:border-mercan hover:text-metin"
    >
      {musteri ? "Hesabım" : "Giriş"}
    </Link>
  );
}
