import "server-only";

/**
 * Panel kimliği: kullanıcılar, oturum ve yetki.
 *
 * **Neden tarayıcının şifre kutusu bırakıldı.** Panel bugüne kadar HTTP Basic
 * ile korunuyordu: şifre `YONETIM_SIFRE` ortam değişkenindeydi. Üç sorunu
 * vardı. Tarayıcının kendi kutusu **biçimlendirilemiyor** — markanın hiçbir
 * yanı görünmüyor, Türkçe bile değil. **Çıkış yapmanın yolu yok**; tarayıcı
 * kimliği kapanana kadar tutuyor. Ve **tek bir şifre** vardı: kimin ne yaptığı
 * bilinmiyordu, bir kişi ayrılınca şifreyi herkes için değiştirmek
 * gerekiyordu (K-45).
 *
 * **Müşteriden tamamen ayrı.** Ayrı tablo, ayrı çerez, ayrı oturum. Müşteri
 * oturumu hiçbir koşulda panele geçiş vermiyor; iki sistemin tek ortak yanı
 * şifre özetleme işlevleri (`server/uyelik.ts`), onlar da saf hesap.
 *
 * **Middleware kimlik doğrulamıyor.** Edge çalışma ortamında veritabanı yok.
 * Middleware yalnızca çerez hiç yoksa giriş sayfasına yolluyor; asıl kontrol
 * her istekte burada, veritabanına bakarak yapılıyor. Sahte bir çerez
 * middleware'den geçer ama düzende reddedilir.
 */

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { sifreOzetle, sifreTutuyorMu } from "@/server/uyelik";

export const YONETIM_CEREZI = "yonetim_oturum";

/**
 * Panel oturumu on iki saat yaşıyor, müşterininki gibi otuz gün değil.
 * Panelde stok, sipariş ve müşteri bilgisi var; ortak kullanılan bir
 * bilgisayarda açık kalmış bir panel, açık kalmış bir müşteri hesabından
 * daha pahalı.
 */
const OTURUM_OMRU_SAAT = 12;

export const ROLLER = ["sahip", "yonetici"] as const;
export type Rol = (typeof ROLLER)[number];

export const ROL_ADLARI: Record<Rol, string> = {
  sahip: "Sahip",
  yonetici: "Yönetici",
};

export const ROL_ACIKLAMALARI: Record<Rol, string> = {
  sahip: "Her şeyi yapabilir, kullanıcı ekleyip çıkarabilir.",
  yonetici: "Paneldeki her şeyi yapabilir; kullanıcıları yönetemez.",
};

export type Yonetici = {
  id: string;
  eposta: string;
  adSoyad: string;
  rol: Rol;
};

