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

import { AsyncLocalStorage } from "node:async_hooks";

type Cerez = { name: string; value: string };

const ortakKutu = new Map<string, string>();
/**
 * Ayrı istek (K-169): eşzamanlı testlerde her "müşteri"nin kendi çerezleri.
 * Ortak kutuda on müşteri aslında aynı sepeti paylaşıyordu.
 */
const istekKutusu = new AsyncLocalStorage<Map<string, string>>();
const kutuAl = () => istekKutusu.getStore() ?? ortakKutu;

/** `is` kendi çerez kutusuyla çalışıyor; ortak kutunun o anki hâli kopyalanıyor. */
export function ayriIstek<T>(is: () => Promise<T>): Promise<T> {
  return istekKutusu.run(new Map(kutuAl()), is);
}

/** Testler çerezi buradan kuruyor. */
export function cerezAyarla(ad: string, deger: string): void {
  kutuAl().set(ad, deger);
}

export function cerezleriTemizle(): void {
  kutuAl().clear();
}

const kavanoz = {
  get: (ad: string): Cerez | undefined =>
    kutuAl().has(ad) ? { name: ad, value: kutuAl().get(ad)! } : undefined,
  getAll: (): Cerez[] => [...kutuAl()].map(([name, value]) => ({ name, value })),
  has: (ad: string): boolean => kutuAl().has(ad),
  set: (ad: string | { name: string; value: string }, deger?: string): void => {
    if (typeof ad === "string") kutuAl().set(ad, deger ?? "");
    else kutuAl().set(ad.name, ad.value);
  },
  delete: (ad: string): void => {
    kutuAl().delete(ad);
  },
};

export async function cookies() {
  return kavanoz;
}

let basliklar = new Headers();

/** İsteğin geldiği adresi taklit eder (hız sınırı testleri); `undefined` sıfırlar. */
export function ipAyarla(ip: string | undefined): void {
  basliklar = new Headers(ip ? { "x-forwarded-for": ip } : {});
}

export async function headers() {
  return basliklar;
}

export async function draftMode() {
  return { isEnabled: false, enable: () => {}, disable: () => {} };
}
