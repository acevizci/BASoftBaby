# Stok planı: barkodla, telefonda, az adımla

Bu belge stok tarafının yeniden düzenlenmesinin tam planı. Amaç yeni özellik
eklemek değil, **günlük stok işini kısaltmak**. Her madde "bir adımı kaldırıyor
mu?" sorusuyla seçildi. Kaldırmıyorsa ya plandan çıktı ya da kendiliğinden
oluyor.

Uygulama sırasında her aşama `04-kararlar.md`'ye K-numarasıyla yazılacak.

---

## 1. Çıkış noktası

### Mağazanın durumu

- Ürünlerin **üzerinde üretici barkodu var**.
- Tedarikçi **belli değil, çok sayıda olabiliyor**. Sipariş genellikle
  **WhatsApp**'tan veriliyor.
- Stok işi bugün **bilgisayardan** yapılıyor; **telefondan** yapılabilmesi
  isteniyor.

### Bugünkü stok ekranları (6 sayfa)

| Sayfa | Ne yapıyor | Sorun |
| --- | --- | --- |
| Stok | Bedenlerin sayısını mutlak değerle düzeltme | Hasar, kayıp gibi sebepler yok; her şey "Elle düzeltme" |
| Mal kabulü | Ürünü ara, gelen adedi yaz | 20 kalemlik irsaliye 20 ayrı arama |
| Sayım | Sayım aç, bedenlere sayı gir | Ayrı akış, telefonda zahmetli |
| Sipariş listesi | Satış hızına göre öneri, CSV | Tedarikçiye mesaj elle yazılıyor |
| Satmayanlar | Uzun süredir satmayanlar | Rapor olarak kalıyor, bir işe bağlanmıyor |
| Hareketler | Stok geçmişi | Sorun yok; ayrı menü satırı gereksiz |

### Koddaki eksikler

- **Üretici barkodu için alan yok.** Sistem yalnızca bizim etiketimizi
  (`B` + `barkodNo`, K-107), SKU'yu ve beden kimliğini tanıyor. Ürünün kendi
  barkodu okutulunca "bulunamadı" çıkıyor.
- **iPhone'da kamerayla okuma yok.** `ui/barkod-okuyucu.tsx` tarayıcının
  `BarcodeDetector`'ını kullanıyor. Bu Android Chrome'da var, iPhone
  Safari'de yok.
- **Beden-renk ekleme tek tek.** Ürün sayfasında her birleşim için ayrı form
  gönderiliyor (`varyantEkle`). 5 beden × 3 renk = 15 gönderim.
- **"Azaldı" sınırı sabit 3 adet** (`AZALAN_ESIK`). Çok satan bodyde 3 adet
  birkaç saatlik stok; yavaş satan bir üründe aylarca yeter.
- **Kâr raporunda stok kaybı yok.** Sayım farkları hareketlere yazılıyor ama
  maliyet olarak rapora girmiyor.

---

## 2. İlkeler

1. **Okut, yazma.** Barkodu olan her şey okutularak yapılır. Elle yazmak
   yalnızca barkodsuz ürün ve adet düzeltmesi için kalır.
2. **Bir kez öğret.** Tanınmayan barkod bir kez sorulur, bir daha sorulmaz.
   Barkodları önceden toplu girmek gerekmez.
3. **Liste biriksin, tek seferde kaydet.** Okutulanlar ekranda toplanır;
   stok sonunda tek işlemle yazılır. Kaydetmeden önce her satır düzeltilebilir.
4. **Kaybolmasın, iki kez yazılmasın.** Kaydedilmemiş liste telefonda saklanır.
   Kaydetme bir kerelik anahtarla yapılır; bağlantı kopup yeniden gönderilse de
   stok iki kez artmaz (K-166 ile aynı yöntem).
5. **Yeni kavram yok.** Tedarikçi kaydı zorunlu değil; ayrı "bekleyen
   sipariş" takibi, onay adımı, rol yok.
6. **Menü küçülür.** 6 sayfa 3'e iner. Eski adresler yeni yerlerine yönlenir.

---

