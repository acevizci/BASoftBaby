import { NextResponse } from "next/server";
import { girisYapan } from "@/server/uyelik";
import { kisiselVeriyiTopla } from "@/server/kisisel-veri";

/**
 * Kişisel verilerin JSON dosyası olarak indirilmesi (KVKK erişim hakkı).
 *
 * JSON seçildi çünkü eksiksiz: PDF'te tablolar kırpılır, CSV'de iç içe
 * yapılar (siparişin satırları) düzleşir. Dosya insan tarafından da
 * okunabilir olsun diye girintili yazılıyor.
 *
 * Kimlik oturumdan; başka kimsenin verisine erişim yok.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const musteri = await girisYapan();
  if (!musteri) {
    return NextResponse.json({ hata: "Giriş gerekli." }, { status: 401 });
  }

  const veri = await kisiselVeriyiTopla(musteri.id);
  const gun = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(veri, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="basoftbaby-verilerim-${gun}.json"`,
      "cache-control": "no-store",
    },
  });
}
