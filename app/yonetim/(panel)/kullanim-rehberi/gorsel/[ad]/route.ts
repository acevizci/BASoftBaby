import { readFile } from "node:fs/promises";
import path from "node:path";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

/** Kullanım rehberinin ekran görüntüleri (K-162); yalnızca yöneticiye. */
export const dynamic = "force-dynamic";

export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ ad: string }> },
): Promise<Response> {
  await yoneticiGerekli();
  const { ad } = await params;
  // Yalnızca klasördeki düz dosya adları: "../" ile başka dosya okunamasın.
  if (!/^[a-z0-9-]{1,40}\.jpg$/.test(ad)) return new Response("Yok", { status: 404 });
  try {
    const veri = await readFile(
      path.join(process.cwd(), "assets", "kullanim-rehberi", "gorsel", ad),
    );
    return new Response(new Uint8Array(veri), {
      headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=86400" },
    });
  } catch {
    return new Response("Yok", { status: 404 });
  }
}
