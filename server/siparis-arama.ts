import "server-only";

/**
 * Sipariş listesinin araması, süzgeçleri ve sayfalaması.
 *
 * Panelin sipariş listesi bugüne kadar son 100 siparişi gösteriyordu ve
 * fazlasını **sessizce** kesiyordu: 101. sipariş girdiğinde mağaza sahibinin
 * eski siparişlere ulaşma yolu kalmıyordu, üstelik bir şeyin eksik olduğunu
 * görmüyordu bile. Arama eklenirken o da düzeltildi — artık sayfalanıyor ve
 * kaç kayıt olduğu yazıyor.
 *
 * Bütün süzgeçler adres satırında taşınıyor: form düz GET, yani JavaScript
 * kapalı tarayıcıda çalışıyor, sonuç sayfası yer imine eklenebiliyor ve
 * "şu aramayı bir de sen aç" diye paylaşılabiliyor.
 */

import { db } from "@/server/veritabani";
import {
  DURUMLAR,
  ODEME_DURUMLARI,
  YONTEMLER,
  type Durum,
  type OdemeDurumu,
  type Yontem,
} from "@/ui/siparis-bicim";

export const SAYFA_BOYU = 50;

export type SiparisSuzgeci = {
  ara: string;
  durum?: Durum;
  odeme?: OdemeDurumu;
  yontem?: Yontem;
  baslangic?: string;
  bitis?: string;
  sayfa: number;
};

export type SiparisSatiri = {
  id: string;
  numara: string;
  olusturuldu: Date;
  adSoyad: string;
  eposta: string;
  telefon: string;
  il: string;
  ilce: string;
  toplamKurus: number;
  durum: string;
  odemeDurumu: string;
  odemeYontemi: string;
};

export type AramaSonucu = {
  satirlar: SiparisSatiri[];
  toplamAdet: number;
  toplamTutarKurus: number;
  sayfa: number;
  sonSayfa: number;
};

/** YYYY-MM-DD metnini güne çevirir; geçersizse yok sayılır. */
function gunCoz(deger: string | undefined): Date | undefined {
  if (!deger || !/^\d{4}-\d{2}-\d{2}$/.test(deger)) return undefined;
  const t = new Date(`${deger}T00:00:00`);
  return Number.isNaN(t.getTime()) ? undefined : t;
}

/** Adres satırındaki ham değerleri güvenli bir süzgece çevirir. */
export function suzgeciCoz(
  parametreler: Record<string, string | string[] | undefined>,
): SiparisSuzgeci {
  const tek = (ad: string): string | undefined => {
    const d = parametreler[ad];
    return typeof d === "string" && d.trim() !== "" ? d.trim() : undefined;
  };

  const durum = tek("durum");
  const odeme = tek("odeme");
  const yontem = tek("yontem");
  const sayfa = Number(tek("sayfa") ?? "1");

  return {
    ara: tek("ara") ?? "",
    durum: (DURUMLAR as readonly string[]).includes(durum ?? "") ? (durum as Durum) : undefined,
    odeme: (ODEME_DURUMLARI as readonly string[]).includes(odeme ?? "")
      ? (odeme as OdemeDurumu)
      : undefined,
    yontem: (YONTEMLER as readonly string[]).includes(yontem ?? "") ? (yontem as Yontem) : undefined,
    baslangic: gunCoz(tek("baslangic")) ? tek("baslangic") : undefined,
    bitis: gunCoz(tek("bitis")) ? tek("bitis") : undefined,
    sayfa: Number.isInteger(sayfa) && sayfa > 0 ? sayfa : 1,
  };
}

/**
 * Telefon numarasıyla arama.
 *
 * Telefonlar girildiği gibi duruyor: "0555 123 45 67", "05551234567",
 * "+90 555 123 45 67" — hepsi aynı numara. Düz bir metin araması bunları
 * birbirine bağlayamıyor, o yüzden karşılaştırma iki tarafta da rakam dışı
 * her şey atılarak yapılıyor. Prisma'nın süzgeçleri bunu yapamadığı için bu
 * tek koşul ham SQL; sonucu asıl sorguya kimlik listesi olarak giriyor.
 */
