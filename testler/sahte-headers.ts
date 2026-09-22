/**
 * `next/headers` modülünün test karşılığı.
 *
 * Gerçek `cookies()` yalnızca bir istek bağlamında çalışıyor; testte istek
 * yok. Burası bellekte duran basit bir çerez kutusu: testler `cerezAyarla`
 * ile sepet çerezini kurup gerçek sipariş yolunu çalıştırabiliyor (K-77).
 *
 * Taklit edilen tek şey **taşıyıcı**, mantık değil: sipariş oluşturma sepeti
 * yine veritabanından okuyor, stoğu yine kendi koşullu düşümüyle düşürüyor.
 */

type Cerez = { name: string; value: string };

const kutu = new Map<string, string>();

/** Testler çerezi buradan kuruyor. */
export function cerezAyarla(ad: string, deger: string): void {
  kutu.set(ad, deger);
}

export function cerezleriTemizle(): void {
  kutu.clear();
}

const kavanoz = {
  get: (ad: string): Cerez | undefined =>
    kutu.has(ad) ? { name: ad, value: kutu.get(ad)! } : undefined,
  getAll: (): Cerez[] => [...kutu].map(([name, value]) => ({ name, value })),
  has: (ad: string): boolean => kutu.has(ad),
  set: (ad: string | { name: string; value: string }, deger?: string): void => {
    if (typeof ad === "string") kutu.set(ad, deger ?? "");
    else kutu.set(ad.name, ad.value);
  },
  delete: (ad: string): void => {
    kutu.delete(ad);
  },
};

export async function cookies() {
  return kavanoz;
}

export async function headers() {
  return new Headers();
}

export async function draftMode() {
  return { isEnabled: false, enable: () => {}, disable: () => {} };
}
