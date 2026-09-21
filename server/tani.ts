import "server-only";

/**
 * Dağıtım tanısı: işlev nerede çalışıyor, veritabanı nerede duruyor, arası
 * ne kadar sürüyor.
 *
 * Bu sayfanın çıkış sebebi somut: yayındaki `X-Vercel-Id` başlığı
 * `fra1::iad1::` diyordu — kenar Frankfurt'ta, işlev Washington'da. Veritabanı
 * da Washington'daysa sorun yok; Frankfurt'taysa her sorgu Atlantik'i iki kez
 * geçiyor demektir. İkisinin nerede olduğunu tahmin etmek yerine burada
 * yazıyor.
 *
 * **Bağlantı adresi asla ekrana çıkmıyor.** Yalnızca sunucu adından okunan
 * bölge kodu gösteriliyor; kullanıcı adı, şifre ve tam sunucu adı değil.
 */

import { Client } from "pg";

/** Vercel işlev bölgeleri — kod → şehir. */
const VERCEL_BOLGELERI: Record<string, string> = {
  arn1: "Stockholm",
  bom1: "Mumbai",
  cdg1: "Paris",
  cle1: "Cleveland",
  cpt1: "Cape Town",
  dub1: "Dublin",
  fra1: "Frankfurt",
  gru1: "São Paulo",
  hkg1: "Hong Kong",
  hnd1: "Tokyo",
  iad1: "Washington",
  icn1: "Seul",
  kix1: "Osaka",
  lhr1: "Londra",
  pdx1: "Portland",
  sfo1: "San Francisco",
  sin1: "Singapur",
  syd1: "Sidney",
};

/** AWS bölgeleri — Neon sunucu adında bunlardan biri geçiyor. */
const AWS_BOLGELERI: Record<string, string> = {
  "eu-central-1": "Frankfurt",
  "eu-west-1": "İrlanda",
  "eu-west-2": "Londra",
  "us-east-1": "Virginia",
  "us-east-2": "Ohio",
  "us-west-2": "Oregon",
  "ap-southeast-1": "Singapur",
  "ap-southeast-2": "Sidney",
  "ap-northeast-1": "Tokyo",
  "sa-east-1": "São Paulo",
};

/** Hangi Vercel bölgesi hangi AWS bölgesiyle aynı şehirde. */
const AYNI_SEHIR: Record<string, string> = {
  fra1: "eu-central-1",
  iad1: "us-east-1",
  dub1: "eu-west-1",
  lhr1: "eu-west-2",
  sin1: "ap-southeast-1",
  syd1: "ap-southeast-2",
  hnd1: "ap-northeast-1",
  gru1: "sa-east-1",
  pdx1: "us-west-2",
};

export type Tani = {
  islevBolgesi: string | null;
  islevSehri: string | null;
  veritabaniBolgesi: string | null;
  veritabaniSehri: string | null;
  havuzluMu: boolean;
  aynidaMi: boolean | null;
  gidisDonusMs: number | null;
  olculenler: number[];
  /** Bağlantı kurma süresi: TLS el sıkışması + Neon uykudaysa uyanması. */
  baglantiMs: number | null;
  /** Bu işlev örneği kaç saniyedir ayakta. Sıfıra yakınsa soğuk başlamış. */
  ornekYasiSn: number;
  hata: string | null;
};

/**
 * Bu işlev örneğinin doğum anı.
 *
 * Modül kapsamı örnek başına bir kez çalışıyor; sayfa açıldığında buradaki
 * sayı küçükse istek soğuk bir örneğe düşmüş demektir. Az ziyaretçili bir
 * sitede bu istisna değil, kural.
 */
const ORNEK_BASLANGICI = Date.now();

/** Sunucu adından bölge kodunu ayıklar: ep-ad-123.eu-central-1.aws.neon.tech */
function bolgeyiBul(sunucu: string): string | null {
  for (const kod of Object.keys(AWS_BOLGELERI)) {
    if (sunucu.includes(`.${kod}.`)) return kod;
  }
  return null;
}

