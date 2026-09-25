import { atlamaSebebi, kimlik, sepetKur, temizle, testDb, urunKur } from "./veritabani";
import { cerezAyarla, cerezleriTemizle } from "./sahte-headers";
import { kodUret } from "@/server/hediye-ceki-bicim";
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { siparisOlustur } from "@/server/siparis";
import { siparisiIptalEtVeStoguIadeEt } from "@/server/odeme-akis";
import { siparisleriSil } from "@/server/siparis-silme";
import { HEDIYE_CEKI_CEREZI } from "@/server/hediye-ceki";
import { listeKoduUret } from "@/server/dogum-listesi";
import type { SatisAyari } from "@/server/sepet";

/** Deneme siparişlerini silme (K-163): yan etkiler geri alınıyor. */

const AYAR: SatisAyari = {
  kargoKurus: 4990,
  bedavaKargoEsigi: 50000,
  havaleBilgisi: "Test Bankası TR00",
  havaleSaat: 72,
  havaleHatirlatmaSaat: 24,
  kdvOrani: 10,
  varsayilanTasiyici: "yurtici",
};
const ON_EK = "t_silme_";
const musteriler: string[] = [];
const cekler: string[] = [];

const girdi = () => ({
  adSoyad: "Deneme Alıcı",
  eposta: `${ON_EK}${kimlik("e").toLowerCase()}@deneme.test`,
  telefon: "05001112233",
  adres: "Deneme Mahallesi Deneme Sokak No 1",
  ilce: "Kadıköy",
  il: "İstanbul",
  postaKodu: "34000",
  not: "",
  hediyePaketi: false,
  hediyeNotu: "",
  sozlesmeOnayi: new Date(),
});

const stok = async (id: string) =>
  (await testDb().productVariant.findUniqueOrThrow({ where: { id } })).stok;

describe("deneme siparişlerini silme (veritabanı)", { skip: atlamaSebebi }, () => {
  after(async () => {
    await testDb().order.deleteMany({ where: { eposta: { startsWith: ON_EK } } });
    await testDb().giftCard.deleteMany({ where: { id: { in: cekler } } });
    await testDb().customer.deleteMany({ where: { id: { in: musteriler } } });
    await temizle();
  });

  it("stok, doğum listesi ve hediye çeki geri dönüyor; sipariş ve hareketleri gidiyor", async () => {
    const { variantId } = await urunKur(5);
    const customerId = kimlik("musteri");
    musteriler.push(customerId);
    await testDb().customer.create({
      data: {
        id: customerId,
        eposta: `${ON_EK}${customerId.toLowerCase()}@deneme.test`,
        adSoyad: "Sahip",
        sifreOzeti: "x",
      },
    });
    const liste = await testDb().giftList.create({
      data: { customerId, kod: listeKoduUret(), baslik: "Liste", sahipAdi: "Ayşe" },
    });
    const kalem = await testDb().giftListItem.create({
      data: { listId: liste.id, variantId, istenen: 3 },
    });
    const cekId = kimlik("cek");
    cekler.push(cekId);
    const kod = kodUret();
    await testDb().giftCard.create({
      data: { id: cekId, kod, tutarKurus: 5000, bakiyeKurus: 5000 },
    });

    const cartId = await sepetKur(variantId, 2);
    await testDb().cartItem.updateMany({ where: { cartId }, data: { giftListItemId: kalem.id } });
    cerezAyarla(HEDIYE_CEKI_CEREZI, kod);
    const s = await siparisOlustur(girdi(), AYAR);
    assert.ok(s.tamam);
    cerezleriTemizle();

    assert.equal(await stok(variantId), 3);
    assert.equal(
      (await testDb().giftListItem.findUniqueOrThrow({ where: { id: kalem.id } })).alinan,
      2,
    );
    assert.equal(
      (await testDb().giftCard.findUniqueOrThrow({ where: { id: cekId } })).bakiyeKurus,
      0,
    );

    const sonuc = await siparisleriSil([s.numara, "BA-1999-9999"]);
    assert.deepEqual(sonuc.silinen, [s.numara]);
    assert.deepEqual(sonuc.bulunamayan, ["BA-1999-9999"]);

    assert.equal(await stok(variantId), 5);
    assert.equal(
      (await testDb().giftListItem.findUniqueOrThrow({ where: { id: kalem.id } })).alinan,
      0,
    );
    assert.equal(
      (await testDb().giftCard.findUniqueOrThrow({ where: { id: cekId } })).bakiyeKurus,
      5000,
    );
    assert.equal(await testDb().order.count({ where: { numara: s.numara } }), 0);
    assert.equal(await testDb().stockMovement.count({ where: { siparisNo: s.numara } }), 0);
    assert.equal(await testDb().giftCardUse.count({ where: { siparisNo: s.numara } }), 0);

    // Sayaç kalan en büyük numarada.
    const kalan = await testDb().order.findMany({ select: { numara: true } });
    const enBuyuk = kalan.reduce((m, o) => Math.max(m, Number(o.numara.split("-").pop())), 0);
    const ayar = await testDb().storeSetting.findUniqueOrThrow({ where: { id: "tek" } });
    assert.equal(ayar.sonSiparisNo, enBuyuk);
  });

  it("iptal edilmiş sipariş silinince stok ikinci kez eklenmiyor", async () => {
    const { variantId } = await urunKur(4);
    await sepetKur(variantId, 1);
    const s = await siparisOlustur(girdi(), AYAR);
    assert.ok(s.tamam);
    const o = await testDb().order.findUniqueOrThrow({ where: { numara: s.numara } });
    await siparisiIptalEtVeStoguIadeEt(o.id);
    assert.equal(await stok(variantId), 4);
    await siparisleriSil([s.numara]);
    assert.equal(await stok(variantId), 4);
  });
});
