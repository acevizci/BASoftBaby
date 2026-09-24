import "server-only";

/**
 * Arama motorları (K-129): doğrulama kodları ve IndexNow.
 *
 * **IndexNow** Bing'in ve Yandex'in (Türkiye'de payı küçük değil) ortak
 * bildirim yolu: ürün eklenince, değişince ya da kalkınca adresi hemen
 * bildiriliyor; taramayı beklemiyor. Google IndexNow'u kullanmıyor; Google
 * için site haritası (K-128) ve Search Console var.
 *
 * Bildirim yalnızca yayındaki sitede (https, yerel adres değil) gidiyor ve
 * hiçbir zaman işlemi bekletmiyor ya da düşürmüyor: en çok 3 saniye, hata
 * yalnızca günlüğe.
 */

import { randomBytes } from "node:crypto";
import { db } from "@/server/veritabani";
import { ETIKETLER, paylasilanOnbellek } from "@/server/onbellek";
import { siteAdresi } from "@/server/site";
import { indexNowGovdesi } from "@/server/arama-motoru-bicim";

export type AramaMotoruAyari = {
  googleDogrulama: string;
  bingDogrulama: string;
  yandexDogrulama: string;
  indexNowAnahtari: string;
  indexNowAcik: boolean;
};

export const aramaMotoruAyari = paylasilanOnbellek(
  async function aramaMotoruAyari(): Promise<AramaMotoruAyari> {
    const a = await db.storeSetting.findUnique({
      where: { id: "tek" },
      select: {
        googleDogrulama: true,
        bingDogrulama: true,
        yandexDogrulama: true,
        indexNowAnahtari: true,
        indexNowAcik: true,
      },
    });
    return {
      googleDogrulama: a?.googleDogrulama ?? "",
      bingDogrulama: a?.bingDogrulama ?? "",
      yandexDogrulama: a?.yandexDogrulama ?? "",
      indexNowAnahtari: a?.indexNowAnahtari ?? "",
      indexNowAcik: a?.indexNowAcik ?? true,
    };
  },
  ["arama-motoru-ayari"],
  [ETIKETLER.ayarlar],
);

/**
 * Anahtar yoksa üretip kaydeder. Önbellekten değil veritabanından okuyor:
 * önbellekteki ayar ilk üretimden sonra bir süre boş kalıyordu, her çağrı
 * yeni bir anahtar üretip `/indexnow.txt` ile bildirim uyuşmuyordu. Yarış
 * olmasın diye yalnızca boşsa yazılıyor ve yazılan geri okunuyor.
 */
export async function indexNowAnahtari(): Promise<string> {
  const oku = () =>
    db.storeSetting.findUnique({ where: { id: "tek" }, select: { indexNowAnahtari: true } });
  const mevcut = (await oku())?.indexNowAnahtari;
  if (mevcut) return mevcut;
  const anahtar = randomBytes(16).toString("hex");
  const yazildi = await db.storeSetting.updateMany({
    where: { id: "tek", indexNowAnahtari: "" },
    data: { indexNowAnahtari: anahtar },
  });
  if (yazildi.count === 0) {
    await db.storeSetting.upsert({ where: { id: "tek" }, update: {}, create: { id: "tek", indexNowAnahtari: anahtar } });
  }
  return (await oku())?.indexNowAnahtari || anahtar;
}

export type BildirimSonucu = { gonderildi: boolean; adet: number; sebep?: string };

/** Yayındaki site mi (bildirim yalnızca orada anlamlı). */
function yayindaMi(site: string): boolean {
  return site.startsWith("https://") && !/localhost|127\.0\.0\.1/.test(site);
}

/** Adresleri Bing ve Yandex'e bildirir; hata atmıyor. */
export async function indexNowBildir(yollar: string[]): Promise<BildirimSonucu> {
  try {
    const ayar = await aramaMotoruAyari();
    if (!ayar.indexNowAcik) return { gonderildi: false, adet: 0, sebep: "kapalı" };
    const site = siteAdresi();
    if (!yayindaMi(site)) return { gonderildi: false, adet: 0, sebep: "yayında değil" };
    const govde = indexNowGovdesi(site, await indexNowAnahtari(), yollar);
    if (govde.urlList.length === 0) return { gonderildi: false, adet: 0, sebep: "adres yok" };
    const cevap = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(govde),
      signal: AbortSignal.timeout(3000),
    });
    // 200 ve 202 kabul; 403 anahtar dosyası okunamadı, 422 adres uyuşmadı.
    if (!cevap.ok) return { gonderildi: false, adet: 0, sebep: `HTTP ${cevap.status}` };
    return { gonderildi: true, adet: govde.urlList.length };
  } catch (hata) {
    console.error("[indexnow] bildirilemedi", hata);
    return { gonderildi: false, adet: 0, sebep: "ağ hatası" };
  }
}
