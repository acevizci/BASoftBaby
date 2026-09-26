/**
 * Kâr hesabının saf parçaları (K-111, K-112).
 *
 * Satış fiyatları KDV **dahil** giriliyor (fatura da böyle ayrıştırıyor,
 * K-20). Alış fiyatları KDV **hariç**. Karşılaştırmadan önce satış
 * KDV'den arındırılıyor; yoksa marj olduğundan büyük görünürdü.
 */

/** KDV dahil tutardan KDV hariç tutar; faturadaki ayrıştırmayla aynı yuvarlama. */
export function kdvHaric(kurus: number, kdvOrani: number): number {
  return Math.round(kurus / (1 + kdvOrani / 100));
}

export type BirimMarj = {
  /** KDV hariç satış. */
  netSatisKurus: number;
  karKurus: number;
  /** Net satışa göre yüzde; net satış sıfırsa `null`. */
  marjYuzde: number | null;
};

/** Bir ürünün birim brüt kârı: KDV hariç satış − alış. */
export function birimMarj(satisKurus: number, alisKurus: number, kdvOrani: number): BirimMarj {
  const netSatisKurus = kdvHaric(satisKurus, kdvOrani);
  const karKurus = netSatisKurus - alisKurus;
  return {
    netSatisKurus,
    karKurus,
    marjYuzde: netSatisKurus > 0 ? (karKurus / netSatisKurus) * 100 : null,
  };
}