async function telefonlaBulunanlar(ara: string): Promise<string[]> {
  const rakamlar = ara.replace(/\D/g, "");
  // Üç haneden kısa bir parça neredeyse her numarayla eşleşir; aramayı
  // anlamsız kılar.
  if (rakamlar.length < 3) return [];

  // Desen `[^0-9]`, `\D` değil: şablon dizgisinde ters bölü JavaScript
  // tarafından yutuluyor ve desen sessizce "D harfini sil"e dönüşüyor —
  // sorgu hata vermeden hep boş dönüyordu.
  const satirlar = await db.$queryRaw<{ id: string }[]>`
    select id from "Order"
     where regexp_replace(telefon, '[^0-9]', '', 'g') like ${`%${rakamlar}%`}
     limit 500
  `;
  return satirlar.map((s) => s.id);
}

async function kosulYap(s: SiparisSuzgeci): Promise<Record<string, unknown>> {
  const kosullar: Record<string, unknown>[] = [];

  if (s.durum) kosullar.push({ durum: s.durum });
  if (s.odeme) kosullar.push({ odemeDurumu: s.odeme });
  if (s.yontem) kosullar.push({ odemeYontemi: s.yontem });

  const basla = gunCoz(s.baslangic);
  const bit = gunCoz(s.bitis);
  if (basla || bit) {
    // Bitiş günü dahil: 21 Eylül seçildiğinde o günün akşamı da giriyor.
    const bitSonu = bit ? new Date(bit.getTime() + 24 * 60 * 60 * 1000) : undefined;
    kosullar.push({
      olusturuldu: { ...(basla ? { gte: basla } : {}), ...(bitSonu ? { lt: bitSonu } : {}) },
    });
  }

  if (s.ara) {
    const telefonIdleri = await telefonlaBulunanlar(s.ara);
    kosullar.push({
      OR: [
        { numara: { contains: s.ara, mode: "insensitive" } },
        { adSoyad: { contains: s.ara, mode: "insensitive" } },
        { eposta: { contains: s.ara, mode: "insensitive" } },
        { kargoTakipNo: { contains: s.ara, mode: "insensitive" } },
        ...(telefonIdleri.length > 0 ? [{ id: { in: telefonIdleri } }] : []),
      ],
    });
  }

  return kosullar.length > 0 ? { AND: kosullar } : {};
}

export async function siparisleriAra(s: SiparisSuzgeci): Promise<AramaSonucu> {
  const kosul = await kosulYap(s);

  // Sayım ve toplam da süzgece bağlı: "bu ay kaç sipariş, ne kadar tuttu"
  // sorusunun cevabı listenin üstünde yazıyor.
  const [toplamAdet, toplam, satirlar] = await Promise.all([
    db.order.count({ where: kosul }),
    db.order.aggregate({ where: kosul, _sum: { toplamKurus: true } }),
    db.order.findMany({
      where: kosul,
      orderBy: { olusturuldu: "desc" },
      skip: (s.sayfa - 1) * SAYFA_BOYU,
      take: SAYFA_BOYU,
      select: {
        id: true,
        numara: true,
        olusturuldu: true,
        adSoyad: true,
        eposta: true,
        telefon: true,
        il: true,
        ilce: true,
        toplamKurus: true,
        durum: true,
        odemeDurumu: true,
        odemeYontemi: true,
      },
    }),
  ]);

  return {
    satirlar,
    toplamAdet,
    toplamTutarKurus: toplam._sum.toplamKurus ?? 0,
    sayfa: s.sayfa,
    sonSayfa: Math.max(1, Math.ceil(toplamAdet / SAYFA_BOYU)),
  };
}

/** Süzgeci adres satırına çevirir; boş alanlar adrese hiç girmiyor. */
export function suzgecAdresi(s: Partial<SiparisSuzgeci>): string {
  const p = new URLSearchParams();
  if (s.ara) p.set("ara", s.ara);
  if (s.durum) p.set("durum", s.durum);
  if (s.odeme) p.set("odeme", s.odeme);
  if (s.yontem) p.set("yontem", s.yontem);
  if (s.baslangic) p.set("baslangic", s.baslangic);
  if (s.bitis) p.set("bitis", s.bitis);
  if (s.sayfa && s.sayfa > 1) p.set("sayfa", String(s.sayfa));
  const metin = p.toString();
  return metin ? `/yonetim/siparisler?${metin}` : "/yonetim/siparisler";
}
