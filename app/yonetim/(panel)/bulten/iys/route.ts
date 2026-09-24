import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { iysCsv, type IzinKaydi } from "@/server/iys-bicim";

/**
 * İYS'ye yüklenecek dosya (K-125): henüz bildirilmemiş izin kayıtları.
 * İndirmek bir şeyi değiştirmiyor; yükleme bitince ekrandan "bildirildi"
 * işaretleniyor.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await yoneticiGerekli();
  const kayitlar = await db.consentEvent.findMany({
    where: { iysBildirildi: null },
    orderBy: { tarih: "asc" },
    select: { eposta: true, durum: true, kaynak: true, tarih: true },
  });
  const gun = new Date().toISOString().slice(0, 10);
  return new Response(iysCsv(kayitlar as IzinKaydi[]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="iys-izinler-${gun}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
