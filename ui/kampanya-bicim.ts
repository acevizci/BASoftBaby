/**
 * Kampanyanın panelde okunan hâli (K-172): hazır kampanyalar ve kampanyayı
 * düz cümleyle anlatan özet. Saf modül; sihirbaz (tarayıcı) ve liste
 * (sunucu) aynı metni kullanıyor.
 */

import { fiyatYaz } from "@/ui/katalog-bicim";

export type KampanyaTuru = "yuzde" | "tutar" | "al-ode" | "nci-urun" | "kademeli" | "kargo";

export const TUR_BILGILERI: Record<KampanyaTuru, { ad: string; ornek: string; aciklama: string }> =
  {
    yuzde: {
      ad: "Yüzde indirim",
      ornek: "%20 indirim",
      aciklama:
        "Seçilen ürünlerin fiyatından yüzde düşer. Kod ve alt sınır yoksa ürün kartında indirimli fiyat görünür.",
    },
    tutar: {
      ad: "Tutar indirimi",
      ornek: "Sepette 100 ₺ indirim",
      aciklama: "Sepetten sabit tutar düşer; genelde bir alt sınırla kullanılır (750 ₺ üzeri).",
    },
    "al-ode": {
      ad: "X al Y öde",
      ornek: "3 al 2 öde",
      aciklama: "Her X üründe en ucuzu (X − Y tanesi) bedava. Ürünler karışabilir.",
    },
    "nci-urun": {
      ad: "N. ürüne indirim",
      ornek: "2. ürüne %50",
      aciklama: "Her N üründe en ucuzuna yüzde indirim uygulanır.",
    },
    kademeli: {
      ad: "Kademeli sepet indirimi",
      ornek: "500 ₺'ye 50 ₺, 1000 ₺'ye 150 ₺",
      aciklama: "Sepet büyüdükçe indirim büyür. Müşteri sepette sonraki basamağa kalanı görür.",
    },
    kargo: {
      ad: "Ücretsiz kargo",
      ornek: "KARGOBEDAVA kuponu",
      aciklama: "Kargo ücreti alınmaz. Öteki indirimlerle yarışır; hangisi çok kazandırırsa o.",
    },
  };

/** Sihirbazın ve özetin çalıştığı alanlar; para kuruş, tarih ISO. */
export type KampanyaTaslagi = {
  ad: string;
  tip: KampanyaTuru;
  deger: number;
  alAdet: number | null;
  odeAdet: number | null;
  kademeler: { esikKurus: number; indirimKurus: number }[] | null;
  enFazlaIndirimKurus: number | null;
  kapsam: "tumu" | "kategori" | "urun";
  kategoriIdleri: string[];
  urunIdleri: string[];
  kuponKodu: string | null;
  enAzSepetKurus: number;
  uyelereOzel: boolean;
  ilkSiparis: boolean;
  kisiBasiSinir: number | null;
  enFazlaKullanim: number | null;
  baslangic: string | null;
  bitis: string | null;
  aktif: boolean;
};

export const BOS_TASLAK: KampanyaTaslagi = {
  ad: "",
  tip: "yuzde",
  deger: 0,
  alAdet: null,
  odeAdet: null,
  kademeler: null,
  enFazlaIndirimKurus: null,
  kapsam: "tumu",
  kategoriIdleri: [],
  urunIdleri: [],
  kuponKodu: null,
  enAzSepetKurus: 0,
  uyelereOzel: false,
  ilkSiparis: false,
  kisiBasiSinir: null,
  enFazlaKullanim: null,
  baslangic: null,
  bitis: null,
  aktif: true,
};

export type Sablon = {
  anahtar: string;
  baslik: string;
  aciklama: string;
  /** Açılınca bu kadar saat sürüyor (flaş); yoksa süresiz. */
  saat?: number;
  taslak: Partial<KampanyaTaslagi> & Pick<KampanyaTaslagi, "ad" | "tip">;
};

/**
 * Sık kullanılan kampanyalar (K-172). Panelde kart olarak duruyor; aç/kapat
 * ilk açılışta bu değerlerle kampanya oluşturuyor, sonra aynı kaydı açıp
 * kapatıyor. Değerler "Düzenle"den değişiyor.
 */
