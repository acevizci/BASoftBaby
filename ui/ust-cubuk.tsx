import Image from "next/image";
import Link from "next/link";

/**
 * Kategori bağlantıları katalog kurulduğunda (02. adım) gerçek sayfalara
 * bağlanacak. Şimdilik yazı olarak duruyorlar; olmayan sayfaya giden bir
 * bağlantı koymaktan iyi.
 */
const KATEGORILER = ["Yenidoğan", "Zıbın & Body", "Tulum", "Uyku", "Aksesuar"];

export default function UstCubuk() {
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

        <nav className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-metin-3">
          {KATEGORILER.map((k) => (
            <span key={k} className="whitespace-nowrap">
              {k}
            </span>
          ))}
        </nav>

        <span className="flex-none rounded-full bg-sari-soluk px-3 py-1.5 text-xs font-bold text-sari-koyu">
          Yakında
        </span>
      </div>
    </header>
  );
}
