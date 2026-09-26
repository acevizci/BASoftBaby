import { hareketYaz, type Yapan } from "@/server/stok-hareket";
import "server-only";
import { db } from "@/server/veritabani";
import { stokBildirimleriniGonder } from "@/server/stok-bildirimi";
import { odemeSorgula } from "@/server/odeme";
import { odemeAlindiEpostasi } from "@/server/eposta";
import { iadeKaydiAc, iadeTutari } from "@/server/iade";
import { cekeIadeEt } from "@/server/hediye-ceki";
import { alinanlariIsle } from "@/server/dogum-listesi";
import { tahsilat } from "@/server/hediye-ceki-bicim";

/**
 * Ödeme akışının sipariş tarafı: girişim kaydı, dönüşün işlenmesi, ödeme
 * tutmazsa stoğun geri verilmesi.
 *
 * **Aynı dönüş iki kez işlenmiyor** (K-06). iyzico dönüş çağrısını
 * tekrarlayabiliyor, müşteri de "geri" tuşuna basabiliyor. Girişim kaydı
 * jetonla tekil; kayıt "baslatildi" durumundan çıktıysa ikinci çağrı hiçbir
 * şeyi değiştirmeden aynı sonucu döndürüyor.
 *
 * **Stok sipariş açılırken düşüyor**, yani ödeme süresince rezerve. Ödeme
 * tutmazsa aynı işlem içinde geri veriliyor ve sipariş iptal oluyor
 * (mimarideki 04. karar).
 */

/** Bir kart ödeme girişiminin geçerli sayıldığı süre (iyzico formu ~30 dk). */
const KART_GIRISIM_MS = 30 * 60_000;

export type DonusSonucu =
  | { durum: "basarili"; numara: string }
  | { durum: "basarisiz"; numara: string; hata: string }
  /** iyzico'ya ulaşılamadı; sipariş açık kalıyor, sonuç sonra belli olacak (K-165). */
  | { durum: "belirsiz"; numara: string }
  | { durum: "bulunamadi" };

export async function odemeGirisimiKaydet(
  orderId: string,
  jeton: string,
  tutarKurus: number,
): Promise<void> {
  await db.payment.create({ data: { orderId, jeton, tutarKurus } });
}

/**
 * Çekilen tutar sipariş için kabul edilebilir mi (K-110).
 *
 * Tek çekimde birebir. Taksitte fazlası kabul: vade farkı müşteriye
 * yansıtılmış olabilir (iyzico panelindeki ayara bağlı). Eksik hiçbir
 * durumda kabul değil.
 */
export function odemeTutariTutuyor(odenenKurus: number, toplamKurus: number, taksit: number): boolean {
  if (odenenKurus === toplamKurus) return true;
  return taksit > 1 && odenenKurus > toplamKurus;
}

/**
 * Sipariş iptal edilip stok geri veriliyor.
 *
 * Koşul olarak siparişin durumu da veriliyor: iki dönüş çağrısı yarışırsa
 * stok iki kez geri verilmesin. Ürünü silinmiş satırın (variantId boş)
 * stoğu geri verilemiyor, sipariş kaydı yine de iptal oluyor.
 *
 * **Parası alınmış sipariş iptal edilirse ödeme durumu `bekliyor` olmuyor.**
 * Bu işlev iki yerden çağrılıyor: kart ödemesi tutmadığında (para hiç
 * alınmadı, `bekliyor` doğru) ve müşterinin iptal talebi onaylandığında —
 * orada sipariş `odendi` olabiliyor, havalesi gelmiş olabiliyor. İkisine
 * aynı şeyi yazmak, alınmış paranın kaydını siliyordu: ekranda "ödeme
 * bekliyor" yazıyor, kimse iade etmesi gerektiğini bilmiyordu (K-57).
 *
 * Artık ödenmiş sipariş iptal edilince **iade kaydı açılıyor** (K-58): ne
 * kadar borç olduğu, hangi yöntemle ödendiği ve ödenip ödenmediği kayıtta
 * duruyor, panelin "iade bekleyenler" listesine düşüyor. Ödenmemişse eskisi
 * gibi `bekliyor`.
 */