export const SABLONLAR: readonly Sablon[] = [
  {
    anahtar: "hosgeldin",
    baslik: "Hoş geldin indirimi",
    aciklama: "Yeni üyenin ilk siparişine %10, HOSGELDIN10 koduyla. Kişi başı bir kez.",
    taslak: {
      ad: "Hoş geldin %10",
      tip: "yuzde",
      deger: 10,
      kuponKodu: "HOSGELDIN10",
      ilkSiparis: true,
      uyelereOzel: true,
      kisiBasiSinir: 1,
    },
  },
  {
    anahtar: "uc-al-iki-ode",
    baslik: "3 al 2 öde",
    aciklama: "Bütün ürünlerde; üç üründen en ucuzu bedava.",
    taslak: { ad: "3 al 2 öde", tip: "al-ode", alAdet: 3, odeAdet: 2 },
  },
  {
    anahtar: "ikinci-yarim",
    baslik: "2. ürüne %50",
    aciklama: "Her iki üründen ucuz olana yarı fiyat.",
    taslak: { ad: "2. ürüne %50", tip: "nci-urun", alAdet: 2, deger: 50 },
  },
  {
    anahtar: "kademeli",
    baslik: "Kademeli sepet indirimi",
    aciklama: "500 ₺'ye 50 ₺, 1000 ₺'ye 150 ₺ indirim.",
    taslak: {
      ad: "Çok alana çok indirim",
      tip: "kademeli",
      kademeler: [
        { esikKurus: 50000, indirimKurus: 5000 },
        { esikKurus: 100000, indirimKurus: 15000 },
      ],
    },
  },
  {
    anahtar: "sepette-yuzde",
    baslik: "750 ₺ üzeri %10",
    aciklama: "Sepet 750 ₺'yi geçince %10 indirim; kartta görünmez, sepette çıkar.",
    taslak: { ad: "750 ₺ üzeri %10", tip: "yuzde", deger: 10, enAzSepetKurus: 75000 },
  },
  {
    anahtar: "kargo-kuponu",
    baslik: "Ücretsiz kargo kuponu",
    aciklama: "KARGOBEDAVA koduyla kargo ücretsiz; sosyal medya ve e-bülten için.",
    taslak: { ad: "Ücretsiz kargo", tip: "kargo", kuponKodu: "KARGOBEDAVA" },
  },
  {
    anahtar: "flas",
    baslik: "Flaş indirim (24 saat)",
    aciklama: "Açıldığı andan 24 saat bütün ürünlerde %20. Kapanınca kendiliğinden biter.",
    saat: 24,
    taslak: { ad: "Flaş indirim %20", tip: "yuzde", deger: 20 },
  },
];

export type CalismaDurumu = "acik" | "kapali" | "bitti" | "bekliyor";

/** Kampanya şu an çalışıyor mu: kapalı, süresi dolmuş, başlamayı bekliyor. */
export function calismaDurumu(
  k: { aktif: boolean; baslangic: Date | string | null; bitis: Date | string | null },
  simdi = new Date(),
): CalismaDurumu {
  if (!k.aktif) return "kapali";
  if (k.bitis && new Date(k.bitis) <= simdi) return "bitti";
  if (k.baslangic && new Date(k.baslangic) > simdi) return "bekliyor";
  return "acik";
}

export function sablonBul(anahtar: string): Sablon | undefined {
  return SABLONLAR.find((s) => s.anahtar === anahtar);
}

