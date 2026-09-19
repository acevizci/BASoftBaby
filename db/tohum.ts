/**
 * Başlangıç verisi.
 *
 * Mağaza ilk açıldığında boş görünmesin diye kategoriler, örnek ürünler ve
 * duyuru şeridi mesajları buradan yazılır. `npm run tohum` ile çalışır ve
 * tekrar tekrar çalıştırılabilir: var olan kaydı günceller, yenisini ekler,
 * eldeki stoğu ya da sonradan girilmiş ürünleri silmez.
 *
 * Örnek ürünler gerçek ürünler girilince yönetim panelinden silinebilir.
 */

import { PrismaClient } from "./uretilen/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL tanımlı değil.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const KATEGORILER = [
  { slug: "yenidogan", ad: "Yenidoğan", aciklama: "İlk aylar için en yumuşak kumaşlar", sira: 1 },
  { slug: "zibin-body", ad: "Zıbın & Body", aciklama: "Günlük kullanımın temel parçası", sira: 2 },
  { slug: "tulum", ad: "Tulum", aciklama: "Tek parça, kolay giydirilen kalıplar", sira: 3 },
  { slug: "uyku", ad: "Uyku", aciklama: "Uyku tulumu, battaniye ve örtüler", sira: 4 },
  {
    slug: "aksesuar",
    ad: "Aksesuar",
    aciklama: "Şapka, patik, önlük ve küçük tamamlayıcılar",
    sira: 5,
  },
];

type TohumUrun = {
  slug: string;
  ad: string;
  ozet: string;
  kategori: string;
  gorsel: string;
  palet: string;
  fiyatKurus: number;
  eskiFiyatKurus?: number;
  rozetTon?: string;
  rozetYazi?: string;
  puan: number;
  yorumSayisi: number;
  kumasIcerigi: string;
  yikamaTalimati: string;
  ozellikler: string[];
  /** [renk, beden, stok] üçlüleri */
  varyantlar: [string, string, number][];
};

function varyantlar(renkler: string[], bedenler: string[], stoklar: number[]) {
  const cikti: [string, string, number][] = [];
  renkler.forEach((renk, ri) => {
    bedenler.forEach((beden, bi) => {
      cikti.push([renk, beden, stoklar[(ri * bedenler.length + bi) % stoklar.length]]);
    });
  });
  return cikti;
}