export async function siparisiIptalEtVeStoguIadeEt(
  orderId: string,
  /** Panelden iptal edildiyse kim; stok hareketine yazılıyor (K-103). */
  yapan?: Yapan,
): Promise<void> {
  const iadeEdilen = await db.$transaction(async (islem) => {
    // Ödeme durumu iptalden önce okunuyor: sonrası çok geç.
    const oncesi = await islem.order.findUnique({
      where: { id: orderId },
      select: { odemeDurumu: true, numara: true, hediyeCekiKurus: true, kampanyaId: true },
    });
    const parasiAlindi = oncesi?.odemeDurumu === "odendi";

    const iptal = await islem.order.updateMany({
      where: { id: orderId, durum: { not: "iptal" } },
      data: {
        durum: "iptal",
        odemeDurumu: parasiAlindi ? "iade-bekliyor" : "bekliyor",
      },
    });
    if (iptal.count === 0) return [];

    // Ödenmeden iptal edilen siparişin kuponu geri veriliyor (K-167): kart
    // ödemesi tutmayan ya da havalesi gelmeyen müşterinin tek kullanımlık
    // kuponu yanıyordu. Ödenmiş siparişin iptalinde kupon kullanılmış sayılıyor.
    if (!parasiAlindi && oncesi?.kampanyaId) {
      await islem.$executeRaw`
        update "Campaign" set kullanim = kullanim - 1
         where id = ${oncesi.kampanyaId} and kullanim > 0`;
    }

    // Ödenmeden iptal: çekten düşülen tutar olduğu gibi bakiyeye dönüyor
    // (K-137). Ödenmişse aşağıdaki iade kaydı çek kısmını kendisi ayırıyor.
    if (!parasiAlindi && oncesi && oncesi.hediyeCekiKurus > 0) {
      await cekeIadeEt(islem, orderId, oncesi.hediyeCekiKurus, "iptal");
    }

    // Parası alınmışsa borç kayda giriyor. Tutar siparişin tamamı: iptal
    // parça parça olmuyor, kargo da iade ediliyor.
    if (parasiAlindi) {
      const tutar = await iadeTutari(orderId, undefined, islem);
      if (tutar) {
        await iadeKaydiAc(
          orderId,
          tutar.toplamKurus,
          { aciklama: "Sipariş iptal edildi." },
          islem,
        );
      }
    }

    const satirlar = await islem.orderItem.findMany({
      where: { orderId },
      select: { variantId: true, adet: true, giftListItemId: true },
    });
    // İptal edilen hediye listeden yeniden alınabilsin (K-144).
    await alinanlariIsle(islem, satirlar, -1);

    const idler: string[] = [];
    for (const satir of satirlar) {
      if (!satir.variantId) continue;
      await islem.productVariant.update({
        where: { id: satir.variantId },
        data: { stok: { increment: satir.adet } },
      });
      idler.push(satir.variantId);
    }
    // Stok hareketi iptalle aynı işlemde (K-103).
    await hareketYaz(
      islem,
      satirlar.flatMap((s) =>
        s.variantId
          ? [
              {
                variantId: s.variantId,
                degisim: s.adet,
                sebep: "iptal" as const,
                siparisNo: oncesi?.numara,
                yapan,
              },
            ]
          : [],
      ),
    );
    return idler;
  });

  // İade edilen stok son adetse, "gelince haber ver" diyen bekliyordur.
  // İşlemin dışında: e-posta gönderimi veritabanı işlemini uzatmamalı.
  await stokBildirimleriniGonder(iadeEdilen);
}

/**
 * İptal olan siparişin ürünlerini sepete geri koyar.
 *
 * Sipariş açılırken sepet boşalıyor. Ödeme tutmazsa müşteri elinde boş sepetle
 * kalmasın diye satırlar geri yazılıyor; stok o sırada zaten iade edilmiş
 * oluyor, yine de adet eldeki stokla sınırlanıyor.
 *
 * Sepeti olmayan (çerezi silinmiş) müşteri için hiçbir şey yapılmıyor: bu
 * adım kolaylık, siparişin doğruluğuna etkisi yok.
 */
export async function sepetiSiparistenDoldur(
  cartId: string | undefined,
  numara: string,
): Promise<void> {
  if (!cartId) return;

  const sepet = await db.cart.findUnique({ where: { id: cartId }, select: { id: true } });
  if (!sepet) return;

  const satirlar = await db.orderItem.findMany({
    where: { order: { numara } },
    select: { variantId: true, adet: true, variant: { select: { stok: true } } },
  });

  for (const satir of satirlar) {
    if (!satir.variantId) continue;
    const adet = Math.min(satir.adet, satir.variant?.stok ?? 0);
    if (adet <= 0) continue;
    await db.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId: satir.variantId } },
      update: { adet },
      create: { cartId, variantId: satir.variantId, adet },
    });
  }
}