## 3. Yeni düzen: 3 sayfa

| Menü | Adres | İçinde |
| --- | --- | --- |
| **Stok** | `/yonetim/stok` | Özet kutusu · stok listesi · sekmeler: Hareketler, Satmayanlar, Sayımlar |
| **Depo** | `/yonetim/stok/depo` | Telefon ekranı: Mal geldi · Çıkar · Say |
| **Sipariş ver** | `/yonetim/stok/siparis-ver` | Tedarikçiye göre öneri · WhatsApp mesajı |

Kaldırılanlar:

- `mal-kabul` → Depo "Mal geldi" (adres yönleniyor).
- `sayim` → yeni sayımlar Depo "Say"da. Açık eski sayımlar ve geçmiş, Stok ›
  Sayımlar sekmesinde.
- `siparis-listesi` → Sipariş ver (CSV indirme orada kalıyor).
- `hareketler`, `satmayanlar` → Stok sayfasında sekme. Adresler aynı kalıyor,
  yalnızca menü satırı kalkıyor.
- Etiketler sayfası kalıyor ama menüde değil. Üretici barkodu olmayan ürün
  için Depo ve ürün sayfasından bağlantıyla açılıyor.

---

## 4. Barkod öğrenme

### Veri

Yeni tablo `VariantBarcode`:

| Alan | Açıklama |
| --- | --- |
| `kod` | Okutulan metin, boşluksuz (EAN-13, EAN-8, UPC, Code128…) |
| `variantId` | Bağlı beden-renk |
| `carpan` | Bir okutma kaç adet: tek ürün 1, "3'lü paket" barkodu 3, koli 24 |
| `olusturuldu`, `adminId` | Kim, ne zaman öğretti |

- `@@unique([kod, variantId])`, `@@index([kod])`.
- **Bir barkod birden çok bedene bağlanabilir.** Bazı üreticiler bütün renk ya
  da bedenlerde aynı barkodu kullanıyor. Böyle bir barkod okutulunca hangisi
  olduğu sorulur (aşağıda).
- **Bir bedenin birden çok barkodu olabilir.** Tedarikçi değişince eski
  barkod da tanınmaya devam eder.

### Okutulan kod nasıl çözülüyor

Sıra şöyle (tek fonksiyon: `barkodCoz(kod)` → `server/barkod.ts`):

1. `VariantBarcode.kod` eşleşmesi.
2. Bizim etiketimiz (`B` + `barkodNo`).
3. SKU (büyük/küçük harf fark etmez).
4. Beden kimliği.

Sonuç üç türlü olabilir:

- **Tek eşleşme:** satır doğrudan listeye eklenir.
- **Birden çok eşleşme:** ekranda o barkodun bağlı olduğu bedenler düğme
  olarak çıkar ("0-3 ay beyaz", "3-6 ay beyaz"…). Seçilen eklenir. "Bu
  barkod hep bunu gösteriyor" işaretlenirse öteki bağlar kaldırılır.
- **Eşleşme yok:** "Bu barkodu tanımıyorum" kartı açılır.

### "Tanımıyorum" kartı

1. Ürün adıyla ara (yazdıkça sonuç).
2. Ürünü seç → beden-renk düğmeleri.
3. Bedeni seç → barkod öğretildi, satır listeye eklendi.
4. İsteğe bağlı "Bu bir paket: [ 3 ] adet" kutusu (`carpan`).
5. Ürün hiç yoksa "Yeni ürün olarak ekle" → ürün formu yeni sekmede açılır,
   barkod beden-renk tablosunda ilgili hücreye hazır yazılı gelir (bkz. §7).

### Kurallar

- Öğretme yalnızca panel yöneticisine.
- Barkod metni kırpılıyor, içindeki boşluklar siliniyor, en çok 64 karakter.
- Aynı kod ve beden zaten bağlıysa yeniden bağlamak hata değil, sessizce
  geçiliyor.
- Beden silinince bağlı barkodları da siliniyor (`onDelete: Cascade`).
- Ürün sayfasında her bedenin barkodları görünüyor ve kaldırılabiliyor.

