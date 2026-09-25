import "server-only";
import { db } from "@/server/veritabani";
import { urunleriSec, type Urun } from "@/server/katalog";
import { ETIKETLER, paylasilanOnbellekli } from "@/server/onbellek";

/**
 * "Birlikte alınanlar" (K-148): bu ürünü içeren siparişlerde başka hangi
 * ürünler vardı. Ödemesi alınmış, iptal edilmemiş son bir yılın siparişleri;
 * ürün, kaç ayrı siparişte birlikte geçtiğine göre sıralanıyor (eşitlikte
 * daha yeni satış önde). Tükenmiş ve pasif ürünler çıkıyor; hiç yoksa şerit
 * görünmüyor. Siparişler saatte bir yenileniyor, yeter.
 */
const birlikteSorgula = paylasilanOnbellekli(
  async function birlikteSorgula(productId: string, adet: number): Promise<Urun[]> {
    const satirlar = await db.$queryRaw<{ productId: string }[]>`
      with siparisler as (
        select distinct i."orderId"
          from "OrderItem" i
          join "ProductVariant" v on v.id = i."variantId"
          join "Order" o on o.id = i."orderId"
         where v."productId" = ${productId}
           and o."odemeDurumu" = 'odendi'
           and o.durum <> 'iptal'
           and o.olusturuldu > now() - interval '365 days'
      )
      select v."productId"
        from "OrderItem" i
        join siparisler s on s."orderId" = i."orderId"
        join "ProductVariant" v on v.id = i."variantId"
        join "Order" o on o.id = i."orderId"
       where v."productId" <> ${productId}
       group by v."productId"
       order by count(distinct i."orderId") desc, max(o.olusturuldu) desc
       limit 24`;
    const urunler = await urunleriSec({ idler: satirlar.map((s) => s.productId) });
    return urunler.filter((u) => u.varyantlar.some((v) => v.stok > 0)).slice(0, adet);
  },
  ["birlikte-alinanlar"],
  [ETIKETLER.katalog],
  3600,
);

export function birlikteAlinanlar(urun: Pick<Urun, "id">, adet = 4): Promise<Urun[]> {
  return birlikteSorgula(urun.id, adet);
}
