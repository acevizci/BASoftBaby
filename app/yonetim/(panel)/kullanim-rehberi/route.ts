import { readFile } from "node:fs/promises";
import path from "node:path";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

/**
 * Panel kullanım rehberi (K-162): ekran görüntülü, tam sayfa. Menünün
 * altındaki bağlantıdan yeni sekmede açılıyor. Yalnızca giriş yapmış
 * yöneticiye; oturumu kendi soruyor (K-51). Sayfa `assets/` altında duran
 * düz HTML: panel düzeninden bağımsız, kendi içindekiler menüsüyle.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await yoneticiGerekli("/yonetim/kullanim-rehberi");
  const html = await readFile(
    path.join(process.cwd(), "assets", "kullanim-rehberi", "index.html"),
    "utf8",
  );
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, max-age=300",
      "x-robots-tag": "noindex",
    },
  });
}
