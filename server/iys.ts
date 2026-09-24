import "server-only";

/**
 * Ticari ileti izinlerinin kaydı (K-125).
 *
 * İzin her değiştiğinde (üye olurken onay, hesap ayarından açma/kapatma,
 * e-postadaki "listeden çık", hesap silme) bir kayıt düşüyor. Panelde
 * Müşteriler › E-bülten ekranından İYS'ye yüklenecek dosya bu kayıtlardan
 * üretiliyor.
 */

import { db } from "@/server/veritabani";

type Islem = Pick<typeof db, "consentEvent">;

export async function izinDegisti(eposta: string, onay: boolean, islem: Islem = db): Promise<void> {
  await islem.consentEvent.create({
    data: { eposta: eposta.toLowerCase(), durum: onay ? "ONAY" : "RET" },
  });
}
