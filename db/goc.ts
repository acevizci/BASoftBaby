/**
 * Göçleri (migration) uygulayan yapı adımı.
 *
 * `prisma migrate deploy` işe başlarken veritabanında bir danışma kilidi
 * alıyor: aynı anda iki dağıtım aynı göçü uygulamaya kalkmasın diye. Kilidi
 * alamazsa on saniye sonra pes ediyor ve bütün yapı düşüyor:
 *
 *     Error: P1002 — Timed out trying to acquire a postgres advisory lock
 *
 * Bunun iki ayrı sebebi oluyor ve ikisinin çaresi farklı:
 *
 * **Kilit gerçekten kullanımda.** Bir dala gönderip hemen `main`'e
 * birleştirince Vercel önizleme ve yayın yapılarını yan yana başlatıyor,
 * ikisi de aynı veritabanına bakıyor. Doğrusu beklemek: öteki dağıtımın göçü
 * bitince kilit düşüyor.
 *
 * **Kilit bırakılmış.** Dağıtım göç uygularken kesilirse (Vercel eski yapıyı
 * iptal eder) oturum kilidi tutarken ölüyor, ama havuzdaki bağlantı ayakta
 * kaldığı için kilit düşmüyor. Kendiliğinden de düşmüyor: o oturum
 * kapatılmadan **hiçbir** dağıtım geçemiyor. Beklemek burada işe yaramıyor,
 * sonsuza kadar beklenir.
 *
 * Bu yüzden kilit meşgulse önce kimin tuttuğuna bakılıyor. Oturum çalışıyorsa
 * (`active`) gerçekten göç uygulanıyordur, beklenir. Dakikalarca boşta duran
 * bir oturum ise kilidi bırakmıştır; kapatılıyor ve kilit onunla düşüyor.
 *
 * Ayrıca:
 *
 * - **Göç havuzdan değil doğrudan bağlantıyla.** Havuz (PgBouncer) her sorguyu
 *   başka bir arka bağlantıya verebiliyor; oturuma bağlı olan danışma kilidi
 *   böyle bir bağlantıda güvenilir değil — kilidin bırakılıp kalmasının asıl
 *   sebebi de bu. Neon'da havuzlu adresin sunucu adında `-pooler` geçiyor,
 *   doğrudan adres onsuz olanı.
 * - **Önce veritabanı uyandırılıyor.** Neon kullanılmayan veritabanını
 *   uyutuyor; kilit denemesinin on saniyesi uyanmaya harcanmasın diye önce
 *   basit bir sorgu gönderiliyor.
 *
 * Uygulanacak göç yoksa bunların hiçbiri fark ettirmiyor: komut saniyenin
 * altında "No pending migrations" deyip çıkıyor.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const DENEME = 5;

/**
 * Prisma'nın göç kilidinin numarası. Hata metninde de geçiyor:
 * `SELECT pg_advisory_lock(72707369)`.
 */
const KILIT = 72707369;

/**
 * Bu kadar süredir boşta duran bir oturum kilidi bırakmış sayılıyor. Göç
 * uygularken oturum çalışır (`active`) durumda olur; kilidi tutup dakikalarca
 * hiçbir şey yapmayan oturum artık göç uygulamıyordur.
 */
const BIRAKILMIS_SANIYE = 20;

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

/** Adresteki sunucu adı — kullanıcı adı ve şifre asla yazılmıyor. */
function sunucuAdi(adres: string): string {
  try {
    return new URL(adres).hostname;
  } catch {
    return "(adres çözümlenemedi)";
  }
}

type Sahip = { pid: number; durum: string; bosta: number; uygulama: string };

/**
 * Kilidi şu an kim tutuyor?
 *
 * `pg_advisory_lock(bigint)` kilidi `pg_locks` içinde classid/objid/objsubid
 * olarak duruyor; numaramız 2^32'nin altında olduğu için classid sıfır.
 */
