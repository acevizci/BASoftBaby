import { NextResponse } from "next/server";
import { kisiselVeriyiTopla } from "@/server/kisisel-veri";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";

/**
 * Bir müşterinin kişisel verisi, JSON dosyası olarak (KVKK erişim hakkı).
 *
 * Üye bunu kendi hesabından indirebiliyor (K-39); burası telefonla ya da
 * e-postayla "verilerimi gönderin" diyen kişi için (K-70). Başvuru kanalı
 * değişince hak değişmiyor, o yüzden ikisi de **aynı işlevi** çağırıyor:
 * dosyanın içeriği birebir aynı, şifre özeti ve oturum jetonları ikisinde de
 * dışarıda.
 *
 * Rota grubunun düzeni buraya uğramıyor — API rotaları düzen bileşenlerini
 * çalıştırmıyor — o yüzden yetki kontrolü burada tekrar yapılıyor (K-45).
 */
export const dynamic = "force-dynamic";

export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  await yoneticiGerekli();

  const { id } = await params;
  let veri;
  try {
    veri = await kisiselVeriyiTopla(id);
  } catch {
    return NextResponse.json({ hata: "Müşteri bulunamadı." }, { status: 404 });
  }

  const gun = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(veri, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="basoftbaby-musteri-${gun}.json"`,
      "cache-control": "no-store",
    },
  });
}