const URUNLER: TohumUrun[] = [
  {
    slug: "ayiciklu-organik-body",
    ad: "Ayıcıklı organik body",
    ozet: "Kısa kollu, çıtçıtlı",
    kategori: "zibin-body",
    gorsel: "zibin",
    palet: "mercan",
    fiyatKurus: 24990,
    rozetTon: "mercan",
    rozetYazi: "Çok satan",
    puan: 4.8,
    yorumSayisi: 126,
    kumasIcerigi: "%100 organik pamuk",
    yikamaTalimati: "30°C hassas yıkama, çamaşır suyu kullanmayın",
    ozellikler: ["Dikişsiz omuz bandı", "Çıtçıtlı alt kapama", "OEKO-TEX sertifikalı"],
    varyantlar: varyantlar(
      ["mercan", "krem", "mint", "mavi", "sari"],
      ["0-3 ay", "3-6 ay", "6-9 ay", "9-12 ay"],
      [12, 8, 0, 5, 3, 14, 7, 2],
    ),
  },
  {
    slug: "fitilli-pamuk-tulum",
    ad: "Fitilli pamuk tulum",
    ozet: "Fermuarlı, ayaklı",
    kategori: "tulum",
    gorsel: "tulum",
    palet: "mint",
    fiyatKurus: 42990,
    eskiFiyatKurus: 49990,
    rozetTon: "mint",
    rozetYazi: "İndirimde",
    puan: 4.9,
    yorumSayisi: 84,
    kumasIcerigi: "%95 pamuk, %5 elastan",
    yikamaTalimati: "30°C hassas yıkama, düşük ısıda ütüleyin",
    ozellikler: ["Boydan fermuar", "Kapalı ayak", "Çenelik korumalı fermuar ucu"],
    varyantlar: varyantlar(
      ["mint", "krem", "mavi"],
      ["0-3 ay", "3-6 ay", "6-9 ay", "9-12 ay", "12-18 ay"],
      [6, 9, 4, 0, 11, 2],
    ),
  },
  {
    slug: "muslin-battaniye-120x120",
    ad: "Müslin battaniye 120×120",
    ozet: "Çift kat, dört mevsim",
    kategori: "uyku",
    gorsel: "battaniye",
    palet: "mavi",
    fiyatKurus: 37990,
    puan: 4.7,
    yorumSayisi: 203,
    kumasIcerigi: "%100 pamuk müslin",
    yikamaTalimati: "40°C yıkama, her yıkamada yumuşar",
    ozellikler: ["Tek beden 120×120 cm", "Nefes alan dokuma", "Kundak olarak da kullanılır"],
    varyantlar: [
      ["mavi", "0-3 ay", 18],
      ["mint", "0-3 ay", 7],
      ["krem", "0-3 ay", 0],
      ["sari", "0-3 ay", 24],
    ],
  },
  {
    slug: "bambu-patik-2li",
    ad: "Bambu patik · 2'li",
    ozet: "Kaydırmaz tabanlı",
    kategori: "aksesuar",
    gorsel: "patik",
    palet: "sari",
    fiyatKurus: 15990,
    eskiFiyatKurus: 19990,
    rozetTon: "mercan",
    rozetYazi: "%20",
    puan: 4.6,
    yorumSayisi: 51,
    kumasIcerigi: "%70 bambu, %30 pamuk",
    yikamaTalimati: "30°C yıkama, kurutma makinesine vermeyin",
    ozellikler: ["Kaydırmaz silikon taban", "Lastiği bacağı sıkmaz", "İkili paket"],
    varyantlar: varyantlar(["sari", "krem", "mercan"], ["0-3 ay", "3-6 ay", "6-9 ay"], [15, 0, 6, 9, 3]),
  },
  {
    slug: "kadife-sapka",
    ad: "Kadife şapka",
    ozet: "Kulak korumalı",
    kategori: "aksesuar",
    gorsel: "sapka",
    palet: "krem",
    fiyatKurus: 18990,
    rozetTon: "sari",
    rozetYazi: "Son 3 adet",
    puan: 4.9,
    yorumSayisi: 37,
    kumasIcerigi: "%100 pamuk kadife, astarlı",
    yikamaTalimati: "Elde yıkama, gölgede kurutun",
    ozellikler: ["Kulakları kapatan kesim", "Bağcıksız, boğmaz", "Astarlı iç yüzey"],
    varyantlar: varyantlar(["krem", "mint", "mavi", "sari"], ["0-3 ay", "3-6 ay", "6-9 ay"], [1, 2, 0, 3]),
  },
  {
    slug: "organik-zibin-3lu-set",
    ad: "Organik zıbın · 3'lü set",
    ozet: "Uzun kollu, dikişsiz",
    kategori: "yenidogan",
    gorsel: "zibin",
    palet: "mint",
    fiyatKurus: 21990,
    eskiFiyatKurus: 28990,
    rozetTon: "mercan",
    rozetYazi: "%24",
    puan: 4.8,
    yorumSayisi: 168,
    kumasIcerigi: "%100 organik pamuk",
    yikamaTalimati: "30°C hassas yıkama, ilk yıkamayı giymeden yapın",
    ozellikler: ["Üç adet bir arada", "Dikişsiz yan bantlar", "Bebek eli kapatmalı kol ucu"],
    varyantlar: varyantlar(
      ["mint", "krem", "mercan", "mavi", "sari"],
      ["0-3 ay", "3-6 ay", "6-9 ay"],
      [22, 14, 9, 0, 17, 6],
    ),
  },
  {
    slug: "pamuklu-onluk-3lu",
    ad: "Pamuklu önlük · 3'lü",
    ozet: "Su geçirmez arkalı",
    kategori: "aksesuar",
    gorsel: "onluk",
    palet: "mercan",
    fiyatKurus: 13990,
    rozetTon: "mint",
    rozetYazi: "Yeni",
    puan: 4.5,
    yorumSayisi: 29,
    kumasIcerigi: "%100 pamuk ön yüz, su geçirmez arka",
    yikamaTalimati: "40°C yıkama, sık yıkamaya dayanıklı",
    ozellikler: ["Çıtçıtlı boyun", "Üçlü paket", "Leke tutmayan yüzey"],
    varyantlar: [
      ["mercan", "0-3 ay", 31],
      ["sari", "0-3 ay", 12],
      ["mint", "0-3 ay", 8],
    ],
  },
  {
    slug: "uyku-tulumu-25-tog",
    ad: "Uyku tulumu · 2.5 TOG",
    ozet: "Kolsuz, fermuarlı",
    kategori: "uyku",
    gorsel: "tulum",
    palet: "mavi",
    fiyatKurus: 62990,
    eskiFiyatKurus: 74990,
    rozetTon: "mercan",
    rozetYazi: "%16",
    puan: 4.9,
    yorumSayisi: 92,
    kumasIcerigi: "%100 pamuk dış, elyaf dolgu",
    yikamaTalimati: "30°C yıkama, dolgusu topaklanmaz",
    ozellikler: ["Kış kalınlığı 2.5 TOG", "Ters yönde fermuar", "Kolsuz kesim, terletmez"],
    varyantlar: varyantlar(["mavi", "krem", "mint"], ["0-3 ay", "3-6 ay", "6-9 ay", "9-12 ay"], [4, 7, 0, 2, 9]),
  },
];

