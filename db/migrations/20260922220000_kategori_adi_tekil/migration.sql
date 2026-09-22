-- Kategori adı tekil (K-83).
--
-- Uygulama aynı adı zaten reddediyor (K-82), ama kontrol okuyup sonra
-- yazıyor: aynı anda gelen iki istek ikisi de geçebilir. Asıl garanti bu
-- dizin. Büyük-küçük harf ve baştaki/sondaki boşluk farkı ayrı ad sayılmıyor.
--
-- Prisma şeması ifade dizinini tanımlayamıyor; dizin yalnızca burada duruyor
-- ve `prisma migrate diff` onu fark olarak görmüyor.
--
-- Veritabanında hâlâ aynı adlı iki kategori varsa dizin kurulamaz ve göç
-- hata verirse bundan sonraki bütün dağıtımlar durur. O yüzden çakışma
-- varsa dizin kurulmuyor, uyarı bırakılıyor; uygulamadaki kontrol yine
-- çalışıyor ve Kategoriler ekranı çakışan adları gösteriyor. Öyle bir
-- durumda çakışma giderildikten sonra dizin yeni bir göçle kurulmalı.
DO $$
DECLARE
  cakisan TEXT;
BEGIN
  SELECT string_agg(ad, ', ') INTO cakisan FROM (
    SELECT min(ad) AS ad FROM "Category"
    GROUP BY lower(btrim(ad)) HAVING count(*) > 1
  ) t;

  IF cakisan IS NULL THEN
    CREATE UNIQUE INDEX "Category_ad_tekil" ON "Category" (lower(btrim(ad)));
  ELSE
    RAISE WARNING 'Aynı adlı kategoriler var (%); Category_ad_tekil dizini kurulmadı.', cakisan;
  END IF;
END $$;
