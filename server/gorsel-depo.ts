import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Yüklenen ürün fotoğraflarının saklandığı yer.
 *
 * Yayında Vercel Blob kullanılıyor; depo bağlıysa oraya gidiyor.
 * Yerelde geliştirirken jeton olmadığı için dosyalar proje kökündeki
 * `.yuklenen/` klasörüne yazılıyor ve `/yuklenen/...` adresinden bir route
 * handler ile sunuluyor. `public/` kullanılmıyor: oranın içeriği derleme
 * anında sabitleniyor, derlemeden sonra yazılan dosya sunulmuyor.
 *
 * Çağıran taraf ikisini ayırt etmiyor: her iki durumda da geriye tarayıcının
 * açabileceği bir adres dönüyor.
 *
 * Vercel'in dosya sistemi kalıcı değil, bu yüzden yayında yerel diske yazmak
 * bir seçenek değil: bir sonraki dağıtımda fotoğraflar kaybolurdu.
 */

/** Tarayıcıdan gelen Content-Type'a güvenilmiyor; biçimi sharp'ın kendisi söylüyor. */
const IZINLI_BICIMLER = new Set(["jpeg", "png", "webp", "avif", "gif"]);

export const EN_BUYUK_BAYT = 12 * 1024 * 1024;

/** Ürün sayfasındaki büyük görsel ve karttaki küçük görsel. */
const BUYUK_GENISLIK = 1400;
const KUCUK_GENISLIK = 600;

export type Yuklenen = {
  yol: string;
  kucukYol: string;
  genislik: number;
  yukseklik: number;
  boyutBayt: number;
};

export class GorselHatasi extends Error {}

/** Yerelde dosyaların durduğu klasör; yayında kullanılmıyor. */
export const YEREL_KLASOR = path.join(process.cwd(), ".yuklenen");

/** Dosya adı yalnızca üretilen biçimde olabilir: dizin dolaşmayı baştan keser. */
export const YEREL_AD_KALIBI = /^[a-z0-9]+-[a-z0-9]+-[bk]\.webp$/;

/**
 * Depo bağlantısının iki biçimi var, ikisi de destekleniyor.
 *
 * **Okuma-yazma jetonu.** Depoyu bağlarken üretilen `BLOB_READ_WRITE_TOKEN`.
 * Bağlarken bir ön ek verildiyse adı `FOTOGRAF_READ_WRITE_TOKEN` gibi oluyor
 * ve kütüphane kendi başına ona bakmıyor; bu yüzden ön ekli ad da aranıp
 * bulunan jeton çağrılara açıkça veriliyor.
 *
 * **OIDC.** Vercel yeni bağlantılarda jeton üretmek yerine `BLOB_STORE_ID`
 * koyuyor, yetkiyi de her isteğe kendi verdiği kısa ömürlü OIDC jetonundan
 * alıyor. O jeton ortam değişkeni olarak durmuyor, istek bağlamından geliyor;
 * bu yüzden burada okunmaya çalışılmıyor, kütüphanenin kendisi buluyor.
 * Bizim için ölçüt `BLOB_STORE_ID`nin varlığı.
 */
type BlobKimligi = { jeton?: string };

function blobJetonu(): string | undefined {
  const dogrudan = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (dogrudan) return dogrudan;

  for (const [anahtar, deger] of Object.entries(process.env)) {
    if (anahtar.endsWith("_READ_WRITE_TOKEN") && deger?.trim().startsWith("vercel_blob_rw_")) {
      return deger.trim();
    }
  }
  return undefined;
}

/** Depo bağlıysa kimlik, bağlı değilse undefined. */
function blobKimligi(): BlobKimligi | undefined {
  const jeton = blobJetonu();
  if (jeton) return { jeton };
  if (process.env.BLOB_STORE_ID?.trim()) return {};
  return undefined;
}