export type BolgeBilgisi = Pick<
  Tani,
  "islevBolgesi" | "islevSehri" | "veritabaniBolgesi" | "veritabaniSehri" | "havuzluMu" | "aynidaMi"
>;

/**
 * Bölgeleri adresten ve ortam değişkeninden okur. Bağlantı kurmuyor:
 * ayrı durması hem denenebilmesi hem de ölçüm başarısız olsa bile bölgelerin
 * görünebilmesi için.
 */
export function bolgeleriCoz(adres: string | undefined, vercelBolgesi?: string): BolgeBilgisi {
  const islevBolgesi = vercelBolgesi?.trim() || null;

  let sunucu = "";
  try {
    sunucu = adres ? new URL(adres).hostname : "";
  } catch {
    sunucu = "";
  }

  const veritabaniBolgesi = sunucu ? bolgeyiBul(sunucu) : null;

  return {
    islevBolgesi,
    islevSehri: islevBolgesi ? (VERCEL_BOLGELERI[islevBolgesi] ?? null) : null,
    veritabaniBolgesi,
    veritabaniSehri: veritabaniBolgesi ? AWS_BOLGELERI[veritabaniBolgesi] : null,
    havuzluMu: sunucu.includes("-pooler."),
    aynidaMi:
      islevBolgesi && veritabaniBolgesi
        ? AYNI_SEHIR[islevBolgesi] === veritabaniBolgesi
        : null,
  };
}

export async function taniTopla(): Promise<Tani> {
  const adres = process.env.DATABASE_URL;
  const bolgeler = bolgeleriCoz(adres, process.env.VERCEL_REGION);

  const olculenler: number[] = [];
  let baglantiMs: number | null = null;
  let hata: string | null = null;

  if (adres) {
    const istemci = new Client({ connectionString: adres, connectionTimeoutMillis: 10_000 });
    try {
      // Bağlantı kurma ayrı ölçülüyor: sorgu gecikmesiyle karışırsa hangisinin
      // pahalı olduğu anlaşılmıyor. Bu maliyet işlev örneği başına bir kez
      // ödeniyor, ama az ziyaretçili sitede her örnek neredeyse her istek.
      const baglaBasla = performance.now();
      await istemci.connect();
      baglantiMs = Math.round((performance.now() - baglaBasla) * 10) / 10;

      // Gidiş-dönüş: bağlantı kurulduktan sonra beş basit sorgu.
      for (let i = 0; i < 5; i += 1) {
        const basla = performance.now();
        await istemci.query("select 1");
        olculenler.push(Math.round((performance.now() - basla) * 10) / 10);
      }
    } catch (e) {
      hata = e instanceof Error ? e.message : "Bağlanılamadı.";
    } finally {
      await istemci.end().catch(() => {});
    }
  } else {
    hata = "DATABASE_URL tanımlı değil.";
  }

  // Ortanca: tek bir yavaş ölçüm ortalamayı bozmasın.
  const sirali = [...olculenler].sort((a, b) => a - b);
  const gidisDonusMs = sirali.length > 0 ? sirali[Math.floor(sirali.length / 2)] : null;

  return {
    ...bolgeler,
    gidisDonusMs,
    olculenler,
    baglantiMs,
    ornekYasiSn: Math.round((Date.now() - ORNEK_BASLANGICI) / 1000),
    hata,
  };
}

/** Bölgeler ayrıysa `vercel.json`a yazılacak satır. */
export function onerilenVercelBolgesi(veritabaniBolgesi: string | null): string | null {
  if (!veritabaniBolgesi) return null;
  const giris = Object.entries(AYNI_SEHIR).find(([, aws]) => aws === veritabaniBolgesi);
  return giris ? giris[0] : null;
}