function tarihYaz(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** İndirimin kendisi: "%20 indirim", "3 al 2 öde", "500 ₺'ye 50 ₺". */
export function indirimCumlesi(
  t: Pick<
    KampanyaTaslagi,
    "tip" | "deger" | "alAdet" | "odeAdet" | "kademeler" | "enFazlaIndirimKurus"
  >,
): string {
  const tavan = t.enFazlaIndirimKurus ? ` (en çok ${fiyatYaz(t.enFazlaIndirimKurus)})` : "";
  switch (t.tip) {
    case "yuzde":
      return `%${t.deger} indirim${tavan}`;
    case "tutar":
      return `${fiyatYaz(t.deger)} indirim`;
    case "al-ode":
      return `${t.alAdet ?? "?"} al ${t.odeAdet ?? "?"} öde (en ucuzu bedava)`;
    case "nci-urun":
      return `${t.alAdet ?? "?"}. ürüne %${t.deger} indirim (en ucuz olana)${tavan}`;
    case "kademeli":
      return (
        (t.kademeler ?? [])
          .map((k) => `${fiyatYaz(k.esikKurus)} ve üzerine ${fiyatYaz(k.indirimKurus)}`)
          .join(", ") + tavan
      );
    case "kargo":
      return "ücretsiz kargo";
  }
}

/**
 * Kampanyanın düz cümle özeti (K-172): sihirbazın son adımında ve listede.
 * Adlar verilmezse kapsam sayıyla yazılıyor.
 */
export function kampanyaOzeti(
  t: KampanyaTaslagi,
  adlar?: { kategori: ReadonlyMap<string, string>; urun: ReadonlyMap<string, string> },
): string[] {
  const liste = (idler: string[], harita: ReadonlyMap<string, string> | undefined, tur: string) => {
    if (idler.length === 0) return `hiç ${tur} seçilmedi`;
    const isimler = idler.map((id) => harita?.get(id) ?? "").filter(Boolean);
    if (isimler.length === 0) return `${idler.length} ${tur}`;
    return isimler.length > 4
      ? `${isimler.slice(0, 4).join(", ")} ve ${isimler.length - 4} ${tur} daha`
      : isimler.join(", ");
  };
  const kapsam =
    t.kapsam === "kategori"
      ? `${liste(t.kategoriIdleri, adlar?.kategori, "kategori")} ${t.kategoriIdleri.length > 1 ? "kategorilerinde" : "kategorisinde"}`
      : t.kapsam === "urun"
        ? `${liste(t.urunIdleri, adlar?.urun, "ürün")} ${t.urunIdleri.length > 1 ? "ürünlerinde" : "ürününde"}`
        : "bütün ürünlerde";

  const cumleler = [`${kapsam[0].toLocaleUpperCase("tr")}${kapsam.slice(1)} ${indirimCumlesi(t)}.`];
  cumleler.push(
    t.kuponKodu
      ? `Müşteri sepette ${t.kuponKodu} kodunu yazınca uygulanır.`
      : "Kod gerekmez, şartlar tutunca kendiliğinden uygulanır.",
  );
  if (t.enAzSepetKurus > 0) cumleler.push(`Sepet en az ${fiyatYaz(t.enAzSepetKurus)} olmalı.`);
  if (t.ilkSiparis) cumleler.push("Yalnızca üyenin ilk siparişinde geçerli.");
  else if (t.uyelereOzel || t.kisiBasiSinir) cumleler.push("Yalnızca giriş yapmış üyelere.");
  if (t.kisiBasiSinir) cumleler.push(`Bir üye en çok ${t.kisiBasiSinir} kez kullanabilir.`);
  if (t.enFazlaKullanim) cumleler.push(`Toplam ${t.enFazlaKullanim} siparişte kullanılabilir.`);
  if (t.baslangic && t.bitis) {
    cumleler.push(`${tarihYaz(t.baslangic)} – ${tarihYaz(t.bitis)} arasında geçerli.`);
  } else if (t.baslangic) {
    cumleler.push(`${tarihYaz(t.baslangic)} tarihinden itibaren geçerli.`);
  } else if (t.bitis) {
    cumleler.push(`${tarihYaz(t.bitis)} tarihine kadar geçerli.`);
  }
  cumleler.push(
    "Öteki kampanyalarla üst üste binmez: sepete uyanlardan müşteriye en çok kazandıran uygulanır.",
  );
  return cumleler;
}

/** `<input type="datetime-local">` değeri: İstanbul saatiyle "2026-09-30T14:00". */
export function tarihGirdisi(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso);
  const parca = (o: Intl.DateTimeFormatOptions) =>
    t.toLocaleString("en-CA", { timeZone: "Europe/Istanbul", ...o });
  const gun = parca({ year: "numeric", month: "2-digit", day: "2-digit" });
  const saat = parca({ hour: "2-digit", minute: "2-digit", hour12: false }).replace(/^24/, "00");
  return `${gun}T${saat}`;
}

