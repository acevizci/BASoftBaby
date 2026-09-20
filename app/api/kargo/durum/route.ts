import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { gonderiDurumunuIsle } from "@/server/kargo-islem";

/**
 * Taşıyıcı durum bildirimi.
 *
 * Toplayıcı bağlandığında gönderi durumlarını buraya bildirecek; şimdilik uç
 * hazır ve elle de çağrılabiliyor. Gövde: `{ takipNo, durum }`.
 *
 * `KARGO_BILDIRIM_SIRRI` tanımlıysa `Authorization: Bearer <sır>` aranıyor.
 * Sır tanımlı değilse uç hiç çalışmıyor — herkese açık bir uçla siparişlerin
 * durumu dışarıdan değiştirilebilirdi.
 */
export async function POST(istek: NextRequest) {
  const sir = process.env.KARGO_BILDIRIM_SIRRI;
  if (!sir) return new NextResponse("Kapalı", { status: 404 });
  if (istek.headers.get("authorization") !== `Bearer ${sir}`) {
    return new NextResponse("Yetkisiz", { status: 401 });
  }

  const govde = (await istek.json().catch(() => null)) as
    | { takipNo?: string; durum?: string }
    | null;

  const sonuc = await gonderiDurumunuIsle(
    String(govde?.takipNo ?? ""),
    String(govde?.durum ?? ""),
  );

  if (!sonuc.tamam) return NextResponse.json({ hata: sonuc.hata }, { status: 400 });

  revalidatePath("/", "layout");
  return NextResponse.json({ numara: sonuc.numara, durum: sonuc.durum });
}
