import "server-only";
import { kunyeGetir } from "@/server/yasal";
import { siteAdresi } from "@/server/site";
import { whatsappDugmeNumarasi } from "@/server/whatsapp";
import {
  epostaYap,
  tutar,
  type Blok,
  type Eposta,
  type EpostaOrtami,
} from "@/server/eposta-sablon";
import { bedendekiUrunler, siparisDetayi, urunFotolari } from "@/server/eposta-veri";

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


/* ── Şablon ─────────────────────────────────────────────────────────────── */

async function ortam(): Promise<EpostaOrtami> {
  const kunye = await kunyeGetir();
  return { site: siteAdresi(), kunye, whatsapp: whatsappDugmeNumarasi(kunye) };
}

/**
 * Düz metinden e-posta gövdesi: tek metin bloğu, ortak başlık ve alt bilgi
 * (K-138, K-161). Metindeki adresler tıklanır, HTML kaçışlanıyor.
 */
export function epostaHtml(metin: string, site: string = siteAdresi()): string {
  return epostaYap(
    { konu: "", bloklar: [{ tur: "metin", metin }] },
    { site, kunye: { unvan: "", sirketAdresi: "", destekTelefon: "", destekEposta: "" } },
  ).html;
}

async function gonder(
  kime: string,
  e: Eposta,
  basliklar?: Record<string, string>,
): Promise<EpostaSonucu> {
  if (!epostaAcikMi()) {
    console.warn(`E-posta gönderilmedi (RESEND_ANAHTARI yok): ${e.konu} → ${kime}`);
    return { gonderildi: false, sebep: "anahtar-yok" };
  }

  try {
    const { html, text } = epostaYap(e, await ortam());
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
        subject: e.konu,
        text,
        html,
        ...(basliklar ? { headers: basliklar } : {}),
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
        `E-posta gönderilemedi (${cevap.status}${mesaj ? `: ${mesaj}` : ""}): ${e.konu} → ${kime}`,
      );
      return { gonderildi: false, sebep: `http-${cevap.status}`, mesaj };
    }
    return { gonderildi: true };
  } catch (hata) {
    console.error("E-posta gönderilemedi:", hata);
    return { gonderildi: false, sebep: "ag-hatasi" };
  }
}