### Toplu yükleme

- `server/toplu-urun.ts`'e isteğe bağlı **Barkod** sütunu ekleniyor.
- Dolu satırda barkod o bedene bağlanıyor. Başka bir bedene bağlı bir barkod
  gelirse satır hata değil, uyarı veriyor ("iki bedene bağlanacak").

---

## 5. Depo ekranı (telefon)

Adres: `/yonetim/stok/depo`. Telefon için tasarlanıyor; bilgisayarda da el
okuyucuyla ya da arama kutusuyla çalışıyor.

### Ekran düzeni (üstten alta)

1. **Mod seçici**, üç büyük düğme: **Mal geldi** · **Çıkar** · **Say**.
2. **Kamera alanı:** açıkken sürekli okur. Yanında fener ve kamerayı kapat
   düğmeleri.
3. **Arama kutusu:** barkodsuz ürün için ad ya da kod yazılır. El okuyucu da
   buraya yazar.
4. **Son okutulan kartı** (büyük): ürün adı, beden, renk, bu işlemde kaç
   adet, sistemdeki stok, "kaç gün yeter", varsa ödeme bekleyen siparişlerde
   ayrılan adet. Kısa titreşim ve bip sesiyle birlikte gelir.
5. **Liste:** her satırda ürün · beden · renk · adet [−][+] · sil. Adete
   dokununca sayı yazılabilir (koli sayarken).
6. **Alt çubuk** (sabit): toplam kalem ve adet · **Kaydet** düğmesi.

### Okuma ayrıntıları

- **Kamera:** `BarcodeDetector` varsa o kullanılır. Yoksa (iPhone) paket
  içine alınmış ZXing okuyucusu (`@zxing/browser`) yalnızca bu sayfada, ilk
  kullanımda yüklenir.
  - Dışarıdan betik yüklenmiyor, içerik politikası (CSP) değişmiyor.
  - Kamera izni reddedilirse: "Kamera izni yok; arama kutusunu kullan" ve
    nasıl açılacağının iki satırlık tarifi.
- **Aynı kodu art arda okuma:** kamera aynı barkodu saniyede birkaç kez
  görüyor. Aynı kod 1,2 saniye içinde tekrar gelirse sayılmaz. Aynı ürünü
  bilerek bir daha okutmak için kamerayı ürünün üstünden çekip geri getirmek
  yeterli.
- **El okuyucu** (USB ya da Bluetooth, klavye gibi yazar): arama kutusu
  odaktayken Enter ile gelen metin barkod sayılır.
- **Ses ve titreşim:** tanınan barkodda kısa bip, tanınmayanda iki kısa bip.
  Titreşim desteklenen telefonda. Ses bir düğmeyle kapatılabilir.

### Liste saklama ve çift kayıt

- Liste her değişiklikte telefonda (`localStorage`) mod başına saklanır.
  Sayfa kapanıp açılınca "Kaydedilmemiş 12 kalem var: devam et / sil" sorulur.
- Kaydet bir kerelik anahtar gönderir. Sunucu yeni `DepoIslemi` tablosuna
  anahtarı **tekil** yazar ve işlemi aynı veritabanı işleminde yapar.
  - Aynı anahtar yeniden gelirse (bağlantı koptu, iki kez basıldı) stok
    yeniden yazılmaz; ilk kaydın sonucu gösterilir.
- Başarılı kayıttan sonra liste silinir, yeni anahtar üretilir.

### Mod 1: Mal geldi

- Her okutma `+carpan` adet.
- Kaydet'e basınca küçük bir pencere açılır, **hepsi isteğe bağlı**:
  - **Tedarikçi:** yazdıkça önceki adlar önerilir (bkz. §9).
  - **İrsaliye no.**
  - **Alış fiyatları:** listedeki her ürün için bir kutu, şimdiki alış fiyatı
    içinde yazılı. Boş bırakılan ya da değişmeyen fiyata dokunulmaz.