function jetonOzeti(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

function saatSonra(saat: number): Date {
  return new Date(Date.now() + saat * 60 * 60 * 1000);
}

function rolCoz(deger: string): Rol {
  return (ROLLER as readonly string[]).includes(deger) ? (deger as Rol) : "yonetici";
}

export function epostaNormalle(deger: string): string {
  return deger.trim().toLowerCase();
}

// ─── Kurulum ─────────────────────────────────────────────────────────────

/**
 * Hiç kullanıcı var mı?
 *
 * Yoksa giriş sayfası "ilk kullanıcıyı oluştur" hâline geçiyor ve
 * `YONETIM_SIFRE` ile korunuyor. Ortam değişkeni de yoksa panel hiç
 * açılmıyor — ayar unutulursa panel açıkta kalmasın (eski davranışın
 * korunan yanı).
 */
export async function kullaniciVarMi(): Promise<boolean> {
  return (await db.adminUser.count()) > 0;
}

/** Kurulum şifresi; tanımlı değilse ilk kullanıcı da oluşturulamıyor. */
export function kurulumSifresi(): string | undefined {
  return process.env.YONETIM_SIFRE || undefined;
}

/**
 * İlk kullanıcıyı oluşturur. Yalnızca hiç kullanıcı yokken ve kurulum
 * şifresi doğruyken çalışıyor; ikisi de tek bir işlem içinde kontrol
 * ediliyor ki iki istek aynı anda gelse bile ikinci hesap açılmasın.
 */
export async function ilkKullaniciyiOlustur(girdi: {
  eposta: string;
  adSoyad: string;
  sifre: string;
}): Promise<{ tamam: true; id: string } | { tamam: false; hata: string }> {
  const eposta = epostaNormalle(girdi.eposta);
  if (!eposta.includes("@")) return { tamam: false, hata: "gecersiz-eposta" };

  const ozet = await sifreOzetle(girdi.sifre);

  try {
    const id = await db.$transaction(async (islem) => {
      if ((await islem.adminUser.count()) > 0) throw new Error("zaten-var");
      const olusan = await islem.adminUser.create({
        data: { eposta, adSoyad: girdi.adSoyad.trim(), sifreOzeti: ozet, rol: "sahip" },
        select: { id: true },
      });
      return olusan.id;
    });
    return { tamam: true, id };
  } catch {
    return { tamam: false, hata: "zaten-var" };
  }
}

// ─── Oturum ──────────────────────────────────────────────────────────────

/** Yalnızca server action ya da route handler içinden: render sırasında çerez yazılamaz. */
export async function yonetimOturumuAc(adminId: string): Promise<void> {
  const jeton = randomBytes(32).toString("base64url");

  await db.$transaction([
    db.adminSession.create({
      data: { id: jetonOzeti(jeton), adminId, biter: saatSonra(OTURUM_OMRU_SAAT) },
    }),
    db.adminUser.update({ where: { id: adminId }, data: { sonGiris: new Date() } }),
  ]);

  const kavanoz = await cookies();
  kavanoz.set(YONETIM_CEREZI, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Çerez yalnızca panele gidiyor: mağaza sayfalarına giden her isteğin
    // üstünde panel jetonu taşınmasının gereği yok.
    path: "/yonetim",
    maxAge: OTURUM_OMRU_SAAT * 60 * 60,
  });
}

export async function yonetimOturumuKapat(): Promise<void> {
  const kavanoz = await cookies();
  const jeton = kavanoz.get(YONETIM_CEREZI)?.value;
  if (jeton) {
    await db.adminSession.deleteMany({ where: { id: jetonOzeti(jeton) } });
  }
  kavanoz.delete({ name: YONETIM_CEREZI, path: "/yonetim" });
}

/** Bir kullanıcının bütün oturumlarını düşürür: kapatıldığında ya da silindiğinde. */
export async function oturumlariDusur(adminId: string): Promise<void> {
  await db.adminSession.deleteMany({ where: { adminId } });
}

/**
 * Giriş yapmış panel kullanıcısı; yoksa undefined.
 *
 * Kullanıcı kapatılmışsa oturumu da geçersiz: "kapat" düğmesine basılınca
 * kişi bir sonraki isteğinde dışarıda kalıyor, oturumu bitene kadar
 * beklemiyor.
 */
export async function yoneticiGetir(): Promise<Yonetici | undefined> {
  const kavanoz = await cookies();
  const jeton = kavanoz.get(YONETIM_CEREZI)?.value;
  if (!jeton) return undefined;

  const oturum = await db.adminSession.findUnique({
    where: { id: jetonOzeti(jeton) },
    select: {
      id: true,
      biter: true,
      admin: { select: { id: true, eposta: true, adSoyad: true, rol: true, aktif: true } },
    },
  });
  if (!oturum) return undefined;

  if (oturum.biter.getTime() < Date.now() || !oturum.admin.aktif) {
    await db.adminSession.deleteMany({ where: { id: oturum.id } });
    return undefined;
  }

  // Kullanıldıkça uzuyor ama her sayfa açılışında veritabanına yazılmıyor.
  if (oturum.biter.getTime() - Date.now() < (OTURUM_OMRU_SAAT - 2) * 3_600_000) {
    try {
      await db.adminSession.update({
        where: { id: oturum.id },
        data: { sonGorulme: new Date(), biter: saatSonra(OTURUM_OMRU_SAAT) },
      });
    } catch {
      // Tazeleme sayfanın açılmasını engellemesin.
    }
  }

  const { id, eposta, adSoyad, rol } = oturum.admin;
  return { id, eposta, adSoyad, rol: rolCoz(rol) };
}

