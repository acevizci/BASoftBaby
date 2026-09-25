import "server-only";
import { randomInt } from "node:crypto";
import { db } from "@/server/veritabani";
import { tesvikEpostasi } from "@/server/eposta";
import { jetonUret } from "@/server/uyelik";

/**
 * İkinci sipariş teşviki (K-151).
 *
 * İlk (ve tek) siparişi teslim edilmiş, ödemesi alınmış, iptal ya da iade
 * edilmemiş üyeye teslimden `tesvikGun` gün sonra kişiye özel, tek
 * kullanımlık, süreli bir yüzde kuponu. Kupon bir `Campaign` kaydı
 * (`customerId` + `enFazlaKullanim: 1`), panelde kampanyalar listesine
 * girmiyor.
 *
 * **Tanıtım:** yalnızca pazarlama izni açık, e-postası doğrulanmış üyeye.
 * Üye başına bir kez (`tesvikGonderildi`). Teslimi `tesvikGun + 14` günden
 * eski siparişe bakılmıyor: özellik açıldığında eski müşterilerin hepsine
 * birden kupon gitmesin.
 */

const GUN = 24 * 60 * 60 * 1000;
const HARFLER = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function tesvikKoduUret(): string {
  return `TESEKKUR-${Array.from({ length: 6 }, () => HARFLER[randomInt(HARFLER.length)]).join("")}`;
}

export async function tesvikleriGonder(
  gonder: typeof tesvikEpostasi = tesvikEpostasi,
  simdi: Date = new Date(),
): Promise<{ bakilan: number; gonderilen: number }> {
  const ayar = await db.storeSetting.findUnique({
    where: { id: "tek" },
    select: { tesvikYuzde: true, tesvikGun: true, tesvikGecerlilik: true },
  });
  if (!ayar || ayar.tesvikYuzde <= 0) return { bakilan: 0, gonderilen: 0 };

  const enGec = new Date(simdi.getTime() - ayar.tesvikGun * GUN);
  const enErken = new Date(enGec.getTime() - 14 * GUN);

  const adaylar = await db.customer.findMany({
    where: {
      pazarlamaIzni: true,
      epostaDogrulandi: { not: null },
      tesvikGonderildi: null,
      siparisler: {
        some: {
          durum: "teslim",
          odemeDurumu: "odendi",
          teslimTarihi: { gte: enErken, lte: enGec },
        },
      },
    },
    select: {
      id: true,
      eposta: true,
      adSoyad: true,
      _count: { select: { siparisler: { where: { durum: { not: "iptal" } } } } },
    },
    take: 200,
  });

  let gonderilen = 0;
  for (const m of adaylar) {
    // Yalnızca ilk siparişten sonra: ikinciyi zaten vermiş olana gerek yok.
    if (m._count.siparisler !== 1) continue;

    const bitis = new Date(simdi.getTime() + ayar.tesvikGecerlilik * GUN);
    const kod = tesvikKoduUret();
    const kupon = await db.campaign.create({
      data: {
        ad: "İkinci sipariş teşviki",
        tip: "yuzde",
        deger: ayar.tesvikYuzde,
        kapsam: "tumu",
        kuponKodu: kod,
        customerId: m.id,
        enFazlaKullanim: 1,
        baslangic: simdi,
        bitis,
      },
      select: { id: true },
    });

    const sonuc = await gonder(m.eposta, {
      adSoyad: m.adSoyad.split(" ")[0] || m.adSoyad,
      kod,
      yuzde: ayar.tesvikYuzde,
      bitis,
      iptalJetonu: await jetonUret(m.id, "pazarlama-iptal"),
    });
    if (!sonuc.gonderildi) {
      // Gitmeyen kupon kalmasın; ertesi gün yeni kodla yeniden denenir.
      await db.campaign.delete({ where: { id: kupon.id } });
      continue;
    }
    await db.customer.update({ where: { id: m.id }, data: { tesvikGonderildi: simdi } });
    gonderilen += 1;
  }
  return { bakilan: adaylar.length, gonderilen };
}