- **Yazılanlar:**
  - Stok artırılarak yazılır (`increment`); arada gelen satış ezilmez.
  - Hareket: sebep `mal-kabul`, not "Tedarikçi · irsaliye".
  - "Gelince haber ver" bildirimleri gönderilir (`stokBildirimleriniGonder`,
    bugün mal kabulünde de çalışıyor).
  - **Alış fiyatı değiştiyse ortalama maliyet:**
    `yeni = (eskiStok × eskiAlış + gelen × yeniAlış) / (eskiStok + gelen)`.
    `eskiStok` ürünün kayıttan önceki toplam stoğu (sıfırın altı 0 sayılır).
    Ürün seviyesinde (`Product.alisFiyatKurus`), çünkü alış fiyatı bugün de
    ürün başına. Eski alış hiç yoksa yeni fiyat doğrudan yazılır. Verilmiş
    siparişlerin maliyeti satırda sabit olduğu için geçmiş kâr değişmez.
  - Ürünün tedarikçisi girildiyse ürüne yazılır.
- **Sonuç ekranı:** "38 adet, 11 kalem stoğa eklendi". Altında:
  - Bekleyen haber isteği olan ürünlere kaç müşteriye e-posta gittiği.
  - Üretici barkodu olmayan kalemler için "Etiket bas" bağlantısı (gelen
    adet kadar, mevcut etiket sayfası).

### Mod 2: Çıkar

- Her okutma `−carpan` adet.
- Kaydet'te **tek soru: sebep.** Seçenekler:
  - **Hasarlı / fire** (`hasar`)
  - **Kayıp** (`kayip`)
  - **Numune, hediye, kendi kullanım** (`numune`)
  - İsteğe bağlı kısa not.
- **Kurallar:**
  - Stok sıfırın altına düşmez; koşullu düşüm (`stok >= adet`), K-166 ile
    aynı.
  - Yetmeyen satır kaydedilmez, kırmızı işaretlenir: "Stokta 1 var, 2
    çıkarılamaz". Öteki satırlar kaydedilir.
  - Ödeme bekleyen siparişte ayrılmış ürünler stoktan zaten düşmüş durumda.
    Rafta görünse de onlara dokunulmaz; kartta "2 tanesi siparişte ayrılı"
    yazar.
- **Hareket:** yeni sebepler `hasar`, `kayip`, `numune`
  (`server/stok-hareket.ts` → `SEBEPLER`).

### Mod 3: Say

Mevcut sayım mantığı (`server/sayim.ts`, K-107) aynen kullanılıyor: fark satır
sayıldığı ana göre, rafta olması gereken = stok + ayrılan. Değişen, akış:

1. Mod açılınca **kapsam** sorulur:
   - "Yalnızca okuttuklarım" (varsayılan): raf raf, parça parça sayım.
   - Bir kategori.
   - Bütün mağaza.
2. Okutulan her ürün +1 sayılır (koli için adete dokunup yazılır).
3. **Bitir** →
   - **Fark ekranı:** yalnızca farkı olan satırlar, "sistem 5 · sayılan 4 ·
     −1". Toplam fark ve maliyet karşılığı.
   - Kapsam kategori ya da bütün mağazaysa **okutulmamış bedenler** ayrıca
     listelenir. İki seçenek: "Dokunma" (varsayılan) ya da "Rafta yok, sıfır
     say".
   - **Onayla** → farklar stoğa eklenerek uygulanır, hareket `sayim` (bugünkü
     gibi).
- Sayım `StockCount` kaydı olarak tutulur. Kapsam "okutulan" için satırlar
  okutuldukça eklenir. Yarıda bırakılan sayım Stok › Sayımlar'da açık görünür;
  Depo'da "Devam et" ile sürer.
- Aynı anda tek açık sayım (bugünkü kural).

### Tanınmayan barkod her modda

§4'teki "Tanımıyorum" kartı açılır; öğretilince satır o anki moda eklenir.

---

## 6. Stok sayfası

### Özet kutusu (sayfanın üstü)

Dört sayı; her biri tıklanınca listeyi o süzgeçle açar:

