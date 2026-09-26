import "server-only";
import { randomInt } from "node:crypto";
import { db } from "@/server/veritabani";
import { davetOdulEpostasi } from "@/server/eposta";
import { kodUret } from "@/server/hediye-ceki-bicim";

/**
 * Arkadaşını davet et (K-152).
 *
 * Her üyenin bir davet bağlantısı var (`/davet/<kod>`). Bağlantıyla gelip üye
 * olan arkadaşa kişiye özel, tek kullanımlık ilk sipariş kuponu (%
 * `davetYuzde`, 30 gün). Arkadaşın ilk siparişi teslim edilip **cayma süresi
 * (14 gün) geçince** davet edene `davetOdulKurus` tutarında hediye çeki.
 *
 * Kötüye kullanıma karşı: ödül yalnızca ödenmiş, iptal ya da iade edilmemiş
 * siparişe; siparişin telefonu ya da adresi davet edeninkiyle aynıysa ödül
 * yok (kendini davet etme); davet eden yılda en fazla `davetEnFazla` ödül
 * alıyor. `davetOdulKurus` 0 ise program kapalı: bağlantı çalışmıyor,
 * menüde görünmüyor.
 */

const GUN = 24 * 60 * 60 * 1000;
/** Cayma hakkı teslimden itibaren 14 gün; ödül ondan sonra. */
const CAYMA_GUN = 14;
const HARFLER = "abcdefghjkmnpqrstuvwxyz23456789";
export const DAVET_CEREZI = "davet";

export type DavetAyari = { odulKurus: number; yuzde: number; enFazla: number };

export async function davetAyari(): Promise<DavetAyari> {
  const a = await db.storeSetting.findUnique({
    where: { id: "tek" },
    select: { davetOdulKurus: true, davetYuzde: true, davetEnFazla: true },
  });
  return {
    odulKurus: a?.davetOdulKurus ?? 0,
    yuzde: a?.davetYuzde ?? 10,
    enFazla: a?.davetEnFazla ?? 10,
  };
}

/** Üyenin davet kodu; yoksa üretip yazıyor. */
export async function davetKoduAl(customerId: string): Promise<string> {
  const m = await db.customer.findUnique({
    where: { id: customerId },
    select: { davetKodu: true },
  });
  if (m?.davetKodu) return m.davetKodu;
  for (let i = 0; i < 5; i++) {
    const kod = Array.from({ length: 8 }, () => HARFLER[randomInt(HARFLER.length)]).join("");
    const yazildi = await db.customer
      .updateMany({
        where: { id: customerId, davetKodu: null },
        data: { davetKodu: kod },
      })
      .catch(() => ({ count: 0 }));
    if (yazildi.count === 1) return kod;
    const simdiki = await db.customer.findUnique({
      where: { id: customerId },
      select: { davetKodu: true },
    });
    if (simdiki?.davetKodu) return simdiki.davetKodu;
  }
  throw new Error("Davet kodu üretilemedi");
}

/** Bağlantıdaki kod geçerli bir üyenin mi. */
export async function davetEdeniBul(kod: string): Promise<{ id: string; ad: string } | undefined> {
  if (!/^[a-z0-9]{8}$/.test(kod)) return undefined;
  const m = await db.customer.findUnique({
    where: { davetKodu: kod },
    select: { id: true, adSoyad: true },
  });
  return m ? { id: m.id, ad: m.adSoyad.split(" ")[0] || m.adSoyad } : undefined;
}

/**
 * Yeni üyeyi davet edene bağlar ve ilk sipariş kuponunu açar. Program
 * kapalıysa, kod geçersizse ya da kendi koduysa hiçbir şey yapmıyor.
 */
export async function davetiBagla(
  yeniId: string,
  kod: string,
  simdi: Date = new Date(),
): Promise<string | undefined> {
  const ayar = await davetAyari();
  if (ayar.odulKurus <= 0) return undefined;
  const eden = await davetEdeniBul(kod);
  if (!eden || eden.id === yeniId) return undefined;

  const baglandi = await db.customer.updateMany({
    where: { id: yeniId, davetEdenId: null },
    data: { davetEdenId: eden.id },
  });
  if (baglandi.count !== 1 || ayar.yuzde <= 0) return undefined;

  const kupon = `HOSGELDIN-${Array.from({ length: 6 }, () => HARFLER[randomInt(HARFLER.length)])
    .join("")
    .toUpperCase()}`;
  await db.campaign.create({
    data: {
      ad: "Davet: ilk sipariş",
      tip: "yuzde",
      deger: ayar.yuzde,
      kapsam: "tumu",
      kuponKodu: kupon,
      customerId: yeniId,
      enFazlaKullanim: 1,
      baslangic: simdi,
      bitis: new Date(simdi.getTime() + 30 * GUN),
    },
  });
  return kupon;
}

const rakam = (t: string) => t.replace(/\D/g, "").slice(-10);
const sade = (t: string) => t.toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü0-9]/g, "");

/**
 * Günlük iş: ilk siparişi teslim edilip cayma süresi geçmiş davetli üyeler
 * için davet edene hediye çeki. Her davetli bir kez sonuçlanıyor
 * (`davetSonuclandi`): ödül verildiyse çekin kodu, uygun değilse boş.
 */
