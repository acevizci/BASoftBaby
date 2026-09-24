"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/veritabani";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { bultenDenemesi, bultenMetni, topluGonder, type TopluEposta } from "@/server/eposta";
import { topluIptalJetonu } from "@/server/uyelik";
import { siteAdresi } from "@/server/site";

/** E-bülten eylemleri (K-125). */

const geri = (ek: string): never => redirect(`/yonetim/bulten?${ek}`);

/** Gönderilebilecek alıcılar: izin vermiş ve e-postasını doğrulamış müşteriler. */
function alicilar() {
  return db.customer.findMany({
    where: { pazarlamaIzni: true, epostaDogrulandi: { not: null } },
    select: { id: true, adSoyad: true, eposta: true },
    orderBy: { olusturuldu: "asc" },
  });
}

export async function bulteniGonder(form: FormData): Promise<void> {
  const ben = await yoneticiGerekli();
  const konu = String(form.get("konu") ?? "").trim().slice(0, 150);
  const metin = String(form.get("metin") ?? "").trim().slice(0, 20_000);
  if (!konu || !metin) geri("hata=eksik");

  const site = siteAdresi();

  // Deneme: yalnızca yöneticinin kendi adresine, çıkış bağlantısı örnek.
  if (form.get("tur") === "deneme") {
    const govde = await bultenMetni(ben.adSoyad, metin, `${site}/eposta-izni?jeton=ornek`);
    const sonuc = await bultenDenemesi(ben.eposta, konu, govde);
    geri(sonuc.gonderildi ? "deneme=1" : "hata=eposta");
  }

  // Gerçek gönderim: İYS onayı işaretlenmeden gitmiyor.
  if (form.get("iys") !== "on") geri("hata=iys");

  // Aynı form iki kez gönderilmesin (çift tık, geri tuşu): formdaki anahtar
  // bültenin kimliği; ikinci deneme veritabanında çakışıyor.
  const anahtar = String(form.get("anahtar") ?? "");
  if (!/^[a-z0-9]{16,40}$/.test(anahtar)) geri("hata=eksik");
  try {
    await db.newsletter.create({ data: { id: anahtar, konu, metin, yapan: ben.adSoyad } });
  } catch {
    geri("hata=tekrar");
  }

  const liste = await alicilar();
  const jetonlar = await topluIptalJetonu(liste.map((m) => m.id));
  const epostalar: TopluEposta[] = await Promise.all(
    liste.map(async (m) => {
      const jeton = encodeURIComponent(jetonlar.get(m.id) ?? "");
      return {
        kime: m.eposta,
        konu,
        metin: await bultenMetni(m.adSoyad, metin, `${site}/eposta-izni?jeton=${jeton}`),
        iptalAdresi: `${site}/api/eposta-izni?jeton=${jeton}`,
      };
    }),
  );
  const sonuc = await topluGonder(epostalar);

  await db.newsletter.update({
    where: { id: anahtar },
    data: {
      alici: liste.length,
      gonderilen: sonuc.gonderilen,
      durum: sonuc.gonderilen === liste.length ? "gonderildi" : "yarim",
      bitti: new Date(),
    },
  });
  geri(`gonderildi=${sonuc.gonderilen}&alici=${liste.length}`);
}

/**
 * İYS dosyası yüklendikten sonra: o ana kadarki kayıtlar bildirildi diye
 * işaretleniyor. Dosya indirildikten sonra gelen kayıtlar işaretlenmesin
 * diye sınır formdan geliyor (dosyadaki en yeni kaydın zamanı).
 */
export async function iysBildirildi(form: FormData): Promise<void> {
  await yoneticiGerekli();
  const kadar = new Date(String(form.get("kadar") ?? ""));
  if (Number.isNaN(kadar.getTime())) geri("hata=eksik");
  const { count } = await db.consentEvent.updateMany({
    where: { iysBildirildi: null, tarih: { lte: kadar } },
    data: { iysBildirildi: new Date() },
  });
  geri(`iys=${count}`);
}
