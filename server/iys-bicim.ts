/**
 * İYS (İleti Yönetim Sistemi) dosyası — hesap kısmı (K-125).
 *
 * Saf modül; testler doğrudan çağırıyor.
 */

export type IzinKaydi = { eposta: string; durum: "ONAY" | "RET"; kaynak: string; tarih: Date };

/** Türkiye 2016'dan beri yaz saati uygulamıyor: sabit UTC+3. */
const TR_FARK = 3 * 60 * 60 * 1000;

/** İYS'nin tarih biçimi, Türkiye saatiyle: "2026-09-24 15:04:05". */
export function iysTarihi(t: Date): string {
  return new Date(t.getTime() + TR_FARK).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Aynı adresin birden çok kaydı varsa İYS'ye yalnızca sonuncusu gidiyor:
 * önce onay sonra ret verene "onay" bildirmek yanlış olurdu. Kayıtlar
 * tarih sırasıyla geliyor.
 */
export function sonDurumlar(kayitlar: IzinKaydi[]): IzinKaydi[] {
  const son = new Map<string, IzinKaydi>();
  for (const k of [...kayitlar].sort((a, b) => a.tarih.getTime() - b.tarih.getTime())) {
    son.set(k.eposta.toLowerCase(), k);
  }
  return [...son.values()];
}

/** CSV hücresi: virgül, tırnak ya da satır sonu varsa tırnak içinde. */
function hucre(d: string): string {
  return /[",\n\r;]/.test(d) ? `"${d.replace(/"/g, '""')}"` : d;
}

/**
 * İYS'ye toplu yükleme dosyası. Sütunlar İYS'nin kendi alan adları
 * (`type, source, recipient, status, consentDate, recipientType`): izin
 * türü e-posta, alıcı bireysel.
 */
export function iysCsv(kayitlar: IzinKaydi[]): string {
  const satirlar = sonDurumlar(kayitlar).map((k) =>
    ["EPOSTA", k.kaynak, k.eposta, k.durum, iysTarihi(k.tarih), "BIREYSEL"].map(hucre).join(","),
  );
  return ["type,source,recipient,status,consentDate,recipientType", ...satirlar].join("\r\n") + "\r\n";
}
