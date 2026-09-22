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
import type { Prisma } from "@/db/uretilen/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { istekOnbellegi } from "@/server/onbellek";
import { sifreOzetle, sifreTutuyorMu } from "@/server/uyelik";

export const YONETIM_CEREZI = "yonetim_oturum";

/**
 * Panel oturumu on iki saat yaşıyor, müşterininki gibi otuz gün değil.
 * Panelde stok, sipariş ve müşteri bilgisi var; ortak kullanılan bir
 * bilgisayarda açık kalmış bir panel, açık kalmış bir müşteri hesabından
 * daha pahalı.
 */
const OTURUM_OMRU_SAAT = 12;

/**
 * Panel kullanıcısı.
 *
 * **Rol yok.** Eskiden "sahip" ve "yönetici" vardı; yöneticiden yalnızca
 * Kullanıcılar ekranı gizleniyordu. Sonradan açılan hesap varsayılan olarak
 * yönetici oluyor, kişi de menüde bir şeyin eksik olduğunu görüp bunu hata
 * sanıyordu. Bir-iki kişilik bir mağazada ayrımın koruduğu bir şey yoktu:
 * her panel kullanıcısı her şeyi yapabiliyor (K-79).
 */
export type Yonetici = {
  id: string;
  eposta: string;
  adSoyad: string;
};

