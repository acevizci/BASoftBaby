/**
 * Paneldeki kategori seçim listelerinin etiketi.
 *
 * Seçenekte yalnızca ad yazıyordu. Eski "Uyku" ve "Aksesuar" kategorileri
 * "Kız Çocuk" ve "Erkek Çocuk" diye yeniden adlandırılıp kapatılmış, aynı
 * adlarla yeni kategoriler açılmıştı: listede iki "Kız Çocuk" alt alta
 * duruyor, hangisinin dolu hangisinin boş olduğu anlaşılmıyordu. Yaş grubu
 * boş olana bağlanınca süzgeç sıfır ürün getirdi (K-82).
 *
 * Kural: ad listede tekse olduğu gibi; çakışıyorsa adres ekleniyor
 * ("Kız Çocuk · /uyku"). Kapalı kategoriye "(kapalı)" yazılıyor.
 */
export function kategoriEtiketleri(
  liste: readonly { slug: string; ad: string; aktif?: boolean }[],
): Map<string, string> {
  const anahtar = (ad: string) => ad.trim().toLocaleLowerCase("tr");
  const sayim = new Map<string, number>();
  for (const k of liste) sayim.set(anahtar(k.ad), (sayim.get(anahtar(k.ad)) ?? 0) + 1);

  const etiketler = new Map<string, string>();
  for (const k of liste) {
    let etiket = k.ad;
    if ((sayim.get(anahtar(k.ad)) ?? 0) > 1) etiket += ` · /${k.slug}`;
    if (k.aktif === false) etiket += " (kapalı)";
    etiketler.set(k.slug, etiket);
  }
  return etiketler;
}
