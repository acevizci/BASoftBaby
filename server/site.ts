import "server-only";

/**
 * Sitenin kendi adresi.
 *
 * Sitemap, canonical adresler ve yapısal veri mutlak adres istiyor; göreli
 * adres yazılırsa Google bunları kullanamıyor.
 *
 * Sıra: elle verilen `SITE_URL` (alan adı alınınca bu tanımlanacak), sonra
 * Vercel'in projeye kendiliğinden verdiği üretim adresi, sonra yereldeki
 * geliştirme adresi. Böylece alan adı olmadan da doğru çalışıyor, alan adı
 * gelince tek değişkenle her yer düzeliyor.
 */
export function siteAdresi(): string {
  const elle = process.env.SITE_URL?.trim();
  if (elle) return elle.replace(/\/$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

/**
 * Mutlak adres üretir: `/urun/x` → `https://site/urun/x`. Zaten tam olan
 * adres (yayında Vercel Blob'daki fotoğraflar) olduğu gibi dönüyor; önüne
 * site adresi eklenince Google'a bozuk resim adresi gidiyordu (K-123).
 */
export function tamAdres(yol: string): string {
  if (/^https?:\/\//i.test(yol)) return yol;
  return `${siteAdresi()}${yol.startsWith("/") ? yol : `/${yol}`}`;
}