async function kilitSahibi(adres: string): Promise<Sahip | null> {
  const istemci = new Client({ connectionString: adres, connectionTimeoutMillis: 15000 });
  try {
    await istemci.connect();
    const { rows } = await istemci.query(
      `select a.pid,
              coalesce(a.state, '?') as durum,
              coalesce(a.application_name, '') as uygulama,
              extract(epoch from (now() - a.state_change)) as bosta
         from pg_locks l
         join pg_stat_activity a on a.pid = l.pid
        where l.locktype = 'advisory'
          and l.classid = 0 and l.objid = $1 and l.objsubid = 1
          and l.granted
        limit 1`,
      [KILIT],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      pid: Number(r.pid),
      durum: String(r.durum),
      uygulama: String(r.uygulama),
      bosta: Number(r.bosta ?? 0),
    };
  } finally {
    await istemci.end().catch(() => {});
  }
}

/** Bırakılmış kilidi tutan oturumu kapatır; kilit onunla birlikte düşer. */
async function oturumuKapat(adres: string, pid: number): Promise<boolean> {
  const istemci = new Client({ connectionString: adres, connectionTimeoutMillis: 15000 });
  try {
    await istemci.connect();
    const { rows } = await istemci.query("select pg_terminate_backend($1) as sonuc", [pid]);
    return rows[0]?.sonuc === true;
  } catch (e) {
    console.log(`  oturum kapatılamadı: ${(e as Error).message}`);
    return false;
  } finally {
    await istemci.end().catch(() => {});
  }
}

/**
 * Kilit meşgulse ne yapılacağına karar verir.
 *
 * Kilidi tutan oturum çalışıyorsa gerçekten göç uygulanıyordur: beklenir.
 * Ama dakikalarca boşta duran bir oturum kilidi **bırakmış** demektir — yarıda
 * kesilen bir dağıtımdan kalmış olur ve kendiliğinden düşmez; o oturum
 * kapatılmadan hiçbir dağıtım geçemez. Böyle bir oturum kapatılıyor.
 */
async function kilidiCoz(adres: string): Promise<boolean> {
  let sahip: Sahip | null;
  try {
    sahip = await kilitSahibi(adres);
  } catch (e) {
    console.log(`  kilit sahibi sorulamadı: ${(e as Error).message}`);
    return false;
  }

  if (!sahip) {
    console.log("  kilidi tutan oturum görünmüyor; yeniden denenecek.");
    return false;
  }

  console.log(
    `  kilidi tutan oturum: pid ${sahip.pid}, durum "${sahip.durum}", ` +
      `${Math.round(sahip.bosta)} sn'dir bu durumda${sahip.uygulama ? ` (${sahip.uygulama})` : ""}`,
  );

  if (sahip.durum === "active") {
    console.log("  oturum çalışıyor: gerçekten göç uygulanıyor olabilir, bekleniyor.");
    return false;
  }
  if (sahip.bosta < BIRAKILMIS_SANIYE) {
    console.log("  oturum yeni boşa düştü, biraz daha bekleniyor.");
    return false;
  }

  console.log("  oturum kilidi bırakmış görünüyor (yarıda kesilmiş dağıtım). Kapatılıyor.");
  const oldu = await oturumuKapat(adres, sahip.pid);
  console.log(oldu ? "  oturum kapatıldı, kilit serbest." : "  oturum kapatılamadı.");
  return oldu;
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

  console.log(`Göç sunucusu: ${sunucuAdi(adres)}`);
  await uyandir(adres);

  for (let deneme = 1; ; deneme += 1) {
    try {
      gocUygula(adres);
      return;
    } catch (e) {
      if (!kilitHatasiMi(e)) throw e;
      if (deneme >= DENEME) {
        console.error(
          `\nGöç kilidi ${DENEME} denemede de alınamadı. Kilidi tutan oturum\n` +
            "kapatılamıyorsa veritabanı konsolundan şu sorgu çalıştırılabilir:\n\n" +
            `  select pg_terminate_backend(pid) from pg_locks\n` +
            `   where locktype = 'advisory' and objid = ${KILIT} and granted;\n`,
        );
        throw e;
      }
      console.log(`\nGöç kilidi meşgul (${deneme}/${DENEME}).`);

      // Kilit bırakılmışsa temizlenip hemen yeniden denenir; gerçekten
      // kullanılıyorsa beklenir.
      if (await kilidiCoz(adres)) continue;

      const saniye = 5 * 2 ** (deneme - 1);
      console.log(`  ${saniye} sn bekleniyor.\n`);
      await bekle(saniye * 1000);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
