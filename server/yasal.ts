import "server-only";
import { db } from "@/server/veritabani";

/**
 * Yasal metinler ve satıcı künyesi.
 *
 * Metinler koda gömülü değil, veritabanında duruyor ve panelden düzenleniyor:
 * avukattan gelen metin yayın beklemeden yapıştırılabilsin (K-15). Taslak
 * işareti kalktığında sayfadaki uyarı da kalkıyor.
 *
 * Künye (unvan, vergi, MERSİS, ETBİS, adres) mesafeli satışta sitede
 * görünmesi zorunlu bilgiler. Şirket kurulana kadar alanlar boş; boş alan
 * ekrana hiç basılmıyor, yarım künye görünmesin diye.
 */

export type YasalSayfa = {
  slug: string;
  baslik: string;
  ozet: string;
  icerik: string;
  taslakMi: boolean;
  guncellendi: Date;
};

export type YasalBaslik = {
  slug: string;
  baslik: string;
  taslakMi: boolean;
};

export type Kunye = {
  unvan: string;
  vergiDairesi: string;
  vergiNo: string;
  mersisNo: string;
  etbisNo: string;
  sirketAdresi: string;
  destekTelefon: string;
  destekEposta: string;
  /** Künyede tek bir dolu alan bile yoksa ekranda hiç gösterilmiyor. */
  bosMu: boolean;
};

export async function yasalSayfalariGetir(): Promise<YasalBaslik[]> {
  return db.legalPage.findMany({
    orderBy: { sira: "asc" },
    select: { slug: true, baslik: true, taslakMi: true },
  });
}

export async function yasalSayfaGetir(slug: string): Promise<YasalSayfa | undefined> {
  const kayit = await db.legalPage.findUnique({
    where: { slug },
    select: {
      slug: true,
      baslik: true,
      ozet: true,
      icerik: true,
      taslakMi: true,
      guncellendi: true,
    },
  });
  return kayit ?? undefined;
}

export async function kunyeGetir(): Promise<Kunye> {
  const ayar = await db.storeSetting.findUnique({
    where: { id: "tek" },
    select: {
      unvan: true,
      vergiDairesi: true,
      vergiNo: true,
      mersisNo: true,
      etbisNo: true,
      sirketAdresi: true,
      destekTelefon: true,
      destekEposta: true,
    },
  });

  const kunye = {
    unvan: ayar?.unvan ?? "",
    vergiDairesi: ayar?.vergiDairesi ?? "",
    vergiNo: ayar?.vergiNo ?? "",
    mersisNo: ayar?.mersisNo ?? "",
    etbisNo: ayar?.etbisNo ?? "",
    sirketAdresi: ayar?.sirketAdresi ?? "",
    destekTelefon: ayar?.destekTelefon ?? "",
    destekEposta: ayar?.destekEposta ?? "",
  };

  return { ...kunye, bosMu: Object.values(kunye).every((d) => d === "") };
}
