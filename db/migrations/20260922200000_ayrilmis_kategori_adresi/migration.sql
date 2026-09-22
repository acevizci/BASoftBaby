-- Mağazanın kendi sayfalarıyla çakışan kategori adreslerini taşır (K-78).
--
-- "Ürünler" adlı bir kategori `urunler` slug'ını alıyordu; o adres tüm
-- katalog listesi olduğu için kategori sayfası bütün ürünleri gösteriyordu.
-- Çakışan slug'ın sonuna, boş olan ilk sayı ekleniyor (panelin yeni
-- kategoride yaptığıyla aynı: `urunler-2`, doluysa `urunler-3`...).
DO $$
DECLARE
  k RECORD;
  aday TEXT;
  sayi INT;
BEGIN
  FOR k IN
    SELECT id, slug FROM "Category"
    WHERE slug IN (
      'urunler', 'arama', 'urun', 'sepet', 'odeme', 'siparis', 'siparis-takip',
      'yasal', 'beden-rehberi', 'iade-degisim', 'kargo-teslimat',
      'sikca-sorulanlar', 'eposta-dogrula', 'eposta-izni', 'giris', 'kayit',
      'hesabim', 'sifre-sifirla', 'sifremi-unuttum', 'yonetim', 'yuklenen',
      'api', 'marka', 'icon', 'apple-icon'
    )
  LOOP
    sayi := 2;
    aday := k.slug || '-' || sayi;
    WHILE EXISTS (SELECT 1 FROM "Category" WHERE slug = aday) LOOP
      sayi := sayi + 1;
      aday := k.slug || '-' || sayi;
    END LOOP;
    UPDATE "Category" SET slug = aday WHERE id = k.id;
  END LOOP;
END $$;