/**
 * iyzico'dan dönen jetonu işler.
 *
 * Sıra önemli: önce iyzico'ya sorulur, sonra tutar siparişle karşılaştırılır,
 * sonra kayıt güncellenir. Dönüş çağrısının gövdesindeki hiçbir bilgiye
 * güvenilmiyor — jeton dışında oradan bir şey okunmuyor.
 */
export async function odemeDonusunuIsle(jeton: string): Promise<DonusSonucu> {
  if (!jeton) return { durum: "bulunamadi" };

  const girisim = await db.payment.findUnique({
    where: { jeton },
    select: {
      id: true,
      durum: true,
      hata: true,
      order: {
        select: {
          id: true,
          numara: true,
          toplamKurus: true,
          hediyeCekiKurus: true,
          durum: true,
          adSoyad: true,
          eposta: true,
        },
      },
    },
  });
  if (!girisim) return { durum: "bulunamadi" };

  // Daha önce işlenmiş: aynı cevabı ver, hiçbir şeye dokunma.
  if (girisim.durum === "basarili") {
    return { durum: "basarili", numara: girisim.order.numara };
  }
  const oncekiBasarisiz = girisim.durum === "basarisiz";
  const kayitliHata = {
    durum: "basarisiz" as const,
    numara: girisim.order.numara,
    hata: girisim.hata ?? "Ödeme tamamlanamadı.",
  };

  const sonuc = await odemeSorgula(jeton);

  // Başarısız sayılmış girişimin dönüşü yeniden geldiyse iyzico'ya bir kez
  // daha soruluyor: süre dolduğu için kapatılan ödeme sonradan tamamlanmış
  // olabilir (K-165). Hâlâ ödenmemişse kayıtlı sonuç, hiçbir şeye dokunulmadan.
  if (oncekiBasarisiz && !sonuc.basarili) return kayitliHata;

  // Tutar tutmuyorsa ödeme başarılı sayılmıyor: eksik çekilmiş bir ödemeyle
  // sipariş hazırlanmaya başlamamalı. Elle bakmak için günlüğe yazılıyor.
  // Taksitte vade farkı müşteriye yansıtılıyorsa çekilen tutar toplamdan
  // büyük; o fazla kabul (K-110). Eskiden reddediliyordu: para karttan
  // çekilmiş, sipariş iptal edilmiş oluyordu.
  // Karttan beklenen, hediye çeki düşüldükten sonraki kısım (K-137).
  const beklenen = tahsilat(girisim.order);
  const tutarTutuyor = odemeTutariTutuyor(sonuc.odenenKurus, beklenen, sonuc.taksit);
  if (sonuc.basarili && !tutarTutuyor) {
    console.error(
      `Ödeme tutarı siparişle uyuşmuyor: ${girisim.order.numara} bekleniyordu ${beklenen}, geldi ${sonuc.odenenKurus}`,
    );
  }

  const basarili = sonuc.basarili && tutarTutuyor;
  const hata = basarili
    ? null
    : (sonuc.hata ?? (tutarTutuyor ? "Ödeme onaylanmadı." : "Ödeme tutarı siparişle uyuşmadı."));

  // iyzico'ya ulaşılamadıysa girişim olduğu gibi kalıyor: ödeme belki
  // alındı, sonuç bilinmeden sipariş iptal edilmemeli. Bir sonraki dönüş ya
  // da temizlik yeniden soruyor (K-165).
  if (sonuc.ulasilamadi) return { durum: "belirsiz", numara: girisim.order.numara };

  // Girişim yalnızca "baslatildi" durumundaysa işleniyor. iyzico dönüşü ile
  // tarayıcının dönüşü aynı anda gelirse ikisi de yukarıdaki okumada
  // "baslatildi" görüyordu: sipariş iki kez işleniyor, iki onay e-postası
  // gidiyordu (K-165). Koşullu güncellemeyi yalnızca biri kazanıyor.
  const kazanan = await db.payment.updateMany({
    where: { id: girisim.id, durum: girisim.durum },
    data: {
      durum: basarili ? "basarili" : "basarisiz",
      saglayiciRef: sonuc.saglayiciRef ?? null,
      taksit: sonuc.taksit,
      odenenKurus: sonuc.basarili ? sonuc.odenenKurus : null,
      komisyonKurus: sonuc.basarili ? (sonuc.komisyonKurus ?? null) : null,
      hata,
      hamYanit: sonuc.ham || null,
    },
  });
  if (kazanan.count === 0) {
    const son = await db.payment.findUnique({
      where: { id: girisim.id },
      select: { durum: true, hata: true },
    });
    return son?.durum === "basarili"
      ? { durum: "basarili", numara: girisim.order.numara }
      : {
          durum: "basarisiz",
          numara: girisim.order.numara,
          hata: son?.hata ?? "Ödeme tamamlanamadı.",
        };
  }

  if (!basarili) {
    // Tutarı tutmayan geç ödemede sipariş zaten iptal; iptal ikinci kez işlemez.
    await siparisiIptalEtVeStoguIadeEt(girisim.order.id);
    // iyzico "ödendi" dediği hâlde tutar tutmadıysa para karttan çekilmiş
    // demek (K-167): sipariş iptal ediliyordu ama çekilen paranın hiçbir
    // kaydı kalmıyordu. İade kaydı açılıyor, panelin listesine düşüyor.
    if (sonuc.basarili && sonuc.odenenKurus > 0) {
      await parasiAlinanIptalinIadesi(
        girisim.order.id,
        sonuc.odenenKurus,
        "iyzico ödemeyi onayladı ama çekilen tutar siparişle uyuşmadı; sipariş iptal edildi. Tutar karta iade edilmeli.",
      );
    }
    return {
      durum: "basarisiz",
      numara: girisim.order.numara,
      hata: hata ?? "Ödeme tamamlanamadı.",
    };
  }

  // Sipariş bu arada iptal edilmiş olabilir: süresi dolduğu için ya da
  // panelden. Stok geri verilmişti; siparişi "ödendi"ye çevirmek stoksuz bir
  // siparişi hazırlığa sokardı. Para alındığı için iade kaydı açılıyor ve
  // panelin "iade bekleyenler" listesine düşüyor (K-165).
  const odendi = await db.order.updateMany({
    where: { id: girisim.order.id, durum: { not: "iptal" }, odemeDurumu: "bekliyor" },
    data: { odemeDurumu: "odendi", durum: "hazirlaniyor" },
  });
  if (odendi.count === 0) {
    const guncel = await db.order.findUnique({
      where: { id: girisim.order.id },
      select: { durum: true },
    });
    // Sipariş iptal değilse zaten ödenmiş (K-167): müşteri ödemeyi yeniden
    // başlatıp eski sekmede de tamamladıysa iki kez para çekilmiş olur. Başka
    // bir başarılı girişim varsa bu ikinci ödeme iade kaydına giriyor;
    // yoksa sipariş panelden elle "ödendi" yapılmış, aynı ödeme.
    if (guncel && guncel.durum !== "iptal") {
      const baska = await db.payment.count({
        where: { orderId: girisim.order.id, durum: "basarili", id: { not: girisim.id } },
      });
      if (baska > 0) {
        console.error(`Çift ödeme: ${girisim.order.numara}`);
        await db.refund.create({
          data: {
            orderId: girisim.order.id,
            tutarKurus: sonuc.odenenKurus,
            hediyeCekiKurus: 0,
            yontem: "kart",
            aciklama:
              "Çift ödeme: sipariş başka bir ödemeyle zaten ödenmişti. Bu ikinci tutar karta iade edilmeli.",
          },
        });
      }
      return { durum: "basarili", numara: girisim.order.numara };
    }
    console.error(`İptal edilmiş siparişin ödemesi alındı, iade gerekiyor: ${girisim.order.numara}`);
    await parasiAlinanIptalinIadesi(
      girisim.order.id,
      sonuc.odenenKurus,
      "Ödeme, sipariş iptal edildikten sonra tamamlandı (ödeme süresi dolmuştu). Tutar karta iade edilmeli.",
    );
    return {
      durum: "basarisiz",
      numara: girisim.order.numara,
      hata: "Ödemen sipariş süresi dolduktan sonra tamamlandı; sipariş iptal edilmişti. Çekilen tutar kartına iade edilecek.",
    };
  }

  // Kartta onay e-postası burada gidiyor: ödeme belli olmadan "siparişin
  // alındı" demek, tutmayan ödemede yanlış bilgi vermek olurdu. Girişimi
  // yalnızca bir dönüş kazanabildiği için e-posta bir kez gidiyor.
  await odemeAlindiEpostasi({
    numara: girisim.order.numara,
    adSoyad: girisim.order.adSoyad,
    eposta: girisim.order.eposta,
    toplamKurus: girisim.order.toplamKurus,
    hediyeCekiKurus: girisim.order.hediyeCekiKurus,
    odemeYontemi: "kart",
  });

  return { durum: "basarili", numara: girisim.order.numara };
}

