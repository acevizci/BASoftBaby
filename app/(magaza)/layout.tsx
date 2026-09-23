import DuyuruSeridi from "@/ui/duyuru-seridi";
import UstCubuk from "@/ui/ust-cubuk";
import AltBilgi from "@/ui/alt-bilgi";
import { FavoriSaglayici } from "@/ui/favori";
import { favoriIdleri } from "@/server/favori";

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
export default async function MagazaDuzeni({ children }: LayoutProps<"/">) {
  // Favoriler bir kez okunup bütün kartlara dağılıyor (K-94). Üst çubuk zaten
  // her sayfada oturumu okuduğu için bu sayfayı dinamikleştirmiyor.
  const favoriler = await favoriIdleri();
  return (
    <FavoriSaglayici ilk={favoriler}>
      <DuyuruSeridi />
      <UstCubuk />
      <main className="flex-1">{children}</main>
      <AltBilgi />
    </FavoriSaglayici>
  );
}
