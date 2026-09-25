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
/**
 * Düz metinden HTML gövde. Başlıkta mağazanın rozet logosu (K-138): PNG,
 * çünkü Outlook WebP göstermiyor; tam adresle, çünkü e-posta sitenin içinde
 * açılmıyor. Görseli engelleyen istemcide `alt` yazısı kalıyor.
 *
 * Metindeki adresler tıklanır bağlantı: bazı istemciler düz adresi
 * bağlantıya çevirmiyor, müşteri kopyalamak zorunda kalıyordu.
 */
export function epostaHtml(metin: string, site: string = siteAdresi()): string {
  const kacir = (m: string) =>
    m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const baglanti = (m: string) =>
    m.replace(
      /https?:\/\/[^\s<]+[^\s<.,;:!?)]/g,
      (a) => `<a href="${a}" style="color:#2f6e9e;word-break:break-all">${a}</a>`,
    );

  const govde = metin
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${baglanti(kacir(p)).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!doctype html><html lang="tr"><body style="margin:0;background:#fffcf7;padding:24px;font:16px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#2c2721">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #efe7db;border-radius:16px;padding:24px">
<p style="margin:0 0 18px;text-align:center"><a href="${site}"><img src="${site}/marka/basoftbaby-logo-256.png" width="104" height="104" alt="BASoftBaby" style="display:inline-block;border:0;width:104px;height:104px;font-weight:700;font-size:18px;color:#c2433a"></a></p>
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
        html: epostaHtml(metin),
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

export type TopluEposta = {
  kime: string;
  konu: string;
  metin: string;
  /** Tek tıkla listeden çıkma adresi (RFC 8058); Gmail ve Yahoo toplu gönderende istiyor. */
  iptalAdresi: string;
};

/** Resend'in toplu ucu bir istekte en çok 100 e-posta alıyor. */
export const TOPLU_PARCA = 100;

/**
 * E-bülten gönderimi (K-125): Resend'in toplu ucuyla, 100'erli parçalar.
 * Bir parça başarısız olursa öteki parçalar yine gidiyor; dönen sayı
 * gerçekten gönderilen.
 */
export async function topluGonder(liste: TopluEposta[]): Promise<{ gonderilen: number; mesaj?: string }> {
  if (!epostaAcikMi()) return { gonderilen: 0, mesaj: "RESEND_ANAHTARI tanımlı değil." };
  const taban = process.env.EPOSTA_TABAN_ADRES?.trim();
  const uc = taban ? `${taban.replace(/\/$/, "")}/emails/batch` : `${UC}/batch`;
  let gonderilen = 0;
  let mesaj: string | undefined;
  for (let i = 0; i < liste.length; i += TOPLU_PARCA) {
    const parca = liste.slice(i, i + TOPLU_PARCA);
    try {
      const cevap = await fetch(uc, {
        method: "POST",
        headers: { authorization: `Bearer ${resendAnahtari()}`, "content-type": "application/json" },
        body: JSON.stringify(
          parca.map((e) => ({
            from: gonderen(),
            to: [e.kime],
            subject: e.konu,
            text: e.metin.trim(),
            html: epostaHtml(e.metin),
            headers: {
              "List-Unsubscribe": `<${e.iptalAdresi}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          })),
        ),
      });
      if (cevap.ok) gonderilen += parca.length;
      else {
        mesaj = await cevap
          .json()
          .then((g: { message?: string }) => g.message)
          .catch(() => `HTTP ${cevap.status}`);
        console.error(`Toplu e-posta parçası gönderilemedi: ${mesaj}`);
      }
    } catch (hata) {
      mesaj = "Ağ hatası";
      console.error("Toplu e-posta parçası gönderilemedi:", hata);
    }
  }
  return { gonderilen, mesaj };
}

/** E-bülten gövdesi: selam, mağazanın metni, çıkış bağlantısı, künye. */
export async function bultenMetni(adSoyad: string, metin: string, iptalSayfasi: string): Promise<string> {
  const ad = adSoyad.trim().split(/\s+/)[0] || "";
  return `Merhaba${ad ? ` ${ad}` : ""},

${metin.trim()}

Bu e-postayı, kampanya ve yeniliklerden haberdar olmak istediğini söylediğin için alıyorsun. Almak istemiyorsan tek tıkla çıkabilirsin:
${iptalSayfasi}${await altBilgi()}`;
}

/** Deneme gönderimi: bülten yöneticinin kendi adresine, gerçek alıcılara değil. */
export async function bultenDenemesi(kime: string, konu: string, metin: string): Promise<EpostaSonucu> {
  return gonder(kime, `[Deneme] ${konu}`, metin);
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
  /** Hediye çekiyle ödenen kısım (K-137). */
  hediyeCekiKurus?: number;
  odemeYontemi: string;
};

/** "Toplam" satırı; hediye çeki varsa çek ve kalan ödenecek de yazılıyor. */
function tutarSatirlari(s: SiparisEpostasi, sonEtiket: string): string {
  const cek = s.hediyeCekiKurus ?? 0;
  if (cek <= 0) return `${sonEtiket}: ${tutar(s.toplamKurus)}`;
  return [
    `Sipariş toplamı: ${tutar(s.toplamKurus)}`,
    `Hediye çeki: -${tutar(cek)}`,
    `${sonEtiket}: ${tutar(Math.max(0, s.toplamKurus - cek))}`,
  ].join("\n");
}

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
    siparis.odemeYontemi === "hediye-ceki"
      ? "Siparişinin tamamı hediye çekinle ödendi; hazırlanmaya başlıyoruz."
      : siparis.odemeYontemi === "havale"
      ? havaleBilgisi
        ? `Ödemeni aşağıdaki hesaba havale/EFT ile yapabilirsin. Açıklama kısmına sipariş numaranı yazmayı unutma.\n\n${havaleBilgisi}`
        : "Ödeme bilgilerini en kısa sürede ileteceğiz."
      : "Kart ödemen alındıktan sonra sana ayrıca haber vereceğiz.";

  return gonder(
    siparis.eposta,
    `Siparişin alındı · ${siparis.numara}`,
    `Merhaba ${siparis.adSoyad},

Siparişini aldık. Sipariş numaran: ${siparis.numara}
${tutarSatirlari(siparis, siparis.odemeYontemi === "hediye-ceki" ? "Toplam tutar" : "Ödenecek tutar")}

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
${tutarSatirlari(siparis, "Ödenen tutar")}

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
/**
 * Panele davet: şifreyi yeni kullanıcı kendisi belirliyor (K-87).
 *
 * Bağlantıya tıklayıp şifre koymak adresin o kişiye ait olduğunu
 * kanıtlıyor; o zamana kadar hesap giriş yapamıyor.
 */
export async function panelDavetEpostasi(
  kime: string,
  adSoyad: string,
  davetEden: string,
  jeton: string,
  saat: number,
): Promise<EpostaSonucu> {
  const adres = `${siteAdresi()}/yonetim/sifre-sifirla?jeton=${encodeURIComponent(jeton)}&davet=1`;

  return gonder(
    kime,
    "BASoftBaby yönetim paneline davet edildin",
    `Merhaba ${adSoyad},

${davetEden} seni BASoftBaby yönetim paneline ekledi. Hesabını etkinleştirmek için aşağıdaki bağlantıya tıklayıp şifreni belirle. Bağlantı ${saat} saat geçerli ve bir kez kullanılabiliyor:

${adres}

Şifreni belirledikten sonra panele bu e-posta adresi ve şifrenle giriş yapabilirsin.

Böyle bir daveti beklemiyorsan bu e-postayı yok sayabilirsin; bağlantıya tıklanmadıkça hesap açılmaz.${await altBilgi()}`,
  );
}

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

export type FavoriHaberi = {
  urunAd: string;
  slug: string;
  /** Fiyat düştüyse eski ve yeni fiyat. */
  indirim?: { eskiKurus: number; yeniKurus: number };
  /** Yeniden stoğa giren bedenler. */
  gelenBedenler: string[];
};

/**
 * Favorilerdeki ürünlerde indirim ya da yeniden stoğa giren beden (K-100).
 *
 * Müşteri ürünü kendisi favoriye koymuş olsa da e-posta bir satış
 * çağrısı: ticari elektronik ileti sayılıyor. Bu yüzden sepet
 * hatırlatması gibi yalnızca izin verene gidiyor ve altında listeden çıkma
 * bağlantısı var (K-27). Bir günün bütün haberleri tek e-postada.
 */
export async function favoriHaberiEpostasi(
  kime: string,
  bilgi: { adSoyad: string; haberler: FavoriHaberi[]; iptalJetonu: string },
): Promise<EpostaSonucu> {
  const liste = bilgi.haberler
    .map((h) => {
      const satirlar = [`• ${h.urunAd}`];
      if (h.indirim) {
        satirlar.push(
          `  Fiyatı düştü: ${tutar(h.indirim.eskiKurus)} → ${tutar(h.indirim.yeniKurus)}`,
        );
      }
      if (h.gelenBedenler.length > 0) {
        satirlar.push(`  Yeniden stokta: ${h.gelenBedenler.join(", ")}`);
      }
      satirlar.push(`  ${siteAdresi()}/urun/${h.slug}`);
      return satirlar.join("\n");
    })
    .join("\n\n");

  const iptal = `${siteAdresi()}/eposta-izni?jeton=${encodeURIComponent(bilgi.iptalJetonu)}`;
  const konu =
    bilgi.haberler.length === 1
      ? `Favorindeki ${bilgi.haberler[0].urunAd} için güzel haber`
      : "Favorilerinde güzel haberler var";

  return gonder(
    kime,
    konu,
    `Merhaba ${bilgi.adSoyad},

Favorilerine eklediğin ürünlerde değişiklik var:

${liste}

Bütün favorilerin: ${siteAdresi()}/hesabim/favoriler

Sepete eklemek ürünü ayırmıyor; adet sınırlı olabilir.

Bu e-postaları almak istemiyorsan tek tıkla çıkabilirsin:
${iptal}${await altBilgi()}`,
  );
}

/**
 * Panel kullanıcılarına sabah özeti (K-101). Metni `server/sabah-ozeti.ts`
 * kuruyor; burada yalnızca imza ekleniyor.
 */
export async function sabahOzetiEpostasi(
  kime: string,
  konu: string,
  metin: string,
): Promise<EpostaSonucu> {
  return gonder(kime, konu, `${metin}${await altBilgi()}`);
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

/**
 * Ürün sorusu cevaplandı (K-135). Müşterinin kendi sorusunun cevabı:
 * tanıtım değil, izin gerekmiyor. Yalnızca soruda e-posta bırakana gidiyor.
 */
export async function soruCevaplandiEpostasi(
  kime: string,
  bilgi: { urunAd: string; slug: string; soru: string; cevap: string },
): Promise<EpostaSonucu> {
  return gonder(
    kime,
    `Sorunu cevapladık: ${bilgi.urunAd}`,
    `Merhaba,

"${bilgi.urunAd}" hakkında sorduğun soruyu cevapladık.

Soru: ${bilgi.soru}

Cevap: ${bilgi.cevap}

Ürüne bakmak için:
${siteAdresi()}/urun/${bilgi.slug}#sorular${await altBilgi()}`,
  );
}

/** Panelden oluşturulan hediye çekinin kodu, alıcıya (K-137). */
export async function hediyeCekiEpostasi(
  kime: string,
  bilgi: { kod: string; aliciAd: string; tutarKurus: number; sonKullanma: Date | null },
): Promise<EpostaSonucu> {
  const tarih = bilgi.sonKullanma
    ? `\nSon kullanma: ${bilgi.sonKullanma.toLocaleDateString("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" })}`
    : "";
  return gonder(
    kime,
    `${tutar(bilgi.tutarKurus)} değerinde hediye çekin var`,
    `Merhaba${bilgi.aliciAd ? ` ${bilgi.aliciAd}` : ""},

Sana ${tutar(bilgi.tutarKurus)} değerinde bir BASoftBaby hediye çeki tanımlandı.

Kod: ${bilgi.kod}${tarih}

Siparişini verirken ödeme sayfasındaki "Hediye çeki" alanına bu kodu yazman
yeterli. Tutarın tamamını tek siparişte kullanmak zorunda değilsin; kalan
bakiye sonraki siparişlerinde kullanılabiliyor.

Alışverişe başlamak için:
${siteAdresi()}${await altBilgi()}`,
  );
}

/**
 * Teslimden birkaç gün sonra değerlendirme isteği (K-141). Bir kez gidiyor ve
 * tanıtım içermiyor: indirim, kampanya ya da başka ürün önerisi yok. Amaç
 * alınan ürünün değerlendirilmesi, satış değil.
 */
export async function yorumIstegiEpostasi(
  kime: string,
  bilgi: { numara: string; adSoyad: string; urunler: string[] },
): Promise<EpostaSonucu> {
  const adres = `${siteAdresi()}/siparis-takip?numara=${encodeURIComponent(bilgi.numara)}&eposta=${encodeURIComponent(kime)}#degerlendir`;
  const liste = bilgi.urunler.map((u) => `- ${u}`).join("\n");
  return gonder(
    kime,
    `Ürünler nasıl oldu? · ${bilgi.numara}`,
    `Merhaba ${bilgi.adSoyad},

${bilgi.numara} numaralı siparişin birkaç gün önce teslim edildi. Umarız minik
için her şey yolundadır.

Bedeni tuttu mu, kumaşı nasıl? Birkaç satırlık bir değerlendirme, başka
ailelerin doğru bedeni seçmesine çok yardım ediyor. İstersen bir fotoğraf da
ekleyebilirsin.

${liste}

Değerlendirmek için:
${adres}

Bu e-posta bir kez gönderiliyor.${await altBilgi()}`,
  );
}

/**
 * Doğum listesinden hediye alındı (K-146). Liste sahibine; hediye edenin
 * adresi ve e-postası yok, yalnızca kendi yazdığı ad ve not.
 */
export async function listeHediyesiEpostasi(
  kime: string,
  bilgi: { sahipAdi: string; gonderen: string; not: string; urunler: string[]; kod: string },
): Promise<EpostaSonucu> {
  const kimden = bilgi.gonderen ? `${bilgi.gonderen} listenden` : "Bir yakının listenden";
  return gonder(
    kime,
    "Doğum listenden bir hediye alındı",
    `Merhaba ${bilgi.sahipAdi},

${kimden} hediye aldı:

${bilgi.urunler.map((u) => `- ${u}`).join("\n")}
${bilgi.not ? `\nNotu:\n"${bilgi.not}"\n` : ""}
Listen güncellendi; alınanlar işaretli. Listeni görmek için:
${siteAdresi()}/liste/${bilgi.kod}

Gelen hediyelerin hepsi hesabındaki "Doğum listem" sayfasında.${await altBilgi()}`,
  );
}

/**
 * Büyüme hatırlatması (K-147): bebek bir sonraki bedene geçmek üzere. Ürün
 * önerdiği için tanıtım sayılıyor; altında listeden çıkma bağlantısı var.
 */
export async function buyumeEpostasi(
  kime: string,
  bilgi: { adSoyad: string; ay: number; beden: string; iptalJetonu: string },
): Promise<EpostaSonucu> {
  const iptal = `${siteAdresi()}/eposta-izni?jeton=${encodeURIComponent(bilgi.iptalJetonu)}`;
  return gonder(
    kime,
    `Bebeğin ${bilgi.ay} aylık oluyor: ${bilgi.beden} zamanı`,
    `Merhaba ${bilgi.adSoyad},

Bebeğin birkaç hafta içinde ${bilgi.ay} aylık oluyor. Bebekler bu dönemde hızlı büyüyor; ${bilgi.beden} bedenine geçme zamanı yaklaşıyor.

${bilgi.beden} bedeninde stokta olanlar:
${siteAdresi()}/urunler?beden=${encodeURIComponent(bilgi.beden)}

Bedenden emin değilsen boy ve kiloya göre bakabileceğin tablo:
${siteAdresi()}/beden-rehberi

Bu hatırlatmaları almak istemiyorsan tek tıkla çıkabilirsin:
${iptal}${await altBilgi()}`,
  );
}

/**
 * İkinci sipariş teşviki (K-151): kişiye özel, tek kullanımlık kupon.
 * Tanıtım; altında listeden çıkma bağlantısı var.
 */
export async function tesvikEpostasi(
  kime: string,
  bilgi: { adSoyad: string; kod: string; yuzde: number; bitis: Date; iptalJetonu: string },
): Promise<EpostaSonucu> {
  const iptal = `${siteAdresi()}/eposta-izni?jeton=${encodeURIComponent(bilgi.iptalJetonu)}`;
  const son = bilgi.bitis.toLocaleDateString("tr-TR", {
    dateStyle: "long",
    timeZone: "Europe/Istanbul",
  });
  return gonder(
    kime,
    `Sana özel %${bilgi.yuzde} indirim`,
    `Merhaba ${bilgi.adSoyad},

İlk siparişin eline ulaştı; umarız minik beğenmiştir. Bir sonraki alışverişin için sana özel bir kupon hazırladık:

Kupon kodu: ${bilgi.kod}
İndirim: %${bilgi.yuzde}
Son gün: ${son}

Kupon yalnızca senin hesabında ve bir siparişte geçerli. Sepette ya da ödeme sayfasında kodu yazman yeterli; hesabına giriş yapmış olman gerekiyor.

${siteAdresi()}/urunler

Bu e-postaları almak istemiyorsan tek tıkla çıkabilirsin:
${iptal}${await altBilgi()}`,
  );
}

/** Arkadaşını davet et (K-152): davet edene ödül çeki. İşlem bildirimi. */
export async function davetOdulEpostasi(
  kime: string,
  bilgi: { adSoyad: string; arkadas: string; kod: string; tutarKurus: number; sonKullanma: Date },
): Promise<EpostaSonucu> {
  const son = bilgi.sonKullanma.toLocaleDateString("tr-TR", {
    dateStyle: "long",
    timeZone: "Europe/Istanbul",
  });
  return gonder(
    kime,
    `Davetin için ${tutar(bilgi.tutarKurus)} hediye çeki`,
    `Merhaba ${bilgi.adSoyad},

Davet ettiğin ${bilgi.arkadas} ilk alışverişini yaptı. Teşekkür olarak sana ${tutar(bilgi.tutarKurus)} değerinde hediye çeki tanımladık:

Kod: ${bilgi.kod}
Son kullanma: ${son}

Ödeme sayfasındaki "Hediye çeki" alanına yazman yeterli. Kodun hesabındaki "Arkadaşını davet et" sayfasında da duruyor.

${siteAdresi()}/hesabim/davet${await altBilgi()}`,
  );
}