| Kutu | Anlamı |
| --- | --- |
| **Bitti** | Stoğu 0, son 60 günde satışı olan ya da haber bekleyeni olan bedenler |
| **7 günde bitecek** | Satış hızına göre 7 gün içinde bitecekler |
| **Haber bekleyen** | "Gelince haber ver" diyen müşteri sayısı (beden sayısıyla) |
| **Açık sayım** | Varsa; "Devam et" bağlantısıyla |

Stok değeri kutusu (K-114) aynen kalıyor, özet kutusunun yanına küçülüyor.

### "Azaldı" sınırı: satış hızından

`AZALAN_ESIK = 3` kaldırılıyor. Yeni kural (`server/satis-hizi.ts`):

- Yeterli satış verisi varsa: **tahmini süre ≤ 14 gün** ise azaldı.
- Az veri varsa (`PENCERE_GUN` = 30 günde `EN_AZ_SATIS` = 3 satıştan az): **stok ≤ 2** ise azaldı.
- Hiç satış yoksa azaldı sayılmaz (satmayanlar sekmesinin işi).

Ayar ekranı yok. Mağazadaki "Son N adet" rozeti bu değişiklikten
etkilenmiyor; o müşteriye gösterilen ayrı bir sınır.

### Liste

- **Ürün başına beden-renk tablosu:** satırlarda bedenler, sütunlarda renkler,
  hücrede stok kutusu. Biten hücre kırmızı, azalan sarı. Hücrenin altında
  küçük yazıyla "~9 gün".
- **Sayı yazarak düzeltme kalıyor.** Mutlak sayı, çakışma denetimiyle; bugünkü
  `stoklariYaz` ve K-102 mantığı. Hareket `duzeltme`.
- Tek renkli ürün tek sütun, tek bedenli ürün tek satır görünür; yani bugünkü
  liste kadar yer kaplar.
- Her ürün satırında: "Barkodlar" (öğretilmiş barkod sayısı) · "Etiket" ·
  "Geçmiş" (Hareketler sekmesi o ürünle süzülmüş).
- Süzgeçler bugünkü gibi: Sorunlular · Bitenler · Hepsi, arama, kategori.

### Sekmeler

- **Stok** (liste)
- **Hareketler:** bugünkü sayfa. Sebep süzgecine yeni sebepler eklenir.
- **Satmayanlar:** bugünkü sayfa; her satırda seçim kutusu ve üstte
  **"Seçilenlerle kampanya yap"** düğmesi (bkz. §10).
- **Sayımlar:** geçmiş sayımlar ve açık sayım.

---

## 7. Beden-renk tablosu (ürün sayfası)

Ürün sayfasındaki "Bedenler ve stok" bölümü baştan yazılıyor.

### Görünüm

- Üstte iki seçim satırı:
  - **Bedenler:** etkin bedenler, beden sırasıyla, işaret kutusu olarak.
  - **Renkler:** etkin renkler, renk yuvarlağıyla.
- Hızlı seçim düğmeleri:
  - "Bu kategorideki son ürün gibi": o kategoride en son eklenen ürünün beden
    ve renklerini işaretler.
  - "Tüm bedenler" / "Temizle".
- Altta tablo: işaretli bedenler satır, işaretli renkler sütun. Her hücrede:
  - **Stok** kutusu.
  - **Barkod** kutusu (küçük). El okuyucuyla hücreye tıklayıp okutmak
    yeterli; Enter bir sonraki hücreye geçer.
- Var olan birleşimler dolu gelir (stok ve barkodlar). Yeni birleşimlerin
  hücresi "yeni" diye soluk görünür.

### Kaydet (tek düğme)

Tek işlemde:

- **Yeni hücreler:** beden oluşturulur (SKU bugünkü kuralla), başlangıç stoğu
  yazılır, hareket `yeni`.
- **Var olan hücrenin stoğu değiştiyse:** çakışma denetimli düzeltme
  (stok ekranıyla aynı fonksiyon), hareket `duzeltme`.