/** Aynı fotoğraf iki kez yüklenirse birbirini ezmesin diye rastgele bir ön ek. */
function ad(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function yaz(dosyaAdi: string, veri: Buffer): Promise<string> {
  const kimlik = blobKimligi();
  if (kimlik) {
    const { put } = await import("@vercel/blob");
    try {
      const sonuc = await put(`urun/${dosyaAdi}`, veri, {
        access: "public",
        // Jeton yoksa seçenek hiç verilmiyor: kütüphane OIDC ile yetkileniyor.
        ...(kimlik.jeton ? { token: kimlik.jeton } : {}),
        contentType: "image/webp",
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      return sonuc.url;
    } catch (hata) {
      // Kütüphanenin hatası paneldeki kişiye görünsün; yoksa ekranda yalnızca
      // "Fotoğraf yüklenemedi" yazıp sebep günlüklerde kalıyor.
      throw new GorselHatasi(`Fotoğraf depoya yazılamadı: ${(hata as Error).message}`);
    }
  }

  // Vercel'de jeton yoksa yerel diske yazmak sessiz bir veri kaybı olurdu:
  // fotoğraflar yüklenmiş görünür, ilk dağıtımda yok olurdu. Açıkça hata ver.
  // Ölçüt NODE_ENV değil `VERCEL`, çünkü `next start` yerelde de üretim
  // kipinde çalışıyor ve orada yerel diske yazmak doğru davranış.
  if (process.env.VERCEL) {
    // Hatayı okuyan kişi Vercel panelinde ne yapacağını bilsin diye bu
    // dağıtımda jetona benzeyen değişkenlerin *adları* yazılıyor; değerleri
    // hiçbir zaman yazılmıyor.
    const benzer = Object.keys(process.env).filter(
      (a) => a.includes("BLOB") || a.endsWith("_READ_WRITE_TOKEN"),
    );
    throw new GorselHatasi(
      benzer.length > 0
        ? `Fotoğraf deposunun kimliği okunamadı. Bu dağıtımda şu değişkenler var: ${benzer.join(", ")}. Beklenen ya BLOB_STORE_ID ya da BLOB_READ_WRITE_TOKEN.`
        : "Fotoğraf deposu bu dağıtımda bağlı değil. Vercel'de Storage bölümünden Blob deposunu projeye bağladıktan sonra Deployments'tan yeniden dağıtım (Redeploy) gerekiyor: ortam değişkenleri yalnızca yeni dağıtımlara geçiyor. Depo bağlıysa değişkenlerin Production ve Preview ortamlarının ikisinde de işaretli olduğuna bak.",
    );
  }

  await fs.mkdir(YEREL_KLASOR, { recursive: true });
  await fs.writeFile(path.join(YEREL_KLASOR, dosyaAdi), veri);
  return `/yuklenen/${dosyaAdi}`;
}

/**
 * Gelen dosyayı doğrular, webp'ye çevirir, iki boyutta saklar.
 *
 * Fotoğraflar telefondan 5-8 MB gelebiliyor; olduğu gibi saklamak hem depoyu
 * hem müşterinin internetini yiyor. Bu yüzden her fotoğraf en fazla
 * 1400 piksel genişliğe indiriliyor.
 */
export async function gorselYukle(dosya: File): Promise<Yuklenen> {
  if (dosya.size === 0) throw new GorselHatasi("Dosya boş.");
  if (dosya.size > EN_BUYUK_BAYT) {
    throw new GorselHatasi(
      `Dosya çok büyük (${(dosya.size / 1024 / 1024).toFixed(1)} MB). En fazla ${EN_BUYUK_BAYT / 1024 / 1024} MB olabilir.`,
    );
  }

  const ham = Buffer.from(await dosya.arrayBuffer());

  let bilgi;
  try {
    bilgi = await sharp(ham).metadata();
  } catch {
    throw new GorselHatasi("Bu dosya bir fotoğraf değil ya da bozuk.");
  }
  if (!bilgi.format || !IZINLI_BICIMLER.has(bilgi.format)) {
    throw new GorselHatasi("Yalnızca JPEG, PNG, WEBP, AVIF ve GIF yüklenebiliyor.");
  }
  if (!bilgi.width || !bilgi.height) {
    throw new GorselHatasi("Fotoğrafın boyutları okunamadı.");
  }

  // Telefon fotoğraflarındaki dönme bilgisi uygulanıp temizleniyor, yoksa
  // fotoğraf sitede yan yatmış görünüyor.
  const temel = sharp(ham, { failOn: "error" }).rotate();

  const buyukVeri = await temel
    .clone()
    .resize({ width: BUYUK_GENISLIK, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const kucukVeri = await temel
    .clone()
    .resize({ width: KUCUK_GENISLIK, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const kok = ad();
  const [yol, kucukYol] = await Promise.all([
    yaz(`${kok}-b.webp`, buyukVeri.data),
    yaz(`${kok}-k.webp`, kucukVeri),
  ]);

  return {
    yol,
    kucukYol,
    genislik: buyukVeri.info.width,
    yukseklik: buyukVeri.info.height,
    boyutBayt: buyukVeri.data.length + kucukVeri.length,
  };
}

/**
 * Kayıt silinirken dosyaları da siler. Silme başarısız olursa kaydın silinmesi
 * engellenmiyor: artık kimsenin göremediği bir dosya, silinemeyen bir kayıttan
 * daha az zararlı.
 */
export async function gorselDosyalariniSil(yollar: string[]): Promise<void> {
  const temiz = yollar.filter(Boolean);
  if (temiz.length === 0) return;

  try {
    const kimlik = blobKimligi();
    if (kimlik) {
      const { del } = await import("@vercel/blob");
      await del(temiz, kimlik.jeton ? { token: kimlik.jeton } : undefined);
      return;
    }
    await Promise.all(
      temiz
        .filter((y) => y.startsWith("/yuklenen/"))
        .map((y) => fs.rm(path.join(YEREL_KLASOR, path.basename(y)), { force: true })),
    );
  } catch (hata) {
    console.error("Görsel dosyası silinemedi:", hata);
  }
}
