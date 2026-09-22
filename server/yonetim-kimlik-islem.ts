"use server";

/**
 * Panel giriş ve kullanıcı işlemleri.
 *
 * Hepsi form gönderimi (server action): JavaScript kapalı tarayıcıda da
 * çalışıyor, sitenin geri kalanı gibi.
 */

import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { sifreKisaMi, sifreOzetle, sifreTutuyorMu } from "@/server/uyelik";
import { basariliGiris, basarisizDeneme, girisDenenebilirMi } from "@/server/giris-sinir";
import { epostaAcikMi, panelSifreSifirlamaEpostasi } from "@/server/eposta";
import {
  acikKullaniciKalsinDiye,
  epostaNormalle,
  ilkKullaniciyiOlustur,
  kimlikDogrula,
  kullaniciVarMi,
  kurulumSifresi,
  oturumlariDusur,
  sifirlamaJetonuHarca,
  sifirlamaJetonuUret,
  sifirlanabilirKullanici,
  sifreyiYaz,
  sonAcikKullaniciMi,
  yonetimOturumuAc,
  yonetimOturumuKapat,
  yoneticiGerekli,
} from "@/server/yonetim-kimlik";

function metin(form: FormData, ad: string): string {
  return String(form.get(ad) ?? "").trim();
}

/** Yalnızca panelin içine dönülüyor: hazırlanmış bir bağlantı dışarı yollamasın. */
function hedefCoz(form: FormData): string {
  const nereye = metin(form, "nereye");
  return nereye.startsWith("/yonetim") && !nereye.startsWith("/yonetim/giris")
    ? nereye
    : "/yonetim";
}

function girise(hata: string, ek: Record<string, string> = {}): never {
  const p = new URLSearchParams({ hata, ...ek });
  redirect(`/yonetim/giris?${p.toString()}`);
}

// ─── Giriş ───────────────────────────────────────────────────────────────

export async function yonetimGirisi(form: FormData): Promise<void> {
  const eposta = epostaNormalle(metin(form, "eposta"));
  const sifre = String(form.get("sifre") ?? "");
  const hedef = hedefCoz(form);

  if (!eposta || !sifre) girise("eksik");

  // Sayaç scrypt'ten **önce**: kilitliyken pahalı işlem hiç yapılmıyor
  // (K-38).
  const sinir = await girisDenenebilirMi(eposta);
  if (sinir.kilitli) girise("kilit", { dk: String(sinir.kalanDk) });

  const yonetici = await kimlikDogrula(eposta, sifre);
  if (!yonetici) {
    const sonuc = await basarisizDeneme(eposta);
    if (sonuc.kilitli) girise("kilit", { dk: String(sonuc.kalanDk) });
    girise("yanlis");
  }

  await basariliGiris(eposta);
  await yonetimOturumuAc(yonetici.id);
  redirect(hedef);
}

export async function yonetimCikisi(): Promise<void> {
  await yonetimOturumuKapat();
  redirect("/yonetim/giris?cikis=1");
}

// ─── Şifremi unuttum ─────────────────────────────────────────────────────

/**
 * Sıfırlama bağlantısı ister.
 *
 * **Adresin kayıtlı olup olmadığı söylenmiyor.** Kayıtlıysa da değilse de
 * aynı ekran çıkıyor; yoksa bu form panelde kimlerin hesabı olduğunu
 * öğrenmenin yolu olurdu. Sayaç da aynı sebeple adresin özetine bakıyor,
 * hesabın kimliğine değil (K-38).
 *
 * E-posta servisi bağlı değilse durum açıkça yazılıyor: "gönderdik" deyip
 * hiç gitmeyen bir bağlantıyı beklettirmek, hiç sıfırlama olmamasından
 * kötü (K-47).
 */
export async function sifirlamaIste(form: FormData): Promise<void> {
  const eposta = epostaNormalle(metin(form, "eposta"));
  const geri = (ek: Record<string, string>) =>
    redirect(`/yonetim/sifremi-unuttum?${new URLSearchParams(ek).toString()}`);

  if (!eposta.includes("@")) geri({ hata: "gecersiz-eposta" });

  if (!epostaAcikMi()) geri({ hata: "eposta-kapali" });

  const sinir = await girisDenenebilirMi(`sifirlama:${eposta}`);
  if (sinir.kilitli) geri({ hata: "kilit", dk: String(sinir.kalanDk) });
  await basarisizDeneme(`sifirlama:${eposta}`);

  const kullanici = await sifirlanabilirKullanici(eposta);
  if (kullanici) {
    const jeton = await sifirlamaJetonuUret(kullanici.id);
    await panelSifreSifirlamaEpostasi(kullanici.eposta, kullanici.adSoyad, jeton);
  }

  geri({ gonderildi: "1" });
}

