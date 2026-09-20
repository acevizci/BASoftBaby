import "server-only";
import { kunyeGetir } from "@/server/yasal";
import { siteAdresi } from "@/server/site";

/**
 * E-posta gönderimi — Resend.
 *
 * Kütüphane yerine düz HTTP kullanılıyor: tek bir uca POST atılıyor, paketin
 * getireceği bir şey yok.
 *
 * **Anahtar yoksa gönderilmiyor.** `RESEND_ANAHTARI` tanımlı değilse e-posta
 * atlanıyor ve günlüğe yazılıyor; sipariş, kayıt ya da şifre sıfırlama akışı
 * bundan etkilenmiyor. Alan adı (A-02) alınıp Resend'de doğrulanana kadar
 * durum bu.
 *
 * **Gönderim hiçbir akışı bozmuyor.** Gönderim başarısız olursa hata yalnızca
 * günlüğe düşüyor: e-posta gitmedi diye alınmış bir sipariş kaybolmamalı.
 */

const UC = "https://api.resend.com/emails";

export type EpostaSonucu = { gonderildi: boolean; sebep?: string };

export function epostaAcikMi(): boolean {
  return Boolean(process.env.RESEND_ANAHTARI);
}

function gonderen(): string {
  return process.env.EPOSTA_GONDEREN?.trim() || "BASoftBaby <siparis@basoftbaby.com>";
}

/**
 * Düz metni basit bir HTML'e çevirir.
 *
 * Şablonlar düz yazı olarak yazılıyor: hem e-posta istemcilerinin çoğunda
 * sorunsuz görünüyor hem de metnin içine HTML kaçması mümkün olmuyor.
 */
function htmlYap(metin: string): string {
  const kacir = (m: string) =>
    m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const govde = metin
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${kacir(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!doctype html><html lang="tr"><body style="margin:0;background:#fffcf7;padding:24px;font:16px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#2c2721">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #efe7db;border-radius:16px;padding:24px">
<p style="margin:0 0 18px;font-weight:700;font-size:18px;color:#c2433a">BASoftBaby</p>
${govde}
</div></body></html>`;
}

async function gonder(
  kime: string,
  konu: string,
  metin: string,
): Promise<EpostaSonucu> {
  if (!epostaAcikMi()) {
    console.warn(`E-posta gönderilmedi (RESEND_ANAHTARI yok): ${konu} → ${kime}`);
    return { gonderildi: false, sebep: "anahtar-yok" };
  }

  try {
    const taban = process.env.EPOSTA_TABAN_ADRES?.trim();
    const cevap = await fetch(taban ? `${taban.replace(/\/$/, "")}/emails` : UC, {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_ANAHTARI}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: gonderen(),
        to: [kime],
        subject: konu,
        text: metin.trim(),
        html: htmlYap(metin),
      }),
    });

    if (!cevap.ok) {
      console.error(`E-posta gönderilemedi (${cevap.status}): ${konu} → ${kime}`);
      return { gonderildi: false, sebep: `http-${cevap.status}` };
    }
    return { gonderildi: true };
  } catch (hata) {
    console.error("E-posta gönderilemedi:", hata);
    return { gonderildi: false, sebep: "ag-hatasi" };
  }
}

/** Her e-postanın altına giden imza; künye doluysa oradan. */
async function altBilgi(): Promise<string> {
  const kunye = await kunyeGetir();
  const satirlar = [kunye.unvan, kunye.destekTelefon, kunye.destekEposta].filter(Boolean);
  return satirlar.length > 0 ? `\n\n—\n${satirlar.join(" · ")}` : "\n\n—\nBASoftBaby";
}

export type SiparisEpostasi = {
  numara: string;
  adSoyad: string;
  eposta: string;
  toplamKurus: number;
  odemeYontemi: string;
};

function tutar(kurus: number): string {
  return `${(kurus / 100).toFixed(2).replace(".", ",")} ₺`;
}

/** Sipariş alındığında: havalede banka bilgisi, kartta ödeme beklendiği yazıyor. */
export async function siparisAlindiEpostasi(
  siparis: SiparisEpostasi,
  havaleBilgisi: string,
): Promise<EpostaSonucu> {
  const takip = `${siteAdresi()}/siparis-takip?numara=${encodeURIComponent(siparis.numara)}&eposta=${encodeURIComponent(siparis.eposta)}`;

  const odemeBolumu =
    siparis.odemeYontemi === "havale"
      ? havaleBilgisi
        ? `Ödemeni aşağıdaki hesaba havale/EFT ile yapabilirsin. Açıklama kısmına sipariş numaranı yazmayı unutma.\n\n${havaleBilgisi}`
        : "Ödeme bilgilerini en kısa sürede ileteceğiz."
      : "Kart ödemen alındıktan sonra sana ayrıca haber vereceğiz.";

  return gonder(
    siparis.eposta,
    `Siparişin alındı · ${siparis.numara}`,
    `Merhaba ${siparis.adSoyad},

Siparişini aldık. Sipariş numaran: ${siparis.numara}
Toplam tutar: ${tutar(siparis.toplamKurus)}

${odemeBolumu}

Siparişinin durumunu buradan görebilirsin:
${takip}${await altBilgi()}`,
  );
}

/** Kart ödemesi onaylandığında. */
export async function odemeAlindiEpostasi(siparis: SiparisEpostasi): Promise<EpostaSonucu> {
  const takip = `${siteAdresi()}/siparis-takip?numara=${encodeURIComponent(siparis.numara)}&eposta=${encodeURIComponent(siparis.eposta)}`;

  return gonder(
    siparis.eposta,
    `Ödemen alındı · ${siparis.numara}`,
    `Merhaba ${siparis.adSoyad},

${siparis.numara} numaralı siparişinin ödemesi alındı, siparişin hazırlanmaya başlıyor.
Ödenen tutar: ${tutar(siparis.toplamKurus)}

Kargoya verildiğinde sana yine haber vereceğiz.

Siparişinin durumu:
${takip}${await altBilgi()}`,
  );
}

export async function sifreSifirlamaEpostasi(
  kime: string,
  adSoyad: string,
  jeton: string,
): Promise<EpostaSonucu> {
  const adres = `${siteAdresi()}/sifre-sifirla?jeton=${encodeURIComponent(jeton)}`;

  return gonder(
    kime,
    "Şifreni sıfırla",
    `Merhaba ${adSoyad},

Şifreni sıfırlamak için aşağıdaki bağlantıya tıkla. Bağlantı 1 saat geçerli ve bir kez kullanılabiliyor:

${adres}

Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmez.${await altBilgi()}`,
  );
}

export async function dogrulamaEpostasi(
  kime: string,
  adSoyad: string,
  jeton: string,
): Promise<EpostaSonucu> {
  const adres = `${siteAdresi()}/eposta-dogrula?jeton=${encodeURIComponent(jeton)}`;

  return gonder(
    kime,
    "E-posta adresini doğrula",
    `Merhaba ${adSoyad},

Hesabını açtığın için teşekkürler. Adresini doğrulamak için aşağıdaki bağlantıya tıkla:

${adres}

Doğruladığında, üye olmadan bu adresle verdiğin eski siparişler de hesabına bağlanır.

Bağlantı 3 gün geçerli.${await altBilgi()}`,
  );
}
