-- `indirim` artık İndirimdekiler listesinin adresi (K-164). Bu adresi almış
-- bir kategori varsa sayfası açılmaz olurdu: K-78'deki gibi sonuna boş olan
-- ilk sayı ekleniyor (`indirim-2`, doluysa `indirim-3`...).
DO $$
DECLARE
  k RECORD;
  aday TEXT;
  sayi INT;
BEGIN
  FOR k IN SELECT id, slug FROM "Category" WHERE slug = 'indirim' LOOP
    sayi := 2;
    aday := k.slug || '-' || sayi;
    WHILE EXISTS (SELECT 1 FROM "Category" WHERE slug = aday) LOOP
      sayi := sayi + 1;
      aday := k.slug || '-' || sayi;
    END LOOP;
    UPDATE "Category" SET slug = aday WHERE id = k.id;
  END LOOP;
END $$;
