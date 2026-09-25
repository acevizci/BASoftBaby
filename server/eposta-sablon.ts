/**
 * E-posta şablonu (K-161). Saf modül: veritabanına dokunmuyor, testler
 * doğrudan çağırıyor.
 *
 * E-postalar bloklardan kuruluyor; aynı bloklardan hem HTML hem düz metin
 * sürümü çıkıyor (düz metin spam filtrelerine ve metin gösteren istemcilere).
 *
 * **HTML kuralları:** e-posta istemcileri CSS'in küçük bir kısmını tanıyor.
 * Düzen tablolarla, stiller satır içi; `<style>`, flex, grid yok. Görseller
 * tam adresle ve PNG/JPEG (Outlook WebP göstermiyor; ürün fotoğrafları WebP,
 * Outlook'ta yerlerinde alt yazısı kalıyor). Renk şeması açık tema olarak
 * bildiriliyor: koyu temalı istemciler renkleri kendi başına çevirip mercanı
 * okunmaz yapmasın.
 *
 * Metindeki her şey kaçışlanıyor; şablona HTML yazan tek yer bu modül.
 */

export type UrunSatiri = {
  ad: string;
  /** "0-3 ay · Mint" gibi ikinci satır. */
  detay?: string;
  adet?: number;
  /** Satırın toplamı (birim × adet). */
  tutarKurus?: number;
  /** Üstü çizili eski fiyat. */
  eskiKurus?: number;
  /** Tam adres ya da site içi yol ("/yuklenen/…"). */
  foto?: string;
  /** Ürün sayfası; kart tıklanıyor. */
  adres?: string;
  /** Kartın altında vurgulu kısa not: "Yeniden stokta: 3-6 ay". */
  etiket?: string;
};

export type Blok =
  | { tur: "metin"; metin: string }
  | { tur: "dugme"; yazi: string; adres: string }
  | { tur: "urunler"; satirlar: UrunSatiri[] }
  | { tur: "tutarlar"; satirlar: { ad: string; deger: string; vurgu?: boolean }[] }
  /** Sipariş durumu: 0 alındı · 1 hazırlanıyor · 2 kargoda · 3 teslim. */
  | { tur: "durum"; adim: 0 | 1 | 2 | 3 }
  | { tur: "kutu"; baslik?: string; metin: string }
  | { tur: "kupon"; baslik: string; kod: string; alt?: string }
  | { tur: "not"; metin: string };

export type Eposta = {
  konu: string;
  /** Gelen kutusunda konunun yanında görünen kısa özet. */
  onizleme?: string;
  bloklar: Blok[];
  /** Tanıtım e-postalarında listeden çıkma adresi; alt bilgide gösteriliyor. */
  iptalAdresi?: string;
};

export type EpostaOrtami = {
  site: string;
  /** Künye: alt bilgideki satıcı bilgisi. Boş alanlar yazılmıyor. */
  kunye: { unvan: string; sirketAdresi: string; destekTelefon: string; destekEposta: string };
  /** `wa.me` biçiminde numara ("905551234567"); yoksa bağlantı yok. */
  whatsapp?: string;
};

const R = {
  metin: "#332f2a",
  metin2: "#6c655c",
  metin3: "#787064",
  zemin: "#fffcf7",
  sayfa: "#f6f0e6",
  cizgi: "#eae3d7",
  dugme: "#b33b33",
  nane: "#77d9ab",
  naneKoyu: "#277856",
  naneSoluk: "#e6f7ee",
  mercan: "#f36c62",
  mercanSoluk: "#fdebe9",
  sicak: "#fbf5eb",
  mavi: "#2f6e9e",
};
const YAZI = "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

