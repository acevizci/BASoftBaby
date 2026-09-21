import "server-only";

/**
 * Sipariş belgelerinin (kargo etiketi, fatura) basılabilir olup olmadığı.
 *
 * **Ödemesi tamamlanmamış siparişe belge basılmıyor.** İkisinin de sebebi
 * ayrı ve ikisi de ciddi (K-54):
 *
 * - **Kargo etiketi basmak "gönderiyorum" demek.** Havalesi gelmemiş bir
 *   siparişi kargoya vermek, parayı hiç almamak demek. Mağazanın en pahalı
 *   hatası bu olurdu ve yapması bir tıklama kadar kolaydı.
 * - **Fatura satışın belgesi.** Ödenmemiş bir siparişe fatura kesmek,
 *   olmamış bir satışı belgelemek; muhasebede düzeltmesi zahmetli.
 *
 * İptal edilmiş siparişe de basılmıyor — orada zaten satış yok.
 *
 * Kural tek yerde: sipariş ayrıntısındaki bağlantılar, tek etiket sayfası,
 * toplu etiket sayfası ve fatura sayfası hep buraya soruyor. Görünmeyen
 * bağlantı koruma değildir; sayfaların kendisi de kontrol ediyor.
 */

export type BelgeDurumu =
  | { basilabilir: true }
  | { basilabilir: false; sebep: string };

export function belgeBasilabilirMi(siparis: {
  odemeDurumu: string;
  durum: string;
}): BelgeDurumu {
  if (siparis.durum === "iptal") {
    return { basilabilir: false, sebep: "Sipariş iptal edilmiş." };
  }
  if (siparis.odemeDurumu !== "odendi") {
    return {
      basilabilir: false,
      sebep:
        "Siparişin ödemesi tamamlanmadı. Havale geldiyse sipariş ekranından ödeme durumunu “Ödendi” yap; belgeler o zaman basılabilir.",
    };
  }
  return { basilabilir: true };
}
