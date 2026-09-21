import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/server/veritabani";

/**
 * Üyelik — sunucu tarafı.
 *
 * Şifre hiçbir yerde saklanmıyor: scrypt ile üretilen özeti saklanıyor.
 * Hazır bir kimlik kütüphanesi (Auth.js) yerine kendi oturumumuzu tuttuk,
 * gerekçesi docs/04-kararlar.md K-13'te.
 *
 * Tarayıcıda yalnızca `oturum` çerezi var ve httpOnly: sepette olduğu gibi
 * burada da kimliği sadece sunucu değiştirebiliyor. Çerezdeki jetonun kendisi
 * veritabanında durmuyor, SHA-256 özeti duruyor; veritabanını görebilen biri
 * kimsenin oturumunu ele geçiremesin.
 *
 * E-posta doğrulaması ve şifre sıfırlama burada yok: ikisi de e-posta servisi
 * istiyor, o 04. adımda gelecek. Bu yüzden bir hesap, e-postasının sahibi
 * olduğunu kanıtlamış sayılmıyor (K-14).
 */

export const OTURUM_CEREZI = "oturum";

/** Oturum 30 gün yaşar; her kullanımda sonu ileri atılır. */
const OTURUM_OMRU_GUN = 30;
/** Bitişi bu kadar yaklaşmadan veritabanına yazmıyoruz. */
const TAZELEME_ESIGI_GUN = 5;

const EN_KISA_SIFRE = 8;

export type Musteri = {
  id: string;
  eposta: string;
  adSoyad: string;
  telefon: string;
  epostaDogrulandiMi: boolean;
  pazarlamaIzni: boolean;
};

export type Adres = {
  id: string;
  baslik: string;
  adSoyad: string;
  telefon: string;
  adres: string;
  ilce: string;
  il: string;
  postaKodu: string;
  varsayilan: boolean;
};

// ─── Şifre ───────────────────────────────────────────────────────────────

/**
 * scrypt parametreleri. Bellek maliyeti 128 · N · r ≈ 16 MB; tek bir denemeyi
 * yavaşlatmadan, saniyede milyonlarca deneme yapan bir saldırıyı pahalı kılar.
 */
const SCRYPT = { N: 16384, r: 8, p: 1, uzunluk: 64 };

function turet(sifre: string, tuz: Buffer): Promise<Buffer> {
  return new Promise((coz, at) => {
    scrypt(sifre.normalize("NFKC"), tuz, SCRYPT.uzunluk, SCRYPT, (hata, anahtar) =>
      hata ? at(hata) : coz(anahtar),
    );
  });
}

