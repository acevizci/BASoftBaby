import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { odemeDonusunuIsle } from "@/server/odeme-akis";
import { sepetiSiparistenDoldur } from "@/server/odeme-akis";
import { sepetIdOku } from "@/server/sepet";

/**
 * iyzico ödeme ekranından dönüş.
 *
 * iyzico müşteriyi buraya bir POST ile geri gönderiyor ve gövdede yalnızca
 * jeton taşıyor. **Gövdedeki hiçbir bilgiye güvenilmiyor:** ödemenin durumu
 * ve tutarı iyzico'ya ayrıca sorulup cevabın imzası doğrulanıyor
 * (server/odeme.ts).
 *
 * Aynı dönüşün iki kez gelmesi sorun değil: girişim kaydı jetonla tekil ve
 * işlenmiş bir kayıt ikinci çağrıda değiştirilmiyor (K-06).
 *
 * Sonunda müşteri onay sayfasına yönlendiriliyor; sipariş numarası zaten
 * tarayıcısındaki çerezde, yani sayfa yalnızca ona açılıyor. Yönlendirme
 * **göreli** adresle yapılıyor: mutlak adres kurulsaydı istek hangi ana makine
 * adıyla geldiyse ona değil, yapılandırmadaki adrese gidilir; çerezler ana
 * makineye bağlı olduğu için müşteri kendi siparişini göremez hâle gelirdi.
 */
/** 303: tarayıcı POST'u tekrarlamasın, sayfayı GET ile açsın. */
function yonlendir(adres: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: adres } });
}

async function donusuIsle(jeton: string): Promise<NextResponse> {
  const sonuc = await odemeDonusunuIsle(jeton);
  revalidatePath("/", "layout");

  if (sonuc.durum === "bulunamadi") return yonlendir("/sepet?hata=odeme");

  if (sonuc.durum === "basarisiz") {
    // Sipariş iptal olduğu için sepet boşalmıştı; ürünler geri konuyor ki
    // müşteri baştan seçmek zorunda kalmadan tekrar deneyebilsin.
    await sepetiSiparistenDoldur(await sepetIdOku(), sonuc.numara);
    return yonlendir(`/siparis/${sonuc.numara}?odeme=basarisiz`);
  }

  return yonlendir(`/siparis/${sonuc.numara}?odeme=basarili`);
}

export async function POST(istek: NextRequest) {
  const govde = await istek.formData().catch(() => null);
  return donusuIsle(String(govde?.get("token") ?? ""));
}

/** iyzico bazı durumlarda GET ile dönüyor; akış aynı. */
export async function GET(istek: NextRequest) {
  return donusuIsle(istek.nextUrl.searchParams.get("token") ?? "");
}
