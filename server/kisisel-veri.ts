import "server-only";

/**
 * KVKK: verilere erişme ve silme hakkı.
 *
 * Gizlilik metni bu iki hakkı zaten sayıyordu ama tek yolu "künyedeki
 * kanallardan bize yaz"dı. Burası ikisini de üyenin kendi yapabileceği hâle
 * getiriyor (K-39).
 *
 * **Silme, her şeyi silmek değil.** Sipariş ve fatura kayıtları vergi
 * mevzuatının öngördüğü süre boyunca saklanmak zorunda; bunları silmek
 * hesabın isteğiyle bile mümkün değil. Silinen şey **hesap**: oturumlar,
 * jetonlar, adres defteri, pazarlama izni ve hesabın kendisi. Siparişler
 * hesapla bağını kaybediyor, içlerindeki ad ve adres yasal saklama süresince
 * duruyor. Ekranda bu olduğu gibi yazıyor — "her şeyi sildik" demek yanlış
 * olurdu.
 */

import { db } from "@/server/veritabani";
import { izinDegisti } from "@/server/iys";

export type KisiselVeri = {
  disaAktarim: { tarih: string; aciklama: string };
  hesap: Record<string, unknown>;
  adresler: unknown[];
  siparisler: unknown[];
  talepler: unknown[];
  degerlendirmeler: unknown[];
  favoriler: unknown[];
  oturumlar: { adet: number; sonGorulme: Date | null };
};

/**
 * Üyenin hakkındaki bütün kaydı toplar.
 *
 * Şifre özeti ve oturum jetonları **dışarıda**: ikisi de kimlik doğrulama
 * sırrı, kişinin kendi verisi olsa bile dosyaya yazılması riski artırır
 * (indirilen dosya e-postayla paylaşılıyor, bulutta duruyor).
 */
export async function kisiselVeriyiTopla(customerId: string): Promise<KisiselVeri> {
  const musteri = await db.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: {
      eposta: true,
      adSoyad: true,
      telefon: true,
      epostaDogrulandi: true,
      pazarlamaIzni: true,
      pazarlamaIzniTarihi: true,
      olusturuldu: true,
      guncellendi: true,
      adresler: {
        select: {
          baslik: true, adSoyad: true, telefon: true, adres: true,
          ilce: true, il: true, postaKodu: true, varsayilan: true, olusturuldu: true,
        },
      },
      siparisler: {
        orderBy: { olusturuldu: "desc" },
        select: {
          numara: true, durum: true, odemeYontemi: true, odemeDurumu: true,
          adSoyad: true, eposta: true, telefon: true,
          adres: true, ilce: true, il: true, postaKodu: true, not: true,
          araToplamKurus: true, indirimKurus: true, kargoKurus: true, toplamKurus: true,
          kargoTakipNo: true, teslimTarihi: true, olusturuldu: true,
          satirlar: {
            select: { urunAd: true, beden: true, renk: true, adet: true, fiyatKurus: true },
          },
          talepler: {
            select: { tur: true, sebep: true, aciklama: true, durum: true, cevap: true, olusturuldu: true },
          },
        },
      },
    },
  });

  const oturumlar = await db.customerSession.aggregate({
    where: { customerId },
    _count: { _all: true },
    _max: { sonGorulme: true },
  });

  // Değerlendirmeler siparişin satırına bağlı; müşterinin kendi yazdıkları.
  const degerlendirmeler = await db.review.findMany({
    where: { orderItem: { order: { customerId } } },
    select: {
      puan: true, yorum: true, durum: true, yanit: true, olusturuldu: true,
      product: { select: { ad: true } },
    },
  });

  // Favoriler de hesaba ait bir kayıt (K-94); hesap silinince gidiyor.
  const favoriler = await db.favorite.findMany({
    where: { customerId },
    orderBy: { olusturuldu: "desc" },
    select: { olusturuldu: true, product: { select: { ad: true } } },
  });

  const { adresler, siparisler, ...hesap } = musteri;

  return {
    disaAktarim: {
      tarih: new Date().toISOString(),
      aciklama:
        "BASoftBaby'de hesabınla ilgili tuttuğumuz kayıtların tamamı. " +
        "Şifre özeti ve oturum jetonları güvenlik gereği bu dosyaya yazılmıyor.",
    },
    hesap,
    adresler,
    siparisler: siparisler.map(({ talepler, ...s }) => ({ ...s, talepler })),
    talepler: siparisler.flatMap((s) => s.talepler.map((t) => ({ ...t, siparis: s.numara }))),
    degerlendirmeler,
    favoriler: favoriler.map((f) => ({ urun: f.product.ad, eklendi: f.olusturuldu })),
    oturumlar: { adet: oturumlar._count._all, sonGorulme: oturumlar._max.sonGorulme },
  };
}

export type SilmeSonucu = { silinen: number; kalanSiparis: number };

/**
 * Hesabı siler.
 *
 * Silinenler: oturumlar, e-posta jetonları, adres defteri, favoriler, stok
 * bildirimi istekleri ve hesabın kendisi (ilişkiler şemada `Cascade`).
 *
 * Silinmeyenler: siparişler ve faturalar — yasal saklama süresi doluncaya
 * kadar duruyorlar, ama hesapla bağları kopuyor (`SetNull`). Sepetler de
 * sahipsiz kalıyor.
 *
 * Değerlendirmeler duruyor ama adı "Müşteri"ye dönüyor: yorumun kendisi
 * başka müşteriler için bilgi, adı ise kişisel veri.
 */
export async function hesabiSil(customerId: string): Promise<SilmeSonucu> {
  const musteri = await db.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { eposta: true, pazarlamaIzni: true },
  });

  const kalanSiparis = await db.order.count({ where: { customerId } });

  await db.$transaction(async (islem) => {
    // Stok bildirimi isteklerinin hesapla ilişkisi yok, adresle bağlılar.
    await islem.stockAlert.deleteMany({ where: { eposta: musteri.eposta } });

    await islem.review.updateMany({
      where: { orderItem: { order: { customerId } } },
      data: { adSoyad: "Müşteri" },
    });

    await islem.customer.delete({ where: { id: customerId } });
    // Silinen hesabın izni de geri alınmış sayılıyor; İYS'ye ret gidiyor (K-125).
    if (musteri.pazarlamaIzni) await izinDegisti(musteri.eposta, false, islem);
  });

  return { silinen: 1, kalanSiparis };
}