/** Tanıtım e-postalarının tek tıkla listeden çıkma başlıkları (RFC 8058). */
function iptalBasliklari(iptal: string): Record<string, string> {
  return { "List-Unsubscribe": `<${iptal}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}

function iptalAdresi(jeton: string): string {
  return `${siteAdresi()}/eposta-izni?jeton=${encodeURIComponent(jeton)}`;
}

const selam = (ad: string) => `Merhaba${ad.trim() ? ` ${ad.trim()}` : ""},`;

function gunYaz(t: Date): string {
  return t.toLocaleDateString("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" });
}

/* ── E-bülten ───────────────────────────────────────────────────────────── */

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
  const o = await ortam();
  let gonderilen = 0;
  let mesaj: string | undefined;
  for (let i = 0; i < liste.length; i += TOPLU_PARCA) {
    const parca = liste.slice(i, i + TOPLU_PARCA);
    try {
      const cevap = await fetch(uc, {
        method: "POST",
        headers: { authorization: `Bearer ${resendAnahtari()}`, "content-type": "application/json" },
        body: JSON.stringify(
          parca.map((e) => {
            const { html, text } = epostaYap(
              {
                konu: e.konu,
                bloklar: [{ tur: "metin", metin: e.metin }],
                iptalAdresi: e.iptalAdresi,
              },
              o,
            );
            return {
              from: gonderen(),
              to: [e.kime],
              subject: e.konu,
              text,
              html,
              headers: iptalBasliklari(e.iptalAdresi),
            };
          }),
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

/**
 * E-bülten gövdesi: selam ve mağazanın metni. Listeden çıkma bağlantısı ve
 * künye şablonun alt bilgisinde (K-161); `iptalSayfasi` deneme gönderiminde
 * metne yazılıyor, gerçek gönderimde `TopluEposta.iptalAdresi` ile gidiyor.
 */
export async function bultenMetni(adSoyad: string, metin: string, iptalSayfasi: string): Promise<string> {
  const ad = adSoyad.trim().split(/\s+/)[0] || "";
  void iptalSayfasi;
  return `${selam(ad)}

${metin.trim()}

Bu e-postayı, kampanya ve yeniliklerden haberdar olmak istediğini söylediğin için alıyorsun.`;
}

/** Deneme gönderimi: bülten yöneticinin kendi adresine, gerçek alıcılara değil. */
export async function bultenDenemesi(kime: string, konu: string, metin: string): Promise<EpostaSonucu> {
  return gonder(kime, {
    konu: `[Deneme] ${konu}`,
    bloklar: [{ tur: "metin", metin }],
    iptalAdresi: `${siteAdresi()}/eposta-izni?jeton=ornek`,
  });
}

/* ── Sipariş ────────────────────────────────────────────────────────────── */

export type SiparisEpostasi = {
  numara: string;
  adSoyad: string;
  eposta: string;
  toplamKurus: number;
  /** Hediye çekiyle ödenen kısım (K-137). */
  hediyeCekiKurus?: number;
  odemeYontemi: string;
};

function takipAdresi(numara: string, eposta: string): string {
  return `${siteAdresi()}/siparis-takip?numara=${encodeURIComponent(numara)}&eposta=${encodeURIComponent(eposta)}`;
}

/**
 * Siparişin ürünleri ve tutar tablosu (K-161). Sipariş okunamazsa (silinmiş)
 * yalnızca toplam satırı.
 */
async function siparisBloklari(s: SiparisEpostasi, sonEtiket: string): Promise<Blok[]> {
  const d = await siparisDetayi(s.numara);
  const cek = d?.hediyeCekiKurus ?? s.hediyeCekiKurus ?? 0;
  const toplam = d?.toplamKurus ?? s.toplamKurus;
  const satirlar: { ad: string; deger: string; vurgu?: boolean }[] = [];
  if (d) {
    satirlar.push({ ad: "Ara toplam", deger: tutar(d.araToplamKurus) });
    if (d.indirimKurus > 0) {
      satirlar.push({
        ad: d.kampanyaAdi ? `İndirim (${d.kampanyaAdi})` : "İndirim",
        deger: `-${tutar(d.indirimKurus)}`,
      });
    }
    satirlar.push({ ad: "Kargo", deger: d.kargoKurus > 0 ? tutar(d.kargoKurus) : "Ücretsiz" });
    if (d.hediyePaketi) satirlar.push({ ad: "Hediye paketi", deger: "Ücretsiz" });
  }
  if (cek > 0) {
    satirlar.push({ ad: "Sipariş toplamı", deger: tutar(toplam) });
    satirlar.push({ ad: "Hediye çeki", deger: `-${tutar(cek)}` });
  }
  satirlar.push({ ad: sonEtiket, deger: tutar(Math.max(0, toplam - cek)), vurgu: true });
  return [
    ...(d && d.satirlar.length > 0 ? [{ tur: "urunler" as const, satirlar: d.satirlar }] : []),
    { tur: "tutarlar", satirlar },
  ];
}

/** Sipariş alındığında: havalede banka bilgisi, kartta ödeme beklendiği yazıyor. */
export async function siparisAlindiEpostasi(
  siparis: SiparisEpostasi,
  havaleBilgisi: string,
): Promise<EpostaSonucu> {
  if (!epostaAcikMi()) return gonder(siparis.eposta, { konu: "Siparişin alındı", bloklar: [] });
  const cekle = siparis.odemeYontemi === "hediye-ceki";
  const havale = siparis.odemeYontemi === "havale";

  const odeme: Blok[] = cekle
    ? [{ tur: "metin", metin: "Siparişinin tamamı hediye çekinle ödendi; hazırlanmaya başlıyoruz." }]
    : havale
      ? havaleBilgisi
        ? [
            {
              tur: "kutu",
              baslik: "Havale / EFT bilgileri",
              metin: `${havaleBilgisi}\n\nAçıklama kısmına sipariş numaranı yaz: ${siparis.numara}`,
            },
          ]
        : [{ tur: "metin", metin: "Ödeme bilgilerini en kısa sürede ileteceğiz." }]
      : [{ tur: "metin", metin: "Kart ödemen alındıktan sonra sana ayrıca haber vereceğiz." }];

  return gonder(siparis.eposta, {
    konu: `Siparişin alındı · ${siparis.numara}`,
    onizleme: havale
      ? `${siparis.numara} numaralı siparişin ödeme bekliyor; banka bilgileri içeride.`
      : `${siparis.numara} numaralı siparişini aldık, teşekkürler!`,
    bloklar: [
      { tur: "metin", metin: `${selam(siparis.adSoyad)}\n\nSiparişini aldık, teşekkürler! Sipariş numaran: ${siparis.numara}` },
      { tur: "durum", adim: 0 },
      ...(await siparisBloklari(siparis, cekle ? "Toplam tutar" : "Ödenecek tutar")),
      ...odeme,
      { tur: "dugme", yazi: "Siparişimi görüntüle", adres: takipAdresi(siparis.numara, siparis.eposta) },
    ],
  });
}

/** Kart ödemesi onaylandığında. */
export async function odemeAlindiEpostasi(siparis: SiparisEpostasi): Promise<EpostaSonucu> {
  if (!epostaAcikMi()) return gonder(siparis.eposta, { konu: "Ödemen alındı", bloklar: [] });
  return gonder(siparis.eposta, {
    konu: `Ödemen alındı · ${siparis.numara}`,
    onizleme: "Ödemen alındı, siparişin hazırlanmaya başlıyor.",
    bloklar: [
      {
        tur: "metin",
        metin: `${selam(siparis.adSoyad)}\n\n${siparis.numara} numaralı siparişinin ödemesi alındı, siparişin hazırlanmaya başlıyor. Kargoya verildiğinde sana yine haber vereceğiz.`,
      },
      { tur: "durum", adim: 1 },
      ...(await siparisBloklari(siparis, "Ödenen tutar")),
      { tur: "dugme", yazi: "Siparişimi görüntüle", adres: takipAdresi(siparis.numara, siparis.eposta) },
    ],
  });
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
  return gonder(alici, {
    konu: `İaden gönderildi · ${bilgi.numara}`,
    onizleme: `${tutar(bilgi.tutarKurus)} iaden gönderildi.`,
    bloklar: [
      { tur: "metin", metin: `${selam(bilgi.adSoyad)}\n\n${bilgi.numara} numaralı siparişin için iade yapıldı.` },
      { tur: "tutarlar", satirlar: [{ ad: "İade tutarı", deger: tutar(bilgi.tutarKurus), vurgu: true }] },
      {
        tur: "metin",
        metin: kartMi
          ? "İade kartına gönderildi. Bankana göre hesabında görünmesi birkaç iş günü sürebiliyor; bu süre bankanın işleyişine bağlı."
          : "İade, bize bildirdiğin hesaba havale ile gönderildi.",
      },
      { tur: "not", metin: "Bir sorun olursa bu e-postayı yanıtlaman yeterli." },
    ],
  });
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
  const gun = bilgi.sonTarih.toLocaleString("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  });
  return gonder(alici, {
    konu: `Siparişin ödeme bekliyor · ${bilgi.numara}`,
    onizleme: `Ödeme için son gün: ${gun}.`,
    bloklar: [
      {
        tur: "metin",
        metin: `${selam(bilgi.adSoyad)}\n\n${bilgi.numara} numaralı siparişinin ödemesi henüz hesabımıza geçmedi.`,
      },
      { tur: "tutarlar", satirlar: [{ ad: "Ödenecek tutar", deger: tutar(bilgi.toplamKurus), vurgu: true }] },
      {
        tur: "kutu",
        baslik: `Son gün: ${gun}`,
        metin:
          "O saate kadar ödeme görünmezse sipariş kendiliğinden iptal oluyor ve ürünler yeniden satışa açılıyor; sonra istersen yeniden sipariş verebilirsin.",
      },
      {
        tur: "metin",
        metin:
          "Havaleni yaptıysan bu e-postayı yok sayabilirsin; hesaba geçmesi bankalar arası aktarımda bir iş gününü bulabiliyor.",
      },
      { tur: "dugme", yazi: "Hesap bilgilerini gör", adres: takipAdresi(bilgi.numara, alici) },
    ],
  });
}

/** Kargoya verildiğinde: takip numarası ve taşıyıcının sorgulama adresi. */
export async function kargoyaVerildiEpostasi(
  siparis: SiparisEpostasi,
  kargo: { tasiyiciAdi: string; takipNo: string; takipAdresi?: string },
): Promise<EpostaSonucu> {
  if (!epostaAcikMi()) return gonder(siparis.eposta, { konu: "Siparişin kargoya verildi", bloklar: [] });
  const d = await siparisDetayi(siparis.numara);
  return gonder(siparis.eposta, {
    konu: `Siparişin kargoya verildi · ${siparis.numara}`,
    onizleme: `${kargo.tasiyiciAdi} ile yola çıktı. Takip no: ${kargo.takipNo}`,
    bloklar: [
      {
        tur: "metin",
        metin: `${selam(siparis.adSoyad)}\n\n${siparis.numara} numaralı siparişin yola çıktı!`,
      },
      { tur: "durum", adim: 2 },
      { tur: "kutu", baslik: kargo.tasiyiciAdi, metin: `Takip numarası: ${kargo.takipNo}` },
      kargo.takipAdresi
        ? { tur: "dugme", yazi: "Kargomu takip et", adres: kargo.takipAdresi }
        : { tur: "dugme", yazi: "Siparişimi görüntüle", adres: takipAdresi(siparis.numara, siparis.eposta) },
      ...(d && d.satirlar.length > 0 ? [{ tur: "urunler" as const, satirlar: d.satirlar }] : []),
    ],
  });
}

/** Teslim edildiğinde: iade hakkı bu tarihten işliyor. */
export async function teslimEdildiEpostasi(siparis: SiparisEpostasi): Promise<EpostaSonucu> {
  return gonder(siparis.eposta, {
    konu: `Siparişin teslim edildi · ${siparis.numara}`,
    onizleme: "Siparişin teslim edildi. Ellerine sağlık!",
    bloklar: [
      {
        tur: "metin",
        metin: `${selam(siparis.adSoyad)}\n\n${siparis.numara} numaralı siparişin teslim edildi. Ellerine sağlık!`,
      },
      { tur: "durum", adim: 3 },
      {
        tur: "metin",
        metin:
          "Bir sorun varsa ya da iade etmek istersen 14 gün içinde bize yazman yeterli; koşullar \"İade ve değişim\" sayfasında.",
      },
      { tur: "dugme", yazi: "Siparişimi görüntüle", adres: takipAdresi(siparis.numara, siparis.eposta) },
    ],
  });
}

/* ── Hesap ──────────────────────────────────────────────────────────────── */

export async function sifreSifirlamaEpostasi(
  kime: string,
  adSoyad: string,
  jeton: string,
): Promise<EpostaSonucu> {
  return gonder(kime, {
    konu: "Şifreni sıfırla",
    onizleme: "Bağlantı 1 saat geçerli.",
    bloklar: [
      { tur: "metin", metin: `${selam(adSoyad)}\n\nŞifreni sıfırlamak için aşağıdaki düğmeye dokun. Bağlantı 1 saat geçerli ve bir kez kullanılabiliyor.` },
      { tur: "dugme", yazi: "Şifremi sıfırla", adres: `${siteAdresi()}/sifre-sifirla?jeton=${encodeURIComponent(jeton)}` },
      { tur: "not", metin: "Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmez." },
    ],
  });
}

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
  return gonder(kime, {
    konu: "BASoftBaby yönetim paneline davet edildin",
    bloklar: [
      {
        tur: "metin",
        metin: `${selam(adSoyad)}\n\n${davetEden} seni BASoftBaby yönetim paneline ekledi. Hesabını etkinleştirmek için şifreni belirle. Bağlantı ${saat} saat geçerli ve bir kez kullanılabiliyor.`,
      },
      {
        tur: "dugme",
        yazi: "Şifremi belirle",
        adres: `${siteAdresi()}/yonetim/sifre-sifirla?jeton=${encodeURIComponent(jeton)}&davet=1`,
      },
      { tur: "metin", metin: "Şifreni belirledikten sonra panele bu e-posta adresi ve şifrenle giriş yapabilirsin." },
      { tur: "not", metin: "Böyle bir daveti beklemiyorsan bu e-postayı yok sayabilirsin; bağlantıya tıklanmadıkça hesap açılmaz." },
    ],
  });
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
  return gonder(kime, {
    konu: "Yönetim paneli şifreni sıfırla",
    bloklar: [
      { tur: "metin", metin: `${selam(adSoyad)}\n\nYönetim paneli şifreni sıfırlamak için aşağıdaki düğmeye dokun. Bağlantı 1 saat geçerli ve bir kez kullanılabiliyor. Sıfırladığında bütün cihazlardaki panel oturumların kapanıyor.` },
      { tur: "dugme", yazi: "Şifremi sıfırla", adres: `${siteAdresi()}/yonetim/sifre-sifirla?jeton=${encodeURIComponent(jeton)}` },
      { tur: "not", metin: "Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; şifren değişmez. Ama panelin e-posta adresini bilen biri deniyor demektir, haberin olsun." },
    ],
  });
}

export async function dogrulamaEpostasi(
  kime: string,
  adSoyad: string,
  jeton: string,
): Promise<EpostaSonucu> {
  return gonder(kime, {
    konu: "E-posta adresini doğrula",
    onizleme: "Hesabını açtığın için teşekkürler.",
    bloklar: [
      { tur: "metin", metin: `${selam(adSoyad)}\n\nHesabını açtığın için teşekkürler! Adresini doğrulamak için aşağıdaki düğmeye dokun.` },
      { tur: "dugme", yazi: "Adresimi doğrula", adres: `${siteAdresi()}/eposta-dogrula?jeton=${encodeURIComponent(jeton)}` },
      { tur: "metin", metin: "Doğruladığında, üye olmadan bu adresle verdiğin eski siparişler de hesabına bağlanır." },
      { tur: "not", metin: "Bağlantı 3 gün geçerli." },
    ],
  });
}

/* ── Tanıtım ve bildirimler ─────────────────────────────────────────────── */

export type SepetHatirlatmasi = {
  adSoyad: string;
  satirlar: {
    ad: string;
    beden: string;
    renk: string;
    adet: number;
    /** Ürün adresi ve varyant rengi: kartta fotoğraf ve bağlantı (K-161). */
    slug?: string;
    renkKodu?: string;
    tutarKurus?: number;
  }[];
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
  const fotolar = epostaAcikMi()
    ? await urunFotolari(
        bilgi.satirlar.filter((s) => s.slug).map((s) => ({ slug: s.slug!, renk: s.renkKodu })),
      )
    : [];
  let f = 0;
  const iptal = iptalAdresi(bilgi.iptalJetonu);
  return gonder(
    kime,
    {
      konu: "Sepetinde bıraktıkların duruyor",
      onizleme: "Kaldığın yerden devam etmek ister misin?",
      bloklar: [
        { tur: "metin", metin: `${selam(bilgi.adSoyad)}\n\nSepetine eklediğin ürünler hâlâ duruyor:` },
        {
          tur: "urunler",
          satirlar: bilgi.satirlar.map((s) => ({
            ad: s.ad,
            detay: `${s.beden} · ${s.renk}`,
            adet: s.adet,
            tutarKurus: s.tutarKurus,
            foto: s.slug ? fotolar[f++] : undefined,
            adres: s.slug ? `/urun/${s.slug}` : undefined,
          })),
        },
        { tur: "dugme", yazi: "Sepetime dön", adres: `${siteAdresi()}/sepet` },
        { tur: "not", metin: "Stoklar sınırlı olduğu için ürünler tükenebilir; sepete eklemek ayırmıyor." },
      ],
      iptalAdresi: iptal,
    },
    iptalBasliklari(iptal),
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
  const fotolar = epostaAcikMi()
    ? await urunFotolari(bilgi.haberler.map((h) => ({ slug: h.slug })))
    : [];
  const iptal = iptalAdresi(bilgi.iptalJetonu);
  const konu =
    bilgi.haberler.length === 1
      ? `Favorindeki ${bilgi.haberler[0].urunAd} için güzel haber`
      : "Favorilerinde güzel haberler var";
  return gonder(
    kime,
    {
      konu,
      onizleme: "Favorilerine eklediğin ürünlerde indirim ya da yeni stok var.",
      bloklar: [
        { tur: "metin", metin: `${selam(bilgi.adSoyad)}\n\nFavorilerine eklediğin ürünlerde değişiklik var:` },
        {
          tur: "urunler",
          satirlar: bilgi.haberler.map((h, i) => ({
            ad: h.urunAd,
            tutarKurus: h.indirim?.yeniKurus,
            eskiKurus: h.indirim?.eskiKurus,
            foto: fotolar[i],
            adres: `/urun/${h.slug}`,
            etiket: [
              h.indirim ? "Fiyatı düştü" : "",
              h.gelenBedenler.length > 0 ? `Yeniden stokta: ${h.gelenBedenler.join(", ")}` : "",
            ]
              .filter(Boolean)
              .join(" · "),
          })),
        },
        { tur: "dugme", yazi: "Favorilerime git", adres: `${siteAdresi()}/hesabim/favoriler` },
        { tur: "not", metin: "Sepete eklemek ürünü ayırmıyor; adet sınırlı olabilir." },
      ],
      iptalAdresi: iptal,
    },
    iptalBasliklari(iptal),
  );
}

/**
 * Panel kullanıcılarına sabah özeti (K-101). Metni `server/sabah-ozeti.ts`
 * kuruyor; burada yalnızca şablona konuyor.
 */
export async function sabahOzetiEpostasi(
  kime: string,
  konu: string,
  metin: string,
): Promise<EpostaSonucu> {
  return gonder(kime, {
    konu,
    bloklar: [
      { tur: "metin", metin },
      { tur: "dugme", yazi: "Panele git", adres: `${siteAdresi()}/yonetim` },
    ],
  });
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
  const [foto] = epostaAcikMi() ? await urunFotolari([{ slug: bilgi.slug }]) : [];
  return gonder(kime, {
    konu: `${bilgi.urunAd} yeniden stokta`,
    onizleme: `${bilgi.beden}, ${bilgi.renk} yeniden stokta.`,
    bloklar: [
      { tur: "metin", metin: "Merhaba,\n\nHaber vermemizi istediğin ürün yeniden stokta:" },
      {
        tur: "urunler",
        satirlar: [
          {
            ad: bilgi.urunAd,
            detay: `${bilgi.beden} · ${bilgi.renk}`,
            foto,
            adres: `/urun/${bilgi.slug}`,
            etiket: "Yeniden stokta",
          },
        ],
      },
      { tur: "dugme", yazi: "Ürüne git", adres: `${siteAdresi()}/urun/${bilgi.slug}` },
      {
        tur: "not",
        metin:
          "Sepete eklemek ürünü ayırmıyor; adet sınırlı olabilir. Bu e-postayı, bu ürün için haber verilmesini istediğin için aldın. Tek seferlik; isteğin kaydı bu e-postayla birlikte silindi.",
      },
    ],
  });
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
  const tur = bilgi.turAdi.toLocaleLowerCase("tr");
  return gonder(kime, {
    konu: `${bilgi.turAdi} talebin alındı — ${bilgi.numara}`,
    onizleme: `${bilgi.numara} için ${tur} talebini aldık.`,
    bloklar: [
      { tur: "metin", metin: `${selam(bilgi.adSoyad)}\n\n${bilgi.numara} numaralı siparişin için ${tur} talebini aldık:` },
      { tur: "kutu", metin: bilgi.satirlar.map((s) => `• ${s}`).join("\n") },
      { tur: "metin", metin: "En kısa sürede bakıp sonucu bildireceğiz. Talebinin durumunu sipariş takip sayfasından da izleyebilirsin." },
      { tur: "dugme", yazi: "Talebimi izle", adres: takipAdresi(bilgi.numara, kime) },
    ],
  });
}

/** Talep sonuçlandı bildirimi — müşteriye. */
export async function talepCevabiEpostasi(
  kime: string,
  bilgi: TalepEpostasi & { durumAdi: string; cevap: string },
): Promise<EpostaSonucu> {
  const tur = bilgi.turAdi.toLocaleLowerCase("tr");
  return gonder(kime, {
    konu: `${bilgi.turAdi} talebin: ${bilgi.durumAdi} — ${bilgi.numara}`,
    onizleme: `Talebin "${bilgi.durumAdi}" olarak sonuçlandı.`,
    bloklar: [
      {
        tur: "metin",
        metin: `${selam(bilgi.adSoyad)}\n\n${bilgi.numara} numaralı siparişin için açtığın ${tur} talebi "${bilgi.durumAdi}" olarak sonuçlandı.`,
      },
      { tur: "kutu", baslik: "Cevabımız", metin: bilgi.cevap || "Ayrıntı için bize yazabilirsin." },
      { tur: "dugme", yazi: "Siparişimi görüntüle", adres: takipAdresi(bilgi.numara, kime) },
    ],
  });
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
  const tur = bilgi.turAdi.toLocaleLowerCase("tr");
  return gonder(kime, {
    konu: `Yeni ${tur} talebi — ${bilgi.numara}`,
    bloklar: [
      { tur: "metin", metin: `${bilgi.adSoyad} (${bilgi.numara}) bir ${tur} talebi açtı.` },
      { tur: "kutu", metin: bilgi.satirlar.map((s) => `• ${s}`).join("\n") },
      { tur: "dugme", yazi: "Panelde cevapla", adres: `${siteAdresi()}/yonetim/talepler` },
    ],
  });
}

/**
 * Panelden gönderilen deneme e-postası.
 *
 * Anahtar tanımlı olsa da gönderim alan adı doğrulanmadan çalışmıyor ve hata
 * yalnızca sunucu günlüğüne düşüyordu. Satışa hazırlık ekranındaki düğme bunu
 * gönderip Resend'in cevabını ekrana getiriyor (K-85).
 */
export async function denemeEpostasi(kime: string): Promise<EpostaSonucu> {
  return gonder(kime, {
    konu: "BASoftBaby deneme e-postası",
    onizleme: "Mağazanın e-postaları çalışıyor.",
    bloklar: [
      {
        tur: "metin",
        metin:
          'Merhaba,\n\nBu e-posta yönetim panelindeki "Deneme e-postası gönder" düğmesiyle gönderildi. Bunu okuyorsan mağazanın e-postaları çalışıyor: sipariş onayı, ödeme onayı, kargo bildirimi ve şifre sıfırlama bu adresten gidiyor.',
      },
      { tur: "kutu", baslik: "Gönderen", metin: gonderen() },
      { tur: "dugme", yazi: "Mağazaya git", adres: siteAdresi() },
    ],
  });
}

/**
 * Ürün sorusu cevaplandı (K-135). Müşterinin kendi sorusunun cevabı:
 * tanıtım değil, izin gerekmiyor. Yalnızca soruda e-posta bırakana gidiyor.
 */
export async function soruCevaplandiEpostasi(
  kime: string,
  bilgi: { urunAd: string; slug: string; soru: string; cevap: string },
): Promise<EpostaSonucu> {
  return gonder(kime, {
    konu: `Sorunu cevapladık: ${bilgi.urunAd}`,
    onizleme: bilgi.cevap.slice(0, 90),
    bloklar: [
      { tur: "metin", metin: `Merhaba,\n\n"${bilgi.urunAd}" hakkında sorduğun soruyu cevapladık.` },
      { tur: "kutu", baslik: "Sorun", metin: bilgi.soru },
      { tur: "kutu", baslik: "Cevabımız", metin: bilgi.cevap },
      { tur: "dugme", yazi: "Ürüne git", adres: `${siteAdresi()}/urun/${bilgi.slug}#sorular` },
    ],
  });
}