/** Kuruşu panel kutusunun beklediği Türkçe tutara: 5000 → "50", 5050 → "50,50". */
export function tutarGirdisi(kurus: number | null): string {
  if (!kurus) return "";
  return (kurus / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: kurus % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/* ── Sihirbaz (K-172) ─────────────────────────────────────────────────────── */

export const ADIMLAR = ["Tür", "İndirim", "Ürünler", "Kimlere", "Ne zaman", "Özet"] as const;

/** Sihirbazın kutuları: kullanıcının yazdığı hâliyle, metin. */
export type SihirbazDurumu = {
  ad: string;
  tip: KampanyaTuru;
  yuzde: string;
  tutar: string;
  alAdet: string;
  odeAdet: string;
  nciN: string;
  tavan: string;
  kademeler: { esik: string; indirim: string }[];
  kapsam: "tumu" | "kategori" | "urun";
  kategoriIdleri: string[];
  urunIdleri: string[];
  kuponVar: boolean;
  kuponKodu: string;
  enAzSepet: string;
  uyelik: "herkes" | "uye" | "ilk";
  kisiBasiSinir: string;
  enFazlaKullanim: string;
  zaman: "hemen" | "aralik";
  baslangic: string;
  bitis: string;
  aktif: boolean;
};

const sayiYaz = (n: number | null | undefined) => (n ? String(n) : "");

/** Kayıtlı kampanyadan (ya da boş taslaktan) sihirbaz kutularına. */
export function durumaCevir(t: KampanyaTaslagi): SihirbazDurumu {
  const yuzdeli = t.tip === "yuzde" || t.tip === "nci-urun";
  return {
    ad: t.ad,
    tip: t.tip,
    yuzde: yuzdeli ? sayiYaz(t.deger) : "",
    tutar: t.tip === "tutar" ? tutarGirdisi(t.deger) : "",
    alAdet: t.tip === "al-ode" ? sayiYaz(t.alAdet) : "3",
    odeAdet: t.tip === "al-ode" ? sayiYaz(t.odeAdet) : "2",
    nciN: t.tip === "nci-urun" ? sayiYaz(t.alAdet) : "2",
    tavan: tutarGirdisi(t.enFazlaIndirimKurus),
    kademeler: t.kademeler?.length
      ? t.kademeler.map((k) => ({
          esik: tutarGirdisi(k.esikKurus),
          indirim: tutarGirdisi(k.indirimKurus),
        }))
      : [
          { esik: "", indirim: "" },
          { esik: "", indirim: "" },
        ],
    kapsam: t.kapsam,
    kategoriIdleri: t.kategoriIdleri,
    urunIdleri: t.urunIdleri,
    kuponVar: !!t.kuponKodu,
    kuponKodu: t.kuponKodu ?? "",
    enAzSepet: tutarGirdisi(t.enAzSepetKurus),
    uyelik: t.ilkSiparis ? "ilk" : t.uyelereOzel || t.kisiBasiSinir ? "uye" : "herkes",
    kisiBasiSinir: sayiYaz(t.kisiBasiSinir),
    enFazlaKullanim: sayiYaz(t.enFazlaKullanim),
    zaman: t.baslangic || t.bitis ? "aralik" : "hemen",
    baslangic: tarihGirdisi(t.baslangic),
    bitis: tarihGirdisi(t.bitis),
    aktif: t.aktif,
  };
}

/** Sunucudaki `tutarCoz`un eşi: "1.000", "50,50", "1500.5". */
export function tutarOku(ham: string): number | null {
  let m = ham.trim().replace(/\s/g, "").replace(/₺|tl$/i, "");
  if (!m) return null;
  if (m.includes(",")) m = m.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(m)) m = m.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(m)) return null;
  return Math.round(Number(m) * 100);
}

/** Kutudaki tarih ("2026-09-30T14:00") İstanbul saatiyle ISO'ya. */
function tarihOku(girdi: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(girdi)) return null;
  const t = new Date(`${girdi}:00+03:00`);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

const tamSayi = (h: string) => (/^\d+$/.test(h.trim()) ? Number(h.trim()) : NaN);

