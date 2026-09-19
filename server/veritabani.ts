import { PrismaClient } from "@/db/uretilen/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Veritabanı bağlantısı.
 *
 * Bağlantı adresi `DATABASE_URL` ortam değişkeninden geliyor; koda ya da
 * depoya hiçbir zaman yazılmıyor. Vercel'de Neon kurulumu bu değişkeni
 * kendisi ekliyor.
 *
 * Geliştirme sırasında dosya her kaydedildiğinde modül yeniden yükleniyor;
 * istemciyi global'de tutmazsak her seferinde yeni bir bağlantı havuzu açılır
 * ve veritabanı kısa sürede bağlantı sınırına dayanır.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function istemciKur(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL tanımlı değil. Vercel'de proje ayarlarında, yerelde .env dosyasında olmalı.",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const db: PrismaClient = globalForPrisma.prisma ?? istemciKur();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
