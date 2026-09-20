/**
 * Yapısal veri (JSON-LD).
 *
 * Google'ın ürünü fiyatı ve stok durumuyla tanıması için. Veri sayfanın
 * kendisiyle aynı kaynaktan geliyor, yani ekranda yazan fiyatla arama
 * sonucundaki fiyat ayrışmıyor.
 *
 * `<` işareti kaçırılıyor: metnin içine `</script>` geçse bile etiket erken
 * kapanmasın.
 */
export default function YapisalVeri({ veri }: { veri: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(veri).replace(/</g, "\\u003c"),
      }}
    />
  );
}
