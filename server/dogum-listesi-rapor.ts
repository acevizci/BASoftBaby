import "server-only";
import { db } from "@/server/veritabani";

/**
 * Panelde doğum listesi özeti (K-150): kaç liste var, ne kadarı alındı,
 * listeden gelen satış, en çok istenen ürünler ve son listeler.
 *
 * Satış: ödemesi alınmış, iptal edilmemiş siparişlerde listeden gelen
 * satırlar (satır tutarı eksi satıra düşen kampanya payı, kargo hariç).
 */

export type ListeOzeti = {
  liste: number;
  acik: number;
  dolu: number;
  adresli: number;
  istenen: number;
  alinan: number;
  siparis30: number;
  ciro30Kurus: number;
  siparisHepsi: number;
  ciroHepsiKurus: number;
  enCokIstenen: { ad: string; slug: string; istenen: number; alinan: number; liste: number }[];
  sonListeler: {
    kod: string;
    baslik: string;
    sahipAdi: string;
    customerId: string;
    eposta: string;
    olusturuldu: Date;
    tarih: Date | null;
    acik: boolean;
    kalem: number;
    istenen: number;
    alinan: number;
  }[];
};

export async function listeOzeti(simdi: Date = new Date()): Promise<ListeOzeti> {
  const otuzGun = new Date(simdi.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [sayilar, kalemler, satis, enCok, sonlar] = await Promise.all([
    db.$queryRaw<{ liste: number; acik: number; adresli: number }[]>`
      select count(*)::int as liste,
             count(*) filter (where acik)::int as acik,
             count(*) filter (where "adresId" is not null)::int as adresli
        from "GiftList"`,
    db.$queryRaw<{ dolu: number; istenen: number; alinan: number }[]>`
      select count(distinct "listId")::int as dolu,
             coalesce(sum(istenen), 0)::int as istenen,
             coalesce(sum(least(alinan, istenen)), 0)::int as alinan
        from "GiftListItem"`,
    db.$queryRaw<{ son: boolean; siparis: number; ciro: number }[]>`
      select (o.olusturuldu >= ${otuzGun}) as son,
             count(distinct o.id)::int as siparis,
             coalesce(sum(i."fiyatKurus" * i.adet - coalesce(i."indirimKurus", 0)), 0)::int as ciro
        from "OrderItem" i
        join "Order" o on o.id = i."orderId"
       where i."giftListItemId" is not null
         and o."odemeDurumu" = 'odendi'
         and o.durum <> 'iptal'
       group by 1`,
    db.$queryRaw<ListeOzeti["enCokIstenen"]>`
      select p.ad, p.slug,
             sum(k.istenen)::int as istenen,
             sum(least(k.alinan, k.istenen))::int as alinan,
             count(distinct k."listId")::int as liste
        from "GiftListItem" k
        join "ProductVariant" v on v.id = k."variantId"
        join "Product" p on p.id = v."productId"
       group by p.id, p.ad, p.slug
       order by count(distinct k."listId") desc, sum(k.istenen) desc
       limit 10`,
    db.giftList.findMany({
      orderBy: { olusturuldu: "desc" },
      take: 30,
      select: {
        kod: true,
        baslik: true,
        sahipAdi: true,
        customerId: true,
        olusturuldu: true,
        tarih: true,
        acik: true,
        customer: { select: { eposta: true } },
        kalemler: { select: { istenen: true, alinan: true } },
      },
    }),
  ]);

  const son = satis.find((s) => s.son);
  const eski = satis.find((s) => !s.son);
  return {
    liste: sayilar[0]?.liste ?? 0,
    acik: sayilar[0]?.acik ?? 0,
    adresli: sayilar[0]?.adresli ?? 0,
    dolu: kalemler[0]?.dolu ?? 0,
    istenen: kalemler[0]?.istenen ?? 0,
    alinan: kalemler[0]?.alinan ?? 0,
    siparis30: son?.siparis ?? 0,
    ciro30Kurus: son?.ciro ?? 0,
    // Bir sipariş iki gruba birden giremez (tarihi tek), toplam doğru.
    siparisHepsi: (son?.siparis ?? 0) + (eski?.siparis ?? 0),
    ciroHepsiKurus: (son?.ciro ?? 0) + (eski?.ciro ?? 0),
    enCokIstenen: enCok,
    sonListeler: sonlar.map((l) => ({
      kod: l.kod,
      baslik: l.baslik,
      sahipAdi: l.sahipAdi,
      customerId: l.customerId,
      eposta: l.customer.eposta,
      olusturuldu: l.olusturuldu,
      tarih: l.tarih,
      acik: l.acik,
      kalem: l.kalemler.length,
      istenen: l.kalemler.reduce((t, k) => t + k.istenen, 0),
      alinan: l.kalemler.reduce((t, k) => t + Math.min(k.alinan, k.istenen), 0),
    })),
  };
}
