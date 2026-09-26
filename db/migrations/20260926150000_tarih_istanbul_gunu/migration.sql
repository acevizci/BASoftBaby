-- Paneldeki tarih kutusundan gelen günler UTC gece yarısı yazılıyordu
-- (İstanbul 03:00): bitişi 30 Eylül seçilen kampanya o günün başında
-- bitiyordu (K-164). Tam UTC gece yarısındaki kayıtlar İstanbul gününe
-- taşınıyor: başlangıç günün başı (00:00 +03), bitiş günün sonu
-- (23:59:59.999 +03). Başka saatteki kayıtlara dokunulmuyor.
UPDATE "Campaign" SET "baslangic" = "baslangic" - interval '3 hours', "guncellendi" = now()
 WHERE "baslangic" IS NOT NULL AND "baslangic"::time = '00:00:00';
UPDATE "Campaign" SET "bitis" = "bitis" + interval '20 hours 59 minutes 59.999 seconds', "guncellendi" = now()
 WHERE "bitis" IS NOT NULL AND "bitis"::time = '00:00:00';

UPDATE "HeroBanner" SET "baslangic" = "baslangic" - interval '3 hours', "guncellendi" = now()
 WHERE "baslangic" IS NOT NULL AND "baslangic"::time = '00:00:00';
UPDATE "HeroBanner" SET "bitis" = "bitis" + interval '20 hours 59 minutes 59.999 seconds', "guncellendi" = now()
 WHERE "bitis" IS NOT NULL AND "bitis"::time = '00:00:00';

UPDATE "Announcement" SET "baslangic" = "baslangic" - interval '3 hours'
 WHERE "baslangic" IS NOT NULL AND "baslangic"::time = '00:00:00';
UPDATE "Announcement" SET "bitis" = "bitis" + interval '20 hours 59 minutes 59.999 seconds'
 WHERE "bitis" IS NOT NULL AND "bitis"::time = '00:00:00';
