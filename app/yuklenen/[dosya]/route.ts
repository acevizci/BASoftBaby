import fs from "node:fs/promises";
import path from "node:path";
import { YEREL_AD_KALIBI, YEREL_KLASOR } from "@/server/gorsel-depo";

/**
 * Yerelde yüklenen ürün fotoğraflarını sunar.
 *
 * Yayında fotoğraflar Vercel Blob'da duruyor ve adresleri tam URL olduğu için
 * bu uç hiç çağrılmıyor. Yerelde `public/` kullanılamıyor: oranın içeriği
 * derleme anında sabitleniyor, sonradan yazılan dosya sunulmuyordu.
 */
export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ dosya: string }> },
) {
  const { dosya } = await params;

  // path.basename ve kalıp birlikte: ".." ya da alt klasör içeren bir ad
  // buradan geçemiyor.
  const ad = path.basename(dosya);
  if (!YEREL_AD_KALIBI.test(ad)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  try {
    const veri = await fs.readFile(path.join(YEREL_KLASOR, ad));
    return new Response(new Uint8Array(veri), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Bulunamadı", { status: 404 });
  }
}