/** Bağlantıdaki jetonu harcayıp yeni şifreyi yazar. */
export async function sifreyiSifirla(form: FormData): Promise<void> {
  const jeton = metin(form, "jeton");
  const sifre = String(form.get("sifre") ?? "");
  const geri = (ek: Record<string, string>) =>
    redirect(
      `/yonetim/sifre-sifirla?${new URLSearchParams({ jeton, ...ek }).toString()}`,
    );

  if (sifreKisaMi(sifre)) geri({ hata: "kisa-sifre" });

  const kullanici = await sifirlamaJetonuHarca(jeton);
  if (!kullanici) redirect("/yonetim/sifre-sifirla?hata=gecersiz-jeton");

  await sifreyiYaz(kullanici.id, await sifreOzetle(sifre));
  await basariliGiris(`sifirlama:${kullanici.eposta}`);
  await basariliGiris(kullanici.eposta);

  // Doğrudan içeri alınmıyor: yeni şifreyi bir kez yazmak, gerçekten
  // hatırlandığını gösteriyor ve tarayıcının şifreyi kaydetmesine fırsat
  // veriyor.
  redirect("/yonetim/giris?sifirlandi=1");
}

// ─── İlk kurulum ─────────────────────────────────────────────────────────

/**
 * İlk sahibi oluşturur.
 *
 * `YONETIM_SIFRE` yalnızca burada işe yarıyor: hiç kullanıcı yokken ilk
 * hesabı açmanın anahtarı. Hesap açıldıktan sonra o şifreyle kimse giriş
 * yapamıyor — ortam değişkeninde duran ortak bir şifre kalıcı bir arka kapı
 * olurdu ve "kim yaptı" sorusunu yine cevapsız bırakırdı (K-45).
 */
export async function ilkKurulum(form: FormData): Promise<void> {
  if (await kullaniciVarMi()) redirect("/yonetim/giris");

  const kurulum = kurulumSifresi();
  if (!kurulum) redirect("/yonetim/giris");

  const eposta = epostaNormalle(metin(form, "eposta"));
  const adSoyad = metin(form, "adSoyad");
  const sifre = String(form.get("sifre") ?? "");

  // Kurulum şifresi de sayaca tabi: ortam değişkenindeki şifre de denenebilir.
  const sinir = await girisDenenebilirMi(`kurulum:${eposta}`);
  if (sinir.kilitli) girise("kilit", { dk: String(sinir.kalanDk) });

  if (metin(form, "kurulumSifresi") !== kurulum) {
    const sonuc = await basarisizDeneme(`kurulum:${eposta}`);
    if (sonuc.kilitli) girise("kilit", { dk: String(sonuc.kalanDk) });
    girise("kurulum-sifresi");
  }
  await basariliGiris(`kurulum:${eposta}`);

  if (!eposta.includes("@")) girise("gecersiz-eposta");
  if (!adSoyad) girise("eksik");
  if (sifreKisaMi(sifre)) girise("kisa-sifre");

  const sonuc = await ilkKullaniciyiOlustur({ eposta, adSoyad, sifre });
  if (!sonuc.tamam) girise("zaten-var");

  await yonetimOturumuAc(sonuc.id);
  redirect("/yonetim/kullanicilar?kayit=ilk");
}

// ─── Kullanıcı yönetimi ──────────────────────────────────────────────────

const LISTE = "/yonetim/kullanicilar";

function listeye(anahtar: string, deger: string): never {
  redirect(`${LISTE}?${anahtar}=${deger}`);
}

export async function kullaniciEkle(form: FormData): Promise<void> {
  await yoneticiGerekli();

  const eposta = epostaNormalle(metin(form, "eposta"));
  const adSoyad = metin(form, "adSoyad");
  const sifre = String(form.get("sifre") ?? "");

  if (!eposta.includes("@")) listeye("hata", "gecersiz-eposta");
  if (!adSoyad) listeye("hata", "eksik");
  if (sifreKisaMi(sifre)) listeye("hata", "kisa-sifre");

  const ozet = await sifreOzetle(sifre);
  try {
    await db.adminUser.create({ data: { eposta, adSoyad, sifreOzeti: ozet } });
  } catch {
    listeye("hata", "eposta-kullanimda");
  }
  listeye("kayit", "eklendi");
}