export function kacir(m: string): string {
  return m
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Yalnızca http(s) adresleri bağlantı olabiliyor. */
function guvenliAdres(a: string, site: string): string {
  const tam = a.startsWith("/") && !a.startsWith("//") ? `${site}${a}` : a;
  return /^https?:\/\//.test(tam) ? tam : site;
}

export function tutar(kurus: number): string {
  const [tam, kesir] = (Math.abs(kurus) / 100).toFixed(2).split(".");
  const binli = tam.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${kurus < 0 ? "-" : ""}${binli},${kesir} ₺`;
}

/** Metindeki adresler tıklanır; sondaki noktalama bağlantıya girmiyor. */
function baglantili(kacirilmis: string): string {
  return kacirilmis.replace(
    /https?:\/\/[^\s<]+[^\s<.,;:!?)]/g,
    (a) => `<a href="${a}" style="color:${R.mavi};word-break:break-all">${a}</a>`,
  );
}

function paragraflar(metin: string, stil = ""): string {
  return metin
    .trim()
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;${stil}">${baglantili(kacir(p)).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

const DURUMLAR = ["Alındı", "Hazırlanıyor", "Kargoda", "Teslim edildi"];

function blokHtml(b: Blok, site: string): string {
  switch (b.tur) {
    case "metin":
      return paragraflar(b.metin);
    case "not":
      return paragraflar(b.metin, `font-size:13px;color:${R.metin3}`);
    case "dugme":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px auto 20px"><tr><td style="border-radius:999px;background:${R.dugme}"><a href="${kacir(guvenliAdres(b.adres, site))}" style="display:inline-block;padding:13px 28px;font:700 15px ${YAZI};color:#ffffff;text-decoration:none;border-radius:999px">${kacir(b.yazi)}</a></td></tr></table>`;
    case "urunler":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border-collapse:collapse">${b.satirlar
        .map((u) => {
          const foto = u.foto
            ? `<img src="${kacir(guvenliAdres(u.foto, site))}" width="64" height="64" alt="${kacir(u.ad)}" style="display:block;width:64px;height:64px;border-radius:10px;object-fit:cover;background:${R.sicak};border:0">`
            : `<div style="width:64px;height:64px;border-radius:10px;background:${R.sicak}"></div>`;
          const ad = u.adres
            ? `<a href="${kacir(guvenliAdres(u.adres, site))}" style="color:${R.metin};text-decoration:none;font-weight:700">${kacir(u.ad)}</a>`
            : `<span style="font-weight:700">${kacir(u.ad)}</span>`;
          const alt = [u.detay, u.adet && u.adet > 1 ? `${u.adet} adet` : ""]
            .filter(Boolean)
            .join(" · ");
          const fiyat =
            u.tutarKurus !== undefined
              ? `${u.eskiKurus ? `<span style="color:${R.metin3};text-decoration:line-through;font-size:13px">${tutar(u.eskiKurus)}</span><br>` : ""}<span style="font-weight:700;white-space:nowrap">${tutar(u.tutarKurus)}</span>`
              : "";
          return `<tr><td width="76" valign="top" style="padding:10px 12px 10px 0;border-bottom:1px solid ${R.cizgi}">${u.adres ? `<a href="${kacir(guvenliAdres(u.adres, site))}">${foto}</a>` : foto}</td><td valign="top" style="padding:10px 0;border-bottom:1px solid ${R.cizgi};font-size:15px">${ad}${alt ? `<br><span style="font-size:13px;color:${R.metin2}">${kacir(alt)}</span>` : ""}${u.etiket ? `<br><span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:999px;background:${R.naneSoluk};color:${R.naneKoyu};font-size:12px;font-weight:700">${kacir(u.etiket)}</span>` : ""}</td><td valign="top" align="right" style="padding:10px 0 10px 12px;border-bottom:1px solid ${R.cizgi};font-size:15px">${fiyat}</td></tr>`;
        })
        .join("")}</table>`;
    case "tutarlar":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px">${b.satirlar
        .map(
          (s) =>
            `<tr><td style="padding:3px 0;font-size:${s.vurgu ? "16px;font-weight:700" : `14px;color:${R.metin2}`}">${kacir(s.ad)}</td><td align="right" style="padding:3px 0;white-space:nowrap;font-size:${s.vurgu ? "16px;font-weight:700" : `14px;color:${R.metin2}`}">${kacir(s.deger)}</td></tr>`,
        )
        .join("")}</table>`;
    case "durum":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;table-layout:fixed"><tr>${DURUMLAR.map(
        (d, i) => {
          const tamam = i <= b.adim;
          return `<td align="center" valign="top" style="padding:0 2px"><div style="height:6px;border-radius:999px;background:${tamam ? R.nane : R.cizgi}"></div><div style="margin-top:6px;font-size:12px;${i === b.adim ? `font-weight:700;color:${R.naneKoyu}` : `color:${tamam ? R.metin2 : R.metin3}`}">${d}</div></td>`;
        },
      ).join("")}</tr></table>`;
    case "kutu":
      return `<div style="margin:0 0 18px;padding:14px 16px;border-radius:12px;background:${R.sicak};border:1px solid ${R.cizgi}">${b.baslik ? `<p style="margin:0 0 6px;font-weight:700">${kacir(b.baslik)}</p>` : ""}<p style="margin:0;font-size:14px;white-space:pre-line">${baglantili(kacir(b.metin.trim())).replace(/\n/g, "<br>")}</p></div>`;
    case "kupon":
      return `<div style="margin:0 0 18px;padding:18px 16px;border-radius:14px;border:2px dashed ${R.mercan};background:${R.mercanSoluk};text-align:center"><p style="margin:0 0 6px;font-size:14px;color:${R.metin2}">${kacir(b.baslik)}</p><p style="margin:0;font:800 24px/1.3 ui-monospace,Menlo,Consolas,monospace;letter-spacing:2px;color:${R.dugme}">${kacir(b.kod)}</p>${b.alt ? `<p style="margin:6px 0 0;font-size:13px;color:${R.metin2}">${kacir(b.alt)}</p>` : ""}</div>`;
  }
}

function blokMetin(b: Blok): string {
  switch (b.tur) {
    case "metin":
    case "not":
      return b.metin.trim();
    case "dugme":
      return `${b.yazi}:\n${b.adres}`;
    case "urunler":
      return b.satirlar
        .map((u) => {
          const alt = [u.detay, u.adet && u.adet > 1 ? `${u.adet} adet` : ""]
            .filter(Boolean)
            .join(", ");
          const fiyat = u.tutarKurus !== undefined ? ` — ${tutar(u.tutarKurus)}` : "";
          return `• ${u.ad}${alt ? ` (${alt})` : ""}${fiyat}${u.etiket ? `\n  ${u.etiket}` : ""}${u.adres ? `\n  ${u.adres}` : ""}`;
        })
        .join("\n");
    case "tutarlar":
      return b.satirlar.map((s) => `${s.ad}: ${s.deger}`).join("\n");
    case "durum":
      return `Durum: ${DURUMLAR[b.adim]}`;
    case "kutu":
      return `${b.baslik ? `${b.baslik}\n` : ""}${b.metin.trim()}`;
    case "kupon":
      return `${b.baslik}: ${b.kod}${b.alt ? `\n${b.alt}` : ""}`;
  }
}

/** Metin sürümünde site içi adresler tam adres olsun. */
function tamla(b: Blok, site: string): Blok {
  if (b.tur === "dugme") return { ...b, adres: guvenliAdres(b.adres, site) };
  if (b.tur === "urunler") {
    return {
      ...b,
      satirlar: b.satirlar.map((u) => ({
        ...u,
        adres: u.adres ? guvenliAdres(u.adres, site) : undefined,
      })),
    };
  }
  return b;
}

export function epostaYap(e: Eposta, o: EpostaOrtami): { html: string; text: string } {
  const { site, kunye } = o;
  const kunyeSatiri = [kunye.unvan, kunye.sirketAdresi].filter(Boolean).join(" · ");
  const iletisim = [kunye.destekTelefon, kunye.destekEposta].filter(Boolean).join(" · ");

  const bag = (yazi: string, adres: string) =>
    `<a href="${kacir(adres)}" style="color:${R.metin2};text-decoration:underline">${yazi}</a>`;
  const baglantilar = [
    bag("Sipariş takibi", `${site}/siparis-takip`),
    bag("İade ve değişim", `${site}/iade-degisim`),
    ...(o.whatsapp ? [bag("WhatsApp destek", `https://wa.me/${o.whatsapp}`)] : []),
    bag("Hesabım", `${site}/hesabim`),
  ].join(" &nbsp;·&nbsp; ");

  const onizleme = e.onizleme
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${kacir(e.onizleme)}${"&#8204;&nbsp;".repeat(60)}</div>`
    : "";

  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${kacir(e.konu)}</title></head>
<body style="margin:0;padding:0;background:${R.sayfa};color:${R.metin};font:16px/1.6 ${YAZI}">${onizleme}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${R.sayfa}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#ffffff;border:1px solid ${R.cizgi};border-radius:18px;overflow:hidden">
<tr><td style="height:6px;background:${R.nane};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td align="center" style="padding:22px 24px 8px;background:${R.zemin}"><a href="${site}"><img src="${site}/marka/basoftbaby-yatay-eposta.png" width="220" height="55" alt="BASoftBaby" style="display:block;width:220px;height:auto;border:0;font:700 20px ${YAZI};color:${R.dugme}"></a></td></tr>
<tr><td style="padding:22px 28px 10px;font:16px/1.6 ${YAZI};color:${R.metin}">
${e.bloklar.map((b) => blokHtml(b, site)).join("\n")}
</td></tr>
<tr><td style="padding:18px 28px 22px;background:${R.sicak};border-top:1px solid ${R.cizgi};font:12px/1.7 ${YAZI};color:${R.metin3};text-align:center">
<p style="margin:0 0 6px">${baglantilar}</p>
${iletisim ? `<p style="margin:0">${kacir(iletisim)}</p>` : ""}
${kunyeSatiri ? `<p style="margin:0">${kacir(kunyeSatiri)}</p>` : `<p style="margin:0">BASoftBaby</p>`}
${e.iptalAdresi ? `<p style="margin:8px 0 0">Bu e-postaları almak istemiyorsan ${bag("listeden çık", guvenliAdres(e.iptalAdresi, site))}.</p>` : ""}
</td></tr>
</table>
</td></tr></table></body></html>`;

  const altBilgi = [
    "—",
    kunye.unvan || "BASoftBaby",
    iletisim,
    kunye.sirketAdresi,
    e.iptalAdresi
      ? `Bu e-postaları almak istemiyorsan listeden çık:\n${guvenliAdres(e.iptalAdresi, site)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  const text = `${e.bloklar
    .map((b) => blokMetin(tamla(b, site)))
    .filter(Boolean)
    .join("\n\n")}\n\n${altBilgi}`;

  return { html, text };
}
