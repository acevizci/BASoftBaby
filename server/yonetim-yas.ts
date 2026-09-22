"use server";

/**
 * Yaş grubu yönetimi.
 *
 * Gruplar kodda sabitti; artık `AgeGroup` tablosunda ve buradan yönetiliyor
 * (K-65). Beden yönetiminin (`yonetim-beden.ts`) kardeşi, dört farkla:
 *
 * 1. **Kod adresin parçası.** `/urunler?yas=6-12` bağlantısı paylaşılıyor ve
 *    arama motorunda duruyor; kod bu yüzden serbest metin değil, adres
 *    güvenli bir anahtara çevriliyor.
 * 2. **Kod değişince bedenler de değişiyor.** Beden kaydı grubun kodunu
 *    metin olarak tutuyor; aynı işlem içinde güncellenmezse o bedenler
 *    olmayan bir gruba bağlı kalır, yani yaş süzgecinden düşerdi.
 * 3. **Kullanılan grup silinmiyor, kapatılıyor.** Silmek bedenleri gruptan
 *    koparırdı; kapatmak yalnızca vitrinden kaldırıyor.
 * 4. **Son grup kapatılabiliyor.** Bedenlerden farkı: yaş grubu olmayan bir
 *    mağaza çalışır — ana sayfadaki "Yaşa göre" bölümü ve süzgeçteki yaş
 *    başlığı görünmez olur, satış yolunda hiçbir şey kırılmaz.
 */

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { TUM_ETIKETLER } from "@/server/onbellek";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { formSayfaEki, tasimaSayfaEki } from "@/ui/sayfalama-bicim";
import { formAramaEki } from "@/ui/panel-arama-bicim";

const SAYFA = "/yonetim/bedenler";

/** İşlem bitince dönülecek adres; yaş grubu listesinin sayfası korunuyor (K-67). */
function donus(veri: FormData, ek: string): string {
  return `${SAYFA}?${ek}${formSayfaEki(veri, "yasSayfa")}${formAramaEki(veri, "yasAra")}`;
}

function vitriniYenile() {
  for (const etiket of TUM_ETIKETLER) updateTag(etiket);
  revalidatePath("/", "layout");
}

/**
 * Kodu adres güvenli hâle getirir: "6-12 Ay" → "6-12-ay".
 *
 * Türkçe harfler adres satırında yüzde kaçışlarına dönüşüp bağlantıyı
 * okunmaz yapıyor; boşluk da öyle. Kullanıcı ne yazarsa yazsın buradan
 * geçiyor, böylece ekranda gördüğü kod bağlantıda göreceğiyle aynı oluyor.
 */
