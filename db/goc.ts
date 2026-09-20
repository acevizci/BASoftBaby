/**
 * Göçleri (migration) uygulayan yapı adımı.
 *
 * `prisma migrate deploy` işe başlarken veritabanında bir danışma kilidi
 * alıyor: aynı anda iki dağıtım aynı göçü uygulamaya kalkmasın diye. Vercel'de
 * bir dala gönderip hemen ardından `main`'e birleştirince önizleme ve yayın
 * yapıları yan yana başlıyor, ikisi de aynı Neon veritabanına bakıyor. Kilidi
 * biri alınca öteki on saniye bekleyip pes ediyor ve bütün yapı düşüyor:
 *
 *     Error: P1002 — Timed out trying to acquire a postgres advisory lock
 *
 * Kilit doğru davranıyor; yanlış olan, ilk denemede pes edip yapıyı
 * düşürmekti. Burada üç şey yapılıyor:
 *
 * 1. **Göç havuzdan değil doğrudan bağlantıyla.** Havuz (PgBouncer) her
 *    sorguyu başka bir arka bağlantıya verebiliyor; oturuma bağlı olan danışma
 *    kilidi böyle bir bağlantıda güvenilir değil. Neon'da havuzlu adresin
 *    sunucu adında `-pooler` geçiyor, doğrudan adres onsuz olanı.
 * 2. **Önce veritabanını uyandır.** Neon kullanılmayan veritabanını
 *    uyutuyor; uykudan kalkması saniyeler sürüyor. Kilit denemesinin on
 *    saniyesi uyanmaya harcanmasın diye önce basit bir sorgu gönderiliyor.
 * 3. **Kilit meşgulse bekle ve yeniden dene.** Öteki dağıtımın göçü bitince
 *    kilit düşüyor. Bekleme her denemede uzuyor.
 *
 * Uygulanacak göç yoksa bunların hiçbiri fark ettirmiyor: komut saniyenin
 * altında "No pending migrations" deyip çıkıyor.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const DENEME = 5;

// Yerelde bağlantı adresi .env dosyasından gelir; Vercel'de ortam değişkeni
// olarak zaten tanımlı (prisma.config.ts da aynısını yapıyor).
const yerelEnv = path.join(process.cwd(), ".env");
if (fs.existsSync(yerelEnv)) process.loadEnvFile(yerelEnv);

/** Havuzlu Neon adresinden doğrudan bağlantı adresi. */
export function dogrudanAdres(adres: string): string {
  try {
    const u = new URL(adres);
    u.hostname = u.hostname.replace("-pooler.", ".");
    // Havuza özgü ayarlar doğrudan bağlantıda anlamsız.
    u.searchParams.delete("pgbouncer");
    u.searchParams.delete("connection_limit");
    return u.toString();
  } catch {
    // Adres çözümlenemiyorsa olduğu gibi kullan: göç yine de denensin.
    return adres;
  }
}

function bekle(ms: number): Promise<void> {
  return new Promise((c) => setTimeout(c, ms));
}

/** Neon uykudaysa uyandırır. Uyanmazsa göç denemesi yine de yapılır. */
async function uyandir(adres: string): Promise<void> {
  for (let i = 1; i <= 3; i += 1) {
    const istemci = new Client({ connectionString: adres, connectionTimeoutMillis: 15000 });
    try {
      await istemci.connect();
      await istemci.query("select 1");
      await istemci.end();
      return;
    } catch (e) {
      await istemci.end().catch(() => {});
      console.log(`  veritabanı uyanmadı (${i}/3): ${(e as Error).message}`);
      if (i < 3) await bekle(2000 * i);
    }
  }
}

function prismaKomutu(): string {
  const yerel = path.join(process.cwd(), "node_modules", ".bin", "prisma");
  return fs.existsSync(yerel) ? yerel : "npx";
}

/**
 * Prisma'nın çıktısı hem ekrana basılıyor hem de elde tutuluyor: hangi hatada
 * yeniden deneneceğine bakabilmek için metni okumak gerekiyor.
 */
function gocUygula(adres: string): void {
  const komut = prismaKomutu();
  const argumanlar = komut === "npx" ? ["prisma", "migrate", "deploy"] : ["migrate", "deploy"];
  try {
    const cikti = execFileSync(komut, argumanlar, {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env, DATABASE_URL: adres },
    });
    process.stdout.write(cikti);
  } catch (e) {
    const h = e as { stdout?: string; stderr?: string; message?: string };
    const metin = `${h.stdout ?? ""}${h.stderr ?? ""}`;
    process.stderr.write(metin);
    throw Object.assign(new Error(h.message ?? "prisma migrate deploy başarısız"), {
      cikti: metin,
    });
  }
}

/** Hata kilit ya da bağlantı yüzünden mi? Başka hatalarda beklemenin anlamı yok. */
function kilitHatasiMi(e: unknown): boolean {
  const h = e as { cikti?: string; message?: string };
  const metin = `${h?.cikti ?? ""} ${h?.message ?? String(e)}`;
  return (
    metin.includes("P1002") ||
    metin.includes("P1017") ||
    metin.includes("P1001") ||
    metin.includes("advisory lock")
  );
}

async function main(): Promise<void> {
  const havuzlu = process.env.DATABASE_URL;
  if (!havuzlu) throw new Error("DATABASE_URL tanımlı değil.");

  // Ayrı bir doğrudan adres tanımlıysa o kullanılıyor; yoksa havuzlu adresten
  // türetiliyor (Neon dışında bir sağlayıcıda adres olduğu gibi kalır).
  const adres = process.env.MIGRATE_DATABASE_URL ?? dogrudanAdres(havuzlu);

  await uyandir(adres);

  for (let deneme = 1; ; deneme += 1) {
    try {
      gocUygula(adres);
      return;
    } catch (e) {
      if (deneme >= DENEME || !kilitHatasiMi(e)) throw e;
      const saniye = 5 * 2 ** (deneme - 1);
      console.log(
        `\nGöç kilidi meşgul (${deneme}/${DENEME}). Öteki dağıtımın bitmesi için ${saniye} sn bekleniyor.\n`,
      );
      await bekle(saniye * 1000);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
