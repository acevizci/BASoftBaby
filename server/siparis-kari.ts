import "server-only";

/**
 * Siparişin kârı için veriyi toplar (K-112). Hesap `server/kar.ts`'te,
 * saf; burası yalnızca veritabanından girdiyi kuruyor.
 */

import { db } from "@/server/veritabani";
import { ayarlariGetir } from "@/server/sepet";
import { siparisKari, type GiderAyari, type SiparisKari } from "@/server/kar";

export async function giderAyari(): Promise<GiderAyari> {
  const a = await db.storeSetting.findUnique({
    where: { id: "tek" },
    select: {
      kargoGiderKurus: true,
      paketGiderKurus: true,
      hediyePaketGiderKurus: true,
      iadeKargoGiderKurus: true,
      kartKomisyonOnbinde: true,
      kartKomisyonSabitKurus: true,
    },
  });
  return {
    kargoGiderKurus: a?.kargoGiderKurus ?? null,
    paketGiderKurus: a?.paketGiderKurus ?? null,
    hediyePaketGiderKurus: a?.hediyePaketGiderKurus ?? null,
    iadeKargoGiderKurus: a?.iadeKargoGiderKurus ?? null,
    kartKomisyonOnbinde: a?.kartKomisyonOnbinde ?? null,
    kartKomisyonSabitKurus: a?.kartKomisyonSabitKurus ?? null,
  };
}

/** Kâr hesabının gerektirdiği sipariş alanları; rapor da aynısını seçiyor. */
export const KAR_SECIMI = {
  id: true,
  durum: true,
  toplamKurus: true,
  hediyeCekiKurus: true,
  odemeYontemi: true,
  odemeDurumu: true,
  hediyePaketi: true,
  fatura: { select: { kdvOrani: true } },
  satirlar: {
    select: {
      id: true,
      adet: true,
      alisFiyatKurus: true,
      alisTahmini: true,
      talepSatirlari: {
        where: { request: { tur: "iade", durum: "tamamlandi" } },
        select: { adet: true },
      },
    },
  },
  odemeler: {
    where: { durum: "basarili" },
    orderBy: { olusturuldu: "desc" as const },
    take: 1,
    select: { odenenKurus: true, komisyonKurus: true },
  },
  gonderiler: { select: { ucretKurus: true } },
  // Bütün iade kayıtları: para kısmı tamamlanınca, çek kısmı kayıt açılır
  // açılmaz (bakiyeye o anda dönüyor, K-137) satıştan düşüyor.
  iadeler: { select: { durum: true, tutarKurus: true, hediyeCekiKurus: true } },
  talepler: {
    where: { durum: "tamamlandi", tur: { in: ["iade", "degisim"] as string[] } },
    select: { tur: true },
  },
} as const;

type KarSiparisi = {
  durum: string;
  toplamKurus: number;
  hediyeCekiKurus: number;
  odemeYontemi: string;
  hediyePaketi: boolean;
  fatura: { kdvOrani: number } | null;
  satirlar: {
    adet: number;
    alisFiyatKurus: number | null;
    alisTahmini: boolean;
    talepSatirlari: { adet: number }[];
  }[];
  odemeler: { odenenKurus: number | null; komisyonKurus: number | null }[];
  gonderiler: { ucretKurus: number | null }[];
  iadeler: { durum: string; tutarKurus: number; hediyeCekiKurus: number }[];
  talepler: { tur: string }[];
};

/** Kayıttan kâr; iptal edilmiş siparişin kârı yok. */
export function kayittanKar(s: KarSiparisi, kdvOrani: number, gider: GiderAyari): SiparisKari | undefined {
  if (s.durum === "iptal") return undefined;
  const odeme = s.odemeler[0];
  return siparisKari({
    // Fatura kesildiyse onun oranı: sonradan ayar değişse de o gün geçerli olan.
    kdvOrani: s.fatura?.kdvOrani ?? kdvOrani,
    toplamKurus: s.toplamKurus,
    hediyeCekiKurus: s.hediyeCekiKurus,
    // Para iadesi gönderilince, çek bakiyesine dönen kısım hemen (K-137).
    iadeKurus: s.iadeler.reduce(
      (t, i) => t + (i.durum === "tamamlandi" ? i.tutarKurus : 0) + i.hediyeCekiKurus,
      0,
    ),
    odemeYontemi: s.odemeYontemi,
    odenenKurus: odeme?.odenenKurus ?? null,
    komisyonKurus: odeme?.komisyonKurus ?? null,
    gonderiUcretleri: s.gonderiler.map((g) => g.ucretKurus),
    gonderiBekleniyor: true,
    hediyePaketi: s.hediyePaketi,
    iadeTalebi: s.talepler.length,
    degisimTalebi: s.talepler.filter((t) => t.tur === "degisim").length,
    satirlar: s.satirlar.map((x) => ({
      adet: x.adet,
      iadeAdet: x.talepSatirlari.reduce((t, r) => t + r.adet, 0),
      alisFiyatKurus: x.alisFiyatKurus,
      alisTahmini: x.alisTahmini,
    })),
    gider,
  });
}

export async function siparisKariGetir(numara: string): Promise<SiparisKari | undefined> {
  const [s, ayar, gider] = await Promise.all([
    db.order.findUnique({ where: { numara }, select: KAR_SECIMI }),
    ayarlariGetir(),
    giderAyari(),
  ]);
  if (!s) return undefined;
  return kayittanKar(s, ayar.kdvOrani, gider);
}
