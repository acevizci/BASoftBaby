import Image from "next/image";
import Link from "next/link";
import SepetSayaci from "@/ui/sepet-sayaci";
import { kategorileriGetir } from "@/server/katalog";

export default async function UstCubuk() {
  const kategoriler = await kategorileriGetir();

  return (
    <header className="border-b border-cizgi-soluk bg-zemin">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
        <Link href="/" className="flex-none" aria-label="BASoftBaby ana sayfa">
          <Image
            src="/marka/basoftbaby-logo-yatay.svg"
            alt="BASoftBaby"
            width={186}
            height={42}
            priority
            unoptimized
          />
        </Link>

        <nav className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-metin-2">
          {kategoriler.map((k) => (
            <Link key={k.slug} href={`/${k.slug}`} className="whitespace-nowrap hover:text-mercan-koyu">
              {k.ad}
            </Link>
          ))}
        </nav>

        <SepetSayaci />
      </div>
    </header>
  );
}