/** Panelden oluşturulan hediye çekinin kodu, alıcıya (K-137). */
export async function hediyeCekiEpostasi(
  kime: string,
  bilgi: { kod: string; aliciAd: string; tutarKurus: number; sonKullanma: Date | null },
): Promise<EpostaSonucu> {
  return gonder(kime, {
    konu: `${tutar(bilgi.tutarKurus)} değerinde hediye çekin var`,
    onizleme: `Sana ${tutar(bilgi.tutarKurus)} değerinde BASoftBaby hediye çeki tanımlandı.`,
    bloklar: [
      { tur: "metin", metin: `${selam(bilgi.aliciAd)}\n\nSana ${tutar(bilgi.tutarKurus)} değerinde bir BASoftBaby hediye çeki tanımlandı.` },
      {
        tur: "kupon",
        baslik: "Hediye çeki kodun",
        kod: bilgi.kod,
        alt: bilgi.sonKullanma ? `Son kullanma: ${gunYaz(bilgi.sonKullanma)}` : undefined,
      },
      {
        tur: "metin",
        metin:
          'Siparişini verirken ödeme sayfasındaki "Hediye çeki" alanına bu kodu yazman yeterli. Tutarın tamamını tek siparişte kullanmak zorunda değilsin; kalan bakiye sonraki siparişlerinde kullanılabiliyor.',
      },
      { tur: "dugme", yazi: "Alışverişe başla", adres: `${siteAdresi()}/urunler` },
    ],
  });
}