export function yuzdeYaz(y: number | null): string {
  if (y === null) return "—";
  return `%${y.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

// ── Sipariş kârı (K-112) ────────────────────────────────────────────────

/** Satış ayarlarındaki giderler; `null` "girilmedi". */
export type GiderAyari = {
  kargoGiderKurus: number | null;
  paketGiderKurus: number | null;
  hediyePaketGiderKurus: number | null;
  /** İade/değişimde geri gelen paketin kargosu (K-114). */
  iadeKargoGiderKurus: number | null;
  kartKomisyonOnbinde: number | null;
  kartKomisyonSabitKurus: number | null;
};

export type KarSatiri = {
  adet: number;
  /** İadesi tamamlanmış adet; bu adetlerin maliyeti stoğa geri döndü. */
  iadeAdet: number;
  alisFiyatKurus: number | null;
  alisTahmini: boolean;
};

export type KarGirdisi = {
  kdvOrani: number;
  toplamKurus: number;
  /** Hediye çekiyle ödenen kısım (K-137); kart çekimi kalan üzerinden. */
  hediyeCekiKurus?: number;
  /** Tamamlanmış para iadeleri ve çek bakiyesine dönenler (KDV dahil). */
  iadeKurus: number;
  odemeYontemi: string;
  /** Kartta çekilen tutar; vade farkı yansıtıldıysa toplamdan büyük (K-110). */
  odenenKurus: number | null;
  /** iyzico'nun gerçek komisyonu; yoksa ayardaki oranla tahmin. */
  komisyonKurus: number | null;
  /** Her gönderinin gerçek ücreti; boşsa ayardaki ortalama. */
  gonderiUcretleri: (number | null)[];
  /** Kargo henüz yoksa bir gönderi bekleniyor mu (iptal değil, teslim yolunda). */
  gonderiBekleniyor: boolean;
  hediyePaketi: boolean;
  /** Tamamlanmış iade ve değişim talepleri: her biri bir dönüş kargosu (K-114). */
  iadeTalebi: number;
  /** Tamamlanmış değişim talepleri: yerine gönderilen paket ayrıca kargo. */
  degisimTalebi: number;
  satirlar: KarSatiri[];
  gider: GiderAyari;
};

export type Kalem = { kurus: number | null; tahmini: boolean };

export type SiparisKari = {
  /** KDV hariç satış: (tahsilat − iade) ÷ (1 + KDV). */
  netSatisKurus: number;
  vadeFarkiKurus: number;
  /** Satılan malın maliyeti; iade edilenler düşülmüş. */
  maliyet: Kalem & { eksikSatir: number };
  brutKarKurus: number;
  kargo: Kalem;
  paket: Kalem;
  komisyon: Kalem;
  /** Dönüş kargoları ve değişimde yeniden gönderim (K-114). */
  iadeKargo: Kalem;
  /** Brüt kâr − giderler. Girilmeyen giderler sıfır sayılıyor, `eksikler`de yazıyor. */
  katkiKurus: number;
  marjYuzde: number | null;
  /** Hesaba girmeyen ya da eksik giren kalemler, ekranda söylenmek için. */
  eksikler: string[];
};

export function siparisKari(g: KarGirdisi): SiparisKari {
  const eksikler: string[] = [];
  const netSatisKurus = kdvHaric(Math.max(0, g.toplamKurus - g.iadeKurus), g.kdvOrani);
  const tahsilKurus = Math.max(0, g.toplamKurus - (g.hediyeCekiKurus ?? 0));
  const vadeFarkiKurus =
    g.odemeYontemi === "kart" && g.odenenKurus !== null ? Math.max(0, g.odenenKurus - tahsilKurus) : 0;

  // Maliyet: satılıp geri gelmeyen adetler. Alış fiyatı olmayan satırlar
  // sıfır değil, eksik: kâr şişmesin diye ayrıca söyleniyor.
  let maliyetKurus = 0;
  let eksikSatir = 0;
  let maliyetTahmini = false;
  for (const s of g.satirlar) {
    const kalan = Math.max(0, s.adet - s.iadeAdet);
    if (kalan === 0) continue;
    if (s.alisFiyatKurus === null) {
      eksikSatir += 1;
      continue;
    }
    maliyetKurus += s.alisFiyatKurus * kalan;
    if (s.alisTahmini) maliyetTahmini = true;
  }
  if (eksikSatir > 0) eksikler.push(`${eksikSatir} ürünün alış fiyatı yok`);

  // Kargo: her gönderinin gerçek ücreti, yoksa ortalama. Henüz gönderi
  // yoksa ve bekleniyorsa bir gönderi ortalamayla sayılıyor.
  const gonderiler = g.gonderiUcretleri.length > 0 ? g.gonderiUcretleri : g.gonderiBekleniyor ? [null] : [];
  let kargo: Kalem = { kurus: 0, tahmini: false };
  for (const u of gonderiler) {
    if (u !== null) kargo = { kurus: (kargo.kurus ?? 0) + u, tahmini: kargo.tahmini };
    else if (g.gider.kargoGiderKurus !== null) {
      kargo = { kurus: (kargo.kurus ?? 0) + g.gider.kargoGiderKurus, tahmini: true };
    } else {
      kargo = { kurus: null, tahmini: false };
      break;
    }
  }
  if (kargo.kurus === null) eksikler.push("kargo gideri girilmemiş");

  const paket: Kalem =
    g.gider.paketGiderKurus === null
      ? { kurus: null, tahmini: false }
      : {
          kurus:
            g.gider.paketGiderKurus + (g.hediyePaketi ? (g.gider.hediyePaketGiderKurus ?? 0) : 0),
          tahmini: false,
        };
  if (paket.kurus === null) eksikler.push("paket gideri girilmemiş");
  if (g.hediyePaketi && g.gider.hediyePaketGiderKurus === null) eksikler.push("hediye paketi gideri girilmemiş");

  let komisyon: Kalem = { kurus: 0, tahmini: false };
  if (g.odemeYontemi === "kart") {
    if (g.komisyonKurus !== null) komisyon = { kurus: g.komisyonKurus, tahmini: false };
    else if (g.gider.kartKomisyonOnbinde !== null) {
      const cekilen = g.odenenKurus ?? tahsilKurus;
      komisyon = {
        kurus: Math.round((cekilen * g.gider.kartKomisyonOnbinde) / 10000) + (g.gider.kartKomisyonSabitKurus ?? 0),
        tahmini: true,
      };
    } else {
      komisyon = { kurus: null, tahmini: false };
      eksikler.push("kart komisyonu girilmemiş");
    }
  }

  // İade ve değişim: müşterinin geri gönderdiği her paketin kargosu, değişimde
  // yerine gönderilen paketin kargosu da (ortalama gönderi ücretiyle).
  let iadeKargo: Kalem = { kurus: 0, tahmini: false };
  if (g.iadeTalebi > 0 || g.degisimTalebi > 0) {
    const donus = g.iadeTalebi > 0 ? g.gider.iadeKargoGiderKurus : 0;
    const yeniden = g.degisimTalebi > 0 ? g.gider.kargoGiderKurus : 0;
    if (donus === null || yeniden === null) {
      iadeKargo = { kurus: null, tahmini: false };
      eksikler.push("iade/değişim kargo gideri girilmemiş");
    } else {
      iadeKargo = { kurus: g.iadeTalebi * donus + g.degisimTalebi * yeniden, tahmini: true };
    }
  }

  const gelir = netSatisKurus + vadeFarkiKurus;
  const brutKarKurus = gelir - maliyetKurus;
  const katkiKurus =
    brutKarKurus - (kargo.kurus ?? 0) - (paket.kurus ?? 0) - (komisyon.kurus ?? 0) - (iadeKargo.kurus ?? 0);

  return {
    netSatisKurus,
    vadeFarkiKurus,
    maliyet: { kurus: maliyetKurus, tahmini: maliyetTahmini, eksikSatir },
    brutKarKurus,
    kargo,
    paket,
    komisyon,
    iadeKargo,
    katkiKurus,
    marjYuzde: gelir > 0 ? (katkiKurus / gelir) * 100 : null,
    eksikler,
  };
}

// ── Kampanya zarar uyarısı (K-113) ──────────────────────────────────────

export type ZararliUrun = { ad: string; indirimliKurus: number; netKurus: number; alisKurus: number };

/**
 * Kampanyanın kapsamındaki, indirimli fiyatı (KDV hariç) alış fiyatının
 * altına düşen ürünler. Tutar indirimi sepete uygulandığı için en kötü
 * durum, yani sepette yalnızca o ürünün bir adedi varsayılıyor. Alış fiyatı
 * olmayan ürün hesaba girmiyor.
 */
export function kampanyaZarari(
  k: {
    tip: string;
    deger: number;
    kapsam: string;
    categoryId: string | null;
    productId: string | null;
    alAdet?: number | null;
    odeAdet?: number | null;
  },
  urunler: { id: string; ad: string; categoryId: string; fiyatKurus: number; alisFiyatKurus: number | null }[],
  kdvOrani: number,
): ZararliUrun[] {
  return urunler.flatMap((u) => {
    if (u.alisFiyatKurus === null) return [];
    if (k.kapsam === "urun" && k.productId !== u.id) return [];
    if (k.kapsam === "kategori" && k.categoryId !== u.categoryId) return [];
    // "X al Y öde"de ürün başına ortalama indirim (X − Y) / X (K-168).
    const indirim =
      k.tip === "yuzde"
        ? Math.floor((u.fiyatKurus * Math.min(Math.max(k.deger, 0), 100)) / 100)
        : k.tip === "al-ode"
          ? k.alAdet && k.odeAdet && k.odeAdet < k.alAdet
            ? Math.floor((u.fiyatKurus * (k.alAdet - k.odeAdet)) / k.alAdet)
            : 0
          : Math.min(Math.max(k.deger, 0), u.fiyatKurus);
    const indirimliKurus = u.fiyatKurus - indirim;
    const netKurus = kdvHaric(indirimliKurus, kdvOrani);
    return netKurus < u.alisFiyatKurus
      ? [{ ad: u.ad, indirimliKurus, netKurus, alisKurus: u.alisFiyatKurus }]
      : [];
  });
}
