import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";

/**
 * Önbellek.
 *
 * Sorun şuydu: her sayfa açılışında kategoriler, duyuru şeridi, alt bilgideki
 * yasal metinler, künye ve satış ayarları yeniden sorgulanıyordu. Bunlar
 * haftada bir değişen veriler ama istek başına beş ayrı gidiş-geliş
 * demekti. Veritabanı uzaktayken (Neon) her gidiş-geliş 30-60 ms, yani
 * sayfanın yarım saniyesi burada geçiyordu.
 *
 * İki katman var:
 *
 * - **İstek önbelleği:** aynı istek içinde aynı sorgu iki kez çağrılırsa
 *   veritabanına bir kez gidiliyor. Bayatlama riski sıfır.
 * - **Paylaşılan önbellek:** istekler arasında da saklanıyor. Yalnızca
 *   panelden değişen, kullanıcıya özel olmayan veriler için. Panelde bir şey
 *   kaydedilince `vitriniYenile()` etiketleri düşürüyor, yani değişiklik
 *   beklemeden görünüyor.
 *
 * **Sepet, oturum, sipariş ve stok hiçbir zaman paylaşılan önbelleğe
 * girmiyor:** kullanıcıya özel ya da anlık doğru olması gereken veriler.
 * Stok zaten sipariş anında, tek işlem içinde veritabanından okunuyor.
 */

export const ETIKETLER = {
  katalog: "katalog",
  beden: "beden",
  ayarlar: "ayarlar",
  duyuru: "duyuru",
  banner: "banner",
  kampanya: "kampanya",
  yasal: "yasal",
} as const;

export const TUM_ETIKETLER = Object.values(ETIKETLER);

type Islev<T> = () => Promise<T>;
type ParametreliIslev<A extends unknown[], T> = (...arg: A) => Promise<T>;

/** Aynı istek içindeki tekrar çağrıları tek sorguya indirir. */
export function istekOnbellegi<T>(islev: Islev<T>): Islev<T> {
  return cache(islev);
}

/**
 * İstekler arasında da saklanan önbellek.
 *
 * `saniye` bir üst sınır: panelden değişiklik yapılınca etiket zaten
 * düşürülüyor, bu süre yalnızca hiçbir şey olmasa bile veriyi tazeleme
 * garantisi.
 */
export function paylasilanOnbellek<T>(
  islev: Islev<T>,
  anahtar: string[],
  etiketler: string[],
  saniye = 300,
): Islev<T> {
  return cache(unstable_cache(islev, anahtar, { tags: etiketler, revalidate: saniye }));
}

/**
 * Parametre alan sorgular için paylaşılan önbellek; parametreler önbellek
 * anahtarına giriyor.
 *
 * Ürün listeleri bununla saklanıyor. Listedeki stok bilgisi en fazla bu süre
 * kadar bayatlayabilir — ama satın alma yolundaki hiçbir adım listeye
 * güvenmiyor: ürün sayfası stoğu doğrudan okuyor, sipariş anında ise stok tek
 * bir veritabanı işlemi içinde yeniden kontrol edilip düşülüyor. Yani en kötü
 * ihtimalle müşteri listede yarım dakika önce tükenmiş bir ürünü görür,
 * yanlış bir satış olmaz.
 */
export function paylasilanOnbellekli<A extends unknown[], T>(
  islev: ParametreliIslev<A, T>,
  anahtar: string[],
  etiketler: string[],
  saniye = 300,
): ParametreliIslev<A, T> {
  return cache(unstable_cache(islev, anahtar, { tags: etiketler, revalidate: saniye }));
}