/**
 * Teslimden birkaç gün sonra değerlendirme isteği (K-141). Bir kez gidiyor ve
 * tanıtım içermiyor: indirim, kampanya ya da başka ürün önerisi yok. Amaç
 * alınan ürünün değerlendirilmesi, satış değil.
 */
export async function yorumIstegiEpostasi(
  kime: string,
  bilgi: { numara: string; adSoyad: string; urunler: string[]; sluglar?: string[] },
): Promise<EpostaSonucu> {
  const sluglar = bilgi.sluglar ?? [];
  const fotolar =
    epostaAcikMi() && sluglar.length > 0
      ? await urunFotolari(sluglar.map((slug) => ({ slug })))
      : [];
  return gonder(kime, {
    konu: `Ürünler nasıl oldu? · ${bilgi.numara}`,
    onizleme: "Birkaç satırlık değerlendirmen başka ailelere çok yardım ediyor.",
    bloklar: [
      {
        tur: "metin",
        metin: `${selam(bilgi.adSoyad)}\n\n${bilgi.numara} numaralı siparişin birkaç gün önce teslim edildi. Umarız minik için her şey yolundadır.\n\nBedeni tuttu mu, kumaşı nasıl? Birkaç satırlık bir değerlendirme, başka ailelerin doğru bedeni seçmesine çok yardım ediyor. İstersen bir fotoğraf da ekleyebilirsin.`,
      },
      {
        tur: "urunler",
        satirlar: bilgi.urunler.map((ad, i) => ({ ad, foto: fotolar[i] })),
      },
      {
        tur: "dugme",
        yazi: "Değerlendir",
        adres: `${takipAdresi(bilgi.numara, kime)}#degerlendir`,
      },
      { tur: "not", metin: "Bu e-posta bir kez gönderiliyor." },
    ],
  });
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
  return gonder(kime, {
    konu: "Doğum listenden bir hediye alındı",
    onizleme: `${kimden} hediye aldı.`,
    bloklar: [
      { tur: "metin", metin: `${selam(bilgi.sahipAdi)}\n\n${kimden} hediye aldı:` },
      { tur: "urunler", satirlar: bilgi.urunler.map((ad) => ({ ad })) },
      ...(bilgi.not ? [{ tur: "kutu" as const, baslik: "Notu", metin: `"${bilgi.not}"` }] : []),
      { tur: "metin", metin: 'Listen güncellendi; alınanlar işaretli. Gelen hediyelerin hepsi hesabındaki "Doğum listem" sayfasında.' },
      { tur: "dugme", yazi: "Listemi gör", adres: `${siteAdresi()}/liste/${bilgi.kod}` },
    ],
  });
}

