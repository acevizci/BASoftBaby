import DuyuruSeridi from "@/ui/duyuru-seridi";
import UstCubuk from "@/ui/ust-cubuk";
import AltBilgi from "@/ui/alt-bilgi";
import { FavoriSaglayici } from "@/ui/favori";
import { favoriIdleri } from "@/server/favori";
import { kunyeGetir } from "@/server/yasal";
import { whatsappNumarasi } from "@/server/whatsapp";
import WhatsappDugmesi from "@/ui/whatsapp-dugmesi";
import CerezOnayi from "@/ui/cerez-onayi";
import { olcumAyari } from "@/server/olcum";

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
  const [favoriler, kunye, olcum] = await Promise.all([
    favoriIdleri(),
    kunyeGetir(),
    olcumAyari(),
  ]);
  // WhatsApp düğmesi künyedeki destek telefonu cep numarasıysa çıkıyor (K-99).
  const whatsapp = whatsappNumarasi(kunye.destekTelefon);
  // Reklam ölçümü panelde açıksa çerez onay bandı (K-124); değilse site
  // çerez kullanmıyor ve bant da yok (K-16).
  const olcumVar = Boolean(olcum.metaPikselId || olcum.googleEtiketId);
  return (
    <FavoriSaglayici ilk={favoriler}>
      <DuyuruSeridi />
      <UstCubuk />
      <main className="flex-1">{children}</main>
      <AltBilgi cerezTercihi={olcumVar} />
      {whatsapp && <WhatsappDugmesi numara={whatsapp} />}
      {olcumVar && <CerezOnayi metaId={olcum.metaPikselId} googleId={olcum.googleEtiketId} />}
    </FavoriSaglayici>
  );
}