- **Barkod yazıldıysa** o bedene bağlanır (§4 kuralları).
- **İşareti kaldırılmış bir beden ya da rengin** var olan hücreleri
  silinmez. Hücre "kaldırılacak" diye çizili görünür, kaydederken silme
  onayı istenir (bugünkü `SilmeOnayi` metni: stoğu da gidiyor).
  - Siparişte geçmişi olan beden silinmez; "stoğu 0 yap" önerilir. Bugün
    de bedenin sipariş satırları `SetNull` ile korunuyor.

### Yeni ürün akışı

1. Ürün formu (ad, kategori, fiyat…) kaydedilir.
2. Sayfa beden-renk tablosuna kayar; bedenler "bu kategorideki son ürün
   gibi" hazır işaretli gelir.
3. Stoklar ve barkodlar girilir, kaydedilir.

Depo'daki "Yeni ürün olarak ekle"den gelindiyse okutulan barkod adreste
taşınır ve seçilen hücreye yazılı gelir.

---

## 8. Kâr raporu ve sabah özeti

- **Kâr raporu:** yeni satır **Stok kaybı**. İçinde, ay içindeki:
  - `hasar` ve `kayip` hareketleri,
  - `sayim` hareketlerinin eksi olanları,
  - her biri adet × ürünün alış fiyatı.
  - `numune` ayrı satır: **Numune ve hediye**; reklam gideri gibi
    düşünülüyor, kayıptan ayrı görünsün.
  - Sayımda çıkan artılar kayıpla netleşmiyor (fazla çıkan ürün önceki bir
    hatanın düzelmesi); ayrı küçük not olarak yazılıyor.
- **Sabah özeti:** "Azalan stok" bölümü yeni azaldı kuralıyla. Yeni satır:
  "Dün stoktan çıkarılan: 3 adet (hasarlı 2, kayıp 1)", yalnızca varsa.

---

## 9. Sipariş ver (tedarikçi ve WhatsApp)

### Veri

- Yeni tablo `Supplier`: `ad` (tekil), `telefon` (isteğe bağlı), `not`.
  Ayrı bir tedarikçi ekranı yok; ad yazıldığı yerde oluşuyor.
- `Product.tedarikciId` (isteğe bağlı) ve `Product.tedarikciKodu` (isteğe
  bağlı; tedarikçinin model kodu, mesajda yazıyor).
- Yeni tablo `SupplierOrder`: tedarikçi, satırlar (Json: beden kimliği,
  adet), mesaj metni, tarih, kim. Yalnızca "ne zaman ne istendi" kaydı;
  teslim takibi yok.

### Tedarikçi nereden giriliyor

- Ürün formunda "Tedarikçi" kutusu, yazdıkça önceki adlar öneriliyor.
- Depo "Mal geldi" kaydında (bkz. §5); listedeki ürünlere yazılıyor.
- Sipariş ver ekranında "Tedarikçisi yok" grubunda ürün başına.
- Telefon, Sipariş ver ekranında tedarikçi başlığının yanındaki kalemle
  ekleniyor.

### Ekran

- Üstte hedef süre seçici (bugünkü gibi: 7 · 14 · 30 · 60 · 90 gün).
- Öneriler **tedarikçiye göre gruplu**. Her grup bir kart:
  - Satırlar: ürün · tedarikçi kodu · beden · renk · stok · ~gün · haber
    bekleyen · **adet kutusu** (öneriyle dolu) · dahil et kutusu.
  - Satırda **"Son 7 günde istendi: 10"** notu (varsa): aynı ürün iki kez
    sipariş edilmesin. Öneriden düşülmüyor, yalnızca gösteriliyor.
  - Kartın altında **mesaj önizlemesi**, düzenlenebilir.
  - Düğmeler: **WhatsApp'ta aç** (telefon varsa) · **Metni kopyala** · **CSV**.
- İki düğme de basılınca `SupplierOrder` kaydı yazılıyor ve kart "gönderildi
  · bugün 14:05" oluyor.
- "Tedarikçisi yok" grubu en altta; oradan satır başına tedarikçi atanabiliyor.

### Mesaj biçimi