/** Kutulardan özetin ve önerinin okuduğu taslak. */
export function taslagaCevir(d: SihirbazDurumu): KampanyaTaslagi {
  const kademeler =
    d.tip === "kademeli"
      ? d.kademeler
          .filter((k) => k.esik.trim() || k.indirim.trim())
          .map((k) => ({
            esikKurus: tutarOku(k.esik) ?? 0,
            indirimKurus: tutarOku(k.indirim) ?? 0,
          }))
          .sort((a, b) => a.esikKurus - b.esikKurus)
      : null;
  return {
    ad: d.ad.trim(),
    tip: d.tip,
    deger:
      d.tip === "yuzde" || d.tip === "nci-urun"
        ? Math.round(Number(d.yuzde.replace(",", ".")) || 0)
        : d.tip === "tutar"
          ? (tutarOku(d.tutar) ?? 0)
          : 0,
    alAdet: d.tip === "al-ode" ? tamSayi(d.alAdet) : d.tip === "nci-urun" ? tamSayi(d.nciN) : null,
    odeAdet: d.tip === "al-ode" ? tamSayi(d.odeAdet) : null,
    kademeler,
    enFazlaIndirimKurus: d.tip === "yuzde" || d.tip === "nci-urun" ? tutarOku(d.tavan) : null,
    kapsam: d.kapsam,
    kategoriIdleri: d.kapsam === "kategori" ? d.kategoriIdleri : [],
    urunIdleri: d.kapsam === "urun" ? d.urunIdleri : [],
    kuponKodu: d.kuponVar ? d.kuponKodu.trim().toUpperCase() || null : null,
    enAzSepetKurus: tutarOku(d.enAzSepet) ?? 0,
    uyelereOzel: d.uyelik !== "herkes",
    ilkSiparis: d.uyelik === "ilk",
    kisiBasiSinir: d.uyelik !== "herkes" ? tamSayi(d.kisiBasiSinir) || null : null,
    enFazlaKullanim: tamSayi(d.enFazlaKullanim) || null,
    baslangic: d.zaman === "aralik" ? tarihOku(d.baslangic) : null,
    bitis: d.zaman === "aralik" ? tarihOku(d.bitis) : null,
    aktif: d.aktif,
  };
}

/** Önerilen kampanya adı; müşteri sepette bunu görüyor. */
export function adOnerisi(t: KampanyaTaslagi): string {
  switch (t.tip) {
    case "yuzde":
      return t.enAzSepetKurus > 0
        ? `${tutarGirdisi(t.enAzSepetKurus)} ₺ üzeri %${t.deger}`
        : `%${t.deger} indirim`;
    case "tutar":
      return `Sepette ${tutarGirdisi(t.deger)} ₺ indirim`;
    case "al-ode":
      return `${t.alAdet} al ${t.odeAdet} öde`;
    case "nci-urun":
      return `${t.alAdet}. ürüne %${t.deger}`;
    case "kademeli":
      return "Çok alana çok indirim";
    case "kargo":
      return "Ücretsiz kargo";
  }
}

const sinirliMi = (h: string) => {
  if (!h.trim()) return true;
  const n = tamSayi(h);
  return Number.isInteger(n) && n >= 1 && n <= 100_000;
};

/**
 * Adımın hatası; yoksa `null`. Sunucu (`kampanyaKaydet`) aynı kuralları
 * yeniden sınıyor, bu yalnızca kullanıcıyı adımda tutmak için.
 */