/**
 * İptal edilmiş siparişe karttan çekilmiş para için iade kaydı (K-165, K-167).
 * Tutar doğrudan iyzico'nun çektiği tutar; çek kısmı iptalde zaten bakiyeye
 * dönmüştü.
 */
async function parasiAlinanIptalinIadesi(
  orderId: string,
  tutarKurus: number,
  aciklama: string,
): Promise<void> {
  await db.$transaction([
    db.refund.create({
      data: { orderId, tutarKurus, hediyeCekiKurus: 0, yontem: "kart", aciklama },
    }),
    db.order.update({ where: { id: orderId }, data: { odemeDurumu: "iade-bekliyor" } }),
  ]);
}

/**
 * Süresi geçen kart siparişini sonuçlandırır (K-165).
 *
 * Eskiden iyzico'ya sorulmadan iptal ediliyordu. 3D doğrulamada oyalanan
 * müşterinin ödemesi süre dolduktan sonra tamamlanınca para alınmış, sipariş
 * iptal edilmiş ve stok başkasına açılmış oluyordu. Artık her açık girişim
 * önce iyzico'ya soruluyor: ödendiyse sipariş ödeniyor, ödenmediyse iptal.
 * iyzico'ya ulaşılamazsa dokunulmuyor, bir sonraki temizlik yeniden soruyor.
 * Hiç girişimi olmayan (ödeme ekranı açılamamış) sipariş doğrudan iptal.
 *
 * Dönen değer: sipariş kapandı mı (ödendi ya da iptal edildi).
 */
