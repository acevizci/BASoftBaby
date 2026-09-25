#!/usr/bin/env bash
# Veritabanı yedeği (K-143).
#
# 1. Canlı veritabanının tam kopyası (`pg_dump`, sıkıştırılmış özel biçim).
# 2. Kopya boş bir veritabanına geri yükleniyor ve önemli tabloların satır
#    sayıları kaynakla karşılaştırılıyor: yedek var sanıp bozuk çıkmasın.
# 3. Kopya parolayla şifreleniyor (AES-256); şifresiz hali siliniyor. Yedekte
#    müşteri adresleri ve siparişler var.
#
# Girdiler (ortam değişkeni):
#   YEDEK_KAYNAK   canlı veritabanı adresi (havuzsuz, doğrudan bağlantı)
#   YEDEK_HEDEF    geri yükleme denemesi için boş bir veritabanı adresi
#   YEDEK_PAROLASI şifreleme parolası
#   YEDEK_KLASOR   çıktı klasörü (varsayılan: ./yedek)
#
# Geri yükleme (docs/04-kararlar.md, K-143):
#   gpg -d basoftbaby-TARIH.dump.gpg > yedek.dump
#   pg_restore --no-owner --no-privileges --clean --if-exists -d "$ADRES" yedek.dump

set -euo pipefail

: "${YEDEK_KAYNAK:?YEDEK_KAYNAK tanımlı değil}"
: "${YEDEK_HEDEF:?YEDEK_HEDEF tanımlı değil}"
: "${YEDEK_PAROLASI:?YEDEK_PAROLASI tanımlı değil}"
KLASOR="${YEDEK_KLASOR:-./yedek}"
mkdir -p "$KLASOR"

TARIH="$(date -u +%Y-%m-%dT%H%M)"
DOSYA="$KLASOR/basoftbaby-$TARIH.dump"

echo "Yedek alınıyor…"
pg_dump --format=custom --compress=9 --no-owner --no-privileges \
  --dbname="$YEDEK_KAYNAK" --file="$DOSYA"
echo "Yedek: $(du -h "$DOSYA" | cut -f1)"

echo "Geri yükleme deneniyor…"
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$YEDEK_HEDEF" "$DOSYA"

# Kaynakla aynı mı: siparişin, ürünün ve müşterinin kaybolmadığını görmek yeter.
SAYIM='select (select count(*) from "Order")||'"'"' sipariş, '"'"'||(select count(*) from "Product")||'"'"' ürün, '"'"'||(select count(*) from "Customer")||'"'"' müşteri'"'"
KAYNAKTA="$(psql "$YEDEK_KAYNAK" -Atc "$SAYIM")"
YEDEKTE="$(psql "$YEDEK_HEDEF" -Atc "$SAYIM")"
echo "Kaynak: $KAYNAKTA"
echo "Yedek:  $YEDEKTE"
if [ "$KAYNAKTA" != "$YEDEKTE" ]; then
  echo "Yedek kaynakla tutmuyor." >&2
  exit 1
fi

echo "Şifreleniyor…"
gpg --batch --yes --pinentry-mode loopback --passphrase-fd 0 \
  --symmetric --cipher-algo AES256 --output "$DOSYA.gpg" "$DOSYA" <<<"$YEDEK_PAROLASI"
rm -f "$DOSYA"
echo "Hazır: $DOSYA.gpg"
