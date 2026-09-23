/**
 * WhatsApp destek düğmesinin numarası (K-99).
 *
 * Numara künyedeki destek telefonundan geliyor; ayrı bir ayar yok. Yalnızca
 * cep numarası kabul ediliyor: sabit hatla çoğu zaman WhatsApp açılmıyor ve
 * müşteri "bu numara WhatsApp kullanmıyor" hatasıyla karşılaşıyordu. Sabit
 * hat girilmişse düğme hiç çıkmıyor.
 *
 * Dönen değer `wa.me` adresinin istediği biçimde: ülke koduyla, yalnız
 * rakam ("905551234567").
 */
export function whatsappNumarasi(telefon: string): string | undefined {
  let r = telefon.replace(/\D/g, "");
  if (r.startsWith("0090")) r = r.slice(2);
  if (r.startsWith("90") && r.length === 12) r = r.slice(2);
  if (r.startsWith("0") && r.length === 11) r = r.slice(1);
  return /^5\d{9}$/.test(r) ? `90${r}` : undefined;
}