function jetonOzeti(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

function saatSonra(saat: number): Date {
  return new Date(Date.now() + saat * 60 * 60 * 1000);
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
        data: { eposta, adSoyad: girdi.adSoyad.trim(), sifreOzeti: ozet, epostaDogrulandi: new Date() },
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
 *
 * İstek önbelleğinde: düzen de sayfa da çağırıyor, veritabanına bir kez
 * gidiliyor (K-51).
 */
export const yoneticiGetir = istekOnbellegi(async function yoneticiGetir(): Promise<
  Yonetici | undefined
> {
  const kavanoz = await cookies();
  const jeton = kavanoz.get(YONETIM_CEREZI)?.value;
  if (!jeton) return undefined;

  const oturum = await db.adminSession.findUnique({
    where: { id: jetonOzeti(jeton) },
    select: {
      id: true,
      biter: true,
      admin: { select: { id: true, eposta: true, adSoyad: true, aktif: true } },
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

  const { id, eposta, adSoyad } = oturum.admin;
  return { id, eposta, adSoyad };
});

/**
 * Panelin her girişinde çağrılıyor: düzende, **her sayfada** ve her route
 * handler'da.
 *
 * **Düzende olması yetmiyor.** Next.js istemci tarafı gezinmede yalnızca
 * değişen parçayı çiziyor; düzen yeniden çalışmıyor. Yani oturumu düşen
 * biri menüden tıklayarak sayfaları görmeye devam ediyordu — yazma
 * işlemleri engelleniyordu ama okuma sızıyordu. Route handler'lar da
 * düzenden geçmiyor. O yüzden `/yonetim` altındaki her sayfa ve her
 * `route.ts` bunu kendisi çağırıyor; `.deneme` taraması bütün yolları
 * gezip doğruluyor (K-51).
 */
export async function yoneticiGerekli(donus?: string): Promise<Yonetici> {
  const yonetici = await yoneticiGetir();
  if (yonetici) return yonetici;

  const nereye = donus && donus.startsWith("/yonetim") ? `?nereye=${encodeURIComponent(donus)}` : "";
  redirect(`/yonetim/giris${nereye}`);
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
    select: {
      id: true,
      eposta: true,
      adSoyad: true,
      sifreOzeti: true,
      aktif: true,
      epostaDogrulandi: true,
    },
  });

  const tutuyor = await sifreTutuyorMu(sifre, kayit?.sifreOzeti ?? SAHTE_OZET);
  // Daveti kabul etmemiş hesap giremiyor: e-postanın o kişiye ait olduğu
  // henüz kanıtlanmadı (K-87).
  if (!kayit || !kayit.aktif || !kayit.epostaDogrulandi || !tutuyor) return undefined;

  return { id: kayit.id, eposta: kayit.eposta, adSoyad: kayit.adSoyad };
}

// ─── Şifre sıfırlama ─────────────────────────────────────────────────────

/** Sıfırlama bağlantısı bir saat yaşıyor. */
const SIFIRLAMA_SAAT = 1;

/**
 * Tek kullanımlık sıfırlama jetonu üretir; e-postaya konacak hâli dönüyor.
 *
 * Veritabanında jetonun kendisi değil SHA-256 özeti duruyor: veritabanını
 * görebilen biri kimsenin şifresini sıfırlayamasın. Yeni bağlantı istenince
 * eskisi siliniyor — yalnızca en son gönderilen çalışsın (K-47).
 */
export async function sifirlamaJetonuUret(
  adminId: string,
  saat: number = SIFIRLAMA_SAAT,
): Promise<string> {
  const jeton = randomBytes(32).toString("base64url");

  await db.$transaction([
    db.adminToken.deleteMany({ where: { adminId } }),
    db.adminToken.create({
      data: {
        id: jetonOzeti(jeton),
        adminId,
        biter: new Date(Date.now() + saat * 60 * 60 * 1000),
      },
    }),
  ]);

  return jeton;
}

/**
 * Davet bağlantısı iki gün geçerli: sıfırlama bağlantısını isteyen kişi
 * ekranın başında bekliyor, davet edilen ise e-postasına ertesi gün bakabilir.
 */
const DAVET_SAAT = 48;

export { DAVET_SAAT, SIFIRLAMA_SAAT };

/**
 * Jetonu harcar: geçerliyse kullanıcıyı döndürür ve jetonu kullanılmış
 * işaretler. Aynı bağlantı ikinci kez çalışmıyor.
 */
export async function sifirlamaJetonuHarca(
  jeton: string,
): Promise<{ id: string; eposta: string; adSoyad: string } | undefined> {
  if (!jeton) return undefined;

  const kayit = await db.adminToken.findUnique({
    where: { id: jetonOzeti(jeton) },
    select: {
      id: true,
      biter: true,
      kullanildi: true,
      admin: { select: { id: true, eposta: true, adSoyad: true, aktif: true } },
    },
  });

  if (!kayit || kayit.kullanildi || !kayit.admin.aktif) return undefined;
  if (kayit.biter.getTime() < Date.now()) return undefined;

  // Koşullu güncelleme: aynı bağlantıya iki kez tıklanırsa ikincisi boş
  // dönüyor.
  const harcandi = await db.adminToken.updateMany({
    where: { id: kayit.id, kullanildi: null },
    data: { kullanildi: new Date() },
  });
  if (harcandi.count === 0) return undefined;

  const { id, eposta, adSoyad } = kayit.admin;
  return { id, eposta, adSoyad };
}

/** Sıfırlama isteği için: adres kayıtlıysa açık kullanıcıyı döndürüyor. */
export async function sifirlanabilirKullanici(
  epostaGirdisi: string,
): Promise<{ id: string; eposta: string; adSoyad: string } | undefined> {
  const kayit = await db.adminUser.findUnique({
    where: { eposta: epostaNormalle(epostaGirdisi) },
    select: { id: true, eposta: true, adSoyad: true, aktif: true },
  });
  if (!kayit || !kayit.aktif) return undefined;
  const { id, eposta, adSoyad } = kayit;
  return { id, eposta, adSoyad };
}

/**
 * Şifreyi yazar ve o kullanıcının bütün oturumlarını düşürür.
 *
 * Sıfırlamanın sebebi çoğu zaman "biri girmiş olabilir"; açık sekmelerin
 * çalışmaya devam etmesi bunun anlamını yok ederdi.
 */
export async function sifreyiYaz(adminId: string, ozet: string): Promise<void> {
  await db.$transaction([
    db.adminUser.update({ where: { id: adminId }, data: { sifreOzeti: ozet } }),
    // E-postaya giden bağlantıyla şifre koymak, adresin bu kişiye ait
    // olduğunu kanıtlıyor: davet de sıfırlama da hesabı doğruluyor (K-87).
    db.adminUser.updateMany({
      where: { id: adminId, epostaDogrulandi: null },
      data: { epostaDogrulandi: new Date() },
    }),
    db.adminSession.deleteMany({ where: { adminId } }),
  ]);
}

/**
 * Süresi geçmiş panel oturumlarını ve sıfırlama jetonlarını siler.
 *
 * Oturum okunurken zaten kendi kaydı siliniyor, ama bir daha hiç
 * uğranmayan kayıtlar birikiyor. Günlük temizlikte süpürülüyor (K-48).
 */
export async function eskiPanelKayitlariniTemizle(): Promise<{
  oturum: number;
  jeton: number;
}> {
  const simdi = new Date();
  const [oturum, jeton] = await db.$transaction([
    db.adminSession.deleteMany({ where: { biter: { lt: simdi } } }),
    // Kullanılmış jetonun da saklanmasının anlamı yok: bir kez çalışıyor.
    db.adminToken.deleteMany({
      where: { OR: [{ biter: { lt: simdi } }, { kullanildi: { not: null } }] },
    }),
  ]);
  return { oturum: oturum.count, jeton: jeton.count };
}

// ─── Kullanıcı listesi ───────────────────────────────────────────────────

export type KullaniciSatiri = Yonetici & {
  aktif: boolean;
  olusturuldu: Date;
  sonGiris: Date | null;
  acikOturum: number;
  /** Davet bekliyorsa boş: şifresini belirlememiş, giriş yapamıyor (K-87). */
  epostaDogrulandi: Date | null;
};

export async function kullanicilariGetir(): Promise<KullaniciSatiri[]> {
  const satirlar = await db.adminUser.findMany({
    orderBy: [{ aktif: "desc" }, { olusturuldu: "asc" }],
    select: {
      id: true,
      eposta: true,
      adSoyad: true,
      aktif: true,
      olusturuldu: true,
      sonGiris: true,
      epostaDogrulandi: true,
      _count: { select: { oturumlar: { where: { biter: { gt: new Date() } } } } },
    },
  });

  return satirlar.map((s) => ({
    id: s.id,
    eposta: s.eposta,
    adSoyad: s.adSoyad,
    aktif: s.aktif,
    olusturuldu: s.olusturuldu,
    sonGiris: s.sonGiris,
    acikOturum: s._count.oturumlar,
    epostaDogrulandi: s.epostaDogrulandi,
  }));
}

/**
 * Son açık kullanıcı mı?
 *
 * Son açık hesabı kapatmak ya da silmek panele girilemez hâle getirir.
 * Kural kodda duruyor, uyarı metninde değil.
 *
 * **Bu tek başına yetmiyor**: okuma ile yazma arasında geçen sürede başka
 * bir istek aynı işi yapabilir (bkz. {@link acikKullaniciKalsinDiye}).
 * Buradaki kontrol düğmenin ve hata metninin doğru olması için; garanti
 * işlemde.
 */
export async function sonAcikKullaniciMi(adminId: string): Promise<boolean> {
  return (await acikKullaniciSayisi({ haric: adminId })) === 0;
}

export async function acikKullaniciSayisi(secenek: { haric?: string } = {}): Promise<number> {
  // Davet bekleyen hesap sayılmıyor: açık ama giremiyor, paneli tek başına
  // ayakta tutamaz (K-87).
  return db.adminUser.count({
    where: {
      aktif: true,
      epostaDogrulandi: { not: null },
      ...(secenek.haric ? { id: { not: secenek.haric } } : {}),
    },
  });
}

/**
 * Açık kullanıcı bırakmayan değişikliği uygulamayan sarmalayıcı.
 *
 * `YONETIM_SIFRE` silindikten sonra panele girmenin tek yolu bir hesapla
 * giriş yapmak; kurulum ekranı ancak hiç kullanıcı kalmazsa geri geliyor ve
 * o da değişken yoksa açılmıyor. Yani **son açık hesap kapanırsa panel
 * kalıcı olarak kapanıyor**, çaresi veritabanına elle müdahale oluyor.
 *
 * Önce okuyup sonra yazmak bunu garanti etmiyor: iki kullanıcı aynı anda
 * birbirini kapatırsa ikisi de kontrolden geçer, ikisi de yazar, ortada açık
 * hesap kalmaz. O yüzden değişiklik ve sayım **tek bir işlemde**, üstelik
 * `Serializable` yalıtımla yapılıyor — çakışan iki işlemden biri
 * veritabanınca geri çevriliyor. Sayım yazmadan sonra: işlem açık hesapsız
 * bir duruma varıyorsa tamamı geri alınıyor (K-46).
 */
export async function acikKullaniciKalsinDiye(
  degistir: (islem: Prisma.TransactionClient) => Promise<unknown>,
): Promise<boolean> {
  try {
    await db.$transaction(
      async (islem) => {
        await degistir(islem);
        const kalan = await islem.adminUser.count({
          where: { aktif: true, epostaDogrulandi: { not: null } },
        });
        if (kalan === 0) throw new Error("acik-hesap-kalmaz");
      },
      { isolationLevel: "Serializable" },
    );
    return true;
  } catch {
    return false;
  }
}
