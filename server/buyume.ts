import "server-only";
import { db } from "@/server/veritabani";
import { buyumeEpostasi } from "@/server/eposta";
import { jetonUret } from "@/server/uyelik";
import { bedenAdlari } from "@/server/bedenler";
import { aylik, siradakiBeden } from "@/server/buyume-bicim";

/**
 * Büyüme hatırlatması (K-147). Bebek bir sonraki bedene geçmeden yaklaşık iki
 * hafta önce "X aylık oluyor, Y bedenine geçme zamanı" e-postası.
 *
 * **Doğum tarihi:** müşterinin Bilgilerim'e yazdığı; yoksa doğum listesindeki
 * beklenen tarih, geçmişse (bebek doğmuş).
 *
 * **Tanıtım sayılıyor** (ürün öneriyor): yalnızca pazarlama izni olan ve
 * e-postası doğrulanmış üyeye, altında listeden çıkma bağlantısıyla.
 * Aynı beden için bir kez (`buyumeBedeni`).
 */
type Gonderici = typeof buyumeEpostasi;

export async function buyumeHatirlatmalariniGonder(
  gonder: Gonderici = buyumeEpostasi,
  simdi: Date = new Date(),
): Promise<{ bakilan: number; gonderilen: number }> {
  const [musteriler, bedenler] = await Promise.all([
    db.customer.findMany({
      where: {
        pazarlamaIzni: true,
        epostaDogrulandi: { not: null },
        OR: [
          { bebekDogum: { not: null } },
          { hediyeListesi: { tarih: { not: null, lte: simdi } } },
        ],
      },
      select: {
        id: true,
        eposta: true,
        adSoyad: true,
        bebekDogum: true,
        buyumeBedeni: true,
        hediyeListesi: { select: { tarih: true } },
      },
      take: 500,
    }),
    bedenAdlari(),
  ]);

  let gonderilen = 0;
  for (const m of musteriler) {
    const dogum = m.bebekDogum ?? m.hediyeListesi?.tarih;
    if (!dogum) continue;
    const ay = aylik(dogum, simdi);
    if (ay === undefined) continue;
    const sira = siradakiBeden(bedenler, ay);
    if (!sira || sira.beden === m.buyumeBedeni) continue;

    const sonuc = await gonder(m.eposta, {
      adSoyad: m.adSoyad.split(" ")[0] || m.adSoyad,
      ay: sira.ay,
      beden: sira.beden,
      iptalJetonu: await jetonUret(m.id, "pazarlama-iptal"),
    });
    if (!sonuc.gonderildi) continue;
    await db.customer.update({ where: { id: m.id }, data: { buyumeBedeni: sira.beden } });
    gonderilen += 1;
  }
  return { bakilan: musteriler.length, gonderilen };
}