/** `scrypt$N$r$p$tuz$anahtar` — parametreler özetin içinde, sonradan artırılabilsin. */
export async function sifreOzetle(sifre: string): Promise<string> {
  const tuz = randomBytes(16);
  const anahtar = await turet(sifre, tuz);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${tuz.toString("base64")}$${anahtar.toString("base64")}`;
}

/** Karşılaştırma sabit sürede: şifrenin kaçıncı harfte tutmadığı sızmasın. */
export async function sifreTutuyorMu(sifre: string, ozet: string): Promise<boolean> {
  const parcalar = ozet.split("$");
  if (parcalar.length !== 6 || parcalar[0] !== "scrypt") return false;

  const [, n, r, p, tuz64, anahtar64] = parcalar;
  const beklenen = Buffer.from(anahtar64, "base64");

  let bulunan: Buffer;
  try {
    bulunan = await new Promise<Buffer>((coz, at) => {
      scrypt(
        sifre.normalize("NFKC"),
        Buffer.from(tuz64, "base64"),
        beklenen.length,
        { N: Number(n), r: Number(r), p: Number(p) },
        (hata, anahtar) => (hata ? at(hata) : coz(anahtar)),
      );
    });
  } catch {
    return false;
  }

  return bulunan.length === beklenen.length && timingSafeEqual(bulunan, beklenen);
}

export function sifreKisaMi(sifre: string): boolean {
  return sifre.length < EN_KISA_SIFRE;
}

export { EN_KISA_SIFRE };

// ─── Oturum ──────────────────────────────────────────────────────────────

function jetonOzeti(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

function gunSonra(gun: number): Date {
  return new Date(Date.now() + gun * 24 * 60 * 60 * 1000);
}

/** Yalnızca server action içinden çağrılabilir: render sırasında çerez yazılamaz. */
export async function oturumAc(customerId: string): Promise<void> {
  const jeton = randomBytes(32).toString("base64url");

  await db.customerSession.create({
    data: { id: jetonOzeti(jeton), customerId, biter: gunSonra(OTURUM_OMRU_GUN) },
  });

  const kavanoz = await cookies();
  kavanoz.set(OTURUM_CEREZI, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OTURUM_OMRU_GUN * 24 * 60 * 60,
  });
}

export async function oturumKapat(): Promise<void> {
  const kavanoz = await cookies();
  const jeton = kavanoz.get(OTURUM_CEREZI)?.value;
  if (jeton) {
    // Kayıt zaten silinmişse hata vermesin: çıkış her hâlükârda olmalı.
    await db.customerSession.deleteMany({ where: { id: jetonOzeti(jeton) } });
  }
  kavanoz.delete(OTURUM_CEREZI);
}

/** Giriş yapan müşteri; yoksa undefined. Sayfalar kimliği hep buradan okur. */
export async function girisYapan(): Promise<Musteri | undefined> {
  const kavanoz = await cookies();
  const jeton = kavanoz.get(OTURUM_CEREZI)?.value;
  if (!jeton) return undefined;

  const oturum = await db.customerSession.findUnique({
    where: { id: jetonOzeti(jeton) },
    select: {
      id: true,
      biter: true,
      customer: {
        select: {
          id: true,
          eposta: true,
          adSoyad: true,
          telefon: true,
          epostaDogrulandi: true,
          pazarlamaIzni: true,
        },
      },
    },
  });
  if (!oturum) return undefined;

  if (oturum.biter.getTime() < Date.now()) {
    await db.customerSession.deleteMany({ where: { id: oturum.id } });
    return undefined;
  }

  // Kullanıldıkça uzasın, ama her sayfa açılışında veritabanına yazmayalım.
  if (oturum.biter.getTime() - Date.now() < (OTURUM_OMRU_GUN - TAZELEME_ESIGI_GUN) * 86_400_000) {
    try {
      await db.customerSession.update({
        where: { id: oturum.id },
        data: { sonGorulme: new Date(), biter: gunSonra(OTURUM_OMRU_GUN) },
      });
    } catch {
      // Tazeleme sayfanın açılmasını engellemesin.
    }
  }

  const { epostaDogrulandi, ...musteri } = oturum.customer;
  return { ...musteri, epostaDogrulandiMi: epostaDogrulandi !== null };
}

// ─── E-posta jetonları ───────────────────────────────────────────────────

/**
 * Jeton türleri: ne kadar yaşadıkları ve eskisinin geçerliliğini yitirip
 * yitirmediği.
 *
 * Şifre sıfırlama ve doğrulamada yalnızca en son gönderilen bağlantı
 * çalışmalı (`tekil`): eski bir e-postadaki bağlantının aylarca açık kalması
 * risk. Pazarlama iptalinde tersi geçerli — insan hangi e-postayı açarsa
 * açsın listeden çıkabilmeli, o yüzden eski bağlantılar da yaşamaya devam
 * ediyor.
 */
const JETONLAR = {
  sifirlama: { saat: 1, tekil: true },
  dogrulama: { saat: 72, tekil: true },
  "pazarlama-iptal": { saat: 24 * 180, tekil: false },
} as const;

export type JetonTuru = keyof typeof JETONLAR;

/**
 * Tek kullanımlık jeton üretir; geriye e-postaya konacak hâli döner.
 *
 * Veritabanında jetonun kendisi değil SHA-256 özeti duruyor (oturumda olduğu
 * gibi): veritabanını görebilen biri kimsenin şifresini sıfırlayamasın.
 */
export async function jetonUret(customerId: string, tur: JetonTuru): Promise<string> {
  const jeton = randomBytes(32).toString("base64url");

  if (JETONLAR[tur].tekil) {
    await db.customerToken.deleteMany({ where: { customerId, tur } });
  }
  await db.customerToken.create({
    data: {
      id: jetonOzeti(jeton),
      customerId,
      tur,
      biter: new Date(Date.now() + JETONLAR[tur].saat * 60 * 60 * 1000),
    },
  });

  return jeton;
}

/**
 * Jetonu harcar: geçerliyse hesabın id'sini döndürür ve jetonu kullanılmış
 * işaretler. Aynı bağlantı ikinci kez çalışmaz.
 */
export async function jetonHarca(
  jeton: string,
  tur: JetonTuru,
): Promise<{ customerId: string; eposta: string } | undefined> {
  if (!jeton) return undefined;

  const kayit = await db.customerToken.findUnique({
    where: { id: jetonOzeti(jeton) },
    select: {
      id: true,
      tur: true,
      biter: true,
      kullanildi: true,
      customer: { select: { id: true, eposta: true } },
    },
  });

  if (!kayit || kayit.tur !== tur || kayit.kullanildi) return undefined;
  if (kayit.biter.getTime() < Date.now()) return undefined;

  // Koşullu güncelleme: aynı bağlantıya iki kez tıklanırsa ikincisi boş döner.
  const harcandi = await db.customerToken.updateMany({
    where: { id: kayit.id, kullanildi: null },
    data: { kullanildi: new Date() },
  });
  if (harcandi.count === 0) return undefined;

  return { customerId: kayit.customer.id, eposta: kayit.customer.eposta };
}

/**
 * E-postayı doğrulanmış işaretler ve o adresle üyeliksiz verilmiş siparişleri
 * hesaba bağlar.
 *
 * Bağlama ancak burada yapılabiliyor: doğrulanmamış bir adres o kutunun
 * sahibi olunduğunun kanıtı değil, yani başkasının adresiyle hesap açan biri
 * onun siparişlerini görebilirdi (K-14).
 */
export async function epostayiDogrulanmisSay(customerId: string, eposta: string): Promise<number> {
  await db.customer.update({
    where: { id: customerId },
    data: { epostaDogrulandi: new Date() },
  });

  const baglanan = await db.order.updateMany({
    where: { eposta, customerId: null },
    data: { customerId },
  });

  return baglanan.count;
}

// ─── Okuma ───────────────────────────────────────────────────────────────

export async function adresleriGetir(customerId: string): Promise<Adres[]> {
  return db.address.findMany({
    where: { customerId },
    orderBy: [{ varsayilan: "desc" }, { olusturuldu: "asc" }],
    select: {
      id: true,
      baslik: true,
      adSoyad: true,
      telefon: true,
      adres: true,
      ilce: true,
      il: true,
      postaKodu: true,
      varsayilan: true,
    },
  });
}

export async function adresGetir(customerId: string, id: string): Promise<Adres | undefined> {
  const kayit = await db.address.findFirst({
    where: { id, customerId },
    select: {
      id: true,
      baslik: true,
      adSoyad: true,
      telefon: true,
      adres: true,
      ilce: true,
      il: true,
      postaKodu: true,
      varsayilan: true,
    },
  });
  return kayit ?? undefined;
}

export type SiparisOzeti = {
  numara: string;
  durum: string;
  odemeDurumu: string;
  toplamKurus: number;
  olusturuldu: Date;
  kalemAdedi: number;
  ilkUrun: string;
};

/**
 * Hesabın siparişleri. Yalnızca üye olarak verilenler görünür: e-postası
 * tutan eski siparişler kendiliğinden bağlanmaz (K-14), onlar numara ve
 * e-postayla sipariş takibinden görülür.
 */
/**
 * Sipariş bu hesaba bağlı mı?
 *
 * Üyenin kendi sipariş sayfası buna bakıyor: e-postanın tutması tek başına
 * yetmiyor, siparişin gerçekten hesaba bağlanmış olması gerekiyor. Bağlama
 * e-posta doğrulandıktan sonra yapılıyor (K-14).
 */
export async function buHesabaBagliMi(customerId: string, numara: string): Promise<boolean> {
  const kayit = await db.order.findFirst({
    where: { customerId, numara: numara.trim().toUpperCase() },
    select: { id: true },
  });
  return kayit !== null;
}

export async function siparislerimiGetir(customerId: string): Promise<SiparisOzeti[]> {
  const kayitlar = await db.order.findMany({
    where: { customerId },
    orderBy: { olusturuldu: "desc" },
    select: {
      numara: true,
      durum: true,
      odemeDurumu: true,
      toplamKurus: true,
      olusturuldu: true,
      satirlar: { select: { urunAd: true, adet: true }, orderBy: { id: "asc" } },
    },
  });

  return kayitlar.map((k) => ({
    numara: k.numara,
    durum: k.durum,
    odemeDurumu: k.odemeDurumu,
    toplamKurus: k.toplamKurus,
    olusturuldu: k.olusturuldu,
    kalemAdedi: k.satirlar.reduce((t, s) => t + s.adet, 0),
    ilkUrun: k.satirlar[0]?.urunAd ?? "",
  }));
}
