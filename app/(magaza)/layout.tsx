import DuyuruSeridi from "@/ui/duyuru-seridi";
import UstCubuk from "@/ui/ust-cubuk";
import AltBilgi from "@/ui/alt-bilgi";

/**
 * Mağaza çerçevesi: duyuru şeridi, üst çubuk ve alt bilgi.
 *
 * Bunlar eskiden kök düzendeydi ve **yönetim panelinin üstünde de**
 * görünüyordu: kategoriler, ürün arama kutusu, sepet sayacı. Sipariş
 * yönetirken hiçbirinin işi yok; telefonda ise panelin içeriği ekranın
 * yarısından sonra başlıyordu. Mağaza sayfaları bu gruba alındı, panel
 * dışarıda kaldı (K-43).
 *
 * Grup adı adrese girmiyor: bütün sayfaların adresi aynı kaldı.
 */
export default function MagazaDuzeni({ children }: LayoutProps<"/">) {
  return (
    <>
      <DuyuruSeridi />
      <UstCubuk />
      <main className="flex-1">{children}</main>
      <AltBilgi />
    </>
  );
}