/**
 * Panelin her girişinde çağrılıyor: düzende ve her route handler'da.
 *
 * Route handler'lar düzenden geçmiyor — Next.js yalnızca sayfaları düzenle
 * sarıyor. O yüzden `/yonetim` altındaki her `route.ts` bunu kendisi
 * çağırmak zorunda; unutulursa rapor CSV'si ya da şablon dosyası şifresiz
 * indirilebilir olurdu.
 */
export async function yoneticiGerekli(donus?: string): Promise<Yonetici> {
  const yonetici = await yoneticiGetir();
  if (yonetici) return yonetici;

  const nereye = donus && donus.startsWith("/yonetim") ? `?nereye=${encodeURIComponent(donus)}` : "";
  redirect(`/yonetim/giris${nereye}`);
}

/** Kullanıcı yönetimi yalnızca sahipte. */
export async function sahipGerekli(): Promise<Yonetici> {
  const yonetici = await yoneticiGerekli();
  if (yonetici.rol !== "sahip") redirect("/yonetim?yetki=yok");
  return yonetici;
}

// ─── Giriş ───────────────────────────────────────────────────────────────

/**
 * E-posta ve şifreyi doğrular.
 *
 * Hesap yoksa da şifre özetlenmiş bir değerle karşılaştırılıyor: cevabın
 * gelme süresi "bu adres kayıtlı mı" sorusunu ele vermesin. Sayaç ve kilit
 * `server/giris-sinir.ts`'te, çağıran tarafta.
 */
const SAHTE_OZET =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

export async function kimlikDogrula(
  epostaGirdisi: string,
  sifre: string,
): Promise<Yonetici | undefined> {
  const eposta = epostaNormalle(epostaGirdisi);

  const kayit = await db.adminUser.findUnique({
    where: { eposta },
    select: { id: true, eposta: true, adSoyad: true, rol: true, sifreOzeti: true, aktif: true },
  });

  const tutuyor = await sifreTutuyorMu(sifre, kayit?.sifreOzeti ?? SAHTE_OZET);
  if (!kayit || !kayit.aktif || !tutuyor) return undefined;

  return { id: kayit.id, eposta: kayit.eposta, adSoyad: kayit.adSoyad, rol: rolCoz(kayit.rol) };
}

// ─── Kullanıcı listesi ───────────────────────────────────────────────────

export type KullaniciSatiri = Yonetici & {
  aktif: boolean;
  olusturuldu: Date;
  sonGiris: Date | null;
  acikOturum: number;
};

export async function kullanicilariGetir(): Promise<KullaniciSatiri[]> {
  const satirlar = await db.adminUser.findMany({
    orderBy: [{ aktif: "desc" }, { olusturuldu: "asc" }],
    select: {
      id: true,
      eposta: true,
      adSoyad: true,
      rol: true,
      aktif: true,
      olusturuldu: true,
      sonGiris: true,
      _count: { select: { oturumlar: { where: { biter: { gt: new Date() } } } } },
    },
  });

  return satirlar.map((s) => ({
    id: s.id,
    eposta: s.eposta,
    adSoyad: s.adSoyad,
    rol: rolCoz(s.rol),
    aktif: s.aktif,
    olusturuldu: s.olusturuldu,
    sonGiris: s.sonGiris,
    acikOturum: s._count.oturumlar,
  }));
}

/**
 * Son açık sahip mi?
 *
 * Kendini kapatmak, silmek ya da rolünü düşürmek panele girilemez hâle
 * getirebilir. Bunun tek çaresi veritabanına elle müdahale olurdu; o yüzden
 * kural kodda duruyor, uyarı metninde değil.
 */
export async function sonSahipMi(adminId: string): Promise<boolean> {
  const digerSahipler = await db.adminUser.count({
    where: { rol: "sahip", aktif: true, id: { not: adminId } },
  });
  return digerSahipler === 0;
}