/**
 * Kullanıcıyı açar ya da kapatır.
 *
 * Kapatınca oturumları da düşüyor: bir sonraki istekte dışarıda kalıyor.
 * Kendini ve son açık hesabı kapatmak engelli — panele girilemez hâle gelirdi.
 */
export async function kullaniciCevir(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();
  const id = metin(form, "id");
  if (!id) listeye("hata", "bulunamadi");

  const kayit = await db.adminUser.findUnique({ where: { id }, select: { aktif: true } });
  if (!kayit) listeye("hata", "bulunamadi");

  if (kayit.aktif) {
    if (id === ben.id) listeye("hata", "kendini-kapatamaz");
    if (await sonAcikKullaniciMi(id)) listeye("hata", "son-kullanici");
  }

  // Kapatma açık hesap bırakmıyorsa hiç uygulanmıyor; kontrol işlemin
  // içinde, yukarıdaki okuma yalnızca hata metni için (K-46).
  const oldu = await acikKullaniciKalsinDiye((islem) =>
    islem.adminUser.update({ where: { id }, data: { aktif: !kayit.aktif } }),
  );
  if (!oldu) listeye("hata", "son-kullanici");

  if (kayit.aktif) await oturumlariDusur(id);

  listeye("kayit", kayit.aktif ? "kapatildi" : "acildi");
}

/**
 * Kullanıcıyı siler.
 *
 * Kapatmak çoğu durumda doğrusu — kaydı duruyor. Silme, yanlışlıkla açılmış
 * bir hesap için var.
 */
export async function kullaniciSil(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();
  const id = metin(form, "id");
  if (!id) listeye("hata", "bulunamadi");
  if (id === ben.id) listeye("hata", "kendini-silemez");
  if (await sonAcikKullaniciMi(id)) listeye("hata", "son-kullanici");

  const varMi = await db.adminUser.count({ where: { id } });
  if (varMi === 0) listeye("hata", "bulunamadi");

  const oldu = await acikKullaniciKalsinDiye((islem) => islem.adminUser.delete({ where: { id } }));
  if (!oldu) listeye("hata", "son-kullanici");

  listeye("kayit", "silindi");
}

/**
 * Başkasının şifresini değiştirir.
 *
 * Şifre değişince o kullanıcının açık oturumları düşüyor: şifresi
 * değiştirilen biri açık sekmesinden çalışmaya devam etmesin.
 */
export async function sifreAta(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();
  const id = metin(form, "id");
  const sifre = String(form.get("sifre") ?? "");
  if (!id) listeye("hata", "bulunamadi");
  // Kendi şifresi Hesabım'dan, mevcut şifre sorularak değişiyor; buradan
  // değiştirmek bu oturumu da düşürürdü.
  if (id === ben.id) redirect("/yonetim/hesabim");
  if (sifreKisaMi(sifre)) listeye("hata", "kisa-sifre");

  const ozet = await sifreOzetle(sifre);
  try {
    await db.adminUser.update({ where: { id }, data: { sifreOzeti: ozet } });
  } catch {
    listeye("hata", "bulunamadi");
  }
  await oturumlariDusur(id);
  listeye("kayit", "sifre");
}

/** Kendi şifresini değiştirir; her kullanıcı yapabiliyor. */
export async function kendiSifremiDegistir(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();

  const eski = String(form.get("eskiSifre") ?? "");
  const yeni = String(form.get("yeniSifre") ?? "");

  const kayit = await db.adminUser.findUnique({
    where: { id: ben.id },
    select: { sifreOzeti: true },
  });
  if (!kayit || !(await sifreTutuyorMu(eski, kayit.sifreOzeti))) {
    redirect("/yonetim/hesabim?hata=eski-sifre");
  }
  if (sifreKisaMi(yeni)) redirect("/yonetim/hesabim?hata=kisa-sifre");

  await db.adminUser.update({
    where: { id: ben.id },
    data: { sifreOzeti: await sifreOzetle(yeni) },
  });

  // Öteki cihazlardaki oturumlar düşüyor, buradaki yenileniyor: şifresini
  // değiştirmenin sebebi çoğu zaman "biri girmiş olabilir".
  await oturumlariDusur(ben.id);
  await yonetimOturumuAc(ben.id);
  redirect("/yonetim/hesabim?kayit=sifre");
}

/** Kendi açık oturumlarını sonlandırır (bu cihaz dahil). */
export async function tumOturumlariKapat(): Promise<void> {
  const ben = await yoneticiGerekli();
  await oturumlariDusur(ben.id);
  await yonetimOturumuKapat();
  redirect("/yonetim/giris?cikis=1");
}