function koduDuzelt(ham: string): string {
  const harita: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return ham
    .trim()
    .replace(/[çğıöşüÇĞİIÖŞÜ]/g, (h) => harita[h] ?? h)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function alanlar(veri: FormData) {
  return {
    kod: koduDuzelt(String(veri.get("kod") ?? "")),
    ad: String(veri.get("ad") ?? "").trim().slice(0, 40),
    aciklama: String(veri.get("aciklama") ?? "").trim().slice(0, 40),
  };
}

export async function yasGrubuEkle(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const { kod, ad, aciklama } = alanlar(veri);
  if (!kod) redirect(donus(veri, "hata=yaskod"));
  if (!ad) redirect(donus(veri, "hata=yasad"));

  const varMi = await db.ageGroup.findUnique({ where: { kod }, select: { id: true } });
  if (varMi) redirect(donus(veri, "hata=yastekrar"));

  const son = await db.ageGroup.aggregate({ _max: { sira: true } });
  await db.ageGroup.create({
    data: { kod, ad, aciklama, sira: (son._max.sira ?? 0) + 1 },
  });

  vitriniYenile();
  redirect(donus(veri, "kayit=yaseklendi"));
}

/**
 * Kodu, adı ve açıklamayı kaydeder.
 *
 * Kod değiştiyse o koda bağlı bedenler aynı işlemde güncelleniyor: ikisi
 * ayrı yapılsaydı arada düşen bir istek bedenleri artık var olmayan bir
 * grupta bırakır, yaş süzgeci o bedenleri hiç getirmezdi.
 */
export async function yasGrubuKaydet(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  const { kod, ad, aciklama } = alanlar(veri);
  if (!id) redirect(SAYFA);
  if (!kod) redirect(donus(veri, "hata=yaskod"));
  if (!ad) redirect(donus(veri, "hata=yasad"));

  const mevcut = await db.ageGroup.findUnique({ where: { id }, select: { kod: true } });
  if (!mevcut) redirect(donus(veri, "hata=bulunamadi"));

  if (mevcut.kod !== kod) {
    const cakisma = await db.ageGroup.findUnique({ where: { kod }, select: { id: true } });
    if (cakisma) redirect(donus(veri, "hata=yastekrar"));
  }

  await db.$transaction(async (islem) => {
    await islem.ageGroup.update({ where: { id }, data: { kod, ad, aciklama } });
    if (mevcut.kod !== kod) {
      await islem.size.updateMany({
        where: { yasKodu: mevcut.kod },
        data: { yasKodu: kod },
      });
    }
  });

  vitriniYenile();
  redirect(donus(veri, "kayit=yaskaydedildi"));
}

export async function yasGrubuCevir(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  if (!id) redirect(SAYFA);

  const mevcut = await db.ageGroup.findUnique({ where: { id }, select: { aktif: true } });
  if (!mevcut) redirect(donus(veri, "hata=bulunamadi"));

  await db.ageGroup.update({ where: { id }, data: { aktif: !mevcut.aktif } });

  vitriniYenile();
  redirect(donus(veri, `kayit=${mevcut.aktif ? "yaskapatildi" : "yasacildi"}`));
}

/**
 * Grubu siler — yalnızca hiçbir bedene bağlı değilse.
 *
 * Bağlıysa silmek o bedenleri yaş süzgecinden düşürürdü; ekran da bunu
 * söylüyor ve kapatmayı öneriyor.
 */
export async function yasGrubuSil(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  if (!id) redirect(SAYFA);

  const grup = await db.ageGroup.findUnique({ where: { id }, select: { kod: true } });
  if (!grup) redirect(donus(veri, "hata=bulunamadi"));

  const kullanim = await db.size.count({ where: { yasKodu: grup.kod } });
  if (kullanim > 0) redirect(donus(veri, `hata=yaskullanimda&adet=${kullanim}`));

  await db.ageGroup.delete({ where: { id } });

  vitriniYenile();
  redirect(donus(veri, "kayit=yassilindi"));
}

/** Sıralama ok düğmeleriyle: JavaScript'siz çalışıyor. */
export async function yasGrubuTasi(veri: FormData): Promise<void> {
  await yoneticiGerekli();

  const id = String(veri.get("id") ?? "").trim();
  const yon = String(veri.get("yon") ?? "") === "yukari" ? -1 : 1;
  if (!id) redirect(SAYFA);

  const hepsi = await db.ageGroup.findMany({ orderBy: { sira: "asc" }, select: { id: true } });
  const yer = hepsi.findIndex((y) => y.id === id);
  const hedef = yer + yon;
  if (yer === -1 || hedef < 0 || hedef >= hepsi.length) redirect(SAYFA);

  [hepsi[yer], hepsi[hedef]] = [hepsi[hedef], hepsi[yer]];

  // Sıra numaraları baştan yazılıyor: elle açılmış boşluklar da düzeliyor.
  await db.$transaction(
    hepsi.map((y, i) => db.ageGroup.update({ where: { id: y.id }, data: { sira: i + 1 } })),
  );

  vitriniYenile();
  redirect(
    `${SAYFA}?kayit=yassira${tasimaSayfaEki(veri, hedef, "yasSayfa")}${formAramaEki(veri, "yasAra")}`,
  );
}
