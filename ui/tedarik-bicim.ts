/**
 * Tedarikçi siparişinin saf parçaları (K-179): telefon biçimi, WhatsApp
 * mesajı ve bağlantısı, ortalama maliyet. Tarayıcı ve sunucu ortak.
 */

/**
 * Telefonu WhatsApp'ın istediği biçime çevirir: yalnızca rakam, ülke koduyla,
 * başında + olmadan ("905321234567"). Türkiye numaraları baştaki 0 ya da
 * +90 ile de yazılabiliyor. Okunamazsa `null`.
 */
export function telefonCoz(ham: string): string | null {
  const metin = ham.trim();
  if (!metin) return null;
  const uluslararasi = metin.startsWith("+") || metin.startsWith("00");
  let r = metin.replace(/\D/g, "");
  if (r.startsWith("00")) r = r.slice(2);
  if (!uluslararasi) {
    if (r.length === 11 && r.startsWith("0")) r = `90${r.slice(1)}`;
    else if (r.length === 10 && r.startsWith("5")) r = `90${r}`;
  }
  if (r.startsWith("90")) return r.length === 12 ? r : null;
  return uluslararasi && r.length >= 8 && r.length <= 15 ? r : null;
}

/** Okunur telefon: "+90 532 123 45 67". */
export function telefonYaz(t: string): string {
  if (t.startsWith("90") && t.length === 12) {
    return `+90 ${t.slice(2, 5)} ${t.slice(5, 8)} ${t.slice(8, 10)} ${t.slice(10)}`;
  }
  return `+${t}`;
}

/** WhatsApp'ta mesajı hazır açan bağlantı. */
export function whatsappBaglantisi(telefon: string, metin: string): string {
  return `https://wa.me/${telefon}?text=${encodeURIComponent(metin)}`;
}

export type MesajSatiri = {
  productId: string;
  urunAd: string;
  tedarikciKodu: string | null;
  renkAdi: string;
  beden: string;
  /** Beden sırası (küçükten büyüğe). */
  bedenSira: number;
  adet: number;
};

/**
 * Sipariş mesajı: ürün başına bir blok, rengin bedenleri tek satırda, beden
 * sırasıyla.
 *
 * ```
 * Merhaba, BASoftBaby siparişi:
 *
 * Organik zıbın 3'lü set (Kod 2045)
 *   Beyaz: 0-3 ay 10 · 3-6 ay 8
 *
 * Toplam 18 adet. Teşekkürler.
 * ```
 */
export function siparisMesaji(magaza: string, satirlar: MesajSatiri[]): string {
  const dolu = satirlar.filter((s) => s.adet > 0);
  const urunler = new Map<string, MesajSatiri[]>();
  for (const s of dolu) urunler.set(s.productId, [...(urunler.get(s.productId) ?? []), s]);

  const bloklar = [...urunler.values()]
    .sort((a, b) => a[0].urunAd.localeCompare(b[0].urunAd, "tr"))
    .map((liste) => {
      const ilk = liste[0];
      const baslik = ilk.tedarikciKodu ? `${ilk.urunAd} (Kod ${ilk.tedarikciKodu})` : ilk.urunAd;
      const renkler = new Map<string, MesajSatiri[]>();
      for (const s of liste) renkler.set(s.renkAdi, [...(renkler.get(s.renkAdi) ?? []), s]);
      const satir = [...renkler]
        .sort((a, b) => a[0].localeCompare(b[0], "tr"))
        .map(
          ([renk, bedenler]) =>
            `  ${renk}: ${bedenler
              .sort((a, b) => a.bedenSira - b.bedenSira)
              .map((b) => `${b.beden} ${b.adet}`)
              .join(" · ")}`,
        );
      return [baslik, ...satir].join("\n");
    });

  const toplam = dolu.reduce((t, s) => t + s.adet, 0);
  return [`Merhaba, ${magaza} siparişi:`, ...bloklar, `Toplam ${toplam} adet. Teşekkürler.`].join(
    "\n\n",
  );
}

/**
 * Mal gelince yeni alış fiyatıyla ortalama maliyet (K-179):
 * `(eskiStok × eskiAlış + gelen × yeniAlış) / (eskiStok + gelen)`, kuruşa
 * yuvarlanmış. Eski alış yoksa ya da eski stok yoksa yeni fiyat.
 */
export function ortalamaMaliyet(
  eskiStok: number,
  eskiAlis: number | null,
  gelen: number,
  yeniAlis: number,
): number {
  const eski = Math.max(0, eskiStok);
  if (eskiAlis === null || eski === 0 || gelen <= 0) return yeniAlis;
  return Math.round((eski * eskiAlis + gelen * yeniAlis) / (eski + gelen));
}
