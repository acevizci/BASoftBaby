/**
 * `next/cache` modülünün test karşılığı.
 *
 * `unstable_cache` bir istek bağlamı istiyor ("incrementalCache missing");
 * testte istek yok. Burada işlev **olduğu gibi** döndürülüyor: önbellek
 * katmanı atlanıyor, altındaki sorgu her çağrıda gerçekten çalışıyor.
 *
 * Bu testte doğru davranış — hatta istenen davranış: sınanan şey önbelleğin
 * kendisi değil, stoğun ve paranın doğruluğu. Bayat bir değerin sınavı
 * yanıltmasındansa her seferinde veritabanına gitmesi iyi (K-77).
 *
 * `revalidatePath` ve `updateTag` sessizce yutuluyor: ikisi de yalnızca
 * önbellek düşürüyor, veriye dokunmuyorlar.
 */

export function unstable_cache<A extends unknown[], T>(
  islev: (...arg: A) => Promise<T>,
): (...arg: A) => Promise<T> {
  return islev;
}

export function revalidatePath(): void {}
export function revalidateTag(): void {}
export function updateTag(): void {}
export function unstable_noStore(): void {}
