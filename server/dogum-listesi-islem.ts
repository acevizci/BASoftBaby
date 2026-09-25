"use server";

/** Doğum listesi eylemleri (K-144). */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/veritabani";
import { girisYapan } from "@/server/uyelik";
import { sepetIdAlVeyaKur } from "@/server/sepet";
import { listeKoduUret } from "@/server/dogum-listesi";

const SAYFA = "/hesabim/dogum-listesi";
const EN_FAZLA = 20;

function metin(form: FormData, ad: string, uzunluk: number): string {
  return String(form.get(ad) ?? "")
    .trim()
    .slice(0, uzunluk);
}

/** Müşterinin listesi; yoksa varsayılan adlarla açılıyor. */
async function listeAlVeyaAc(customerId: string, adSoyad: string): Promise<string> {
  const var_ = await db.giftList.findUnique({ where: { customerId }, select: { id: true } });
  if (var_) return var_.id;
  for (let deneme = 0; deneme < 5; deneme++) {
    try {
      const yeni = await db.giftList.create({
        data: {
          customerId,
          kod: listeKoduUret(),
          baslik: "Doğum listemiz",
          sahipAdi: adSoyad.split(" ")[0] || adSoyad,
        },
        select: { id: true },
      });
      return yeni.id;
    } catch (hata) {
      // Kod çakışması (çok düşük olasılık) ya da aynı anda iki istek.
      const sonra = await db.giftList.findUnique({ where: { customerId }, select: { id: true } });
      if (sonra) return sonra.id;
      if (deneme === 4) throw hata;
    }
  }
  throw new Error("Liste açılamadı");
}

/** Ürün sayfasından: seçili beden-renk listeye. Üye değilse girişe. */
export async function listeyeEkle(form: FormData): Promise<void> {
  const variantId = String(form.get("variantId") ?? "");
  const slug = String(form.get("slug") ?? "");
  const musteri = await girisYapan();
  if (!musteri) {
    redirect(`/giris?nereye=${encodeURIComponent(slug ? `/urun/${slug}` : SAYFA)}`);
  }
  const varyant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true },
  });
  if (!varyant) redirect(SAYFA);

  const listId = await listeAlVeyaAc(musteri.id, musteri.adSoyad);
  await db.giftListItem.upsert({
    where: { listId_variantId: { listId, variantId } },
    update: {},
    create: { listId, variantId, istenen: 1 },
  });
  revalidatePath(SAYFA);
  redirect(`${SAYFA}?eklendi=1`);
}

export async function listeKaydet(form: FormData): Promise<void> {
  const musteri = await girisYapan();
  if (!musteri) redirect(`/giris?nereye=${SAYFA}`);
  const baslik = metin(form, "baslik", 80) || "Doğum listemiz";
  const sahipAdi = metin(form, "sahipAdi", 60) || musteri.adSoyad.split(" ")[0];
  const mesaj = metin(form, "mesaj", 600);
  const tarihHam = metin(form, "tarih", 10);
  const tarih = /^\d{4}-\d{2}-\d{2}$/.test(tarihHam)
    ? new Date(`${tarihHam}T12:00:00+03:00`)
    : null;
  const acik = form.get("acik") !== null;
  // Hediyelerin gönderileceği adres (K-149): yalnızca kendi kayıtlı adresi.
  const adresHam = metin(form, "adresId", 40);
  const adres = adresHam
    ? await db.address.findFirst({
        where: { id: adresHam, customerId: musteri.id },
        select: { id: true },
      })
    : null;

  const listId = await listeAlVeyaAc(musteri.id, musteri.adSoyad);
  await db.giftList.update({
    where: { id: listId },
    data: { baslik, sahipAdi, mesaj, tarih, acik, adresId: adres?.id ?? null },
  });
  revalidatePath(SAYFA);
  redirect(`${SAYFA}?kayit=1`);
}

/** Kalem sahibin listesinde mi; değilse hiçbir şey yapılmıyor. */
async function sahibinKalemi(kalemId: string) {
  const musteri = await girisYapan();
  if (!musteri) redirect(`/giris?nereye=${SAYFA}`);
  const kalem = await db.giftListItem.findFirst({
    where: { id: kalemId, list: { customerId: musteri.id } },
    select: { id: true },
  });
  return kalem;
}

export async function kalemAdedi(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  const istenen = Math.max(
    1,
    Math.min(EN_FAZLA, Math.floor(Number(form.get("istenen") ?? 1)) || 1),
  );
  if (await sahibinKalemi(id)) {
    // Alınandan aza inmiyor: alınmış hediye listeden düşmesin.
    await db.$executeRaw`update "GiftListItem" set istenen = greatest(${istenen}::int, alinan) where id = ${id}`;
  }
  revalidatePath(SAYFA);
  redirect(SAYFA);
}

export async function kalemSil(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  if (await sahibinKalemi(id)) {
    // Alınmış kalem silinmiyor, istenen alınana indiriliyor: siparişlerle bağı
    // kopsa "Gelen hediyeler"den düşer, bekleyen haber de gitmezdi.
    const kalem = await db.giftListItem.findUnique({ where: { id }, select: { alinan: true } });
    if (kalem && kalem.alinan > 0) {
      await db.giftListItem.update({ where: { id }, data: { istenen: kalem.alinan } });
    } else {
      await db.giftListItem.delete({ where: { id } });
    }
  }
  revalidatePath(SAYFA);
  redirect(SAYFA);
}

/**
 * Paylaşılan sayfadan: kalemi hediye edenin sepetine koyar, kalemle
 * bağlantısıyla. Kalan adetten ve stoktan fazlası eklenmiyor.
 */
export async function listedenSepete(form: FormData): Promise<void> {
  const kalemId = String(form.get("kalemId") ?? "");
  const kod = String(form.get("kod") ?? "");
  const geri = `/liste/${encodeURIComponent(kod)}`;
  const kalem = await db.giftListItem.findUnique({
    where: { id: kalemId },
    select: {
      istenen: true,
      alinan: true,
      variantId: true,
      list: { select: { kod: true, acik: true } },
      variant: { select: { stok: true, product: { select: { aktif: true } } } },
    },
  });
  if (!kalem || kalem.list.kod !== kod || !kalem.list.acik) redirect(geri);
  const kalan = kalem.istenen - kalem.alinan;
  if (kalan <= 0 || kalem.variant.stok <= 0 || !kalem.variant.product.aktif)
    redirect(`${geri}?durum=yok`);

  const cartId = await sepetIdAlVeyaKur();
  const mevcut = await db.cartItem.findUnique({
    where: { cartId_variantId: { cartId, variantId: kalem.variantId } },
    select: { adet: true },
  });
  const adet = Math.min(kalan, kalem.variant.stok, EN_FAZLA, (mevcut?.adet ?? 0) + 1);
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId: kalem.variantId } },
    update: { adet, giftListItemId: kalemId },
    create: { cartId, variantId: kalem.variantId, adet, giftListItemId: kalemId },
  });
  revalidatePath("/", "layout");
  redirect("/sepet");
}