/**
 * Büyüme hatırlatması (K-147): bebek bir sonraki bedene geçmek üzere. Ürün
 * önerdiği için tanıtım sayılıyor; altında listeden çıkma bağlantısı var.
 */
export async function buyumeEpostasi(
  kime: string,
  bilgi: { adSoyad: string; ay: number; beden: string; iptalJetonu: string },
): Promise<EpostaSonucu> {
  const urunler = epostaAcikMi() ? await bedendekiUrunler(bilgi.beden) : [];
  const iptal = iptalAdresi(bilgi.iptalJetonu);
  return gonder(
    kime,
    {
      konu: `Bebeğin ${bilgi.ay} aylık oluyor: ${bilgi.beden} zamanı`,
      onizleme: `${bilgi.beden} bedenine geçme zamanı yaklaşıyor.`,
      bloklar: [
        {
          tur: "metin",
          metin: `${selam(bilgi.adSoyad)}\n\nBebeğin birkaç hafta içinde ${bilgi.ay} aylık oluyor. Bebekler bu dönemde hızlı büyüyor; ${bilgi.beden} bedenine geçme zamanı yaklaşıyor.`,
        },
        ...(urunler.length > 0
          ? [
              { tur: "metin" as const, metin: `${bilgi.beden} bedeninde stokta olanlardan birkaçı:` },
              { tur: "urunler" as const, satirlar: urunler },
            ]
          : []),
        {
          tur: "dugme",
          yazi: `${bilgi.beden} ürünlerini gör`,
          adres: `${siteAdresi()}/urunler?beden=${encodeURIComponent(bilgi.beden)}`,
        },
        {
          tur: "not",
          metin: `Bedenden emin değilsen boy ve kiloya göre bakabileceğin tablo: ${siteAdresi()}/beden-rehberi`,
        },
      ],
      iptalAdresi: iptal,
    },
    iptalBasliklari(iptal),
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
  const iptal = iptalAdresi(bilgi.iptalJetonu);
  return gonder(
    kime,
    {
      konu: `Sana özel %${bilgi.yuzde} indirim`,
      onizleme: `Bir sonraki alışverişin için %${bilgi.yuzde} indirim kuponun hazır.`,
      bloklar: [
        {
          tur: "metin",
          metin: `${selam(bilgi.adSoyad)}\n\nİlk siparişin eline ulaştı; umarız minik beğenmiştir. Bir sonraki alışverişin için sana özel bir kupon hazırladık:`,
        },
        {
          tur: "kupon",
          baslik: `%${bilgi.yuzde} indirim kuponun`,
          kod: bilgi.kod,
          alt: `Son gün: ${gunYaz(bilgi.bitis)} · tek siparişte geçerli`,
        },
        {
          tur: "metin",
          metin: "Kupon yalnızca senin hesabında geçerli. Hesabına giriş yapıp sepet sayfasındaki kupon alanına kodu yazman yeterli.",
        },
        { tur: "dugme", yazi: "Alışverişe başla", adres: `${siteAdresi()}/urunler` },
      ],
      iptalAdresi: iptal,
    },
    iptalBasliklari(iptal),
  );
}

/** Arkadaşını davet et (K-152): davet edene ödül çeki. İşlem bildirimi. */
export async function davetOdulEpostasi(
  kime: string,
  bilgi: { adSoyad: string; arkadas: string; kod: string; tutarKurus: number; sonKullanma: Date },
): Promise<EpostaSonucu> {
  return gonder(kime, {
    konu: `Davetin için ${tutar(bilgi.tutarKurus)} hediye çeki`,
    onizleme: `${bilgi.arkadas} ilk alışverişini yaptı; hediye çekin hazır.`,
    bloklar: [
      {
        tur: "metin",
        metin: `${selam(bilgi.adSoyad)}\n\nDavet ettiğin ${bilgi.arkadas} ilk alışverişini yaptı. Teşekkür olarak sana ${tutar(bilgi.tutarKurus)} değerinde hediye çeki tanımladık:`,
      },
      {
        tur: "kupon",
        baslik: "Hediye çeki kodun",
        kod: bilgi.kod,
        alt: `Son kullanma: ${gunYaz(bilgi.sonKullanma)}`,
      },
      {
        tur: "metin",
        metin: 'Ödeme sayfasındaki "Hediye çeki" alanına yazman yeterli. Kodun hesabındaki "Arkadaşını davet et" sayfasında da duruyor.',
      },
      { tur: "dugme", yazi: "Davet sayfama git", adres: `${siteAdresi()}/hesabim/davet` },
    ],
  });
}