```
Merhaba, BASoftBaby siparişi:

Organik zıbın 3'lü set (Kod 2045)
  Beyaz: 0-3 ay 10 · 3-6 ay 8 · 6-9 ay 4
  Mavi: 0-3 ay 6

Bambu patik (Kod P-12)
  Gri: 0-6 ay 12

Toplam 40 adet. Teşekkürler.
```

- Aynı ürünün renkleri tek satırda, bedenler beden sırasıyla.
- **WhatsApp bağlantısı:** `https://wa.me/90XXXXXXXXXX?text=…`.
  - Telefon kaydederken Türkiye biçimine çevriliyor: baştaki 0 ve +90
    temizlenip 90 ekleniyor.
  - Geçersiz numarada düğme yerine "Numara geçersiz" yazıyor.
- Mağaza adı künyeden (`StoreSetting`) okunuyor.

---

## 10. Satmayanlardan kampanya

- Satmayanlar sekmesinde ürünler işaretlenip "Seçilenlerle kampanya yap"
  denince sihirbaz açılıyor (`/yonetim/kampanyalar/yeni?urunler=…`, K-172).
- Açılışta tür "Yüzde indirim", kapsam "Seçili ürünler" ve seçilenler
  işaretli geliyor; kullanıcı yüzdeyi yazıp ilerliyor.
- Adres en çok 200 ürün taşıyor; fazlası için uyarı.

---

## 11. Güvenlik ve tutarlılık

| Konu | Önlem |
| --- | --- |
| Çift kayıt (iki basış, bağlantı kopması) | `DepoIslemi` tekil anahtarı; aynı anahtar ikinci kez uygulanmıyor |
| Arada gelen satış | Mal geldi `increment`, Çıkar koşullu `decrement`, Say fark ekleyerek; hiçbiri mutlak yazmıyor |
| Eksiye düşme | Çıkar'da `stok >= adet` koşulu; yetmeyen satır kaydedilmiyor |
| Aynı barkod iki bedende | Hata değil; okutunca seçtiriliyor |
| Silinen beden | Barkod bağları siliniyor; hareket ve sipariş kayıtları duruyor (bugünkü gibi) |
| Yetki | Bütün Depo eylemleri `yoneticiGerekli` |
| Büyük liste | Bir kayıtta en çok 500 satır; üstü "ikiye böl" uyarısı |
| Kamera ve gizlilik | Görüntü telefondan çıkmıyor; yalnızca okunan metin gönderiliyor |

---

## 12. Aşamalar

Her aşama kendi başına çalışır, bitince test edilip yayına alınır ve kullanım
rehberi o aşamanın ekranlarıyla güncellenir.

### Aşama 1: Barkod ve Depo ekranı