export function adimHatasi(d: SihirbazDurumu, adim: number): string | null {
  const t = taslagaCevir(d);
  switch (adim) {
    case 0:
      return TUR_BILGILERI[d.tip] ? null : "Bir kampanya türü seç.";
    case 1: {
      const yuzdeGecerli = () => {
        const n = Number(d.yuzde.replace(",", "."));
        return d.yuzde.trim() !== "" && Number.isFinite(n) && n >= 1 && n <= 100;
      };
      if (d.tip === "yuzde" || d.tip === "nci-urun") {
        if (!yuzdeGecerli()) return "İndirim yüzdesini 1 ile 100 arasında yaz.";
      }
      if (d.tip === "nci-urun") {
        const n = t.alAdet ?? NaN;
        if (!(Number.isInteger(n) && n >= 2 && n <= 10)) return "Kaçıncı ürün: 2 ile 10 arası.";
      }
      if (d.tip === "tutar" && !(t.deger > 0)) return "İndirim tutarını yaz (ör. 100 ya da 49,90).";
      if (d.tip === "al-ode") {
        const x = t.alAdet ?? NaN;
        const y = t.odeAdet ?? NaN;
        if (!(Number.isInteger(x) && x >= 2 && x <= 20))
          return "Alınan adet 2 ile 20 arası olmalı.";
        if (!(Number.isInteger(y) && y >= 1 && y < x)) {
          return "Ödenen adet en az 1 ve alınan adetten küçük olmalı (ör. 3 al 2 öde).";
        }
      }
      if (d.tip === "kademeli") {
        const dolu = d.kademeler.filter((k) => k.esik.trim() || k.indirim.trim());
        if (dolu.length === 0) return "En az bir basamak yaz: sepet tutarı ve indirimi.";
        if (dolu.length > 10) return "En çok 10 basamak olabilir.";
        for (const k of dolu) {
          const e = tutarOku(k.esik);
          const i = tutarOku(k.indirim);
          if (!e || !i) return "Her basamakta sepet tutarını ve indirimi yaz (ör. 500 ve 50).";
          if (i >= e) return "Basamağın indirimi sepet tutarından küçük olmalı.";
        }
        const esikler = (t.kademeler ?? []).map((k) => k.esikKurus);
        if (new Set(esikler).size !== esikler.length) return "Aynı sepet tutarı iki kez yazılmış.";
      }
      if (d.tavan.trim() && (d.tip === "yuzde" || d.tip === "nci-urun")) {
        if (!t.enFazlaIndirimKurus)
          return "İndirim tavanını tutar olarak yaz (ör. 200) ya da boş bırak.";
      }
      return null;
    }
    case 2:
      if (d.kapsam === "kategori" && d.kategoriIdleri.length === 0) {
        return "En az bir kategori işaretle.";
      }
      if (d.kapsam === "urun" && d.urunIdleri.length === 0) return "En az bir ürün işaretle.";
      return null;
    case 3:
      if (d.kuponVar && !/^[A-Z0-9_-]{3,40}$/.test(d.kuponKodu.trim().toUpperCase())) {
        return "Kupon kodu 3-40 karakter: A-Z harf (Türkçe harf yok), rakam, tire. Ör. HOSGELDIN10.";
      }
      if (d.enAzSepet.trim() && tutarOku(d.enAzSepet) === null) {
        return "En az sepet tutarını ₺ olarak yaz (ör. 750) ya da boş bırak.";
      }
      if (!sinirliMi(d.enFazlaKullanim) || (d.uyelik !== "herkes" && !sinirliMi(d.kisiBasiSinir))) {
        return "Kullanım sınırı 1 ya da daha büyük tam sayı olmalı; sınırsızsa boş bırak.";
      }
      return null;
    case 4:
      if (d.zaman === "aralik") {
        if (d.baslangic && !t.baslangic) return "Başlangıç tarihini seç.";
        if (d.bitis && !t.bitis) return "Bitiş tarihini seç.";
        if (!t.baslangic && !t.bitis) return "Başlangıç ya da bitişten en az birini seç.";
        if (t.baslangic && t.bitis && t.bitis <= t.baslangic) {
          return "Bitiş, başlangıçtan sonra olmalı.";
        }
      }
      return null;
    case 5:
      return d.ad.trim() ? null : "Kampanyaya bir ad ver; müşteri sepette bunu görür.";
    default:
      return null;
  }
}

/** Kampanya ekranlarının hata metinleri; adres yalnızca kodu taşıyor (K-57). */
export const KAMPANYA_HATALARI: Record<string, string> = {
  kupon: "Bu kupon kodu başka bir kampanyada kullanılıyor. Başka bir kod seç.",
  "sablon-kupon":
    "Bu hazır kampanyanın kupon kodu başka bir kampanyada kullanılıyor. O kampanyayı sil ya da kodunu değiştir.",
  ad: "Kampanya adı boş olamaz.",
  gecersiz: "Tanınmayan indirim türü ya da kapsam.",
  yuzde: "Yüzde 1 ile 100 arasında bir sayı olmalı.",
  tutar: "Geçerli bir indirim tutarı yaz (ör. 50,00).",
  "al-ode":
    '"X al Y öde" için X en az 2, en çok 20; Y en az 1 ve X\'ten küçük olmalı (ör. 3 al 2 öde).',
  "kupon-harf":
    "Kupon kodu 3-40 karakter; yalnızca Türkçe olmayan büyük harf (A-Z), rakam, tire ve alt çizgi. Ör. HOSGELDIN10.",
  kategori: "En az bir kategori işaretle.",
  urun: "En az bir ürün işaretle.",
  tarih: "Bitiş tarihi başlangıçtan önce olamaz.",
  "nci-urun": "N. ürün 2 ile 10 arasında olmalı (ör. 2. ürüne %50).",
  kademeli:
    "Her basamakta sepet tutarı ve indirim olmalı; indirim tutardan küçük, aynı tutar iki kez olmaz, en çok 10 basamak.",
  tavan: "İndirim tavanı geçerli bir tutar olmalı (ör. 200).",
  sinir: "Kullanım sınırları 1 ya da daha büyük tam sayı olmalı.",
};
