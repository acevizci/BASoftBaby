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

export type EpostaSonucu = {
  gonderildi: boolean;
  sebep?: string;
  /** Resend'in kendi hata metni: "The basoftbaby.com domain is not verified…" */
  mesaj?: string;
};

/**
 * Ortam değişkenindeki anahtar, temizlenmiş hâliyle.
 *
 * Vercel'e yapıştırılırken sona satır sonu ya da boşluk, başa sona tırnak
 * kaçabiliyor (`.env` alışkanlığıyla `"re_…"` yazmak). Resend bunları
 * anahtarın parçası sayıp "API key is invalid" diyordu (K-86).
 */
export function resendAnahtari(): string {
  return (process.env.RESEND_ANAHTARI ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

/**
 * Anahtarın ekranda gösterilebilecek özeti: baştaki birkaç karakter ve
 * uzunluk. Anahtarın kendisi hiçbir zaman gösterilmiyor; bu kadarı "doğru
 * anahtar mı, eksik mi kopyalandı" sorusuna yetiyor (K-86).
 */
export function anahtarOzeti(): { onEk: string; uzunluk: number; bicimDogru: boolean; temizlendi: boolean } {
  const ham = process.env.RESEND_ANAHTARI ?? "";
  const temiz = resendAnahtari();
  return {
    onEk: temiz.slice(0, 5),
    uzunluk: temiz.length,
    bicimDogru: /^re_[A-Za-z0-9_]{20,}$/.test(temiz),
    temizlendi: ham !== temiz,
  };
}

export function epostaAcikMi(): boolean {
  return resendAnahtari() !== "";
}

/** Gönderen adres; panelde gösteriliyor, alan adı Resend'dekiyle aynı olmalı. */
export function gonderenAdresi(): string {
  return gonderen();
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
        authorization: `Bearer ${resendAnahtari()}`,
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
      // Resend sebebi gövdede yazıyor ("domain is not verified", "API key is
      // invalid"…). Eskiden atılıyordu; günlükte yalnızca durum kodu kalıyor,
      // hangi ayarın eksik olduğu anlaşılmıyordu.
      const mesaj = await cevap
        .json()
        .then((g: { message?: string }) => g.message)
        .catch(() => undefined);
      console.error(
        `E-posta gönderilemedi (${cevap.status}${mesaj ? `: ${mesaj}` : ""}): ${konu} → ${kime}`,
      );
      return { gonderildi: false, sebep: `http-${cevap.status}`, mesaj };
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

/**
 * Para iadesi tamamlandığında.
 *
 * İade akışında müşteri iki kez haber alıyordu: talebi alındığında ve
 * sonuçlandığında. **Paranın gerçekten gönderildiği an** sessizdi — oysa
 * beklenen haber o (K-62). Havalede özellikle önemli: müşteri hesabına
 * bakmadan bilemiyor.
 *
 * Kartta "bankana göre birkaç iş günü" uyarısı var: para iyzico'dan çıkmış
 * olsa bile kartta görünmesi zaman alıyor ve bu süre bize bağlı değil.
 */
export async function iadeYapildiEpostasi(
  alici: string,
  bilgi: { numara: string; adSoyad: string; tutarKurus: number; yontem: string },
): Promise<EpostaSonucu> {
  const kartMi = bilgi.yontem === "kart";

  return gonder(
    alici,
    `İaden gönderildi · ${bilgi.numara}`,
    `Merhaba ${bilgi.adSoyad},

${bilgi.numara} numaralı siparişin için ${tutar(bilgi.tutarKurus)} tutarında iade yapıldı.

${
  kartMi
    ? "İade kartına gönderildi. Bankana göre hesabında görünmesi birkaç iş günü sürebiliyor; bu süre bankanın işleyişine bağlı."
    : "İade, bize bildirdiğin hesaba havale ile gönderildi."
}

Bir sorun olursa bu e-postayı yanıtlaman yeterli.${await altBilgi()}`,
  );
}

/**
 * Havale siparişinin süresi dolmadan önce hatırlatma.
 *
 * Bekleyen sipariş stoğu tutuyor; süresi dolunca kendiliğinden iptal olup
 * stok geri veriliyor (K-64). Müşteri bunu bilmeden kalmamalı: parayı
 * yatırmayı unuttuysa hatırlasın, vazgeçtiyse de bir sürprizle
 * karşılaşmasın. Bir kez gönderiliyor.
 */
export async function havaleHatirlatmaEpostasi(
  alici: string,
  bilgi: { numara: string; adSoyad: string; toplamKurus: number; sonTarih: Date },
): Promise<EpostaSonucu> {
  const takip = `${siteAdresi()}/siparis-takip?numara=${encodeURIComponent(bilgi.numara)}&eposta=${encodeURIComponent(alici)}`;
  const gun = bilgi.sonTarih.toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" });

  return gonder(
    alici,
    `Siparişin ödeme bekliyor · ${bilgi.numara}`,
    `Merhaba ${bilgi.adSoyad},

${bilgi.numara} numaralı siparişinin ödemesi henüz hesabımıza geçmedi.
Tutar: ${tutar(bilgi.toplamKurus)}

Havaleni yaptıysan bu e-postayı yok sayabilirsin; hesaba geçmesi bankalar
arası aktarımda bir iş gününü bulabiliyor.

Yapmadıysan ${gun} tarihine kadar zamanın var. O saate kadar ödeme
görünmezse sipariş kendiliğinden iptal oluyor ve ürünler yeniden satışa
açılıyor — sonra istersen yeniden sipariş verebilirsin.

Siparişinin durumu ve hesap bilgileri:
${takip}${await altBilgi()}`,
  );
}

/** Kargoya verildiğinde: takip numarası ve taşıyıcının sorgulama adresi. */
export async function kargoyaVerildiEpostasi(
  siparis: SiparisEpostasi,
  kargo: { tasiyiciAdi: string; takipNo: string; takipAdresi?: string },
): Promise<EpostaSonucu> {
  const takipSatiri = kargo.takipAdresi
    ? `\n\nGönderini buradan takip edebilirsin:\n${kargo.takipAdresi}`
    : "";

  return gonder(
    siparis.eposta,
    `Siparişin kargoya verildi · ${siparis.numara}`,
    `Merhaba ${siparis.adSoyad},

${siparis.numara} numaralı siparişin ${kargo.tasiyiciAdi} ile yola çıktı.
Takip numarası: ${kargo.takipNo}${takipSatiri}${await altBilgi()}`,
  );
}

/** Teslim edildiğinde: iade hakkı bu tarihten işliyor. */
export async function teslimEdildiEpostasi(siparis: SiparisEpostasi): Promise<EpostaSonucu> {
  return gonder(
    siparis.eposta,
    `Siparişin teslim edildi · ${siparis.numara}`,
    `Merhaba ${siparis.adSoyad},

${siparis.numara} numaralı siparişin teslim edildi. Ellerine sağlık!

Bir sorun varsa ya da iade etmek istersen 14 gün içinde bize yazman yeterli;
koşulları "İade ve değişim" sayfasında bulabilirsin.${await altBilgi()}`,
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

/**
 * Panel kullanıcısının şifre sıfırlaması.
 *
 * Müşteri sıfırlamasından ayrı: adresi panelin içine gidiyor ve metni
 * mağazanın değil yönetimin dilinde (K-47).
 */
export async function panelSifreSifirlamaEpostasi(
  kime: string,
  adSoyad: string,
  jeton: string,
): Promise<EpostaSonucu> {
  const adres = `${siteAdresi()}/yonetim/sifre-sifirla?jeton=${encodeURIComponent(jeton)}`;

  return gonder(
    kime,
    "Yönetim paneli şifreni sıfırla",
    `Merhaba ${adSoyad},

Yönetim paneli şifreni sıfırlamak için aşağıdaki bağlantıya tıkla. Bağlantı 1 saat geçerli ve bir kez kullanılabiliyor:

${adres}

Sıfırladığında bütün cihazlardaki panel oturumların kapanıyor.

Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmez. Ama panelin e-posta adresini bilen biri deniyor demektir, haberin olsun.${await altBilgi()}`,
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

export type SepetHatirlatmasi = {
  adSoyad: string;
  satirlar: { ad: string; beden: string; renk: string; adet: number }[];
  iptalJetonu: string;
};

/**
 * Sepette unutulan ürünlerin hatırlatması.
 *
 * Ticari elektronik ileti sayıldığı için yalnızca izin vermiş üyelere
 * gidiyor ve altında listeden çıkma bağlantısı var — ikisi de 6563 sayılı
 * kanunun gereği (K-27). Bir sepete bir kez gönderiliyor.
 */
export async function sepetHatirlatmaEpostasi(
  kime: string,
  bilgi: SepetHatirlatmasi,
): Promise<EpostaSonucu> {
  const liste = bilgi.satirlar
    .map((s) => `• ${s.ad} — ${s.beden}, ${s.renk}${s.adet > 1 ? ` (${s.adet} adet)` : ""}`)
    .join("\n");

  const iptal = `${siteAdresi()}/eposta-izni?jeton=${encodeURIComponent(bilgi.iptalJetonu)}`;

  return gonder(
    kime,
    "Sepetinde bıraktıkların duruyor",
    `Merhaba ${bilgi.adSoyad},

Sepetine eklediğin ürünler hâlâ duruyor:

${liste}

Kaldığın yerden devam etmek istersen:

${siteAdresi()}/sepet

Stoklar sınırlı olduğu için ürünler tükenebilir; sepete eklemek ayırmıyor.

Bu hatırlatmaları almak istemiyorsan tek tıkla çıkabilirsin:
${iptal}${await altBilgi()}`,
  );
}

export type StokBildirimi = { urunAd: string; slug: string; beden: string; renk: string };

/**
 * "Stoka girdi" bildirimi.
 *
 * Müşterinin kendi isteği üzerine, tek bir olay için gönderiliyor; tanıtım
 * olmadığı için pazarlama izni aranmıyor ve listeden çıkma bağlantısı da
 * gerekmiyor — zaten bir daha gönderilmiyor (K-28).
 */
export async function stokBildirimEpostasi(
  kime: string,
  bilgi: StokBildirimi,
): Promise<EpostaSonucu> {
  const adres = `${siteAdresi()}/urun/${bilgi.slug}`;

  return gonder(
    kime,
    `${bilgi.urunAd} yeniden stokta`,
    `Merhaba,

Haber vermemizi istediğin ürün yeniden stokta:

${bilgi.urunAd} — ${bilgi.beden}, ${bilgi.renk}

${adres}

Sepete eklemek ürünü ayırmıyor; adet sınırlı olabilir.

Bu e-postayı, bu ürün için haber verilmesini istediğin için aldın. Tek
seferlik; isteğin kaydı bu e-postayla birlikte silindi.${await altBilgi()}`,
  );
}

export type TalepEpostasi = {
  numara: string;
  adSoyad: string;
  turAdi: string;
  satirlar: string[];
};

/** Talep alındı bildirimi — müşteriye. */
export async function talepAlindiEpostasi(
  kime: string,
  bilgi: TalepEpostasi,
): Promise<EpostaSonucu> {
  return gonder(
    kime,
    `${bilgi.turAdi} talebin alındı — ${bilgi.numara}`,
    `Merhaba ${bilgi.adSoyad},

${bilgi.numara} numaralı siparişin için ${bilgi.turAdi.toLocaleLowerCase("tr")} talebini aldık.

${bilgi.satirlar.map((s) => `• ${s}`).join("\n")}

En kısa sürede bakıp sonucu bildireceğiz. Talebinin durumunu sipariş takip
sayfasından da izleyebilirsin:

${siteAdresi()}/siparis-takip${await altBilgi()}`,
  );
}

/** Talep sonuçlandı bildirimi — müşteriye. */
export async function talepCevabiEpostasi(
  kime: string,
  bilgi: TalepEpostasi & { durumAdi: string; cevap: string },
): Promise<EpostaSonucu> {
  return gonder(
    kime,
    `${bilgi.turAdi} talebin: ${bilgi.durumAdi} — ${bilgi.numara}`,
    `Merhaba ${bilgi.adSoyad},

${bilgi.numara} numaralı siparişin için açtığın ${bilgi.turAdi.toLocaleLowerCase("tr")} talebi
"${bilgi.durumAdi}" olarak sonuçlandı.

${bilgi.cevap || "Ayrıntı için bize yazabilirsin."}

${siteAdresi()}/siparis-takip${await altBilgi()}`,
  );
}

/**
 * Yeni talep bildirimi — mağaza sahibine.
 *
 * Müşteri talebini açtığında panele kimse bakmıyor olabilir. Künyedeki destek
 * adresi tanımlıysa oraya haber gidiyor; tanımlı değilse atlanıyor.
 */
export async function talepBildirimiEpostasi(bilgi: TalepEpostasi): Promise<EpostaSonucu> {
  const kunye = await kunyeGetir();
  const kime = kunye.destekEposta.trim();
  if (!kime) return { gonderildi: false, sebep: "destek-adresi-yok" };

  return gonder(
    kime,
    `Yeni ${bilgi.turAdi.toLocaleLowerCase("tr")} talebi — ${bilgi.numara}`,
    `${bilgi.adSoyad} (${bilgi.numara}) bir ${bilgi.turAdi.toLocaleLowerCase("tr")} talebi açtı.

${bilgi.satirlar.map((s) => `• ${s}`).join("\n")}

Panelden cevaplayabilirsin:
${siteAdresi()}/yonetim/talepler`,
  );
}

/**
 * Panelden gönderilen deneme e-postası.
 *
 * Anahtar tanımlı olsa da gönderim alan adı doğrulanmadan çalışmıyor ve hata
 * yalnızca sunucu günlüğüne düşüyordu. Satışa hazırlık ekranındaki düğme bunu
 * gönderip Resend'in cevabını ekrana getiriyor (K-85).
 */
export async function denemeEpostasi(kime: string): Promise<EpostaSonucu> {
  return gonder(
    kime,
    "BASoftBaby deneme e-postası",
    `Merhaba,

Bu e-posta yönetim panelindeki "Deneme e-postası gönder" düğmesiyle gönderildi. Bunu okuyorsan mağazanın e-postaları çalışıyor: sipariş onayı, ödeme onayı, kargo bildirimi ve şifre sıfırlama bu adresten gidiyor.

Gönderen: ${gonderen()}${await altBilgi()}`,
  );
}