const DUYURULAR = [
  { metin: "750 TL ve üzeri siparişlerde kargo bedava", sira: 1 },
  { metin: "Aynı gün kargo · saat 16:00'a kadar verilen siparişler bugün çıkar", sira: 2 },
  { metin: "Hediye paketi ücretsiz", sira: 3 },
];

async function main() {
  for (const k of KATEGORILER) {
    await db.category.upsert({
      where: { slug: k.slug },
      update: { ad: k.ad, aciklama: k.aciklama, sira: k.sira },
      create: k,
    });
  }

  for (const u of URUNLER) {
    const kategori = await db.category.findUniqueOrThrow({ where: { slug: u.kategori } });
    const alanlar = {
      ad: u.ad,
      ozet: u.ozet,
      categoryId: kategori.id,
      fiyatKurus: u.fiyatKurus,
      eskiFiyatKurus: u.eskiFiyatKurus ?? null,
      kumasIcerigi: u.kumasIcerigi,
      yikamaTalimati: u.yikamaTalimati,
      ozellikler: u.ozellikler,
      rozetTon: u.rozetTon ?? null,
      rozetYazi: u.rozetYazi ?? null,
      gorsel: u.gorsel,
      palet: u.palet,
      puan: u.puan,
      yorumSayisi: u.yorumSayisi,
    };

    const urun = await db.product.upsert({
      where: { slug: u.slug },
      update: alanlar,
      create: { slug: u.slug, ...alanlar },
    });

    for (const [renk, beden, stok] of u.varyantlar) {
      await db.productVariant.upsert({
        where: { productId_beden_renk: { productId: urun.id, beden, renk } },
        // Stok mağazanın gerçek verisi; tohum onu ezmez, yalnızca yoksa yazar.
        update: {},
        create: {
          productId: urun.id,
          beden,
          renk,
          stok,
          sku: `${u.slug}-${beden.replace(/\s/g, "")}-${renk}`,
        },
      });
    }
  }

  for (const d of DUYURULAR) {
    const varOlan = await db.announcement.findFirst({ where: { metin: d.metin } });
    if (!varOlan) await db.announcement.create({ data: d });
  }

  await db.storeSetting.upsert({ where: { id: "tek" }, update: {}, create: { id: "tek" } });

  const [kategori, urun, varyant, duyuru] = await Promise.all([
    db.category.count(),
    db.product.count(),
    db.productVariant.count(),
    db.announcement.count(),
  ]);
  console.log(
    `Tamam: ${kategori} kategori, ${urun} ürün, ${varyant} varyant, ${duyuru} duyuru.`,
  );
}

main()
  .catch((hata) => {
    console.error(hata);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