- `VariantBarcode`, `DepoIslemi` tabloları. `barkodCoz`.
- iPhone için kamera okuyucusu (ZXing, yalnızca Depo'da yükleniyor).
- Depo ekranı: Mal geldi, Çıkar, "Tanımıyorum" kartı, liste saklama.
- Yeni hareket sebepleri; mal kabulü adresi Depo'ya yönleniyor.
- Ürün sayfasında bedenlerin barkodları (görme ve kaldırma).

**Bitti sayılır:**

- iPhone Safari ve Android Chrome'da okutup "Mal geldi" kaydedilebiliyor.
- Tanınmayan barkod bir kez öğretilince sonraki okutmada doğrudan ekleniyor.
- Aynı kaydı iki kez göndermek stoğu iki kez artırmıyor (test).
- Çıkar stoğu eksiye düşürmüyor (test).

### Aşama 2: Depo'da sayım ve sade menü

- Depo "Say" modu (okuttuklarım · kategori · bütün mağaza), fark ekranı,
  okutulmamışlar seçeneği.
- Stok sayfası sekmeleri (Hareketler, Satmayanlar, Sayımlar). Menü 3 satır.
  Eski adreslerin yönlendirmeleri.

**Bitti sayılır:**

- Sayım telefondan baştan sona yapılabiliyor.
- Sayım sürerken gelen sipariş farkı bozmuyor (bugünkü test korunuyor).
- Menüde 3 satır var; eski bağlantılar çalışıyor.

### Aşama 3: Beden-renk tablosu ve stok listesi

- Ürün sayfasında seçim + tablo + tek kaydet; hücrede barkod.
- Stok listesinde ürün başına tablo görünümü.
- Satış hızına göre "azaldı".
- Özet kutusu.
- Toplu yüklemede Barkod sütunu.

**Bitti sayılır:**

- 5 beden × 3 renklik ürün tek kaydetle kuruluyor.
- Var olan hücrede stok değişikliği arada gelen siparişi ezmiyor (çakışma
  testi).

### Aşama 4: Sipariş ver ve raporlar

- `Supplier`, `SupplierOrder`, ürün tedarikçisi.
- Mal gelirken tedarikçi ve alış fiyatı, ortalama maliyet.
- Sipariş ver ekranı, WhatsApp mesajı.
- Kâr raporunda stok kaybı, numune; sabah özeti satırı.
- Satmayanlardan kampanya.

**Bitti sayılır:**

- Mesaj yukarıdaki biçimde, telefon numarası doğru biçimde açılıyor.
- Ortalama maliyet hesabı testli (eski alış yok, eski stok sıfır ya da eksi
  durumları dahil).
- Kâr raporundaki kayıp, hareketlerle birebir tutuyor.

---

## 13. Testler

- **Saf fonksiyonlar:**
  - `barkodCoz` önceliği.
  - Telefon biçimleme.
  - Mesaj metni (renk ve beden gruplama, sıralama).
  - Ortalama maliyet.
  - Azaldı kuralı.
  - Sayımda okutulmamışların seçenekleri.
- **Veritabanı:**
  - Mal geldi, Çıkar ve Say'ın stok ve hareket kayıtları.
  - Aynı anahtarla iki gönderim.
  - Eşzamanlı sipariş ile Çıkar.
  - Birden çok bedene bağlı barkod.
  - Beden silinince barkod bağının silinmesi.
  - Beden-renk tablosunda yeni ve var olan hücre ile çakışma.
- **Tarayıcı (Playwright):**
  - Depo'da el okuyucu gibi yazıp Enter'la okutma, liste, kaydet, sonuç
    ekranı.
  - Liste saklama (sayfa yenilenince geri gelme).
  - Beden-renk tablosunda seç, doldur, kaydet.
  - Telefon genişliğinde (390 px) ekran görüntüleri.
  - Kamera testi otomatik yapılamıyor; gerçek telefonda elle denenecek
    (Android ve iPhone).

---

## 14. Bilerek yapılmayanlar

- **Tedarikçi ekranı, teslim takibi, eksik/fazla eşleştirmesi.** Mal gelince
  zaten okutuluyor; ayrı takip ek iş getirir. Yalnızca "son 7 günde istendi"
  notu var.
- **Çoklu depo / raf adresi.** Tek depo var.
- **Parti ve son kullanma tarihi.** Tekstilde gerekmiyor.
- **Rol ve yetki ayrımı** ("depocu yalnızca Depo'yu görsün"). Şu an panelde
  tek tür kullanıcı var; ihtiyaç olursa ayrı iş.
- **Hareketten geri alma düğmesi.** Kaydetmeden önceki liste düzeltmesi ve
  sayı yazarak düzeltme yetiyor.
- **İnternetsiz çalışma.** Liste telefonda saklanıyor ama kaydetmek için
  bağlantı gerekiyor.

---

## 15. Açık konular

- **Kamera okuyucusu paketi:** `@zxing/browser` (Apache-2.0) düşünülüyor.
  Boyutu ve iPhone'daki hızı ilk aşamada ölçülecek; yetmezse
  `html5-qrcode`'a bakılacak.
- **Gerçek telefonda deneme:** kamera okuma otomatik testle doğrulanamıyor.
  Yayında; mağazanın kendi telefonunda (iPhone ve Android)
  denenmesi gerekiyor.
- **El okuyucu:** varsa modeli; Bluetooth okuyucular telefonda da klavye gibi
  çalışıyor, Depo ekranı bunu destekliyor.
