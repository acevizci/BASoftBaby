"use server";

/**
 * Üyelik işlemleri: kayıt, giriş, çıkış, bilgiler, şifre ve adres defteri.
 *
 * Hepsi düz HTML formundan çağrılıyor, yani JavaScript kapalı tarayıcıda da
 * çalışıyor. Hata mesajları adres satırında kod olarak taşınıyor, düz metin
 * olarak değil: aksi halde biri `/giris?hata=...` bağlantısı hazırlayıp
 * sayfamızda istediği yazıyı gösterebilirdi.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import {
  epostayiDogrulanmisSay,
  girisYapan,
  jetonHarca,
  jetonUret,
  oturumAc,
  oturumKapat,
  sifreKisaMi,
  sifreOzetle,
  sifreTutuyorMu,
} from "@/server/uyelik";
import { dogrulamaEpostasi, sifreSifirlamaEpostasi } from "@/server/eposta";

function temiz(veri: FormData, alan: string): string {
  return String(veri.get(alan) ?? "").trim();
}

function epostaGecerliMi(eposta: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta);
}

/**
 * Giriş sonrası dönülecek adres. Yalnızca kendi sitemizin yolu kabul edilir:
 * `//baska-site` gibi bir değer verilirse müşteri oradan giriş yapmış gibi
 * başka bir siteye atılabilirdi.
 */
function guvenliYol(deger: string, varsayilan: string): string {
  if (!deger.startsWith("/") || deger.startsWith("//")) return varsayilan;
  return deger;
}

export async function kayitOl(veri: FormData): Promise<void> {
  const nereye = guvenliYol(temiz(veri, "nereye"), "/hesabim");
  const geri = (kod: string) =>
    `/kayit?hata=${kod}&nereye=${encodeURIComponent(nereye)}`;

  const adSoyad = temiz(veri, "adSoyad");
  // Türkçe yerelde küçültmek "I" harfini "ı" yapıp eşleşmeyi bozar.
  const eposta = temiz(veri, "eposta").toLowerCase();
  const telefon = temiz(veri, "telefon");
  const sifre = String(veri.get("sifre") ?? "");

  if (adSoyad.length < 3 || !epostaGecerliMi(eposta)) redirect(geri("eksik"));
  if (sifreKisaMi(sifre)) redirect(geri("kisa"));

  const varOlan = await db.customer.findUnique({ where: { eposta }, select: { id: true } });
  if (varOlan) redirect(geri("kayitli"));

  const musteri = await db.customer.create({
    data: { adSoyad, eposta, telefon, sifreOzeti: await sifreOzetle(sifre) },
    select: { id: true },
  });

  await dogrulamaGonder(musteri.id, eposta, adSoyad);
  await oturumAc(musteri.id);
  revalidatePath("/", "layout");
  redirect(nereye);
}

export async function girisYap(veri: FormData): Promise<void> {
  const nereye = guvenliYol(temiz(veri, "nereye"), "/hesabim");
  const eposta = temiz(veri, "eposta").toLowerCase();
  const sifre = String(veri.get("sifre") ?? "");

  const musteri = await db.customer.findUnique({
    where: { eposta },
    select: { id: true, sifreOzeti: true },
  });

  // E-posta kayıtlı değilse de şifre yanlışsa da aynı cevap veriliyor: yoksa
  // hangi adreslerin kayıtlı olduğu tek tek denenerek öğrenilebilirdi.
  if (!musteri || !(await sifreTutuyorMu(sifre, musteri.sifreOzeti))) {
    redirect(`/giris?hata=kimlik&nereye=${encodeURIComponent(nereye)}`);
  }

  await oturumAc(musteri.id);
  revalidatePath("/", "layout");
  redirect(nereye);
}