export async function kartSiparisiniSonuclandir(orderId: string): Promise<boolean> {
  const girisimler = await db.payment.findMany({
    where: { orderId, durum: "baslatildi" },
    select: { jeton: true, olusturuldu: true },
    orderBy: { olusturuldu: "desc" },
  });
  // Müşteri ödemeyi yeniden başlattıysa (K-167) son girişimin süresi
  // dolmadan sipariş kapatılmıyor: ödeme ekranındayken iptal edilmesin.
  if (girisimler[0] && Date.now() - girisimler[0].olusturuldu.getTime() < KART_GIRISIM_MS) {
    return false;
  }
  if (girisimler.length === 0) {
    const onceki = await db.payment.count({ where: { orderId, durum: "basarili" } });
    if (onceki > 0) return false;
    await siparisiIptalEtVeStoguIadeEt(orderId);
    return true;
  }
  let kapandi = false;
  for (const g of girisimler) {
    const sonuc = await odemeDonusunuIsle(g.jeton);
    if (sonuc.durum === "basarili") return true;
    const kayit = await db.order.findUnique({ where: { id: orderId }, select: { durum: true } });
    if (kayit?.durum === "iptal") kapandi = true;
  }
  return kapandi;
}

/**
 * Yarıda kalan kart ödemelerini temizler.
 *
 * Müşteri ödeme ekranını kapatırsa dönüş çağrısı hiç gelmiyor ve sipariş
 * "ödeme bekliyor" durumunda kalıyor — stoğu da tutmaya devam ediyor. Son
 * adet bedenler bebek ürünlerinde sık olduğu için bu stok başka müşteriye
 * açılmalı. Zamanlı iş bunu yapıyor (app/api/cron).
 */
export async function suresiGecenOdemeleriTemizle(dakika = 30): Promise<number> {
  const sinir = new Date(Date.now() - dakika * 60 * 1000);

  const girisimler = await db.payment.findMany({
    where: {
      durum: "baslatildi",
      olusturuldu: { lt: sinir },
      order: { durum: "bekliyor", odemeDurumu: "bekliyor" },
    },
    select: { id: true, orderId: true },
  });

  let kapanan = 0;
  for (const orderId of new Set(girisimler.map((g) => g.orderId))) {
    if (await kartSiparisiniSonuclandir(orderId)) kapanan++;
  }
  return kapanan;
}
