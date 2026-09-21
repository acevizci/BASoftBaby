import "server-only";

/**
 * Giriş denemesi sınırı.
 *
 * scrypt her denemeyi yavaşlatıyor (bellek maliyeti 16 MB) ama **sınır
 * koymuyor:** bir hesaba saatlerce şifre denenebilirdi. Burası o sınırı
 * koyuyor.
 *
 * **İki ayrı sayaç, iki ayrı saldırı biçimi için:**
 *
 * - **E-posta başına** — belirli bir hesaba şifre deneyen saldırı. Anahtar
 *   e-postanın özeti, hesabın kimliği değil: hesap **var da olsa yok da
 *   olsa** aynı davranıyor. Böylece "bu adres kilitlendi" mesajı hangi
 *   adreslerin kayıtlı olduğunu ele vermiyor.
 * - **IP başına** — tek bir yerden çok sayıda hesaba tek tek şifre deneyen
 *   saldırı (şifre serpme). E-posta sayacı bunu yakalayamaz, çünkü her hesaba
 *   bir deneme düşüyor.
 *
 * **Kilit mesajı açıkça söyleniyor.** "Yanlış şifre" demeye devam etmek,
 * gerçek müşteriyi doğru şifresini yazarken bile giremediği için çaresiz
 * bırakırdı. Kilidin varlığını söylemek küçük bir bilgi veriyor ama e-posta
 * anahtarı özet olduğu için hesabın varlığını vermiyor.
 *
 * IP'nin kendisi saklanmıyor, özeti saklanıyor; kayıtlar günlük temizlikte
 * siliniyor.
 */

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/server/veritabani";

/** Bu kadar dakika içindeki denemeler aynı seriden sayılıyor. */
const PENCERE_DK = 15;

/** Kilit süresi. Pencereyle aynı: kilit açılınca sayaç da sıfırlanmış oluyor. */
const KILIT_DK = 15;

/** Tek bir e-postaya bu kadar hatalı denemeden sonra kilit. */
const EPOSTA_SINIRI = 5;

/**
 * Tek bir IP'den bu kadar hatalı denemeden sonra kilit.
 *
 * E-posta sınırından yüksek: aynı evden ya da iş yerinden birden çok kişi
 * girmeye çalışabiliyor ve şifresini unutan bir kişi yüzünden hepsi
 * kilitlenmemeli.
 */
const IP_SINIRI = 20;

function ozet(deger: string): string {
  return createHash("sha256").update(deger).digest("hex").slice(0, 32);
}

/**
 * İsteğin geldiği adres.
 *
 * Vercel `x-forwarded-for` başlığını kendisi yazıyor ve ilk değer gerçek
 * istemci. Yerelde başlık hiç olmayabiliyor; o zaman IP sayacı devre dışı
 * kalıyor, e-posta sayacı çalışmaya devam ediyor.
 */
async function ipAnahtari(): Promise<string | null> {
  const baslik = await headers();
  const ham = baslik.get("x-forwarded-for") ?? baslik.get("x-real-ip") ?? "";
  const ilk = ham.split(",")[0]?.trim();
  return ilk ? `ip:${ozet(ilk)}` : null;
}

export type SinirDurumu = { kilitli: boolean; kalanDk: number };

async function anahtarlar(eposta: string): Promise<string[]> {
  const ip = await ipAnahtari();
  return [`eposta:${ozet(eposta.trim().toLowerCase())}`, ...(ip ? [ip] : [])];
}

/** Giriş denenebilir mi? Kilitliyse kaç dakika kaldığını da söylüyor. */
export async function girisDenenebilirMi(eposta: string): Promise<SinirDurumu> {
  const simdi = Date.now();
  const kayitlar = await db.loginThrottle.findMany({
    where: { id: { in: await anahtarlar(eposta) }, kilitBitis: { gt: new Date(simdi) } },
    select: { kilitBitis: true },
  });

  if (kayitlar.length === 0) return { kilitli: false, kalanDk: 0 };

  const enGec = Math.max(...kayitlar.map((k) => k.kilitBitis!.getTime()));
  return { kilitli: true, kalanDk: Math.max(1, Math.ceil((enGec - simdi) / 60_000)) };
}

/**
 * Hatalı denemeyi sayar; sınır aşıldıysa kilitler ve **sonucu döndürür.**
 *
 * Sonucu döndürmesinin sebebi: kilit bu denemeyle kurulduysa kullanıcıya
 * hemen söylenebiliyor. Söylenmeseydi bir kez daha deneyip öğrenecekti —
 * doğru şifresini yazsa bile girememesinin sebebini bilmeden.
 *
 * Pencere dolduysa sayaç sıfırdan başlıyor: dün üç kez yanlış yazmış olmak
 * bugünkü hakkını yemiyor.
 */
export async function basarisizDeneme(eposta: string): Promise<SinirDurumu> {
  const simdi = new Date();
  const pencereBasi = new Date(simdi.getTime() - PENCERE_DK * 60_000);
  let kilitSonu = 0;

  for (const anahtar of await anahtarlar(eposta)) {
    const sinir = anahtar.startsWith("ip:") ? IP_SINIRI : EPOSTA_SINIRI;

    const kayit = await db.loginThrottle.findUnique({
      where: { id: anahtar },
      select: { sayac: true, ilkDeneme: true },
    });

    const seriDevam = kayit !== null && kayit.ilkDeneme > pencereBasi;
    const sayac = seriDevam ? kayit.sayac + 1 : 1;

    const kilitli = sayac >= sinir;
    const kilitBitis = kilitli ? new Date(simdi.getTime() + KILIT_DK * 60_000) : null;
    if (kilitBitis) kilitSonu = Math.max(kilitSonu, kilitBitis.getTime());

    await db.loginThrottle.upsert({
      where: { id: anahtar },
      create: {
        id: anahtar,
        sayac: 1,
        ilkDeneme: simdi,
        ...(sinir <= 1 ? { kilitBitis } : {}),
      },
      update: {
        sayac,
        ...(seriDevam ? {} : { ilkDeneme: simdi, kilitBitis: null }),
        ...(kilitli ? { kilitBitis } : {}),
      },
    });
  }

  return kilitSonu > 0
    ? { kilitli: true, kalanDk: Math.max(1, Math.ceil((kilitSonu - simdi.getTime()) / 60_000)) }
    : { kilitli: false, kalanDk: 0 };
}

/** Doğru şifre girildi: o e-postanın sayacı sıfırlanıyor. */
export async function basariliGiris(eposta: string): Promise<void> {
  await db.loginThrottle.deleteMany({
    where: { id: `eposta:${ozet(eposta.trim().toLowerCase())}` },
  });
}

/** Eski sayaçları siler; günlük temizlikte çağrılıyor. */
export async function eskiGirisSayaclariniTemizle(): Promise<number> {
  const sinir = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await db.loginThrottle.deleteMany({
    where: { guncellendi: { lt: sinir } },
  });
  return count;
}
