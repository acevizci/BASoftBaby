/**
 * Boş yükleme şablonu (.xlsx).
 *
 * Sütun adlarını elle yazmak hata kaynağı; şablon indirilip doldurulunca
 * başlıklar zaten doğru oluyor. İki örnek satır var: aynı ürünün iki bedeni,
 * yani "aynı ad = tek ürün" kuralı örnekten anlaşılıyor.
 *
 * **Oturum kontrolünü kendi yapıyor.** Route handler'lar düzenden geçmiyor,
 * yani `(panel)/layout.tsx`'teki kontrol buraya uğramıyor (K-45).
 */
import ExcelJS from "exceljs";
import { yoneticiGerekli } from "@/server/yonetim-kimlik";
import { renkSecenekleri } from "@/server/renkler";
import { bedenAdlari } from "@/server/bedenler";

export const dynamic = "force-dynamic";

const BASLIKLAR = [
  "Ürün adı", "Kategori", "Fiyat", "Eski fiyat", "Alış fiyatı", "Özet", "Açıklama",
  "Kumaş içeriği", "Yıkama talimatı", "Üretici", "Özellikler",
  "Beden", "Renk", "Stok", "SKU", "Görsel", "Palet", "Aktif",
];

const ORNEKLER = [
  [
    "Organik zıbın", "Zıbın & Body", "249,90", "", "120,00", "Pamuklu, dikişsiz omuzlu zıbın", "",
    "%100 organik pamuk", "30°C'de ters yüz yıkayın", "",
    "Dikişsiz omuz|Çıtçıtlı",
    "0-3 ay", "Nane", "12", "", "zibin", "Nane", "Evet",
  ],
  [
    "Organik zıbın", "Zıbın & Body", "249,90", "", "", "", "", "", "", "", "",
    "3-6 ay", "Nane", "8", "", "", "", "",
  ],
];

export async function GET(): Promise<Response> {
  await yoneticiGerekli();

  const kitap = new ExcelJS.Workbook();
  const sayfa = kitap.addWorksheet("Ürünler");

  sayfa.addRow(BASLIKLAR);
  sayfa.getRow(1).font = { bold: true };
  sayfa.views = [{ state: "frozen", ySplit: 1 }];
  for (const satir of ORNEKLER) sayfa.addRow(satir);

  // Sütun genişlikleri: başlık okunacak kadar, metin sütunları biraz geniş.
  sayfa.columns = BASLIKLAR.map((b) => ({
    width: Math.max(14, Math.min(34, b.length + 8)),
  }));

  const yardim = kitap.addWorksheet("Yardım");
  yardim.columns = [{ width: 22 }, { width: 80 }];
  yardim.addRow(["Sütun", "Açıklama"]).font = { bold: true };
  for (const [ad, aciklama] of [
    ["Ürün adı", "Zorunlu. Aynı adı taşıyan satırlar tek ürün olur."],
    ["Kategori", "Zorunlu. Panelde açık bir kategorinin adı ya da adresi."],
    ["Fiyat", "Yeni üründe zorunlu. 249,90 ya da 249.90 yazılabilir."],
    ["Alış fiyatı", "İsteğe bağlı. Maliyet; mağazada görünmez, satmayan stok raporunda kullanılır."],
    ["Kumaş içeriği", "Yeni üründe zorunlu — bebek tekstilinde yasal."],
    ["Yıkama talimatı", "Yeni üründe zorunlu."],
    ["Özellikler", "Madde madde; aralarına | koyun."],
    ["Beden", (await bedenAdlari()).join(", ")],
    ["Renk", (await renkSecenekleri()).map((r) => r.ad).join(", ")],
    ["Stok", "Zorunlu. Tam sayı."],
    ["SKU", "Boş bırakılırsa kendiliğinden üretilir."],
    ["Aktif", "Evet / Hayır. Boşsa Evet."],
    ["", ""],
    ["Var olan ürün", "Boş bıraktığınız hücre eski değeri silmez, olduğu gibi bırakır."],
    ["Silme", "Bu dosya hiçbir şey silmez; yalnızca ekler ve günceller."],
  ]) {
    yardim.addRow([ad, aciklama]);
  }

  const veri = await kitap.xlsx.writeBuffer();
  return new Response(veri as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="basoftbaby-urun-sablonu.xlsx"',
      "cache-control": "no-store",
    },
  });
}
