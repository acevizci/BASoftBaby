"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { GIDER_KATEGORILERI, ayEkle, ayGecerliMi, buAy, tutarCoz } from "@/server/sabit-gider";

/** Sabit gider eylemleri (K-115). Hepsi görüntülenen aya geri dönüyor. */

function donus(ay: string, ek: string): never {
  redirect(`/yonetim/kar?ay=${ay}&${ek}#giderler`);
}

function ayAl(form: FormData): string {
  const ay = String(form.get("ay") ?? "");
  return ayGecerliMi(ay) ? ay : buAy();
}

export async function sabitGiderEkle(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();
  const ay = ayAl(form);
  const kategoriHam = String(form.get("kategori") ?? "");
  const kategori = kategoriHam in GIDER_KATEGORILERI ? kategoriHam : "diger";
  const tutarKurus = tutarCoz(String(form.get("tutar") ?? ""));
  // Üst sınır yazım hatasına karşı: 25.000 yerine 25.000.000.
  if (tutarKurus === null || tutarKurus <= 0 || tutarKurus > 1_000_000_000) donus(ay, "hata=tutar");

  await db.expense.create({
    data: {
      ay,
      tekrarli: form.get("tekrarli") !== null,
      kategori,
      aciklama: String(form.get("aciklama") ?? "").trim().slice(0, 120),
      tutarKurus,
      adminId: ben.id,
      yapan: ben.adSoyad,
    },
  });
  donus(ay, "kayit=eklendi");
}

/**
 * Görüntülenen aydan itibaren kaldırır.
 *
 * Tek seferlik gider siliniyor. Tekrarlı gider bu aydan önce başladıysa
 * silinmiyor, bir önceki ayda durduruluyor: geçmiş ayların hesabı
 * değişmesin. Bu ay başladıysa siliniyor.
 */
export async function sabitGiderKaldir(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const ay = ayAl(form);
  const id = String(form.get("id") ?? "");
  const g = await db.expense.findUnique({ where: { id } });
  if (!g) donus(ay, "hata=yok");

  if (g.tekrarli && g.ay < ay) {
    await db.expense.update({ where: { id }, data: { bitisAy: ayEkle(ay, -1) } });
    donus(ay, "kayit=durduruldu");
  }
  await db.expense.delete({ where: { id } });
  donus(ay, "kayit=silindi");
}
