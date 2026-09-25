-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "urunArama" TEXT NOT NULL DEFAULT '';

-- Başlangıç yazılarına ürün anahtar kelimeleri (K-157). Panelden
-- değiştirilmişse dokunulmuyor.
UPDATE "Article" AS a SET "urunArama" = v.kelimeler, guncellendi = CURRENT_TIMESTAMP
FROM (VALUES
  ('yenidogan-kiyafet-listesi', 'zıbın body tulum müslin uyku'),
  ('hastane-cantasi-bebek', 'zıbın body tulum müslin battaniye şapka'),
  ('bebek-kiyafeti-beden-secimi', 'body tulum zıbın'),
  ('bebek-kiyafeti-yikama', 'organik pamuk müslin body'),
  ('mevsime-gore-bebek-giydirme', 'hırka body uyku tulumu şapka'),
  ('zibin-body-tulum-farki', 'zıbın body tulum'),
  ('dogum-listesi-nasil-hazirlanir', 'set body tulum müslin uyku'),
  ('uyku-tulumu-tog-secimi', 'uyku tulumu tog'),
  ('organik-pamuk-nedir', 'organik pamuk'),
  ('bebek-hediyesi-secimi', 'set müslin body uyku'),
  ('bebegin-ilk-bayramligi', 'takım body hırka şapka elbise')
) AS v(slug, kelimeler)
WHERE a.slug = v.slug AND a."urunArama" = '';