export async function davetOdulleriniVer(
  gonder: typeof davetOdulEpostasi = davetOdulEpostasi,
  simdi: Date = new Date(),
): Promise<{ bakilan: number; verilen: number }> {
  const ayar = await davetAyari();
  if (ayar.odulKurus <= 0) return { bakilan: 0, verilen: 0 };
  const sinir = new Date(simdi.getTime() - CAYMA_GUN * GUN);

  const davetliler = await db.customer.findMany({
    where: {
      davetEdenId: { not: null },
      davetSonuclandi: null,
      siparisler: {
        some: { durum: "teslim", odemeDurumu: "odendi", teslimTarihi: { lte: sinir } },
      },
    },
    select: {
      id: true,
      adSoyad: true,
      siparisler: {
        where: { durum: "teslim", odemeDurumu: "odendi", teslimTarihi: { lte: sinir } },
        orderBy: { olusturuldu: "asc" },
        take: 1,
        select: { telefon: true, adres: true, listeAdresi: true },
      },
      davetEden: {
        select: {
          id: true,
          eposta: true,
          adSoyad: true,
          telefon: true,
          adresler: { select: { adres: true, telefon: true } },
        },
      },
    },
    take: 200,
  });

  let verilen = 0;
  for (const d of davetliler) {
    const eden = d.davetEden;
    const siparis = d.siparisler[0];
    if (!eden || !siparis) continue;

    const telefonlar = new Set(
      [eden.telefon, ...eden.adresler.map((a) => a.telefon)]
        .map(rakam)
        .filter((t) => t.length >= 10),
    );
    const adresler = new Set(eden.adresler.map((a) => sade(a.adres)).filter(Boolean));
    const kendisi =
      telefonlar.has(rakam(siparis.telefon)) ||
      (!siparis.listeAdresi && adresler.has(sade(siparis.adres)));
    const yillik = await db.customer.count({
      where: {
        davetEdenId: eden.id,
        davetOdulKodu: { not: "" },
        davetSonuclandi: { gte: new Date(simdi.getTime() - 365 * GUN) },
      },
    });

    // Önce koşullu işaret (K-166): zamanlanmış iş iki kez çalışırsa aynı
    // davet için iki çek verilmesin. Yalnızca bir çalışma işareti alabiliyor.
    const alindi = await db.customer.updateMany({
      where: { id: d.id, davetSonuclandi: null },
      data: { davetSonuclandi: simdi },
    });
    if (alindi.count === 0) continue;
    if (kendisi || yillik >= ayar.enFazla) continue;

    const kod = kodUret();
    const sonKullanma = new Date(simdi.getTime() + 365 * GUN);
    const edenAdi = eden.adSoyad.split(" ")[0] || eden.adSoyad;
    const arkadas = d.adSoyad.split(" ")[0] || d.adSoyad;
    await db.$transaction([
      db.giftCard.create({
        data: {
          kod,
          tutarKurus: ayar.odulKurus,
          bakiyeKurus: ayar.odulKurus,
          aliciAd: eden.adSoyad,
          aliciEposta: eden.eposta,
          not: `Davet ödülü: ${d.adSoyad}`,
          sonKullanma,
          yapan: "davet",
        },
      }),
      db.customer.update({ where: { id: d.id }, data: { davetOdulKodu: kod } }),
    ]);
    // Çek hesabın Davet sayfasında da görünüyor; e-posta gitmese de kaybolmuyor.
    await gonder(eden.eposta, {
      adSoyad: edenAdi,
      arkadas,
      kod,
      tutarKurus: ayar.odulKurus,
      sonKullanma,
    });
    verilen += 1;
  }
  return { bakilan: davetliler.length, verilen };
}

export type DavetOzeti = {
  kod: string;
  davetEdilen: number;
  odul: { kod: string; arkadas: string; tutarKurus: number; bakiyeKurus: number }[];
};

/** Hesabım › Arkadaşını davet et. */
export async function davetOzeti(customerId: string): Promise<DavetOzeti> {
  const [kod, davetliler] = await Promise.all([
    davetKoduAl(customerId),
    db.customer.findMany({
      where: { davetEdenId: customerId },
      select: { adSoyad: true, davetOdulKodu: true },
    }),
  ]);
  const kodlar = davetliler.map((d) => d.davetOdulKodu).filter(Boolean);
  const cekler = kodlar.length
    ? await db.giftCard.findMany({
        where: { kod: { in: kodlar } },
        select: { kod: true, tutarKurus: true, bakiyeKurus: true },
      })
    : [];
  return {
    kod,
    davetEdilen: davetliler.length,
    odul: cekler.map((c) => ({
      ...c,
      arkadas: davetliler.find((d) => d.davetOdulKodu === c.kod)?.adSoyad.split(" ")[0] ?? "",
    })),
  };
}

/** Hesabım'da gösterilen, kullanılmamış kişiye özel kuponlar (K-151, K-152). */
export async function kisiselKuponlar(
  customerId: string,
  simdi: Date = new Date(),
): Promise<{ kod: string; ad: string; yuzde: number; bitis: Date | null }[]> {
  const k = await db.campaign.findMany({
    where: {
      customerId,
      aktif: true,
      tip: "yuzde",
      OR: [{ bitis: null }, { bitis: { gte: simdi } }],
    },
    select: {
      kuponKodu: true,
      ad: true,
      deger: true,
      bitis: true,
      kullanim: true,
      enFazlaKullanim: true,
    },
    orderBy: { olusturuldu: "desc" },
  });
  return k
    .filter((x) => x.kuponKodu && (x.enFazlaKullanim === null || x.kullanim < x.enFazlaKullanim))
    .map((x) => ({ kod: x.kuponKodu!, ad: x.ad, yuzde: x.deger, bitis: x.bitis }));
}
