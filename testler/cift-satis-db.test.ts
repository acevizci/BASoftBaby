import { atlamaSebebi, kimlik, ON_EK, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { siparisOlustur, type SiparisGirdisi } from "@/server/siparis";
import { iadeKaydiAc, iadeyiTamamla } from "@/server/iade";
import { siparisiIptalEtVeStoguIadeEt } from "@/server/odeme-akis";
import { KUPON_CEREZI } from "@/server/kampanya";
import { cerezAyarla, cerezleriTemizle } from "./sahte-headers";
import { listeKoduUret } from "@/server/dogum-listesi";
import type { SatisAyari } from "@/server/sepet";

/** Çift satış ve çift işlem önlemleri (K-166). */

const AYAR: SatisAyari = {
  kargoKurus: 0,
  bedavaKargoEsigi: 0,
  havaleBilgisi: "Test",
  havaleSaat: 72,
  havaleHatirlatmaSaat: 24,
  kdvOrani: 10,
  varsayilanTasiyici: "yurtici",
};

const girdi = (ek: Partial<SiparisGirdisi> = {}): SiparisGirdisi => ({
  adSoyad: "Test Kişi",
  eposta: `${ON_EK}${kimlik("m").toLowerCase()}@deneme.test`,
  telefon: "05001112233",
  adres: "Deneme Mahallesi No 1",
  ilce: "Kadıköy",
  il: "İstanbul",
  postaKodu: "34000",
  not: "",
  hediyePaketi: false,
  hediyeNotu: "",
  sozlesmeOnayi: new Date(),
  ...ek,
});

describe("çift satış (veritabanı)", { skip: atlamaSebebi }, () => {
  before(temizle);
  after(temizle);

  it("aynı sepet aynı anda iki kez gönderilince tek sipariş açılıyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(10);
    await sepetKur(variantId, 2);
    const sonuclar = await Promise.all([
      siparisOlustur(girdi(), AYAR),
      siparisOlustur(girdi(), AYAR),
    ]);
    assert.equal(sonuclar.filter((s) => s.tamam).length, 1);
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v.stok, 8, "stok yalnızca bir kez düşmeli");
  });

  it("aynı form anahtarıyla ikinci sipariş açılmıyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(10);
    const anahtar = crypto.randomUUID();
    await sepetKur(variantId, 1);
    const ilk = await siparisOlustur(girdi({ istekAnahtari: anahtar }), AYAR);
    assert.ok(ilk.tamam);
    // Sepet yeniden doldurulmuş olsa bile aynı anahtar ikinci sipariş açmıyor.
    await sepetKur(variantId, 1);
    const ikinci = await siparisOlustur(girdi({ istekAnahtari: anahtar }), AYAR);
    assert.equal(ikinci.tamam, false);
    assert.equal(!ikinci.tamam && ikinci.sebep, "tekrar");
    assert.equal(await db.order.count({ where: { istekAnahtari: anahtar } }), 1);
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v.stok, 9);
  });

  it("sepet okunduktan sonra değiştiyse sipariş açılmıyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(10);
    const cartId = await sepetKur(variantId, 1);
    // Başka sekmede adet değişti: sipariş anındaki okuma ile işlem ayrışıyor.
    const bekleyen = siparisOlustur(girdi(), AYAR);
    await db.cartItem.updateMany({ where: { cartId }, data: { adet: 3 } });
    const s = await bekleyen;
    // Değişiklik okumadan önce ya da sonra düşebilir: iki durumda da tek sipariş
    // ve müşterinin gördüğüyle yazılanın aynı olması yeterli.
    if (s.tamam) {
      const o = await db.order.findUniqueOrThrow({
        where: { numara: s.numara },
        include: { satirlar: true },
      });
      const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
      assert.equal(v.stok, 10 - o.satirlar[0].adet);
    } else {
      assert.equal(s.sebep, "sepet-degisti");
    }
  });

  it("doğum listesindeki son hediye ikinci kez satılmıyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(10);
    const customerId = kimlik("musteri");
    await db.customer.create({
      data: {
        id: customerId,
        adSoyad: "Liste Sahibi",
        eposta: `${customerId.toLowerCase()}@deneme.test`,
        sifreOzeti: "x",
      },
    });
    const liste = await db.giftList.create({
      data: { customerId, kod: listeKoduUret(), baslik: "Liste", sahipAdi: "Ayşe" },
    });
    const kalem = await db.giftListItem.create({
      data: { listId: liste.id, variantId, istenen: 1 },
    });

    const al = async () => {
      const cartId = await sepetKur(variantId, 1);
      await db.cartItem.updateMany({ where: { cartId }, data: { giftListItemId: kalem.id } });
      return siparisOlustur(girdi(), AYAR);
    };
    const ilk = await al();
    assert.ok(ilk.tamam);
    const ikinci = await al();
    assert.equal(ikinci.tamam, false);
    assert.equal(!ikinci.tamam && ikinci.sebep, "liste-alindi");
    const k = await db.giftListItem.findUniqueOrThrow({ where: { id: kalem.id } });
    assert.equal(k.alinan, 1);
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(v.stok, 9, "başarısız siparişin stoğu düşmemeli");
  });

  it("iade iki kez tamamlanmıyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(10);
    await sepetKur(variantId, 1);
    const s = await siparisOlustur(girdi(), AYAR);
    assert.ok(s.tamam);
    const o = await db.order.update({
      where: { numara: s.numara },
      data: { odemeDurumu: "odendi" },
      select: { id: true },
    });
    const id = await iadeKaydiAc(o.id, 5000);
    assert.ok(id);
    const sonuclar = await Promise.all([iadeyiTamamla(id), iadeyiTamamla(id)]);
    assert.equal(sonuclar.filter(Boolean).length, 1);
  });

  it("ödenmeden iptal edilen siparişin tek kullanımlık kuponu geri veriliyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(10);
    const kod = `T${kimlik("k").slice(-8).toUpperCase()}`;
    const kupon = await db.campaign.create({
      data: { ad: "T_kupon", deger: 10, kuponKodu: kod, enFazlaKullanim: 1 },
      select: { id: true },
    });
    try {
      await sepetKur(variantId, 1);
      cerezAyarla(KUPON_CEREZI, kod);
      const s = await siparisOlustur(girdi(), AYAR);
      cerezleriTemizle();
      assert.ok(s.tamam);
      const o = await db.order.findUniqueOrThrow({ where: { numara: s.numara } });
      assert.equal(o.kampanyaId, kupon.id);
      assert.equal((await db.campaign.findUniqueOrThrow({ where: { id: kupon.id } })).kullanim, 1);
      await siparisiIptalEtVeStoguIadeEt(o.id);
      assert.equal((await db.campaign.findUniqueOrThrow({ where: { id: kupon.id } })).kullanim, 0);
    } finally {
      await db.order.deleteMany({ where: { kampanyaId: kupon.id } });
      await db.campaign.delete({ where: { id: kupon.id } });
    }
  });

  it("çift ödemenin iadesi ödenmiş siparişi 'iade edildi' yapmıyor", async () => {
    const db = testDb();
    const { variantId } = await urunKur(10);
    await sepetKur(variantId, 1);
    const s = await siparisOlustur(girdi(), AYAR);
    assert.ok(s.tamam);
    const o = await db.order.update({
      where: { numara: s.numara },
      data: { odemeDurumu: "odendi" },
      select: { id: true },
    });
    const iade = await db.refund.create({
      data: { orderId: o.id, tutarKurus: 1000, yontem: "kart", aciklama: "Çift ödeme" },
    });
    await iadeyiTamamla(iade.id);
    const son = await db.order.findUniqueOrThrow({ where: { id: o.id } });
    assert.equal(son.odemeDurumu, "odendi");
  });
});
