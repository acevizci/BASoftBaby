import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Yerelde bağlantı adresi .env dosyasından gelir; Vercel'de zaten ortam
// değişkeni olarak tanımlı olduğu için dosya aranmaz.
const yerelEnv = path.join(process.cwd(), ".env");
if (fs.existsSync(yerelEnv)) process.loadEnvFile(yerelEnv);

export default defineConfig({
  schema: path.join("db", "schema.prisma"),
  migrations: {
    path: path.join("db", "migrations"),
    seed: "tsx db/tohum.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
