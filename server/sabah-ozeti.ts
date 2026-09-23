import "server-only";

/**
 * Sabah özeti e-postası (K-101).
 *
 * Mağaza sahibi güne panelden değil telefonundan başlıyor. Günlük iş sabah
 * (Türkiye saatiyle 06:00) her panel kullanıcısına tek bir e-posta
 * gönderiyor: dün kaç sipariş geldi, bugün ne bekliyor, hangi beden
 * tükenmek üzere. Rakamlar panelin özet ekranıyla aynı kaynaktan
 * (`panelOzetiGetir`) geliyor; iki yerde iki ayrı sayı çıkmıyor.
 *
 * - **Alıcılar:** açık ve davetini kabul etmiş (e-postası doğrulanmış)
 *   kullanıcılar; Hesabım ekranında kapatan hariç.
 * - **Günde bir kez.** Uç herkese açık olabildiği için (CRON_SECRET yoksa)
 *   son gönderim tutuluyor; aynı gün ikinci çağrı e-posta göndermiyor.
 * - **Söylenecek bir şey yoksa gönderilmiyor:** dün sipariş gelmemiş ve
 *   bekleyen iş yoksa sessiz bir sabah, gelen kutusuna boş e-posta düşmüyor.
 */

import { db } from "@/server/veritabani";
import { sabahOzetiEpostasi, type EpostaSonucu } from "@/server/eposta";
import { panelOzetiGetir, type PanelOzeti } from "@/server/panel-ozet";
import { siteAdresi } from "@/server/site";
import { renkAdlari } from "@/server/renkler";

/** Türkiye 2016'dan beri yaz saati uygulamıyor: sabit UTC+3. */
const TR_FARK = 3 * 60 * 60 * 1000;
const GUN = 24 * 60 * 60 * 1000;

/** Türkiye saatine göre dünün başı ve bugünün başı. */
export function dununAraligi(simdi: Date): { bas: Date; son: Date } {
  const tr = new Date(simdi.getTime() + TR_FARK);
  const bugun = Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate()) - TR_FARK;
  return { bas: new Date(bugun - GUN), son: new Date(bugun) };
}

export type DununSiparisi = {
  numara: string;
  adSoyad: string;
  toplamKurus: number;
  hediyePaketi: boolean;
};

export type SabahVerisi = {
  gun: Date;
  dunAdet: number;
  dunKurus: number;
  siparisler: DununSiparisi[];
  ozet: Pick<
    PanelOzeti,
    "isler" | "azalanlar" | "azalanToplam" | "bekleyenler" | "bekleyenToplam" | "eksikler"
  >;
};

/** E-postada gösterilen sipariş sayısı; fazlası "ve N sipariş daha". */
const EN_COK_SIPARIS = 10;