export async function cikisYap(): Promise<void> {
  await oturumKapat();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function bilgileriKaydet(veri: FormData): Promise<void> {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?nereye=%2Fhesabim%2Fbilgiler");

  const adSoyad = temiz(veri, "adSoyad");
  const telefon = temiz(veri, "telefon");
  if (adSoyad.length < 3) redirect("/hesabim/bilgiler?hata=eksik");

  await db.customer.update({ where: { id: musteri.id }, data: { adSoyad, telefon } });
  revalidatePath("/", "layout");
  redirect("/hesabim/bilgiler?kayit=bilgi");
}

export async function sifreDegistir(veri: FormData): Promise<void> {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?nereye=%2Fhesabim%2Fbilgiler");

  const eski = String(veri.get("eskiSifre") ?? "");
  const yeni = String(veri.get("yeniSifre") ?? "");

  const kayit = await db.customer.findUnique({
    where: { id: musteri.id },
    select: { sifreOzeti: true },
  });
  if (!kayit || !(await sifreTutuyorMu(eski, kayit.sifreOzeti))) {
    redirect("/hesabim/bilgiler?hata=sifre-yanlis");
  }
  if (sifreKisaMi(yeni)) redirect("/hesabim/bilgiler?hata=kisa");

  await db.customer.update({
    where: { id: musteri.id },
    data: { sifreOzeti: await sifreOzetle(yeni) },
  });

  // Şifre değişince bütün oturumlar kapanıyor: şifre başkasının eline geçtiği
  // için değiştiriliyorsa onun açık oturumu da düşsün. Bu tarayıcıya yeni
  // oturum açılıyor ki müşteri kendini dışarıda bulmasın.
  await db.customerSession.deleteMany({ where: { customerId: musteri.id } });
  await oturumAc(musteri.id);

  revalidatePath("/", "layout");
  redirect("/hesabim/bilgiler?kayit=sifre");
}

// ─── E-posta doğrulama ve şifre sıfırlama ────────────────────────────────

/** Doğrulama bağlantısını üretip gönderir; gönderilemezse akış bozulmuyor. */
async function dogrulamaGonder(
  customerId: string,
  eposta: string,
  adSoyad: string,
): Promise<void> {
  const jeton = await jetonUret(customerId, "dogrulama");
  await dogrulamaEpostasi(eposta, adSoyad, jeton);
}

export async function dogrulamayiTekrarGonder(): Promise<void> {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?nereye=%2Fhesabim");
  if (musteri.epostaDogrulandiMi) redirect("/hesabim");

  await dogrulamaGonder(musteri.id, musteri.eposta, musteri.adSoyad);
  redirect("/hesabim?kayit=dogrulama-gonderildi");
}

/**
 * Doğrulama bağlantısındaki jetonu harcar.
 *
 * Bağlantı düğmeyle onaylanıyor, doğrudan açılışta değil: kurumsal e-posta
 * tarayıcıları gelen bağlantıları kendiliğinden ziyaret ediyor ve jeton
 * müşteri görmeden harcanmış olurdu.
 */
export async function epostayiDogrula(veri: FormData): Promise<void> {
  const jeton = temiz(veri, "jeton");
  const sonuc = await jetonHarca(jeton, "dogrulama");
  if (!sonuc) redirect("/eposta-dogrula?hata=jeton");

  const baglanan = await epostayiDogrulanmisSay(sonuc.customerId, sonuc.eposta);

  // Bağlantıya başka bir tarayıcıdan tıklanmış olabilir; doğrulayan kişi
  // adresin sahibi olduğunu kanıtladığı için oturum açılıyor.
  await oturumAc(sonuc.customerId);
  revalidatePath("/", "layout");
  redirect(`/hesabim?kayit=dogrulandi&baglanan=${baglanan}`);
}

/**
 * Şifre sıfırlama isteği.
 *
 * Adres kayıtlı olsa da olmasa da aynı cevap veriliyor: yoksa hangi
 * adreslerin kayıtlı olduğu tek tek denenerek öğrenilebilirdi.
 */
export async function sifreSifirlamaIste(veri: FormData): Promise<void> {
  const eposta = temiz(veri, "eposta").toLowerCase();

  if (epostaGecerliMi(eposta)) {
    const musteri = await db.customer.findUnique({
      where: { eposta },
      select: { id: true, adSoyad: true },
    });
    if (musteri) {
      const jeton = await jetonUret(musteri.id, "sifirlama");
      await sifreSifirlamaEpostasi(eposta, musteri.adSoyad, jeton);
    }
  }

  redirect("/sifremi-unuttum?gonderildi=1");
}

export async function sifreyiSifirla(veri: FormData): Promise<void> {
  const jeton = temiz(veri, "jeton");
  const yeni = String(veri.get("yeniSifre") ?? "");

  if (sifreKisaMi(yeni)) {
    redirect(`/sifre-sifirla?jeton=${encodeURIComponent(jeton)}&hata=kisa`);
  }

  const sonuc = await jetonHarca(jeton, "sifirlama");
  if (!sonuc) redirect("/sifre-sifirla?hata=jeton");

  await db.customer.update({
    where: { id: sonuc.customerId },
    data: { sifreOzeti: await sifreOzetle(yeni) },
  });

  // Şifre sıfırlandıysa eski oturumlar da düşmeli: hesap başkasının eline
  // geçtiği için sıfırlanıyor olabilir.
  await db.customerSession.deleteMany({ where: { customerId: sonuc.customerId } });

  // Bağlantı o kutuya gitti ve tıklandı: adresin sahibi olduğu kanıtlandı.
  await epostayiDogrulanmisSay(sonuc.customerId, sonuc.eposta);
  await oturumAc(sonuc.customerId);

  revalidatePath("/", "layout");
  redirect("/hesabim?kayit=sifre");
}

// ─── Adres defteri ───────────────────────────────────────────────────────

function adresEksikMi(g: Record<string, string>): boolean {
  if (g.adSoyad.length < 3) return true;
  if (g.telefon.replace(/\D/g, "").length < 10) return true;
  if (g.adres.length < 10) return true;
  if (g.ilce.length < 2 || g.il.length < 2) return true;
  return false;
}

export async function adresKaydet(veri: FormData): Promise<void> {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?nereye=%2Fhesabim%2Fadresler");

  const id = temiz(veri, "id");
  const girdi = {
    baslik: temiz(veri, "baslik").slice(0, 40) || "Adresim",
    adSoyad: temiz(veri, "adSoyad"),
    telefon: temiz(veri, "telefon"),
    adres: temiz(veri, "adres").slice(0, 500),
    ilce: temiz(veri, "ilce"),
    il: temiz(veri, "il"),
    postaKodu: temiz(veri, "postaKodu"),
  };
  if (adresEksikMi(girdi)) {
    redirect(`/hesabim/adresler?hata=eksik${id ? `&duzenle=${id}` : ""}`);
  }

  const adetVar = await db.address.count({ where: { customerId: musteri.id } });
  // İlk adres kendiliğinden varsayılan olur, yoksa hiçbiri seçili kalmazdı.
  const varsayilan = veri.get("varsayilan") !== null || adetVar === 0;

  await db.$transaction(async (islem) => {
    if (varsayilan) {
      await islem.address.updateMany({
        where: { customerId: musteri.id },
        data: { varsayilan: false },
      });
    }

    if (id) {
      // Kimin adresi olduğu koşulda: başkasının adresinin id'si yazılırsa
      // hiçbir satır güncellenmez.
      const sonuc = await islem.address.updateMany({
        where: { id, customerId: musteri.id },
        data: { ...girdi, varsayilan },
      });
      if (sonuc.count === 0) throw new Error("ADRES_YOK");
      return;
    }

    await islem.address.create({ data: { ...girdi, varsayilan, customerId: musteri.id } });
  });

  revalidatePath("/", "layout");
  redirect("/hesabim/adresler?kayit=adres");
}

export async function adresSil(veri: FormData): Promise<void> {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?nereye=%2Fhesabim%2Fadresler");

  const id = temiz(veri, "id");
  if (!id) redirect("/hesabim/adresler");

  await db.$transaction(async (islem) => {
    const silinen = await islem.address.deleteMany({ where: { id, customerId: musteri.id } });
    if (silinen.count === 0) return;

    // Varsayılan silindiyse defter sahipsiz kalmasın: en eskisi devralır.
    const kalanVarsayilan = await islem.address.count({
      where: { customerId: musteri.id, varsayilan: true },
    });
    if (kalanVarsayilan > 0) return;

    const ilk = await islem.address.findFirst({
      where: { customerId: musteri.id },
      orderBy: { olusturuldu: "asc" },
      select: { id: true },
    });
    if (ilk) await islem.address.update({ where: { id: ilk.id }, data: { varsayilan: true } });
  });

  revalidatePath("/", "layout");
  redirect("/hesabim/adresler?kayit=silindi");
}

export async function varsayilanYap(veri: FormData): Promise<void> {
  const musteri = await girisYapan();
  if (!musteri) redirect("/giris?nereye=%2Fhesabim%2Fadresler");

  const id = temiz(veri, "id");
  if (!id) redirect("/hesabim/adresler");

  await db.$transaction(async (islem) => {
    const sonuc = await islem.address.updateMany({
      where: { id, customerId: musteri.id },
      data: { varsayilan: true },
    });
    if (sonuc.count === 0) return;
    await islem.address.updateMany({
      where: { customerId: musteri.id, id: { not: id } },
      data: { varsayilan: false },
    });
  });

  revalidatePath("/", "layout");
  redirect("/hesabim/adresler?kayit=varsayilan");
}
