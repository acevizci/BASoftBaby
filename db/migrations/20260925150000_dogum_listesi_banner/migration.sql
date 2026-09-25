-- Doğum listesi tanıtım banner'ı (K-145). Yalnızca veri; panelden
-- düzenlenebilir, kapatılabilir ya da silinebilir. Silinse de bu göç bir
-- daha çalışmadığı için geri gelmez.
INSERT INTO "HeroBanner" ("id", "baslik", "altYazi", "dugmeYazi", "dugmeLink", "palet", "gorsel", "sira", "aktif", "olusturuldu", "guncellendi")
VALUES (
  'dogum-listesi-tanitim',
  'Doğum listeni oluştur',
  'İstediklerini beden ve rengiyle listele, yakınlarınla paylaş. Aynı hediye iki kez gelmesin.',
  'Listemi oluştur',
  '/dogum-listesi',
  'mint',
  'tulum',
  1,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