function tutar(kurus: number): string {
  return `${(kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

/** Gönderilecek bir şey var mı: dün sipariş ya da bekleyen iş. */
export function soylenecekVarMi(v: SabahVerisi): boolean {
  return v.dunAdet > 0 || v.ozet.isler.some((i) => i.acil);
}

/** E-postanın konusu ve düz metni. */
export function sabahMetni(v: SabahVerisi): { konu: string; metin: string } {
  const site = siteAdresi();
  const gunAdi = v.gun.toLocaleDateString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    weekday: "long",
  });

  const bolumler: string[] = [];

  if (v.dunAdet === 0) {
    bolumler.push(`Dün (${gunAdi}) sipariş gelmedi.`);
  } else {
    const satirlar = v.siparisler
      .slice(0, EN_COK_SIPARIS)
      .map(
        (s) =>
          `• ${s.numara} · ${s.adSoyad} · ${tutar(s.toplamKurus)}${s.hediyePaketi ? " · 🎁 hediye" : ""}`,
      );
    if (v.dunAdet > EN_COK_SIPARIS) satirlar.push(`… ve ${v.dunAdet - EN_COK_SIPARIS} sipariş daha`);
    bolumler.push(
      `Dün (${gunAdi}): ${v.dunAdet} sipariş, ${tutar(v.dunKurus)}\n\n${satirlar.join("\n")}`,
    );
  }

  const isler = v.ozet.isler.filter((i) => i.acil);
  if (isler.length > 0) {
    bolumler.push(
      `Bugün bekleyenler:\n\n${isler.map((i) => `• ${i.ad}: ${i.adet}\n  ${site}${i.adres}`).join("\n")}`,
    );
  }

  if (v.ozet.azalanToplam > 0) {
    const satirlar = v.ozet.azalanlar.map(
      (a) => `• ${a.urunAd} — ${a.beden}, ${a.renk}: ${a.stok} adet kaldı`,
    );
    if (v.ozet.azalanToplam > v.ozet.azalanlar.length) {
      satirlar.push(`… toplam ${v.ozet.azalanToplam} beden: ${site}/yonetim/stok`);
    }
    bolumler.push(`Azalan stok:\n\n${satirlar.join("\n")}`);
  }

  if (v.ozet.bekleyenToplam > 0) {
    const satirlar = v.ozet.bekleyenler.map(
      (b) => `• ${b.urunAd} — ${b.beden}, ${b.renk}: ${b.kisi} kişi`,
    );
    bolumler.push(`"Gelince haber ver" diyenler:\n\n${satirlar.join("\n")}`);
  }

  if (v.ozet.eksikler.length > 0) {
    bolumler.push(
      `Kurulum eksikleri:\n\n${v.ozet.eksikler.map((e) => `• ${e.ad}`).join("\n")}`,
    );
  }

  bolumler.push(`Panel: ${site}/yonetim`);
  bolumler.push(
    `Bu e-postayı panel kullanıcısı olduğun için alıyorsun. Kapatmak için:\n${site}/yonetim/hesabim`,
  );

  const konu =
    v.dunAdet > 0
      ? `Günaydın · dün ${v.dunAdet} sipariş, ${tutar(v.dunKurus)}`
      : "Günaydın · bugünün işleri";

  return { konu, metin: `Günaydın,\n\n${bolumler.join("\n\n")}` };
}

async function veriTopla(simdi: Date): Promise<SabahVerisi> {
  const { bas, son } = dununAraligi(simdi);
  const kosul = { durum: { not: "iptal" }, olusturuldu: { gte: bas, lt: son } };
  const [toplam, siparisler, ozet, adlar] = await Promise.all([
    db.order.aggregate({ where: kosul, _count: true, _sum: { toplamKurus: true } }),
    db.order.findMany({
      where: kosul,
      orderBy: { olusturuldu: "asc" },
      take: EN_COK_SIPARIS,
      select: { numara: true, adSoyad: true, toplamKurus: true, hediyePaketi: true },
    }),
    panelOzetiGetir(),
    renkAdlari(),
  ]);
  // Özet renk kodlarını taşıyor ("mavi"); e-postada panelde görünen ad.
  const renk = <T extends { renk: string }>(x: T): T => ({ ...x, renk: adlar[x.renk] ?? x.renk });
  return {
    gun: bas,
    dunAdet: toplam._count,
    dunKurus: toplam._sum.toplamKurus ?? 0,
    siparisler,
    ozet: { ...ozet, azalanlar: ozet.azalanlar.map(renk), bekleyenler: ozet.bekleyenler.map(renk) },
  };
}

/** Aynı gün ikinci gönderim yok: son gönderimden bu yana en az bu kadar geçmeli. */
const EN_AZ_ARA_SAAT = 20;

export type SabahSonucu = { alici: number; gonderilen: number };

export async function sabahOzetiniGonder(
  simdi: Date = new Date(),
  gonderici: (kime: string, konu: string, metin: string) => Promise<EpostaSonucu> = sabahOzetiEpostasi,
): Promise<SabahSonucu> {
  const alicilar = await db.adminUser.findMany({
    where: {
      aktif: true,
      sabahOzeti: true,
      epostaDogrulandi: { not: null },
      OR: [
        { sabahOzetiGonderildi: null },
        { sabahOzetiGonderildi: { lt: new Date(simdi.getTime() - EN_AZ_ARA_SAAT * 60 * 60 * 1000) } },
      ],
    },
    select: { id: true, eposta: true },
  });
  if (alicilar.length === 0) return { alici: 0, gonderilen: 0 };

  const veri = await veriTopla(simdi);
  if (!soylenecekVarMi(veri)) return { alici: alicilar.length, gonderilen: 0 };

  const { konu, metin } = sabahMetni(veri);
  let gonderilen = 0;
  for (const a of alicilar) {
    const sonuc = await gonderici(a.eposta, konu, metin);
    if (!sonuc.gonderildi) continue;
    await db.adminUser.update({ where: { id: a.id }, data: { sabahOzetiGonderildi: simdi } });
    gonderilen += 1;
  }
  return { alici: alicilar.length, gonderilen };
}
